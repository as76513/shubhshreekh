package api

import (
	"context"
	"fmt"
	"time"

	"github.com/as76513/shubhshreekh/backend/internal/db"
)

// fakeContentStore is an in-memory stand-in for db.ContentStore — same
// rationale as fakeUsersStore in auth_test.go: exercises the admin/customer
// content handlers over net/http/httptest without touching real DynamoDB.
// Where production logic is a pure function (db.ResolveTargetHitIndex), the
// fake reuses it instead of reimplementing the rule.
type fakeContentStore struct {
	insights  map[string]*db.Insight
	overviews []db.Overview

	createErr        error
	listAllErr       error
	listPublishedErr error
}

func newFakeContentStore() *fakeContentStore {
	return &fakeContentStore{insights: map[string]*db.Insight{}}
}

func (f *fakeContentStore) CreateInsight(ctx context.Context, in db.InsightInput) (*db.Insight, error) {
	if f.createErr != nil {
		return nil, f.createErr
	}
	id := fmt.Sprintf("insight-%d", len(f.insights)+1)
	now := time.Now().UTC().Format(time.RFC3339)
	insight := &db.Insight{
		ID:             id,
		Status:         "draft",
		Tier:           in.Tier,
		Action:         in.Action,
		InstrumentType: in.InstrumentType,
		Stock:          in.Stock,
		Symbol:         in.Symbol,
		Timeframe:      in.Timeframe,
		EntryPriceLow:  in.EntryPriceLow,
		EntryPriceHigh: in.EntryPriceHigh,
		Targets:        in.Targets,
		StopLoss:       in.StopLoss,
		Rationale:      in.Rationale,
		TradeStatus:    "open",
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	f.insights[id] = insight
	return insight, nil
}

func (f *fakeContentStore) UpdateInsight(ctx context.Context, id string, in db.InsightInput) error {
	existing, ok := f.insights[id]
	if !ok {
		return fmt.Errorf("insight %q not found", id)
	}
	existing.Tier = in.Tier
	existing.Action = in.Action
	existing.InstrumentType = in.InstrumentType
	existing.Stock = in.Stock
	existing.Symbol = in.Symbol
	existing.Timeframe = in.Timeframe
	existing.EntryPriceLow = in.EntryPriceLow
	existing.EntryPriceHigh = in.EntryPriceHigh
	existing.Targets = in.Targets
	existing.StopLoss = in.StopLoss
	existing.Rationale = in.Rationale
	return nil
}

func (f *fakeContentStore) PublishInsight(ctx context.Context, id, publishedBy string) error {
	existing, ok := f.insights[id]
	if !ok {
		return fmt.Errorf("insight %q not found", id)
	}
	existing.Status = "published"
	existing.PublishedBy = publishedBy
	existing.PublishedAt = time.Now().UTC().Format(time.RFC3339)
	return nil
}

func (f *fakeContentStore) ArchiveInsight(ctx context.Context, id string) error {
	existing, ok := f.insights[id]
	if !ok {
		return fmt.Errorf("insight %q not found", id)
	}
	existing.Status = "archived"
	return nil
}

// CloseInsight mirrors db.ContentTable.CloseInsight's bounds-check and
// fallback-to-last-marked-target behavior, calling the same exported pure
// function (db.ResolveTargetHitIndex) production uses, rather than
// reimplementing the rule.
func (f *fakeContentStore) CloseInsight(ctx context.Context, id, outcome string, targetIndex *int) error {
	existing, ok := f.insights[id]
	if !ok {
		return fmt.Errorf("insight %q not found", id)
	}
	// Validate before mutating anything — matches db.ContentTable.CloseInsight,
	// which only builds its DynamoDB UpdateItem after this check passes, so
	// an out-of-range index never leaves the trade half-closed either way.
	var idx *int
	if outcome == "target_hit" {
		effectiveIndex := targetIndex
		if effectiveIndex == nil {
			effectiveIndex = existing.TargetHitIndex
		}
		resolved, err := db.ResolveTargetHitIndex(existing.Targets, effectiveIndex)
		if err != nil {
			return err
		}
		idx = &resolved
	}
	existing.TradeStatus = "closed"
	existing.Outcome = outcome
	existing.ClosedAt = time.Now().UTC().Format(time.RFC3339)
	existing.TargetHitIndex = idx
	return nil
}

// MarkTargetHit mirrors db.ContentTable.MarkTargetHit — records progress
// without touching TradeStatus/Outcome/ClosedAt.
func (f *fakeContentStore) MarkTargetHit(ctx context.Context, id string, targetIndex *int) error {
	existing, ok := f.insights[id]
	if !ok {
		return fmt.Errorf("insight %q not found", id)
	}
	idx, err := db.ResolveTargetHitIndex(existing.Targets, targetIndex)
	if err != nil {
		return err
	}
	existing.TargetHitIndex = &idx
	return nil
}

func (f *fakeContentStore) GetInsight(ctx context.Context, id string) (*db.Insight, error) {
	return f.insights[id], nil
}

func (f *fakeContentStore) ListAll(ctx context.Context) ([]db.Insight, error) {
	if f.listAllErr != nil {
		return nil, f.listAllErr
	}
	out := make([]db.Insight, 0, len(f.insights))
	for _, in := range f.insights {
		out = append(out, *in)
	}
	return out, nil
}

func (f *fakeContentStore) ListPublished(ctx context.Context) ([]db.Insight, error) {
	if f.listPublishedErr != nil {
		return nil, f.listPublishedErr
	}
	out := make([]db.Insight, 0, len(f.insights))
	for _, in := range f.insights {
		if in.Status == "published" {
			out = append(out, *in)
		}
	}
	return out, nil
}

func (f *fakeContentStore) CreateOverview(ctx context.Context, text string, photoURLs []string, publishedBy string) (*db.Overview, error) {
	ov := db.Overview{
		ID:          fmt.Sprintf("overview-%d", len(f.overviews)+1),
		Text:        text,
		PhotoURLs:   photoURLs,
		PublishedAt: time.Now().UTC().Format(time.RFC3339),
		PublishedBy: publishedBy,
	}
	// Newest-first, matching db.ContentTable.ListOverviews' GSI1 query order.
	f.overviews = append([]db.Overview{ov}, f.overviews...)
	return &ov, nil
}

func (f *fakeContentStore) ListOverviews(ctx context.Context) ([]db.Overview, error) {
	return f.overviews, nil
}

// fakeSettingsStore is an in-memory stand-in for db.SettingsStore.
type fakeSettingsStore struct {
	discountPercent float64
	weeklyPDF       db.WeeklyPDF
	setDiscountErr  error
	setWeeklyPDFErr error
}

func newFakeSettingsStore() *fakeSettingsStore {
	return &fakeSettingsStore{discountPercent: db.DefaultDiscountPercent}
}

func (f *fakeSettingsStore) GetPricing(ctx context.Context) (*db.PricingSettings, error) {
	return &db.PricingSettings{DiscountPercent: f.discountPercent}, nil
}

func (f *fakeSettingsStore) SetDiscountPercent(ctx context.Context, pct float64, updatedBy string) error {
	if f.setDiscountErr != nil {
		return f.setDiscountErr
	}
	f.discountPercent = pct
	return nil
}

func (f *fakeSettingsStore) GetWeeklyPDF(ctx context.Context) (*db.WeeklyPDF, error) {
	return &f.weeklyPDF, nil
}

func (f *fakeSettingsStore) SetWeeklyPDF(ctx context.Context, title, summary, pdfURL, updatedBy string) error {
	if f.setWeeklyPDFErr != nil {
		return f.setWeeklyPDFErr
	}
	f.weeklyPDF = db.WeeklyPDF{Title: title, Summary: summary, PdfURL: pdfURL, UpdatedBy: updatedBy}
	return nil
}
