package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/as76513/shubhshreekh/backend/internal/auth"
	"github.com/as76513/shubhshreekh/backend/internal/db"
)

type insightRequest struct {
	Tier           string    `json:"tier"`
	Action         string    `json:"action"`
	InstrumentType string    `json:"instrumentType"` // equity | fno
	Stock          string    `json:"stock"`
	Symbol         string    `json:"symbol"`
	Category       string    `json:"category"`
	Timeframe      string    `json:"timeframe"`
	EntryPrice     float64   `json:"entryPrice"`
	Targets        []float64 `json:"targets"` // equity: exactly 1; fno: 1-3
	StopLoss       float64   `json:"stopLoss"`
	Rationale      string    `json:"rationale"`
}

// validate enforces architecture.md's "never trust the client" at the one
// place both create and edit funnel through — equity calls carry a single
// target, F&O calls carry up to 3 scaled booking levels, and the UI's own
// form shape is not itself a guarantee the stored data is well-formed.
func (req insightRequest) validate() error {
	switch req.InstrumentType {
	case "equity":
		if len(req.Targets) != 1 {
			return errors.New("equity calls require exactly one target")
		}
	case "fno":
		if len(req.Targets) < 1 || len(req.Targets) > 3 {
			return errors.New("F&O calls require 1 to 3 targets")
		}
	default:
		return errors.New(`instrumentType must be "equity" or "fno"`)
	}
	for _, t := range req.Targets {
		if t <= 0 {
			return errors.New("targets must be positive")
		}
	}
	return nil
}

func (req insightRequest) toInput() db.InsightInput {
	return db.InsightInput{
		Tier:           req.Tier,
		Action:         req.Action,
		InstrumentType: req.InstrumentType,
		Stock:          req.Stock,
		Symbol:         req.Symbol,
		Category:       req.Category,
		Timeframe:      req.Timeframe,
		EntryPrice:     req.EntryPrice,
		Targets:        req.Targets,
		StopLoss:       req.StopLoss,
		Rationale:      req.Rationale,
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
	if err := req.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
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
	if err := req.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
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
	claims, ok := auth.FromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
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

type closeInsightRequest struct {
	Outcome     string `json:"outcome"`               // target_hit | sl_hit
	TargetIndex *int   `json:"targetIndex,omitempty"` // which Targets[] element was hit; target_hit only, defaults to 0
}

// handleCloseInsight: POST /admin/insights/{id}/close — TD-053. The RA
// marks a trade resolved by hand (no live price feed to detect this
// automatically); independent of Status/GSI1, so a closed trade can stay
// "published" and visible, just no longer "open". For a F&O call with more
// than one booking level, TargetIndex says which one was actually hit —
// db.CloseInsight validates it against that insight's own Targets array
// rather than trusting the client's count.
func (d Deps) handleCloseInsight(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req closeInsightRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Outcome != "target_hit" && req.Outcome != "sl_hit" {
		writeError(w, http.StatusBadRequest, `outcome must be "target_hit" or "sl_hit"`)
		return
	}
	if err := d.Content.CloseInsight(r.Context(), id, req.Outcome, req.TargetIndex); err != nil {
		if errors.Is(err, db.ErrTargetIndexOutOfRange) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeError(w, http.StatusNotFound, "insight not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"closed": true})
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

// customerInsight is GET /insights' response shape. There's no Free tier
// left to gate against (TD-054 — every active session is "pro"), so this
// is a straight read of the published row; see TECH_DEBT.md TD-062 for the
// history of the per-row lock this replaced.
type customerInsight struct {
	ID             string    `json:"id"`
	Stock          string    `json:"stock"`
	Symbol         string    `json:"symbol"`
	Action         string    `json:"action"`
	InstrumentType string    `json:"instrumentType"`
	Category       string    `json:"category"`
	Timeframe      string    `json:"timeframe"`
	Tier           string    `json:"tier"`
	EntryPrice     float64   `json:"entryPrice"`
	Targets        []float64 `json:"targets"`
	StopLoss       float64   `json:"stopLoss"`
	ReturnsPct     float64   `json:"returnsPct"`
	Rationale      string    `json:"rationale"`
	Date           string    `json:"date"`
	TradeStatus    string    `json:"tradeStatus"`
	Outcome        string    `json:"outcome,omitempty"`
	ClosedAt       string    `json:"closedAt,omitempty"`
	TargetHitIndex *int      `json:"targetHitIndex,omitempty"`
}

// handleListInsights: GET /insights — published insights.
func (d Deps) handleListInsights(w http.ResponseWriter, r *http.Request) {
	if _, ok := auth.FromContext(r.Context()); !ok {
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
		out = append(out, customerInsight{
			ID:             in.ID,
			Stock:          in.Stock,
			Symbol:         in.Symbol,
			Action:         in.Action,
			InstrumentType: in.InstrumentType,
			Category:       in.Category,
			Timeframe:      in.Timeframe,
			Tier:           in.Tier,
			EntryPrice:     in.EntryPrice,
			Targets:        in.Targets,
			StopLoss:       in.StopLoss,
			ReturnsPct:     in.ReturnsPct,
			Rationale:      in.Rationale,
			Date:           in.PublishedAt,
			TradeStatus:    in.TradeStatus,
			Outcome:        in.Outcome,
			ClosedAt:       in.ClosedAt,
			TargetHitIndex: in.TargetHitIndex,
		})
	}
	writeJSON(w, http.StatusOK, out)
}
