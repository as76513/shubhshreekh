package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/as76513/shubhshreekh/backend/internal/auth"
	"github.com/as76513/shubhshreekh/backend/internal/db"
	"github.com/as76513/shubhshreekh/backend/internal/otp"
)

// deviceSwapRole marks a short-lived token minted only to complete a
// device swap after verify-otp rejected a login with device_limit_reached
// — never a normal session token (see handleSwapDevice). OTP was already
// confirmed in that verify-otp call; this token just lets the frontend
// finish the login after the user picks a device to log out.
const deviceSwapRole = "device_swap"
const deviceSwapTokenTTL = 10 * time.Minute

// maxDeviceFieldLen bounds the client-supplied deviceId/deviceLabel —
// nothing exploitable today, but without a cap a pathologically large
// value would bloat the devices list item stored on the user row (TD-064).
// Real device IDs are UUIDs (~36 chars); labels are short device names.
const maxDeviceFieldLen = 128

// phoneRe matches a bare 10-digit Indian mobile number (no country code —
// the frontend collects it separately, see src/components/SignupModal.tsx).
// Never trust this format assumption from the client alone; it's re-checked
// here server-side regardless of what the frontend already validated.
var phoneRe = regexp.MustCompile(`^[6-9]\d{9}$`)

var otpRe = regexp.MustCompile(`^\d{4,6}$`)

// roleForPhone derives the role claim live from ANALYST_PHONES (same CSV
// format/parser as OTP_TEST_PHONES — see TECH_DEBT.md TD-013) rather than
// storing it on the user row: flipping who's an analyst is then just an env
// var + redeploy, with no DB migration and no stale role surviving after
// someone's removed from the list.
func roleForPhone(fullPhone string) string {
	analysts := otp.ParseTestPhones(os.Getenv("ANALYST_PHONES"))
	if _, ok := analysts[fullPhone]; ok {
		return "analyst"
	}
	return "customer"
}

// isTestPhone reports whether fullPhone is in the OTP_TEST_PHONES
// whitelist (TECH_DEBT.md TD-001) — those numbers already skip real SMS
// delivery via otp.Gate, so they're exempt from rate limiting too: QA and
// Play reviewers repeatedly re-running the same fixed-code login shouldn't
// be able to lock themselves out.
func isTestPhone(fullPhone string) bool {
	_, ok := otp.ParseTestPhones(os.Getenv("OTP_TEST_PHONES"))[fullPhone]
	return ok
}

// retryAfterMessage renders a rate-limit rejection with a concrete wait
// time when one is known (the send cooldown, a verify lockout) or a
// generic one when it isn't (the daily send cap has no single "try again
// at X" instant within the same UTC day — see ratelimit.CheckSend).
func retryAfterMessage(base string, retryAfter time.Duration) string {
	if retryAfter <= 0 {
		return base
	}
	seconds := int(retryAfter.Round(time.Second) / time.Second)
	if seconds < 60 {
		return fmt.Sprintf("%s — try again in %ds", base, seconds)
	}
	return fmt.Sprintf("%s — try again in %dm", base, seconds/60)
}

type sendOTPRequest struct {
	Phone string `json:"phone"`
}

func (d Deps) handleSendOTP(w http.ResponseWriter, r *http.Request) {
	var req sendOTPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if !phoneRe.MatchString(req.Phone) {
		writeError(w, http.StatusBadRequest, "enter a valid 10-digit mobile number")
		return
	}

	fullPhone := "91" + req.Phone
	if !isTestPhone(fullPhone) {
		ok, retryAfter, err := d.RateLimit.AllowSend(r.Context(), fullPhone)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not send OTP, try again")
			return
		}
		if !ok {
			if retryAfter > 0 {
				w.Header().Set("Retry-After", strconv.Itoa(int(retryAfter.Round(time.Second)/time.Second)))
			}
			writeError(w, http.StatusTooManyRequests, retryAfterMessage("too many OTP requests for this number", retryAfter))
			return
		}
		// Record the attempt before calling the provider, not after — a
		// downstream MSG91 failure shouldn't grant unlimited free retries
		// against the cooldown/cap (see TECH_DEBT.md TD-006).
		if err := d.RateLimit.RecordSend(r.Context(), fullPhone); err != nil {
			writeError(w, http.StatusInternalServerError, "could not send OTP, try again")
			return
		}
	}

	if err := d.OTP.Send(r.Context(), fullPhone); err != nil {
		writeError(w, http.StatusBadGateway, "could not send OTP, try again")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "sent"})
}

