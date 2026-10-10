package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/as76513/shubhshreekh/backend/internal/auth"
	"github.com/as76513/shubhshreekh/backend/internal/db"
)

// testSigningSecret is shared by these tests; a fixed value is fine since
// nothing here depends on secrecy, only on signer/verifier agreeing.
var testSigningSecret = []byte("test-signing-secret")

// withAuthToken runs handler through the real auth.Middleware (not a fake)
// with a freshly minted token for (subject, role) — same approach as
// auth_test.go's withBearer, generalized for the content/pricing handlers
// that read auth.FromContext themselves (publish, close-by-attribution,
// pricing update, overview create).
func withAuthToken(t *testing.T, secret []byte, subject, role string, req *http.Request, handler http.HandlerFunc) *httptest.ResponseRecorder {
	t.Helper()
	token, err := auth.IssueToken(secret, subject, "pro", role, time.Hour)
	if err != nil {
		t.Fatalf("IssueToken: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	auth.Middleware(secret)(handler).ServeHTTP(rec, req)
	return rec
}

// --- insightRequest.validate() — pure, no DB/HTTP involved ---

func TestInsightRequestValidate(t *testing.T) {
	cases := []struct {
		name    string
		req     insightRequest
		wantErr bool
	}{
		{"equity with exactly one target", insightRequest{Action: "BUY", InstrumentType: "equity", Targets: []float64{3200}, EntryPriceLow: 2900, EntryPriceHigh: 2920, StopLoss: 2780}, false},
		{"equity with zero targets", insightRequest{Action: "BUY", InstrumentType: "equity", Targets: nil, EntryPriceLow: 2900, EntryPriceHigh: 2920, StopLoss: 2780}, true},
		{"equity with two targets rejected", insightRequest{Action: "BUY", InstrumentType: "equity", Targets: []float64{3200, 3300}, EntryPriceLow: 2900, EntryPriceHigh: 2920, StopLoss: 2780}, true},
		{"fno with one target", insightRequest{Action: "BUY", InstrumentType: "fno", Targets: []float64{24500}, EntryPriceLow: 24000, EntryPriceHigh: 24050, StopLoss: 23800}, false},
		{"fno with three targets", insightRequest{Action: "BUY", InstrumentType: "fno", Targets: []float64{24500, 24700, 24900}, EntryPriceLow: 24000, EntryPriceHigh: 24050, StopLoss: 23800}, false},
		{"fno with four targets rejected", insightRequest{Action: "BUY", InstrumentType: "fno", Targets: []float64{1, 2, 3, 4}, EntryPriceLow: 24000, EntryPriceHigh: 24050, StopLoss: 23800}, true},
		{"fno with zero targets rejected", insightRequest{Action: "BUY", InstrumentType: "fno", Targets: nil, EntryPriceLow: 24000, EntryPriceHigh: 24050, StopLoss: 23800}, true},
		{"unknown instrument type rejected", insightRequest{Action: "BUY", InstrumentType: "option", Targets: []float64{100}, EntryPriceLow: 90, EntryPriceHigh: 95, StopLoss: 80}, true},
		{"zero target value rejected", insightRequest{Action: "BUY", InstrumentType: "equity", Targets: []float64{0}, EntryPriceLow: 2900, EntryPriceHigh: 2920, StopLoss: 2780}, true},
		{"negative target value rejected", insightRequest{Action: "BUY", InstrumentType: "fno", Targets: []float64{100, -5}, EntryPriceLow: 90, EntryPriceHigh: 95, StopLoss: 80}, true},
		{"entry price low above high rejected", insightRequest{Action: "BUY", InstrumentType: "equity", Targets: []float64{3200}, EntryPriceLow: 2920, EntryPriceHigh: 2900, StopLoss: 2780}, true},
		{"zero entry price rejected", insightRequest{Action: "BUY", InstrumentType: "equity", Targets: []float64{3200}, EntryPriceLow: 0, EntryPriceHigh: 0, StopLoss: 2780}, true},
		{"zero stop loss rejected", insightRequest{Action: "BUY", InstrumentType: "equity", Targets: []float64{3200}, EntryPriceLow: 2900, EntryPriceHigh: 2920, StopLoss: 0}, true},
		{"BUY stop loss above entry low rejected", insightRequest{Action: "BUY", InstrumentType: "equity", Targets: []float64{3200}, EntryPriceLow: 2900, EntryPriceHigh: 2920, StopLoss: 2910}, true},
		{"BUY stop loss equal to entry low rejected", insightRequest{Action: "BUY", InstrumentType: "equity", Targets: []float64{3200}, EntryPriceLow: 2900, EntryPriceHigh: 2920, StopLoss: 2900}, true},
		{"SELL stop loss above entry high accepted", insightRequest{Action: "SELL", InstrumentType: "equity", Targets: []float64{2800}, EntryPriceLow: 2900, EntryPriceHigh: 2920, StopLoss: 2950}, false},
		{"SELL stop loss below entry high rejected", insightRequest{Action: "SELL", InstrumentType: "equity", Targets: []float64{2800}, EntryPriceLow: 2900, EntryPriceHigh: 2920, StopLoss: 2910}, true},
		{"unknown action rejected", insightRequest{Action: "HOLD", InstrumentType: "equity", Targets: []float64{3200}, EntryPriceLow: 2900, EntryPriceHigh: 2920, StopLoss: 2780}, true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := c.req.validate()
			if (err != nil) != c.wantErr {
				t.Fatalf("validate() error = %v, wantErr %v", err, c.wantErr)
			}
		})
	}
}

// --- POST /admin/insights ---

func TestHandleCreateInsight_HappyPath(t *testing.T) {
	store := newFakeContentStore()
	d := Deps{SigningSecret: testSigningSecret, Content: store}

	body := `{"instrumentType":"equity","stock":"Reliance","symbol":"RELIANCE","action":"BUY","entryPriceLow":2920,"entryPriceHigh":2930,"targets":[3200],"stopLoss":2780,"rationale":"breakout"}`
	req := httptest.NewRequest(http.MethodPost, "/admin/insights", strings.NewReader(body))
	rec := httptest.NewRecorder()
	d.handleCreateInsight(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201; body = %s", rec.Code, rec.Body)
	}
	if len(store.insights) != 1 {
		t.Fatalf("expected one insight created, got %d", len(store.insights))
	}
}

func TestHandleCreateInsight_InvalidTargets(t *testing.T) {
	store := newFakeContentStore()
	d := Deps{SigningSecret: testSigningSecret, Content: store}

	body := `{"instrumentType":"equity","targets":[100,200]}`
	req := httptest.NewRequest(http.MethodPost, "/admin/insights", strings.NewReader(body))
	rec := httptest.NewRecorder()
	d.handleCreateInsight(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body = %s", rec.Code, rec.Body)
	}
	if len(store.insights) != 0 {
		t.Fatalf("an invalid request must never reach the store")
	}
}

// --- PATCH /admin/insights/{id} ---

func TestHandleUpdateInsight_NotFound(t *testing.T) {
	store := newFakeContentStore()
	d := Deps{SigningSecret: testSigningSecret, Content: store}

	body := `{"action":"BUY","instrumentType":"equity","targets":[100],"entryPriceLow":90,"entryPriceHigh":95,"stopLoss":80}`
	req := httptest.NewRequest(http.MethodPatch, "/admin/insights/does-not-exist", strings.NewReader(body))
	req.SetPathValue("id", "does-not-exist")
	rec := httptest.NewRecorder()
	d.handleUpdateInsight(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404; body = %s", rec.Code, rec.Body)
	}
}

// --- POST /admin/insights/{id}/publish ---

func TestHandlePublishInsight(t *testing.T) {
	store := newFakeContentStore()
	insight, err := store.CreateInsight(t.Context(), db.InsightInput{InstrumentType: "equity", Targets: []float64{100}})
	if err != nil {
		t.Fatalf("CreateInsight: %v", err)
	}
	d := Deps{SigningSecret: testSigningSecret, Content: store}

	req := httptest.NewRequest(http.MethodPost, "/admin/insights/"+insight.ID+"/publish", nil)
	req.SetPathValue("id", insight.ID)
	rec := withAuthToken(t, testSigningSecret, "user#analyst-1", "analyst", req, d.handlePublishInsight)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %s", rec.Code, rec.Body)
	}
	if store.insights[insight.ID].Status != "published" {
		t.Fatalf("status = %q, want published", store.insights[insight.ID].Status)
	}
	if store.insights[insight.ID].PublishedBy != "user#analyst-1" {
		t.Fatalf("publishedBy = %q, want attribution to the acting analyst", store.insights[insight.ID].PublishedBy)
	}
}

