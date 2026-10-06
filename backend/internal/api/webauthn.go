package api

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"

	"github.com/as76513/shubhshreekh/backend/internal/auth"
	"github.com/as76513/shubhshreekh/backend/internal/db"
)

// NewWebAuthnFromEnv builds the relying-party config shared by cmd/server
// and cmd/lambda. RPID must be the frontend's effective domain (where
// navigator.credentials runs), NOT the api.* domain the Go backend is
// served from — WebAuthn credentials are bound to the origin the browser
// actually called the API from. Defaults match local dev (frontend on
// localhost:3000); production must set both env vars explicitly.
func NewWebAuthnFromEnv() (*webauthn.WebAuthn, error) {
	rpID := os.Getenv("WEBAUTHN_RP_ID")
	if rpID == "" {
		rpID = "localhost"
	}
	origins := os.Getenv("WEBAUTHN_RP_ORIGINS")
	if origins == "" {
		origins = "http://localhost:3000"
	}
	return webauthn.New(&webauthn.Config{
		RPID:          rpID,
		RPDisplayName: "ShubhShree Knowledge Hub",
		RPOrigins:     strings.Split(origins, ","),
	})
}

// otpVerifiedWindow bounds how long a biometric/PIN refresh (see
// handleRefreshBegin/Finish) may mint new access tokens after the user's
// last full phone+OTP login, before another OTP is required — see
// db.User.VerifiedUntil and TECH_DEBT.md.
const otpVerifiedWindow = 7 * 24 * time.Hour

// accessTokenTTL is deliberately short — the long-lived guarantee now lives
// in otpVerifiedWindow + a WebAuthn credential, not in the bearer token
// itself, so a leaked token is only useful for a few minutes.
const accessTokenTTL = 30 * time.Minute

// webauthnUser adapts db.User to the webauthn.User interface the library
// needs for both registration and login ceremonies.
type webauthnUser struct {
	*db.User
}

func (u webauthnUser) WebAuthnID() []byte { return []byte(u.UserID) }

func (u webauthnUser) WebAuthnName() string {
	if u.Name != "" {
		return u.Name
	}
	return u.PhoneNumber
}

func (u webauthnUser) WebAuthnDisplayName() string { return u.WebAuthnName() }

func (u webauthnUser) WebAuthnCredentials() []webauthn.Credential {
	if u.WebAuthnCredential == "" {
		return nil
	}
	var cred webauthn.Credential
	if err := json.Unmarshal([]byte(u.WebAuthnCredential), &cred); err != nil {
		return nil
	}
	return []webauthn.Credential{cred}
}

// handleWebAuthnRegisterBegin starts registering a biometric/PIN credential
// for the already-authenticated caller (Bearer token required — this is an
// upgrade on top of a session that just completed full OTP login, not a
// standalone identity check).
func (d Deps) handleWebAuthnRegisterBegin(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.FromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	user, err := d.Users.Get(r.Context(), claims.Subject)
	if err != nil || user == nil {
		writeError(w, http.StatusInternalServerError, "could not load user")
		return
	}

	creation, session, err := d.WebAuthn.BeginRegistration(
		webauthnUser{user},
		webauthn.WithAuthenticatorSelection(protocol.AuthenticatorSelection{
			AuthenticatorAttachment: protocol.Platform,
			UserVerification:        protocol.VerificationRequired,
		}),
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not start registration")
		return
	}

	sessionJSON, err := json.Marshal(session)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not start registration")
		return
	}
	if err := d.Users.SetWebAuthnSession(r.Context(), user.UserID, string(sessionJSON)); err != nil {
		writeError(w, http.StatusInternalServerError, "could not start registration")
		return
	}

	writeJSON(w, http.StatusOK, creation)
}

// handleWebAuthnRegisterFinish completes registration and stores the
// resulting credential's public key (the private key never left the
// user's device).
func (d Deps) handleWebAuthnRegisterFinish(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.FromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	user, err := d.Users.Get(r.Context(), claims.Subject)
	if err != nil || user == nil || user.WebAuthnSession == "" {
		writeError(w, http.StatusBadRequest, "no registration in progress")
		return
	}

	var session webauthn.SessionData
	if err := json.Unmarshal([]byte(user.WebAuthnSession), &session); err != nil {
		writeError(w, http.StatusInternalServerError, "could not finish registration")
		return
	}

	credential, err := d.WebAuthn.FinishRegistration(webauthnUser{user}, session, r)
	_ = d.Users.ClearWebAuthnSession(r.Context(), user.UserID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "could not verify registration")
		return
	}

	credentialJSON, err := json.Marshal(credential)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not finish registration")
		return
	}
	if err := d.Users.SetWebAuthnCredential(r.Context(), user.UserID, string(credentialJSON)); err != nil {
		writeError(w, http.StatusInternalServerError, "could not finish registration")
		return
	}

	writeJSON(w, http.StatusOK, map[string]bool{"registered": true})
}

