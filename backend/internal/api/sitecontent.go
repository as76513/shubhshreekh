package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/as76513/shubhshreekh/backend/internal/auth"
	"github.com/as76513/shubhshreekh/backend/internal/db"
)

// handleGetSiteStats: GET /site-stats — public (no auth), same reasoning as
// handleGetPricing: the landing page's "Achievement strip" needs to be
// visible to a logged-out visitor, and nothing here is sensitive.
func (d Deps) handleGetSiteStats(w http.ResponseWriter, r *http.Request) {
	stats, err := d.Settings.GetSiteStats(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load site stats")
		return
	}
	writeJSON(w, http.StatusOK, stats)
}

type updateSiteStatsRequest struct {
	Learners    string `json:"learners"`
	IdeasShared string `json:"ideasShared"`
	Courses     string `json:"courses"`
	AvgRating   string `json:"avgRating"`
}

// handleUpdateSiteStats: PATCH /admin/site-stats — analyst/admin only.
func (d Deps) handleUpdateSiteStats(w http.ResponseWriter, r *http.Request) {
	var req updateSiteStatsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	learners, ideasShared, courses, avgRating :=
		strings.TrimSpace(req.Learners), strings.TrimSpace(req.IdeasShared),
		strings.TrimSpace(req.Courses), strings.TrimSpace(req.AvgRating)
	if learners == "" || ideasShared == "" || courses == "" || avgRating == "" {
		writeError(w, http.StatusBadRequest, "all four stats are required")
		return
	}
	claims, ok := auth.FromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	stats := db.SiteStats{Learners: learners, IdeasShared: ideasShared, Courses: courses, AvgRating: avgRating}
	if err := d.Settings.SetSiteStats(r.Context(), stats, claims.Subject); err != nil {
		writeError(w, http.StatusInternalServerError, "could not update site stats")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"updated": true})
}

// handleGetTestimonials: GET /testimonials — public (no auth), same
// reasoning as handleGetSiteStats.
func (d Deps) handleGetTestimonials(w http.ResponseWriter, r *http.Request) {
	testimonials, err := d.Settings.GetTestimonials(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load testimonials")
		return
	}
	writeJSON(w, http.StatusOK, testimonials)
}

type updateTestimonialsRequest struct {
	// Name/City/Text/Returns only — no Initials field: it's derived
	// server-side (deriveInitials below) rather than trusted from the
	// admin form, the same "never trust the client" reasoning
	// architecture.md applies everywhere else, even to the RA's own
	// browser.
	Testimonials []struct {
		Name    string `json:"name"`
		City    string `json:"city"`
		Text    string `json:"text"`
		Returns string `json:"returns"`
	} `json:"testimonials"`
}

// deriveInitials takes the first letter of up to the first two words of a
// name ("Arjun Patel" -> "AP", "Cher" -> "C") — admin types a name, not an
// avatar monogram.
func deriveInitials(name string) string {
	fields := strings.Fields(name)
	initials := ""
	for i, f := range fields {
		if i >= 2 {
			break
		}
		initials += strings.ToUpper(string([]rune(f)[0]))
	}
	return initials
}

// handleUpdateTestimonials: PATCH /admin/testimonials — analyst/admin only.
// Always the full replacement list (whatever the admin UI currently has
// after an add/delete), not a merge/append.
func (d Deps) handleUpdateTestimonials(w http.ResponseWriter, r *http.Request) {
	var req updateTestimonialsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	testimonials := make([]db.Testimonial, 0, len(req.Testimonials))
	for _, t := range req.Testimonials {
		name, city, text, returns := strings.TrimSpace(t.Name), strings.TrimSpace(t.City), strings.TrimSpace(t.Text), strings.TrimSpace(t.Returns)
		if name == "" || city == "" || text == "" {
			writeError(w, http.StatusBadRequest, "name, city, and text are required for every testimonial")
			return
		}
		testimonials = append(testimonials, db.Testimonial{
			Name:     name,
			City:     city,
			Text:     text,
			Returns:  returns,
			Initials: deriveInitials(name),
		})
	}
	claims, ok := auth.FromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if err := d.Settings.SetTestimonials(r.Context(), testimonials, claims.Subject); err != nil {
		writeError(w, http.StatusInternalServerError, "could not update testimonials")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"updated": true})
}