type checkPhoneRequest struct {
	Phone string `json:"phone"`
}

// handleCheckPhone lets the frontend decide, before sending an OTP, whether
// to route the user to login (existing phone) or signup (new phone) — a
// read-only lookup, never creates a row (see handleVerifyOTP for that).
func (d Deps) handleCheckPhone(w http.ResponseWriter, r *http.Request) {
	var req checkPhoneRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if !phoneRe.MatchString(req.Phone) {
		writeError(w, http.StatusBadRequest, "enter a valid 10-digit mobile number")
		return
	}

	user, err := d.Users.Get(r.Context(), "91"+req.Phone)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not check phone")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"exists": user != nil})
}

type verifyOTPRequest struct {
	Phone       string `json:"phone"`
	OTP         string `json:"otp"`
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	Email       string `json:"email"`
	DeviceID    string `json:"deviceId"`
	DeviceLabel string `json:"deviceLabel"`
}

// issueSession is the one place a normal (non-device-swap) session token
// gets minted — used by both handleVerifyOTP's success path and
// handleSwapDevice's completion path, so the two can't drift apart.
// subscription is always "pro": TD-054 removed the Free tier, so by the
// time this is called (entitlement + device checks already passed),
// there's nothing else to issue.
func (d Deps) issueSession(ctx context.Context, user *db.User) (map[string]string, error) {
	verifiedUntil := time.Now().Add(otpVerifiedWindow)
	if err := d.Users.SetVerifiedUntil(ctx, user.UserID, verifiedUntil); err != nil {
		return nil, err
	}
	role := roleForPhone(user.UserID)
	token, err := auth.IssueToken(d.SigningSecret, user.UserID, "pro", role, accessTokenTTL)
	if err != nil {
		return nil, err
	}
	return map[string]string{
		"token":        token,
		"subscription": "pro",
		"name":         user.Name,
		"userId":       user.UserID,
		"role":         role,
	}, nil
}

// handleVerifyOTP is the one place a user record gets created — never trust
// the client for identity; the phone number is only trusted here because
// Provider.Verify just confirmed it against the code sent to that number.
func (d Deps) handleVerifyOTP(w http.ResponseWriter, r *http.Request) {
	var req verifyOTPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if !phoneRe.MatchString(req.Phone) || !otpRe.MatchString(req.OTP) {
		writeError(w, http.StatusBadRequest, "invalid phone or OTP")
		return
	}

	fullPhone := "91" + req.Phone
	skipLimit := isTestPhone(fullPhone)
	if !skipLimit {
		allowed, retryAfter, err := d.RateLimit.AllowVerify(r.Context(), fullPhone)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not verify OTP, try again")
			return
		}
		if !allowed {
			w.Header().Set("Retry-After", strconv.Itoa(int(retryAfter.Round(time.Second)/time.Second)))
			writeError(w, http.StatusTooManyRequests, retryAfterMessage("too many failed attempts for this number", retryAfter))
			return
		}
	}

	ok, err := d.OTP.Verify(r.Context(), fullPhone, req.OTP)
	if err != nil {
		writeError(w, http.StatusBadGateway, "could not verify OTP, try again")
		return
	}
	if !ok {
		if !skipLimit {
			// Best-effort: a bookkeeping write failing here shouldn't turn
			// a wrong-code response into an opaque 500.
			_ = d.RateLimit.RecordVerifyFailure(r.Context(), fullPhone)
		}
		writeError(w, http.StatusUnauthorized, "incorrect or expired OTP")
		return
	}
	if !skipLimit {
		if err := d.RateLimit.RecordVerifySuccess(r.Context(), fullPhone); err != nil {
			writeError(w, http.StatusInternalServerError, "could not issue session")
			return
		}
	}

	name := strings.TrimSpace(strings.TrimSpace(req.FirstName) + " " + strings.TrimSpace(req.LastName))
	user, err := d.Users.GetOrCreateByPhone(r.Context(), fullPhone, name, strings.TrimSpace(req.Email))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create user")
		return
	}

	// TD-054: Free tier removed — OTP matched, but that alone no longer
	// means "let them in." A fresh signup's trial was just started by
	// GetOrCreateByPhone above, so this only actually rejects a returning
	// user whose trial has lapsed with no paid subscription.
	if !db.HasActiveEntitlement(user, time.Now()) {
		writeError(w, http.StatusForbidden, "trial_expired")
		return
	}

	if req.DeviceID == "" {
		writeError(w, http.StatusBadRequest, "device id required")
		return
	}
	if len(req.DeviceID) > maxDeviceFieldLen || len(req.DeviceLabel) > maxDeviceFieldLen {
		writeError(w, http.StatusBadRequest, "device id or label too long")
		return
	}
	// Anti-piracy device cap is a customer-subscription concern — RA/admin
	// staff legitimately run 2-3 people pushing trades from their own
	// devices, so analyst/admin/compliance roles get no cap (maxDevices<=0
	// means unlimited, see db.CheckDevice).
	maxDevices := db.MaxDevices
	if roleForPhone(fullPhone) != "customer" {
		maxDevices = 0
	}
	deviceAllowed, devices, err := d.Users.RegisterDevice(r.Context(), user.UserID, req.DeviceID, req.DeviceLabel, maxDevices)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not issue session")
		return
	}
	if !deviceAllowed {
		// Anti-piracy cap (TD-054): 2 registered devices max, a 3rd is
		// rejected rather than silently evicting one of the other two.
		// OTP already matched, so this mints a narrow-purpose token (not a
		// real session) just for the self-service "log out other device"
		// flow — see handleSwapDevice.
		swapToken, err := auth.IssueToken(d.SigningSecret, user.UserID, "", deviceSwapRole, deviceSwapTokenTTL)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not issue session")
			return
		}
		writeJSON(w, http.StatusForbidden, map[string]any{
			"error":                 "device_limit_reached",
			"devices":               devices,
			"deviceManagementToken": swapToken,
		})
		return
	}

	resp, err := d.issueSession(r.Context(), user)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not issue session")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

