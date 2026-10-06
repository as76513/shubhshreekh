// Package api builds the one handler tree shared by both cmd/server (local)
// and cmd/lambda (deployed) — no route logic is duplicated between them.
package api

import (
	"net/http"

	"github.com/go-webauthn/webauthn/webauthn"

	"github.com/as76513/shubhshreekh/backend/internal/auth"
	"github.com/as76513/shubhshreekh/backend/internal/db"
	"github.com/as76513/shubhshreekh/backend/internal/otp"
)

type Deps struct {
	SigningSecret  []byte
	Users          db.UsersStore
	Content        *db.ContentTable
	Settings       *db.SettingsTable
	OTP            otp.Provider
	RateLimit      RateLimiter
	WebAuthn       *webauthn.WebAuthn
	AllowedOrigins []string
}

func NewRouter(deps Deps) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", handleHealthz)

	mw := auth.Middleware(deps.SigningSecret)
	mux.Handle("GET /me", mw(http.HandlerFunc(deps.handleMe)))

	mux.HandleFunc("POST /auth/send-otp", deps.handleSendOTP)
	mux.HandleFunc("POST /auth/check-phone", deps.handleCheckPhone)
	mux.HandleFunc("POST /auth/verify-otp", deps.handleVerifyOTP)

	// Device swap (TD-054) — requires the short-lived deviceManagementToken
	// verify-otp returns on a device_limit_reached rejection, not a normal
	// session token; auth.Middleware verifies it the same way regardless
	// (same signing secret, same claims shape), handleSwapDevice itself
	// checks the role is deviceSwapRole.
	mux.Handle("POST /auth/devices/swap", mw(http.HandlerFunc(deps.handleSwapDevice)))

	// Pricing (TD-055) — public read (landing/upgrade pages, logged out or
	// in), admin-only write.
	mux.HandleFunc("GET /pricing", deps.handleGetPricing)

	// Registration requires a just-issued access token (the user already
	// completed OTP). Refresh deliberately does NOT — a possibly-expired
	// token is exactly the case it exists to handle — so each refresh
	// handler re-derives trust itself (see webauthn.go's doc comments).
	mux.Handle("POST /auth/webauthn/register/begin", mw(http.HandlerFunc(deps.handleWebAuthnRegisterBegin)))
	mux.Handle("POST /auth/webauthn/register/finish", mw(http.HandlerFunc(deps.handleWebAuthnRegisterFinish)))
	mux.HandleFunc("POST /auth/refresh/begin", deps.handleRefreshBegin)
	mux.HandleFunc("POST /auth/refresh/finish", deps.handleRefreshFinish)

	// RA content platform (Pipe B) — thin insights CMS, see architecture.md.
	mux.Handle("GET /insights", mw(http.HandlerFunc(deps.handleListInsights)))

	writer := requireRole("analyst", "admin")
	mux.Handle("GET /admin/insights", mw(writer(http.HandlerFunc(deps.handleListAllInsights))))
	mux.Handle("POST /admin/insights", mw(writer(http.HandlerFunc(deps.handleCreateInsight))))
	mux.Handle("PATCH /admin/insights/{id}", mw(writer(http.HandlerFunc(deps.handleUpdateInsight))))
	mux.Handle("POST /admin/insights/{id}/publish", mw(writer(http.HandlerFunc(deps.handlePublishInsight))))
	mux.Handle("POST /admin/insights/{id}/archive", mw(writer(http.HandlerFunc(deps.handleArchiveInsight))))
	mux.Handle("POST /admin/insights/{id}/close", mw(writer(http.HandlerFunc(deps.handleCloseInsight))))
	mux.Handle("PATCH /admin/pricing", mw(writer(http.HandlerFunc(deps.handleUpdatePricing))))

	origins := make(map[string]bool, len(deps.AllowedOrigins))
	for _, o := range deps.AllowedOrigins {
		origins[o] = true
	}
	return CORS(origins)(mux)
}
