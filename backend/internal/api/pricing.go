package api

import (
	"encoding/json"
	"math"
	"net/http"

	"github.com/as76513/shubhshreekh/backend/internal/auth"
)

// planDef is a Go constant, not admin-configurable — only the discount
// percentage is (TECH_DEBT.md TD-055). Anchor prices are carried over from
// the 2026-10-06 stakeholder dictation; adjust here if they're wrong, this
// isn't derived from anything else.
type planDef struct {
	ID          string  `json:"id"`
	Label       string  `json:"label"`
	AnchorPrice float64 `json:"anchorPrice"`
}

var planDefs = []planDef{
	{ID: "monthly", Label: "Monthly", AnchorPrice: 3000},
	{ID: "quarterly", Label: "Quarterly", AnchorPrice: 6000},
	{ID: "annual", Label: "Annual", AnchorPrice: 20000},
}

// offerWindowHours is the countdown duration shown with the discount — a
// constant for now, unlike the discount percentage itself.
const offerWindowHours = 72

type pricingPlanResponse struct {
	ID              string  `json:"id"`
	Label           string  `json:"label"`
	AnchorPrice     float64 `json:"anchorPrice"`
	DiscountedPrice float64 `json:"discountedPrice"`
}

type pricingResponse struct {
	DiscountPercent  float64               `json:"discountPercent"`
	OfferWindowHours int                   `json:"offerWindowHours"`
	Plans            []pricingPlanResponse `json:"plans"`
}

// handleGetPricing: GET /pricing — public (no auth), the same way the
// marketing/landing page's plan comparison needs to be visible to a logged
// -out visitor. Nothing sensitive here: anchor prices and a discount
// percentage, not an entitlement decision.
func (d Deps) handleGetPricing(w http.ResponseWriter, r *http.Request) {
	settings, err := d.Settings.GetPricing(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not load pricing")
		return
	}
	plans := make([]pricingPlanResponse, len(planDefs))
	for i, p := range planDefs {
		discounted := p.AnchorPrice * (1 - settings.DiscountPercent/100)
		plans[i] = pricingPlanResponse{
			ID:              p.ID,
			Label:           p.Label,
			AnchorPrice:     p.AnchorPrice,
			DiscountedPrice: math.Round(discounted),
		}
	}
	writeJSON(w, http.StatusOK, pricingResponse{
		DiscountPercent:  settings.DiscountPercent,
		OfferWindowHours: offerWindowHours,
		Plans:            plans,
	})
}

type updatePricingRequest struct {
	DiscountPercent float64 `json:"discountPercent"`
}

// handleUpdatePricing: PATCH /admin/pricing — analyst/admin only. The one
// thing this round of requirements asked to be changeable without a
// deploy, specifically so discounts can be bumped for festive sales.
func (d Deps) handleUpdatePricing(w http.ResponseWriter, r *http.Request) {
	var req updatePricingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.DiscountPercent < 25 || req.DiscountPercent >= 100 {
		writeError(w, http.StatusBadRequest, "discountPercent must be between 25 and 100")
		return
	}
	claims, ok := auth.FromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if err := d.Settings.SetDiscountPercent(r.Context(), req.DiscountPercent, claims.Subject); err != nil {
		writeError(w, http.StatusInternalServerError, "could not update pricing")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"updated": true})
}
