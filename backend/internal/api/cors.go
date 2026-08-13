package api

import "net/http"

// CORS restricts cross-origin requests to an explicit allowlist. The
// frontend and backend are on different origins even in production
// (app.<domain> vs api.<domain> — see architecture.md), so this is a real
// requirement, not just a local-dev convenience. Never combine a wildcard
// origin with Allow-Credentials — reflecting only allowlisted origins
// keeps that door closed even though cookies/credentials aren't used yet.
func CORS(allowedOrigins map[string]bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if allowedOrigins[origin] {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			}
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