// --- POST /admin/insights/{id}/close — TD-053/065 target-index validation ---

func TestHandleCloseInsight_TargetIndexOutOfRange(t *testing.T) {
	store := newFakeContentStore()
	insight, err := store.CreateInsight(t.Context(), db.InsightInput{InstrumentType: "fno", Targets: []float64{24500, 24700, 24900}})
	if err != nil {
		t.Fatalf("CreateInsight: %v", err)
	}
	d := Deps{SigningSecret: testSigningSecret, Content: store}

	// Only indices 0-2 exist on this 3-target F&O call; the client claiming
	// index 5 must be rejected against the insight's own stored data, not
	// trusted — this is exactly the "never trust the client" check TD-053's
	// db.ErrTargetIndexOutOfRange exists for.
	body := `{"outcome":"target_hit","targetIndex":5}`
	req := httptest.NewRequest(http.MethodPost, "/admin/insights/"+insight.ID+"/close", strings.NewReader(body))
	req.SetPathValue("id", insight.ID)
	rec := httptest.NewRecorder()
	d.handleCloseInsight(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body = %s", rec.Code, rec.Body)
	}
	if store.insights[insight.ID].TradeStatus == "closed" {
		t.Fatalf("an out-of-range target index must not close the trade")
	}
}

func TestHandleCloseInsight_ValidTargetIndex(t *testing.T) {
	store := newFakeContentStore()
	insight, err := store.CreateInsight(t.Context(), db.InsightInput{InstrumentType: "fno", Targets: []float64{24500, 24700, 24900}})
	if err != nil {
		t.Fatalf("CreateInsight: %v", err)
	}
	d := Deps{SigningSecret: testSigningSecret, Content: store}

	body := `{"outcome":"target_hit","targetIndex":1}`
	req := httptest.NewRequest(http.MethodPost, "/admin/insights/"+insight.ID+"/close", strings.NewReader(body))
	req.SetPathValue("id", insight.ID)
	rec := httptest.NewRecorder()
	d.handleCloseInsight(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %s", rec.Code, rec.Body)
	}
	got := store.insights[insight.ID]
	if got.TradeStatus != "closed" || got.TargetHitIndex == nil || *got.TargetHitIndex != 1 {
		t.Fatalf("unexpected insight state: %+v", got)
	}
}