type swapDeviceRequest struct {
	RemoveDeviceID string `json:"removeDeviceId"`
	NewDeviceID    string `json:"newDeviceId"`
	NewDeviceLabel string `json:"newDeviceLabel"`
}

// handleSwapDevice: POST /auth/devices/swap — completes a login that
// verify-otp blocked with device_limit_reached. Requires the short-lived
// deviceManagementToken from that rejection (role == deviceSwapRole), not a
// normal Bearer session token — OTP was already confirmed in the verify-otp
// call that triggered the rejection; this just finishes that same login
// once the user's picked a device to free up.
func (d Deps) handleSwapDevice(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.FromContext(r.Context())
	if !ok || claims.Role != deviceSwapRole {
		writeError(w, http.StatusForbidden, "invalid token for this action")
		return
	}
	var req swapDeviceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.RemoveDeviceID == "" || req.NewDeviceID == "" {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if len(req.RemoveDeviceID) > maxDeviceFieldLen || len(req.NewDeviceID) > maxDeviceFieldLen || len(req.NewDeviceLabel) > maxDeviceFieldLen {
		writeError(w, http.StatusBadRequest, "device id or label too long")
		return
	}

	swapped, retryAfter, err := d.Users.SwapDevice(r.Context(), claims.Subject, req.RemoveDeviceID, req.NewDeviceID, req.NewDeviceLabel)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not swap device")
		return
	}
	if !swapped {
		w.Header().Set("Retry-After", strconv.Itoa(int(retryAfter.Round(time.Second)/time.Second)))
		writeError(w, http.StatusTooManyRequests, retryAfterMessage("device switch is rate-limited", retryAfter))
		return
	}

	// A single WebAuthn credential is shared by the whole account (TD-049
	// — one per user, not per device), so the evicted device's credential
	// can't be selectively revoked. Clearing it here forces a fresh OTP +
	// re-registration before biometric/PIN refresh works again for anyone
	// on this account — without this, the evicted device could keep
	// minting access tokens via /auth/refresh/* for up to 7 days despite
	// being "logged out" (found in code review 2026-10-06).
	_ = d.Users.ClearWebAuthnCredential(r.Context(), claims.Subject)

	user, err := d.Users.Get(r.Context(), claims.Subject)
	if err != nil || user == nil {
		writeError(w, http.StatusInternalServerError, "could not issue session")
		return
	}
	resp, err := d.issueSession(r.Context(), user)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not issue session")
		return
	}
	writeJSON(w, http.StatusOK, resp)
}
