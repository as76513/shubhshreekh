package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
)

type contextKey int

const claimsKey contextKey = iota

// Middleware verifies the Bearer token on every request and puts the
// trusted claims in the request context — handlers never read identity
// from anything the client sent directly (architecture.md: "never trust
// the client").
func Middleware(secret []byte) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			raw, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
			if !ok || raw == "" {
				writeUnauthorized(w)
				return
			}
			claims, err := VerifyToken(secret, raw)
			if err != nil {
				writeUnauthorized(w)
				return
			}
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), claimsKey, claims)))
		})
	}
}

func FromContext(ctx context.Context) (*Claims, bool) {
	c, ok := ctx.Value(claimsKey).(*Claims)
	return c, ok
}

func writeUnauthorized(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
}