func TestHandleCloseInsight_InvalidOutcome(t *testing.T) {
	store := newFakeContentStore()
	d := Deps{SigningSecret: testSigningSecret, Content: store}

	body := `{"outcome":"profit"}`
	req := httptest.NewRequest(http.MethodPost, "/admin/insights/whatever/close", strings.NewReader(body))
	req.SetPathValue("id", "whatever")
	rec := httptest.NewRecorder()
	d.handleCloseInsight(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body = %s", rec.Code, rec.Body)
	}
}

// --- POST /admin/insights/{id}/mark-target-hit ---

func TestHandleMarkTargetHit_KeepsTradeOpen(t *testing.T) {
	store := newFakeContentStore()
	insight, err := store.CreateInsight(t.Context(), db.InsightInput{InstrumentType: "fno", Targets: []float64{24500, 24700, 24900}})
	if err != nil {
		t.Fatalf("CreateInsight: %v", err)
	}
	d := Deps{SigningSecret: testSigningSecret, Content: store}

	// T1 hit: the old close-only flow would have ended the trade here —
	// mark-target-hit must leave it open so T2/T3 can still be recorded
	// later as the trade keeps running.
	body := `{"targetIndex":0}`
	req := httptest.NewRequest(http.MethodPost, "/admin/insights/"+insight.ID+"/mark-target-hit", strings.NewReader(body))
	req.SetPathValue("id", insight.ID)
	rec := httptest.NewRecorder()
	d.handleMarkTargetHit(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %s", rec.Code, rec.Body)
	}
	got := store.insights[insight.ID]
	if got.TradeStatus != "open" {
		t.Fatalf("TradeStatus = %q, want still open after marking a target hit", got.TradeStatus)
	}
	if got.TargetHitIndex == nil || *got.TargetHitIndex != 0 {
		t.Fatalf("TargetHitIndex = %v, want 0", got.TargetHitIndex)
	}

	// T2 hit later, same still-open trade.
	body = `{"targetIndex":1}`
	req = httptest.NewRequest(http.MethodPost, "/admin/insights/"+insight.ID+"/mark-target-hit", strings.NewReader(body))
	req.SetPathValue("id", insight.ID)
	rec = httptest.NewRecorder()
	d.handleMarkTargetHit(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %s", rec.Code, rec.Body)
	}
	got = store.insights[insight.ID]
	if got.TradeStatus != "open" {
		t.Fatalf("TradeStatus = %q, want still open after marking a second target hit", got.TradeStatus)
	}
	if got.TargetHitIndex == nil || *got.TargetHitIndex != 1 {
		t.Fatalf("TargetHitIndex = %v, want 1", got.TargetHitIndex)
	}
}

