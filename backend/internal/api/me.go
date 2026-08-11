package api

import (
	"encoding/json"
	"net/http"

	"github.com/as76513/shubhshreekh/backend/internal/auth"
)

type meResponse struct {
	UserID       string `json:"user_id"`
	Subscription string `json:"subscription"`
	Name         string `json:"name,omitempty"`
	PhoneNumber  string `json:"phone_number,omitempty"`
}

// handleMe derives identity and tier from the verified token claims only —
// never from anything the client sent directly. The DB read below only
// enriches the response with profile fields; it is not the source of truth
// for entitlement (architecture.md: authz comes from the signed token).
func (d Deps) handleMe(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.FromContext(r.Context())
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	resp := meResponse{
		UserID:       claims.Subject,
		Subscription: claims.Subscription,
	}

	if user, err := d.Users.Get(r.Context(), claims.Subject); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	} else if user != nil {
		resp.Name = user.Name
		resp.PhoneNumber = user.PhoneNumber
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}
