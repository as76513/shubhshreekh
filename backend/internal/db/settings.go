package db

import (
	"context"
	"time"

	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
)

// pricingSettingsKey is the single row this table holds for now — a
// singleton, not a real multi-item table. If other admin-configurable
// settings show up later, give them their own key under the same table
// rather than a new table per setting.
const pricingSettingsKey = "pricing"

// DefaultDiscountPercent is used until an admin ever saves a value — see
// TECH_DEBT.md TD-055. 50% at launch per the 2026-10-06 stakeholder round.
const DefaultDiscountPercent = 50.0

type PricingSettings struct {
	Key             string  `dynamodbav:"settingKey" json:"-"`
	DiscountPercent float64 `dynamodbav:"discountPercent" json:"discountPercent"`
	UpdatedAt       string  `dynamodbav:"updatedAt,omitempty" json:"updatedAt,omitempty"`
	UpdatedBy       string  `dynamodbav:"updatedBy,omitempty" json:"updatedBy,omitempty"`
}

// SettingsStore is what backend/internal/api's handlers depend on for the
// admin-configurable settings (pricing discount, weekly PDF) — *SettingsTable
// satisfies it for production; tests inject an in-memory fake instead, same
// pattern as db.UsersStore/db.ContentStore.
type SettingsStore interface {
	GetPricing(ctx context.Context) (*PricingSettings, error)
	SetDiscountPercent(ctx context.Context, pct float64, updatedBy string) error
	GetWeeklyPDF(ctx context.Context) (*WeeklyPDF, error)
	SetWeeklyPDF(ctx context.Context, title, summary, pdfURL, updatedBy string) error
	GetSiteStats(ctx context.Context) (*SiteStats, error)
	SetSiteStats(ctx context.Context, stats SiteStats, updatedBy string) error
	GetTestimonials(ctx context.Context) ([]Testimonial, error)
	SetTestimonials(ctx context.Context, testimonials []Testimonial, updatedBy string) error
}

type SettingsTable struct {
	client *dynamodb.Client
	name   string
}

func NewSettingsTable(client *dynamodb.Client, tableName string) *SettingsTable {
	return &SettingsTable{client: client, name: tableName}
}

// GetPricing returns the stored discount, or DefaultDiscountPercent if no
// admin has ever saved one yet — so the pricing page always has a sane
// value to show, not an error, before the settings row exists.
func (t *SettingsTable) GetPricing(ctx context.Context) (*PricingSettings, error) {
	key, err := attributevalue.MarshalMap(map[string]string{"settingKey": pricingSettingsKey})
	if err != nil {
		return nil, err
	}
	out, err := t.client.GetItem(ctx, &dynamodb.GetItemInput{TableName: &t.name, Key: key})
	if err != nil {
		return nil, err
	}
	if out.Item == nil {
		return &PricingSettings{Key: pricingSettingsKey, DiscountPercent: DefaultDiscountPercent}, nil
	}
	var settings PricingSettings
	if err := attributevalue.UnmarshalMap(out.Item, &settings); err != nil {
		return nil, err
	}
	return &settings, nil
}

// SetDiscountPercent overwrites the single pricing row — admin-only, see
// router.go's requireRole wrapping on PATCH /admin/pricing.
func (t *SettingsTable) SetDiscountPercent(ctx context.Context, pct float64, updatedBy string) error {
	settings := PricingSettings{
		Key:             pricingSettingsKey,
		DiscountPercent: pct,
		UpdatedAt:       time.Now().UTC().Format(time.RFC3339),
		UpdatedBy:       updatedBy,
	}
	item, err := attributevalue.MarshalMap(settings)
	if err != nil {
		return err
	}
	_, err = t.client.PutItem(ctx, &dynamodb.PutItemInput{TableName: &t.name, Item: item})
	return err
}

// weeklyPDFSettingsKey (TD-058) is this table's second singleton row — the
// Dashboard's "Today's Update" card reads whichever PDF was most recently
// uploaded here instead of the old static file in public/assets.
const weeklyPDFSettingsKey = "weekly_pdf"

type WeeklyPDF struct {
	Key       string `dynamodbav:"settingKey" json:"-"`
	Title     string `dynamodbav:"title" json:"title"`
	Summary   string `dynamodbav:"summary" json:"summary"`
	PdfURL    string `dynamodbav:"pdfUrl" json:"pdfUrl"`
	UpdatedAt string `dynamodbav:"updatedAt,omitempty" json:"updatedAt,omitempty"`
	UpdatedBy string `dynamodbav:"updatedBy,omitempty" json:"updatedBy,omitempty"`
}

