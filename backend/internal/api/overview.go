package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/as76513/shubhshreekh/backend/internal/auth"
)

type createOverviewRequest struct {
	Text      string   `json:"text"`
	PhotoURLs []string `json:"photoUrls"`
}

// handleCreateOverview: POST /admin/overview — analyst/admin only. Posts
// immediately, no draft stage (see db.Overview's doc comment).
func (d Deps) handleCreateOverview(w http.ResponseWriter, r *http.Request) {
	var req createOverviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	text := strings.TrimSpace(req.Text)
	if text == "" {
		writeError(w, http.StatusBadRequest, "text is required")
		return
	}
	claims, _ := auth.FromContext(r.Context())
	ov, err := d.Content.CreateOverview(r.Context(), text, req.PhotoURLs, claims.Subject)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not post overview")
		return
	}
	writeJSON(w, http.StatusCreated, ov)
}

// handleListOverviews: GET /overview — every post newest-first, for the
// Blogs archive page.
func (d Deps) handleListOverviews(w http.ResponseWriter, r *http.Request) {
	overviews, err := d.Content.ListOverviews(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list overviews")
		return
	}
	writeJSON(w, http.StatusOK, overviews)
}

// handleGetLatestOverview: GET /overview/latest — just today's/most recent
// post, for the Dashboard card. Returns null if the RA hasn't posted yet.
func (d Deps) handleGetLatestOverview(w http.ResponseWriter, r *http.Request) {
	overviews, err := d.Content.ListOverviews(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load overview")
		return
	}
	if len(overviews) == 0 {
		writeJSON(w, http.StatusOK, nil)
		return
	}
	writeJSON(w, http.StatusOK, overviews[0])
}

type weeklyPDFRequest struct {
	Title   string `json:"title"`
	Summary string `json:"summary"`
	PdfURL  string `json:"pdfUrl"`
}

// handleSetWeeklyPDF: PATCH /admin/weekly-pdf — analyst/admin only.
func (d Deps) handleSetWeeklyPDF(w http.ResponseWriter, r *http.Request) {
	var req weeklyPDFRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	title, pdfURL := strings.TrimSpace(req.Title), strings.TrimSpace(req.PdfURL)
	if title == "" || pdfURL == "" {
		writeError(w, http.StatusBadRequest, "title and pdfUrl are required")
		return
	}
	claims, _ := auth.FromContext(r.Context())
	if err := d.Settings.SetWeeklyPDF(r.Context(), title, strings.TrimSpace(req.Summary), pdfURL, claims.Subject); err != nil {
		writeError(w, http.StatusInternalServerError, "could not update weekly PDF")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"updated": true})
}

// handleGetWeeklyPDF: GET /weekly-pdf — the Dashboard's "Today's Update"
// card reads this instead of the old static file.
func (d Deps) handleGetWeeklyPDF(w http.ResponseWriter, r *http.Request) {
	pdf, err := d.Settings.GetWeeklyPDF(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load weekly PDF")
		return
	}
	writeJSON(w, http.StatusOK, pdf)
}
