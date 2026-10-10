// Package api builds the one handler tree shared by both cmd/server (local)
// and cmd/lambda (deployed) — no route logic is duplicated between them.
package api

import (
	"net/http"

	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/go-webauthn/webauthn/webauthn"

	"github.com/as76513/shubhshreekh/backend/internal/auth"
	"github.com/as76513/shubhshreekh/backend/internal/db"
	"github.com/as76513/shubhshreekh/backend/internal/otp"
)

type Deps struct {
	SigningSecret     []byte
	Users             db.UsersStore
	Content           db.ContentStore
	Settings          db.SettingsStore
	OTP               otp.Provider
	RateLimit         RateLimiter
	WebAuthn          *webauthn.WebAuthn
	S3                *s3.Client
	MediaBucket       string
	MediaBucketRegion string
	AllowedOrigins    []string
}

func NewRouter(deps Deps) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", handleHealthz)

	mw := auth.Middleware(deps.SigningSecret)

	// customer: any route a real logged-in user should reach. Explicitly
	// excludes deviceSwapRole — without this, the short-lived swap token
	// (minted on a device_limit_reached rejection, scoped only to complete
	// that one action) would work on every route below just because
	// auth.Middleware only checks the signature, not the role, letting a
	// rejected device get repeated 10-minute windows of real access without
	// ever actually freeing a device slot (found in code review 2026-10-06).
	customer := requireRole("customer", "analyst", "admin", "compliance")
	mux.Handle("GET /me", mw(customer(http.HandlerFunc(deps.handleMe))))

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
	mux.Handle("POST /auth/webauthn/register/begin", mw(customer(http.HandlerFunc(deps.handleWebAuthnRegisterBegin))))
	mux.Handle("POST /auth/webauthn/register/finish", mw(customer(http.HandlerFunc(deps.handleWebAuthnRegisterFinish))))
	mux.HandleFunc("POST /auth/refresh/begin", deps.handleRefreshBegin)
	mux.HandleFunc("POST /auth/refresh/finish", deps.handleRefreshFinish)

	// RA content platform (Pipe B) — thin insights CMS, see architecture.md.
	mux.Handle("GET /insights", mw(customer(http.HandlerFunc(deps.handleListInsights))))

	// Daily Market Overview + weekly PDF (TD-057/058) — customer reads
	// behind the same login-gated customer role as everything else shown
	// on the Dashboard; not public like /pricing, which also needs to work
	// for a logged-out landing-page visitor.
	mux.Handle("GET /overview/latest", mw(customer(http.HandlerFunc(deps.handleGetLatestOverview))))
	mux.Handle("GET /overview", mw(customer(http.HandlerFunc(deps.handleListOverviews))))
	mux.Handle("GET /weekly-pdf", mw(customer(http.HandlerFunc(deps.handleGetWeeklyPDF))))

	writer := requireRole("analyst", "admin")
	mux.Handle("GET /admin/insights", mw(writer(http.HandlerFunc(deps.handleListAllInsights))))
	mux.Handle("POST /admin/insights", mw(writer(http.HandlerFunc(deps.handleCreateInsight))))
	mux.Handle("PATCH /admin/insights/{id}", mw(writer(http.HandlerFunc(deps.handleUpdateInsight))))
	mux.Handle("POST /admin/insights/{id}/publish", mw(writer(http.HandlerFunc(deps.handlePublishInsight))))
	mux.Handle("POST /admin/insights/{id}/archive", mw(writer(http.HandlerFunc(deps.handleArchiveInsight))))
	mux.Handle("POST /admin/insights/{id}/close", mw(writer(http.HandlerFunc(deps.handleCloseInsight))))
	mux.Handle("POST /admin/insights/{id}/mark-target-hit", mw(writer(http.HandlerFunc(deps.handleMarkTargetHit))))
	mux.Handle("PATCH /admin/pricing", mw(writer(http.HandlerFunc(deps.handleUpdatePricing))))
	mux.Handle("POST /admin/overview", mw(writer(http.HandlerFunc(deps.handleCreateOverview))))
	mux.Handle("PATCH /admin/weekly-pdf", mw(writer(http.HandlerFunc(deps.handleSetWeeklyPDF))))
	mux.Handle("POST /admin/media/upload-url", mw(writer(http.HandlerFunc(deps.handleMediaUploadURL))))

	origins := make(map[string]bool, len(deps.AllowedOrigins))
	for _, o := range deps.AllowedOrigins {
		origins[o] = true
	}
	return CORS(origins)(mux)
}