// GetWeeklyPDF returns a zero-value (empty PdfURL) if no admin has
// uploaded one yet — the frontend card falls back to a "coming soon"
// state rather than erroring.
func (t *SettingsTable) GetWeeklyPDF(ctx context.Context) (*WeeklyPDF, error) {
	key, err := attributevalue.MarshalMap(map[string]string{"settingKey": weeklyPDFSettingsKey})
	if err != nil {
		return nil, err
	}
	out, err := t.client.GetItem(ctx, &dynamodb.GetItemInput{TableName: &t.name, Key: key})
	if err != nil {
		return nil, err
	}
	if out.Item == nil {
		return &WeeklyPDF{Key: weeklyPDFSettingsKey}, nil
	}
	var pdf WeeklyPDF
	if err := attributevalue.UnmarshalMap(out.Item, &pdf); err != nil {
		return nil, err
	}
	return &pdf, nil
}

// SetWeeklyPDF overwrites the single weekly-PDF row — admin-only, see
// router.go's requireRole wrapping on PATCH /admin/weekly-pdf.
func (t *SettingsTable) SetWeeklyPDF(ctx context.Context, title, summary, pdfURL, updatedBy string) error {
	pdf := WeeklyPDF{
		Key:       weeklyPDFSettingsKey,
		Title:     title,
		Summary:   summary,
		PdfURL:    pdfURL,
		UpdatedAt: time.Now().UTC().Format(time.RFC3339),
		UpdatedBy: updatedBy,
	}
	item, err := attributevalue.MarshalMap(pdf)
	if err != nil {
		return err
	}
	_, err = t.client.PutItem(ctx, &dynamodb.PutItemInput{TableName: &t.name, Item: item})
	return err
}

// siteStatsSettingsKey (2026-10-12, RA feedback) is this table's third
// singleton row — the landing page's "Achievement strip" (50,000+
// Learners, etc.) used to be hardcoded in Landing.tsx; now it's editable
// from /admin with no deploy, same pattern as the pricing discount.
const siteStatsSettingsKey = "site_stats"

type SiteStats struct {
	Key         string `dynamodbav:"settingKey" json:"-"`
	Learners    string `dynamodbav:"learners" json:"learners"`
	IdeasShared string `dynamodbav:"ideasShared" json:"ideasShared"`
	Courses     string `dynamodbav:"courses" json:"courses"`
	AvgRating   string `dynamodbav:"avgRating" json:"avgRating"`
	UpdatedAt   string `dynamodbav:"updatedAt,omitempty" json:"updatedAt,omitempty"`
	UpdatedBy   string `dynamodbav:"updatedBy,omitempty" json:"updatedBy,omitempty"`
}

// DefaultSiteStats matches what was hardcoded in Landing.tsx before this
// change, so nothing on the live site visually changes until an admin
// actually edits these for the first time.
var DefaultSiteStats = SiteStats{
	Learners:    "50,000+",
	IdeasShared: "2,400+",
	Courses:     "45+",
	AvgRating:   "4.8★",
}

// GetSiteStats returns DefaultSiteStats if no admin has ever saved yet.
func (t *SettingsTable) GetSiteStats(ctx context.Context) (*SiteStats, error) {
	key, err := attributevalue.MarshalMap(map[string]string{"settingKey": siteStatsSettingsKey})
	if err != nil {
		return nil, err
	}
	out, err := t.client.GetItem(ctx, &dynamodb.GetItemInput{TableName: &t.name, Key: key})
	if err != nil {
		return nil, err
	}
	if out.Item == nil {
		stats := DefaultSiteStats
		return &stats, nil
	}
	var stats SiteStats
	if err := attributevalue.UnmarshalMap(out.Item, &stats); err != nil {
		return nil, err
	}
	return &stats, nil
}

// SetSiteStats overwrites the single site-stats row — admin-only, see
// router.go's requireRole wrapping on PATCH /admin/site-stats.
func (t *SettingsTable) SetSiteStats(ctx context.Context, stats SiteStats, updatedBy string) error {
	stats.Key = siteStatsSettingsKey
	stats.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	stats.UpdatedBy = updatedBy
	item, err := attributevalue.MarshalMap(stats)
	if err != nil {
		return err
	}
	_, err = t.client.PutItem(ctx, &dynamodb.PutItemInput{TableName: &t.name, Item: item})
	return err
}

