// Package api builds the one handler tree shared by both cmd/server (local)
// and cmd/lambda (deployed) — no route logic is duplicated between them.
package api

import (
	"net/http"

	"github.com/as76513/shubhshreekh/backend/internal/auth"
	"github.com/as76513/shubhshreekh/backend/internal/db"
)

type Deps struct {
	SigningSecret []byte
	Users         *db.UsersTable
}

func NewRouter(deps Deps) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", handleHealthz)

	me := http.HandlerFunc(deps.handleMe)
	mux.Handle("GET /me", auth.Middleware(deps.SigningSecret)(me))

	return mux
}