func TestHandleMarkTargetHit_TargetIndexOutOfRange(t *testing.T) {
	store := newFakeContentStore()
	insight, err := store.CreateInsight(t.Context(), db.InsightInput{InstrumentType: "fno", Targets: []float64{24500, 24700, 24900}})
	if err != nil {
		t.Fatalf("CreateInsight: %v", err)
	}
	d := Deps{SigningSecret: testSigningSecret, Content: store}

	body := `{"targetIndex":5}`
	req := httptest.NewRequest(http.MethodPost, "/admin/insights/"+insight.ID+"/mark-target-hit", strings.NewReader(body))
	req.SetPathValue("id", insight.ID)
	rec := httptest.NewRecorder()
	d.handleMarkTargetHit(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body = %s", rec.Code, rec.Body)
	}
}

func TestHandleCloseInsight_FallsBackToLastMarkedTarget(t *testing.T) {
	store := newFakeContentStore()
	insight, err := store.CreateInsight(t.Context(), db.InsightInput{InstrumentType: "fno", Targets: []float64{24500, 24700, 24900}})
	if err != nil {
		t.Fatalf("CreateInsight: %v", err)
	}
	d := Deps{SigningSecret: testSigningSecret, Content: store}

	// Mark T2 hit (index 1), trade stays open.
	body := `{"targetIndex":1}`
	req := httptest.NewRequest(http.MethodPost, "/admin/insights/"+insight.ID+"/mark-target-hit", strings.NewReader(body))
	req.SetPathValue("id", insight.ID)
	d.handleMarkTargetHit(httptest.NewRecorder(), req)

	// Close without specifying targetIndex — must finalize at T2 (the last
	// one marked), not default back to T1, so an admin who closes right
	// after marking a later target doesn't silently understate the return.
	body = `{"outcome":"target_hit"}`
	req = httptest.NewRequest(http.MethodPost, "/admin/insights/"+insight.ID+"/close", strings.NewReader(body))
	req.SetPathValue("id", insight.ID)
	rec := httptest.NewRecorder()
	d.handleCloseInsight(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %s", rec.Code, rec.Body)
	}
	got := store.insights[insight.ID]
	if got.TradeStatus != "closed" {
		t.Fatalf("TradeStatus = %q, want closed", got.TradeStatus)
	}
	if got.TargetHitIndex == nil || *got.TargetHitIndex != 1 {
		t.Fatalf("TargetHitIndex = %v, want 1 (the last-marked target)", got.TargetHitIndex)
	}
}

// --- GET /insights — customer-facing read ---

func TestHandleListInsights_Unauthorized(t *testing.T) {
	store := newFakeContentStore()
	d := Deps{SigningSecret: testSigningSecret, Content: store}

	req := httptest.NewRequest(http.MethodGet, "/insights", nil)
	rec := httptest.NewRecorder()
	d.handleListInsights(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401; body = %s", rec.Code, rec.Body)
	}
}

func TestHandleListInsights_OnlyPublished(t *testing.T) {
	store := newFakeContentStore()
	draft, _ := store.CreateInsight(t.Context(), db.InsightInput{InstrumentType: "equity", Targets: []float64{100}})
	published, _ := store.CreateInsight(t.Context(), db.InsightInput{InstrumentType: "equity", Targets: []float64{200}})
	_ = store.PublishInsight(t.Context(), published.ID, "user#analyst-1")
	d := Deps{SigningSecret: testSigningSecret, Content: store}

	req := httptest.NewRequest(http.MethodGet, "/insights", nil)
	rec := withAuthToken(t, testSigningSecret, "919876543210", "customer", req, d.handleListInsights)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %s", rec.Code, rec.Body)
	}
	var out []customerInsight
	if err := json.NewDecoder(rec.Body).Decode(&out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(out) != 1 || out[0].ID != published.ID {
		t.Fatalf("got %+v, want exactly the one published insight (draft %q must not appear)", out, draft.ID)
	}
}
