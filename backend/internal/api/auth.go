package api

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/as76513/shubhshreekh/backend/internal/auth"
)

// phoneRe matches a bare 10-digit Indian mobile number (no country code —
// the frontend collects it separately, see src/components/SignupModal.tsx).
// Never trust this format assumption from the client alone; it's re-checked
// here server-side regardless of what the frontend already validated.
var phoneRe = regexp.MustCompile(`^[6-9]\d{9}$`)

var otpRe = regexp.MustCompile(`^\d{4,6}$`)

const sessionTTL = 30 * 24 * time.Hour

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

	if err := d.OTP.Send(r.Context(), "91"+req.Phone); err != nil {
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
	Phone     string `json:"phone"`
	OTP       string `json:"otp"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
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
	ok, err := d.OTP.Verify(r.Context(), fullPhone, req.OTP)
	if err != nil {
		writeError(w, http.StatusBadGateway, "could not verify OTP, try again")
		return
	}
	if !ok {
		writeError(w, http.StatusUnauthorized, "incorrect or expired OTP")
		return
	}

	name := strings.TrimSpace(strings.TrimSpace(req.FirstName) + " " + strings.TrimSpace(req.LastName))
	user, err := d.Users.GetOrCreateByPhone(r.Context(), fullPhone, name, strings.TrimSpace(req.Email))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create user")
		return
	}

	subscription := "free"
	if user.Subscription == "pro" {
		subscription = "pro"
	}

	token, err := auth.IssueToken(d.SigningSecret, user.UserID, subscription, sessionTTL)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not issue session")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{
		"token":        token,
		"subscription": subscription,
		"name":         user.Name,
	})
}
