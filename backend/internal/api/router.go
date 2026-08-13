// Package api builds the one handler tree shared by both cmd/server (local)
// and cmd/lambda (deployed) — no route logic is duplicated between them.
package api

import (
	"net/http"

	"github.com/as76513/shubhshreekh/backend/internal/auth"
	"github.com/as76513/shubhshreekh/backend/internal/db"
	"github.com/as76513/shubhshreekh/backend/internal/otp"
)

type Deps struct {
	SigningSecret  []byte
	Users          *db.UsersTable
	OTP            otp.Provider
	AllowedOrigins []string
}

func NewRouter(deps Deps) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", handleHealthz)

	me := http.HandlerFunc(deps.handleMe)
	mux.Handle("GET /me", auth.Middleware(deps.SigningSecret)(me))

	mux.HandleFunc("POST /auth/send-otp", deps.handleSendOTP)
	mux.HandleFunc("POST /auth/verify-otp", deps.handleVerifyOTP)

	origins := make(map[string]bool, len(deps.AllowedOrigins))
	for _, o := range deps.AllowedOrigins {
		origins[o] = true
	}
	return CORS(origins)(mux)
}
