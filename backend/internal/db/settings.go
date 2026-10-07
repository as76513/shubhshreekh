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
