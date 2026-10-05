package api

import (
	"encoding/json"
	"net/http"

	"github.com/as76513/shubhshreekh/backend/internal/auth"
	"github.com/as76513/shubhshreekh/backend/internal/db"
)

type insightRequest struct {
	Tier      string  `json:"tier"`
	Action    string  `json:"action"`
	Stock     string  `json:"stock"`
	Symbol    string  `json:"symbol"`
	Category  string  `json:"category"`
	Timeframe string  `json:"timeframe"`
	CMP       float64 `json:"cmp"`
	Target    float64 `json:"target"`
	StopLoss  float64 `json:"stopLoss"`
	Rationale string  `json:"rationale"`
}

func (req insightRequest) toInput() db.InsightInput {
	return db.InsightInput{
		Tier:      req.Tier,
		Action:    req.Action,
		Stock:     req.Stock,
		Symbol:    req.Symbol,
		Category:  req.Category,
		Timeframe: req.Timeframe,
		CMP:       req.CMP,
		Target:    req.Target,
		StopLoss:  req.StopLoss,
		Rationale: req.Rationale,
	}
}

// handleCreateInsight: POST /admin/insights — analyst/admin only (see
// router.go's requireRole wrapping). Always creates a draft; Publish is a
// separate, explicit action (architecture.md's publish workflow).
func (d Deps) handleCreateInsight(w http.ResponseWriter, r *http.Request) {
	var req insightRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	insight, err := d.Content.CreateInsight(r.Context(), req.toInput())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create insight")
		return
	}
	writeJSON(w, http.StatusCreated, insight)
}

// handleUpdateInsight: PATCH /admin/insights/{id}.
func (d Deps) handleUpdateInsight(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req insightRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := d.Content.UpdateInsight(r.Context(), id, req.toInput()); err != nil {
		writeError(w, http.StatusNotFound, "insight not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"updated": true})
}

// handlePublishInsight: POST /admin/insights/{id}/publish — the only action
// that makes an insight visible via GET /insights (writes its GSI1 keys).
func (d Deps) handlePublishInsight(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	claims, _ := auth.FromContext(r.Context())
	if err := d.Content.PublishInsight(r.Context(), id, claims.Subject); err != nil {
		writeError(w, http.StatusNotFound, "insight not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"published": true})
}

// handleArchiveInsight: POST /admin/insights/{id}/archive — removes the
// GSI1 keys so it drops out of GET /insights; the row itself is kept for
// the SEBI audit trail, not deleted.
func (d Deps) handleArchiveInsight(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := d.Content.ArchiveInsight(r.Context(), id); err != nil {
		writeError(w, http.StatusNotFound, "insight not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"archived": true})
}

// handleListAllInsights: GET /admin/insights — drafts + published +
// archived, for the analyst's own "my content" list (Publish/Archive
// buttons). Distinct from the customer-facing handleListInsights below.
func (d Deps) handleListAllInsights(w http.ResponseWriter, r *http.Request) {
	insights, err := d.Content.ListAll(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list insights")
		return
	}
	writeJSON(w, http.StatusOK, insights)
}

// customerInsight is GET /insights' response shape. Free-tier callers get
// the stub form with locked:true and every trade-detail field zeroed —
// architecture.md: "never send full Pro content and rely on the UI to hide
// it" — so a free user's network tab never contains the numbers, unlike
// the pre-API static-mock version this replaces.
type customerInsight struct {
	ID         string  `json:"id"`
	Stock      string  `json:"stock"`
	Symbol     string  `json:"symbol"`
	Action     string  `json:"action"`
	Category   string  `json:"category"`
	Timeframe  string  `json:"timeframe"`
	Tier       string  `json:"tier"`
	Locked     bool    `json:"locked"`
	CMP        float64 `json:"cmp"`
	Target     float64 `json:"target"`
	StopLoss   float64 `json:"stopLoss"`
	ReturnsPct float64 `json:"returnsPct"`
	Rationale  string  `json:"rationale"`
	Date       string  `json:"date"`
}

// handleListInsights: GET /insights — published insights, tier-gated.
func (d Deps) handleListInsights(w http.ResponseWriter, r *http.Request) {
	claims, ok := auth.FromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	insights, err := d.Content.ListPublished(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list insights")
		return
	}

	out := make([]customerInsight, 0, len(insights))
	for _, in := range insights {
		locked := in.Tier == "pro" && claims.Subscription != "pro"
		c := customerInsight{
			ID:        in.ID,
			Stock:     in.Stock,
			Symbol:    in.Symbol,
			Action:    in.Action,
			Category:  in.Category,
			Timeframe: in.Timeframe,
			Tier:      in.Tier,
			Locked:    locked,
			Date:      in.PublishedAt,
		}
		if !locked {
			c.CMP = in.CMP
			c.Target = in.Target
			c.StopLoss = in.StopLoss
			c.ReturnsPct = in.ReturnsPct
			c.Rationale = in.Rationale
		}
		out = append(out, c)
	}
	writeJSON(w, http.StatusOK, out)
}
