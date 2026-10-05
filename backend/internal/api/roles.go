package api

import (
	"net/http"

	"github.com/as76513/shubhshreekh/backend/internal/auth"
)

// requireRole must run after auth.Middleware (it reads claims already put
// in context) and before the handler it wraps. architecture.md: analyst and
// admin may write RA content; compliance is read-only review, not a writer,
// so it's deliberately not accepted here.
func requireRole(roles ...string) func(http.Handler) http.Handler {
	allowed := make(map[string]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := auth.FromContext(r.Context())
			if !ok || !allowed[claims.Role] {
				writeError(w, http.StatusForbidden, "forbidden")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