// testimonialsSettingsKey (2026-10-12) — the "What investors say" cards on
// the landing page used to be a hardcoded array in data.ts; now editable
// from /admin. Kept as one singleton row holding the whole list (not one
// DynamoDB item per testimonial) since this is a short, admin-curated list
// replaced wholesale on each edit, not something needing per-item
// create/read-one/delete API shape.
const testimonialsSettingsKey = "testimonials"

// Testimonial has no Color field unlike the original data.ts mock — it was
// never actually read by Landing.tsx's rendering (checked: the avatar tint
// is a fixed gold color regardless), so it's dropped rather than carried
// forward as a dead admin-form field. Initials is derived server-side from
// Name (see insights-adjacent helper in the api package), not admin-typed.
type Testimonial struct {
	Name     string `dynamodbav:"name" json:"name"`
	City     string `dynamodbav:"city" json:"city"`
	Text     string `dynamodbav:"text" json:"text"`
	Returns  string `dynamodbav:"returns" json:"returns"`
	Initials string `dynamodbav:"initials" json:"initials"`
}

type testimonialsSettings struct {
	Key          string        `dynamodbav:"settingKey" json:"-"`
	Testimonials []Testimonial `dynamodbav:"testimonials" json:"testimonials"`
	UpdatedAt    string        `dynamodbav:"updatedAt,omitempty" json:"updatedAt,omitempty"`
	UpdatedBy    string        `dynamodbav:"updatedBy,omitempty" json:"updatedBy,omitempty"`
}

// DefaultTestimonials matches what was hardcoded in data.ts before this
// change, so nothing visually changes until an admin actually edits these.
var DefaultTestimonials = []Testimonial{
	{Name: "Arjun Patel", City: "Mumbai", Text: "The market insights are clearly explained. The course structure helped me study setups with more confidence.", Returns: "+70%", Initials: "AP"},
	{Name: "Meera Krishnan", City: "Chennai", Text: "The research notes have completely transformed my portfolio. I now know exactly when to invest and when to wait. Absolutely worth every rupee.", Returns: "+32%", Initials: "MK"},
	{Name: "Rohit Agarwal", City: "Delhi", Text: "Priya's Technical Analysis Masterclass is better than any paid course I've taken elsewhere. The content quality is exceptional.", Returns: "+48%", Initials: "RA"},
	{Name: "Nisha Verma", City: "Bangalore", Text: "Started as a complete beginner. Within 3 months of using Shubhshree, I can read Indian market charts with much more clarity.", Returns: "+25%", Initials: "NV"},
}

// GetTestimonials returns DefaultTestimonials if no admin has ever saved yet.
func (t *SettingsTable) GetTestimonials(ctx context.Context) ([]Testimonial, error) {
	key, err := attributevalue.MarshalMap(map[string]string{"settingKey": testimonialsSettingsKey})
	if err != nil {
		return nil, err
	}
	out, err := t.client.GetItem(ctx, &dynamodb.GetItemInput{TableName: &t.name, Key: key})
	if err != nil {
		return nil, err
	}
	if out.Item == nil {
		return DefaultTestimonials, nil
	}
	var settings testimonialsSettings
	if err := attributevalue.UnmarshalMap(out.Item, &settings); err != nil {
		return nil, err
	}
	return settings.Testimonials, nil
}

// SetTestimonials overwrites the whole list — admin-only, see router.go's
// requireRole wrapping on PATCH /admin/testimonials. Always the full
// replacement list, not a merge/append — the admin UI sends back whatever
// it currently has after an add/delete.
func (t *SettingsTable) SetTestimonials(ctx context.Context, testimonials []Testimonial, updatedBy string) error {
	settings := testimonialsSettings{
		Key:          testimonialsSettingsKey,
		Testimonials: testimonials,
		UpdatedAt:    time.Now().UTC().Format(time.RFC3339),
		UpdatedBy:    updatedBy,
	}
	item, err := attributevalue.MarshalMap(settings)
	if err != nil {
		return err
	}
	_, err = t.client.PutItem(ctx, &dynamodb.PutItemInput{TableName: &t.name, Item: item})
	return err
}