type refreshBeginRequest struct {
	UserID string `json:"user_id"`
}

// handleRefreshBegin starts a biometric/PIN re-auth for a possibly-expired
// access token. It deliberately runs outside auth.Middleware — that's the
// whole point of a refresh — so it must independently re-check everything
// a stolen request could lie about: that the user exists, is still inside
// its OTP-verified window, and has a registered credential at all.
func (d Deps) handleRefreshBegin(w http.ResponseWriter, r *http.Request) {
	var req refreshBeginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.UserID == "" {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, err := d.Users.Get(r.Context(), req.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not start refresh")
		return
	}
	if user == nil || user.WebAuthnCredential == "" {
		writeError(w, http.StatusUnauthorized, "reauth_required")
		return
	}
	if !withinVerifiedWindow(user.VerifiedUntil) {
		writeError(w, http.StatusUnauthorized, "reauth_required")
		return
	}

	assertion, session, err := d.WebAuthn.BeginLogin(
		webauthnUser{user},
		webauthn.WithUserVerification(protocol.VerificationRequired),
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not start refresh")
		return
	}

	sessionJSON, err := json.Marshal(session)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not start refresh")
		return
	}
	if err := d.Users.SetWebAuthnSession(r.Context(), user.UserID, string(sessionJSON)); err != nil {
		writeError(w, http.StatusInternalServerError, "could not start refresh")
		return
	}

	writeJSON(w, http.StatusOK, assertion)
}

type refreshFinishRequest struct {
	UserID string `json:"user_id"`
}

// handleRefreshFinish verifies the biometric/PIN assertion and, only if
// still inside the OTP-verified window, mints a new short-lived access
// token — it never extends that window itself; only a fresh OTP does (see
// otpVerifiedWindow).
func (d Deps) handleRefreshFinish(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		writeError(w, http.StatusBadRequest, "missing user_id")
		return
	}

	user, err := d.Users.Get(r.Context(), userID)
	if err != nil || user == nil || user.WebAuthnSession == "" {
		writeError(w, http.StatusBadRequest, "no refresh in progress")
		return
	}
	if !withinVerifiedWindow(user.VerifiedUntil) {
		_ = d.Users.ClearWebAuthnSession(r.Context(), user.UserID)
		writeError(w, http.StatusUnauthorized, "reauth_required")
		return
	}

	var session webauthn.SessionData
	if err := json.Unmarshal([]byte(user.WebAuthnSession), &session); err != nil {
		writeError(w, http.StatusInternalServerError, "could not finish refresh")
		return
	}

	credential, err := d.WebAuthn.FinishLogin(webauthnUser{user}, session, r)
	_ = d.Users.ClearWebAuthnSession(r.Context(), user.UserID)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "could not verify biometric/PIN")
		return
	}

	// Required by the library's storage contract: persist the updated
	// signature counter so a cloned authenticator is detectable next time.
	if credentialJSON, err := json.Marshal(credential); err == nil {
		_ = d.Users.SetWebAuthnCredential(r.Context(), user.UserID, string(credentialJSON))
	}

	// TD-054: a refresh must not outlive the trial/paid entitlement either
	// — otherwise a device that registered a passkey during an active
	// trial could keep minting tokens indefinitely after it lapses.
	if !db.HasActiveEntitlement(user, time.Now()) {
		writeError(w, http.StatusForbidden, "trial_expired")
		return
	}
	subscription := "pro"
	role := roleForPhone(user.UserID)
	token, err := auth.IssueToken(d.SigningSecret, user.UserID, subscription, role, accessTokenTTL)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not issue session")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{
		"token":        token,
		"subscription": subscription,
		"name":         user.Name,
		"role":         role,
	})
}

func withinVerifiedWindow(verifiedUntil string) bool {
	if verifiedUntil == "" {
		return false
	}
	until, err := time.Parse(time.RFC3339, verifiedUntil)
	if err != nil {
		return false
	}
	return time.Now().Before(until)
}
