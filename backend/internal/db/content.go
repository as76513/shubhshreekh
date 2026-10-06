// Package db's content.go implements architecture.md's "RA content
// platform (Pipe B)" single-table design for the Oct 18 sprint's thin
// insights CMS — insight rows only (MF/courses/videos deferred, see
// TECH_DEBT.md TD-020).
package db

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/google/uuid"
)

// gsi1IndexName must match the GSI defined in infra/backend/dynamodb.tf.
const gsi1IndexName = "gsi1"

// Insight is one row of architecture.md's INSIGHT#<id>/META example.
// Status is the publish-workflow state (draft/published/archived) — not to
// be confused with the old data.ts mock's "Active"/"Achieved" trade status,
// which has no equivalent here: an insight that's no longer live is simply
// archived (dropped from GET /insights), see architecture.md's publish
// workflow diagram.
type Insight struct {
	// Internal DynamoDB keys — never serialized to JSON; handlers that
	// return an Insight directly (e.g. handleCreateInsight) shouldn't leak
	// the table's key structure to the admin UI.
	PK     string `dynamodbav:"pk" json:"-"`
	SK     string `dynamodbav:"sk" json:"-"`
	GSI1PK string `dynamodbav:"gsi1pk,omitempty" json:"-"`
	GSI1SK string `dynamodbav:"gsi1sk,omitempty" json:"-"`

	ID             string    `dynamodbav:"id" json:"id"`
	Status         string    `dynamodbav:"status" json:"status"`                 // draft | published | archived
	Tier           string    `dynamodbav:"tier" json:"tier"`                     // free | pro
	Action         string    `dynamodbav:"action" json:"action"`                 // BUY | SELL
	InstrumentType string    `dynamodbav:"instrumentType" json:"instrumentType"` // equity | fno
	Stock          string    `dynamodbav:"stock" json:"stock"`
	Symbol         string    `dynamodbav:"symbol" json:"symbol"`
	Category       string    `dynamodbav:"category" json:"category"`
	Timeframe      string    `dynamodbav:"timeframe" json:"timeframe"`
	EntryPrice     float64   `dynamodbav:"entryPrice" json:"entryPrice"` // was "CMP" — renamed 2026-10-06 (TD-052), RA's term is "price to enter at"
	Targets        []float64 `dynamodbav:"targets" json:"targets"`      // 1 for equity, 1-3 for F&O (scaled booking levels)
	StopLoss       float64   `dynamodbav:"stopLoss" json:"stopLoss"`
	ReturnsPct     float64   `dynamodbav:"returnsPct" json:"returnsPct"`
	Rationale      string    `dynamodbav:"rationale" json:"rationale"`
	PublishedAt    string    `dynamodbav:"publishedAt,omitempty" json:"publishedAt,omitempty"`
	PublishedBy    string    `dynamodbav:"publishedBy,omitempty" json:"publishedBy,omitempty"`
	CreatedAt      string    `dynamodbav:"createdAt" json:"createdAt"`
	UpdatedAt      string    `dynamodbav:"updatedAt" json:"updatedAt"`

	// TradeStatus/Outcome/ClosedAt (TD-053, added 2026-10-06): the RA closes
	// a trade by hand — there's no live price feed to detect a target/SL
	// hit automatically (see architecture.md's deferred Pipe A). ClosedAt is
	// separate from UpdatedAt so "when did this actually resolve" survives
	// any later unrelated edit.
	TradeStatus string `dynamodbav:"tradeStatus" json:"tradeStatus"`       // open | closed
	Outcome     string `dynamodbav:"outcome,omitempty" json:"outcome,omitempty"` // "" | target_hit | sl_hit
	ClosedAt    string `dynamodbav:"closedAt,omitempty" json:"closedAt,omitempty"`

	// LegacyTarget/LegacyCMP read rows written before Targets/EntryPrice
	// existed — never set on write. See backfillLegacy below; drop once all
	// dev data has been re-saved through the current admin form.
	LegacyTarget float64 `dynamodbav:"target,omitempty" json:"-"`
	LegacyCMP    float64 `dynamodbav:"cmp,omitempty" json:"-"`
}

// backfillLegacy upgrades a row read from before this change (single
// "target"/"cmp" attributes, no "targets"/"entryPrice"/"tradeStatus") in
// place so old published insights keep rendering instead of silently
// losing data. Safe to call on every read; a no-op once the row has been
// re-saved via the admin form.
func backfillLegacy(i *Insight) {
	if len(i.Targets) == 0 && i.LegacyTarget != 0 {
		i.Targets = []float64{i.LegacyTarget}
	}
	if i.EntryPrice == 0 && i.LegacyCMP != 0 {
		i.EntryPrice = i.LegacyCMP
	}
	if i.InstrumentType == "" {
		i.InstrumentType = "equity"
	}
	if i.TradeStatus == "" {
		i.TradeStatus = "open"
	}
}

type ContentTable struct {
	client *dynamodb.Client
	name   string
}

func NewContentTable(client *dynamodb.Client, tableName string) *ContentTable {
	return &ContentTable{client: client, name: tableName}
}

type InsightInput struct {
	Tier           string
	Action         string
	InstrumentType string // equity | fno
	Stock          string
	Symbol         string
	Category       string
	Timeframe      string
	EntryPrice     float64
	Targets        []float64 // 1 for equity, 1-3 for F&O
	StopLoss       float64
	Rationale      string
}

// primaryTarget is the nearest/first booking level — used for the
// returnsPct headline figure regardless of how many targets a F&O call
// carries (architecture.md's returnsPct is a single number, not a list).
func primaryTarget(targets []float64) float64 {
	if len(targets) == 0 {
		return 0
	}
	return targets[0]
}

// CreateInsight writes a new draft — no GSI1 keys yet, so it's invisible to
// ListPublished (and therefore to GET /insights) until Publish is called.
func (t *ContentTable) CreateInsight(ctx context.Context, in InsightInput) (*Insight, error) {
	now := time.Now().UTC().Format(time.RFC3339)
	id := uuid.NewString()
	insight := Insight{
		PK:             "INSIGHT#" + id,
		SK:             "META",
		ID:             id,
		Status:         "draft",
		Tier:           in.Tier,
		Action:         in.Action,
		InstrumentType: in.InstrumentType,
		Stock:          in.Stock,
		Symbol:         in.Symbol,
		Category:       in.Category,
		Timeframe:      in.Timeframe,
		EntryPrice:     in.EntryPrice,
		Targets:        in.Targets,
		StopLoss:       in.StopLoss,
		ReturnsPct:     computeReturnsPct(in.Action, in.EntryPrice, primaryTarget(in.Targets)),
		Rationale:      in.Rationale,
		TradeStatus:    "open",
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	item, err := attributevalue.MarshalMap(insight)
	if err != nil {
		return nil, err
	}
	if _, err := t.client.PutItem(ctx, &dynamodb.PutItemInput{TableName: &t.name, Item: item}); err != nil {
		return nil, err
	}
	return &insight, nil
}

// UpdateInsight edits a draft's fields — it never touches status/GSI1 keys;
// Publish/Archive are the only paths that change whether an insight is
// visible to customers.
func (t *ContentTable) UpdateInsight(ctx context.Context, id string, in InsightInput) error {
	targetAVs := make([]types.AttributeValue, len(in.Targets))
	for i, target := range in.Targets {
		targetAVs[i] = &types.AttributeValueMemberN{Value: formatFloat(target)}
	}
	set := map[string]types.AttributeValue{
		"tier":           &types.AttributeValueMemberS{Value: in.Tier},
		"action":         &types.AttributeValueMemberS{Value: in.Action},
		"instrumentType": &types.AttributeValueMemberS{Value: in.InstrumentType},
		"stock":          &types.AttributeValueMemberS{Value: in.Stock},
		"symbol":         &types.AttributeValueMemberS{Value: in.Symbol},
		"category":       &types.AttributeValueMemberS{Value: in.Category},
		"timeframe":      &types.AttributeValueMemberS{Value: in.Timeframe},
		"entryPrice":     &types.AttributeValueMemberN{Value: formatFloat(in.EntryPrice)},
		"targets":        &types.AttributeValueMemberL{Value: targetAVs},
		"stopLoss":       &types.AttributeValueMemberN{Value: formatFloat(in.StopLoss)},
		"returnsPct":     &types.AttributeValueMemberN{Value: formatFloat(computeReturnsPct(in.Action, in.EntryPrice, primaryTarget(in.Targets)))},
		"rationale":      &types.AttributeValueMemberS{Value: in.Rationale},
		"updatedAt":      &types.AttributeValueMemberS{Value: time.Now().UTC().Format(time.RFC3339)},
	}
	// Drop the pre-migration singular attributes once a row is re-saved
	// through the current form, so they don't linger alongside the renamed ones.
	return t.updateItem(ctx, id, set, []string{"target", "cmp"})
}

// CloseInsight marks a trade resolved — the RA does this by hand (TD-053),
// since there's no live price feed to detect a target/SL hit automatically.
// Leaves Status/GSI1 untouched: a closed trade can still be "published" and
// visible, just no longer "open".
func (t *ContentTable) CloseInsight(ctx context.Context, id, outcome string) error {
	now := time.Now().UTC().Format(time.RFC3339)
	set := map[string]types.AttributeValue{
		"tradeStatus": &types.AttributeValueMemberS{Value: "closed"},
		"outcome":     &types.AttributeValueMemberS{Value: outcome},
		"closedAt":    &types.AttributeValueMemberS{Value: now},
		"updatedAt":   &types.AttributeValueMemberS{Value: now},
	}
	return t.updateItem(ctx, id, set, nil)
}

// PublishInsight sets status=published and writes the GSI1 keys that make
// it appear in ListPublished / GET /insights — architecture.md: "Only rows
// with status: published get GSI1 keys written."
func (t *ContentTable) PublishInsight(ctx context.Context, id, publishedBy string) error {
	publishedAt := time.Now().UTC().Format(time.RFC3339)
	set := map[string]types.AttributeValue{
		"status":      &types.AttributeValueMemberS{Value: "published"},
		"gsi1pk":      &types.AttributeValueMemberS{Value: "TYPE#insight"},
		"gsi1sk":      &types.AttributeValueMemberS{Value: "PUBLISHED#" + publishedAt},
		"publishedAt": &types.AttributeValueMemberS{Value: publishedAt},
		"publishedBy": &types.AttributeValueMemberS{Value: publishedBy},
		"updatedAt":   &types.AttributeValueMemberS{Value: publishedAt},
	}
	return t.updateItem(ctx, id, set, nil)
}

// ArchiveInsight removes the GSI1 keys — architecture.md's admin route
// table: "Remove from customer feeds." The row itself is kept (status
// becomes "archived") rather than deleted, preserving the SEBI audit trail
// of what was ever published.
func (t *ContentTable) ArchiveInsight(ctx context.Context, id string) error {
	set := map[string]types.AttributeValue{
		"status":    &types.AttributeValueMemberS{Value: "archived"},
		"updatedAt": &types.AttributeValueMemberS{Value: time.Now().UTC().Format(time.RFC3339)},
	}
	return t.updateItem(ctx, id, set, []string{"gsi1pk", "gsi1sk"})
}

func (t *ContentTable) GetInsight(ctx context.Context, id string) (*Insight, error) {
	key, err := attributevalue.MarshalMap(map[string]string{"pk": "INSIGHT#" + id, "sk": "META"})
	if err != nil {
		return nil, err
	}
	out, err := t.client.GetItem(ctx, &dynamodb.GetItemInput{TableName: &t.name, Key: key})
	if err != nil {
		return nil, err
	}
	if out.Item == nil {
		return nil, nil
	}
	var insight Insight
	if err := attributevalue.UnmarshalMap(out.Item, &insight); err != nil {
		return nil, err
	}
	backfillLegacy(&insight)
	return &insight, nil
}

// ListPublished returns published insights newest-first via GSI1 — the
// query customer-facing GET /insights runs. Archived/draft rows have no
// GSI1 keys, so they can never appear here regardless of what Scan-based
// admin listing (ListAll) shows.
func (t *ContentTable) ListPublished(ctx context.Context) ([]Insight, error) {
	keyCond := "gsi1pk = :pk"
	out, err := t.client.Query(ctx, &dynamodb.QueryInput{
		TableName:              &t.name,
		IndexName:              aws.String(gsi1IndexName),
		KeyConditionExpression: &keyCond,
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":pk": &types.AttributeValueMemberS{Value: "TYPE#insight"},
		},
		ScanIndexForward: aws.Bool(false), // gsi1sk is PUBLISHED#<iso8601> — newest first
	})
	if err != nil {
		return nil, err
	}
	var insights []Insight
	if err := attributevalue.UnmarshalListOfMaps(out.Items, &insights); err != nil {
		return nil, err
	}
	for i := range insights {
		backfillLegacy(&insights[i])
	}
	return insights, nil
}

// ListAll is a full-table Scan for the admin UI (drafts + published +
// archived, so an analyst can find and re-publish/archive anything). Fine
// at this table's current size/write volume; revisit (a type attribute +
// its own GSI) once MF/courses/videos rows share this table — see
// architecture.md's single-table design.
func (t *ContentTable) ListAll(ctx context.Context) ([]Insight, error) {
	out, err := t.client.Scan(ctx, &dynamodb.ScanInput{TableName: &t.name})
	if err != nil {
		return nil, err
	}
	var insights []Insight
	if err := attributevalue.UnmarshalListOfMaps(out.Items, &insights); err != nil {
		return nil, err
	}
	for i := range insights {
		backfillLegacy(&insights[i])
	}
	return insights, nil
}

func (t *ContentTable) updateItem(ctx context.Context, id string, set map[string]types.AttributeValue, remove []string) error {
	key, err := attributevalue.MarshalMap(map[string]string{"pk": "INSIGHT#" + id, "sk": "META"})
	if err != nil {
		return err
	}

	names := map[string]string{}
	values := map[string]types.AttributeValue{}
	var setClauses, removeClauses []string

	i := 0
	for attr, val := range set {
		nameKey, valKey := fmt.Sprintf("#n%d", i), fmt.Sprintf(":v%d", i)
		names[nameKey] = attr
		values[valKey] = val
		setClauses = append(setClauses, fmt.Sprintf("%s = %s", nameKey, valKey))
		i++
	}
	for _, attr := range remove {
		nameKey := fmt.Sprintf("#n%d", i)
		names[nameKey] = attr
		removeClauses = append(removeClauses, nameKey)
		i++
	}

	expr := ""
	if len(setClauses) > 0 {
		expr += "SET " + strings.Join(setClauses, ", ") + " "
	}
	if len(removeClauses) > 0 {
		expr += "REMOVE " + strings.Join(removeClauses, ", ")
	}

	input := &dynamodb.UpdateItemInput{
		TableName:                &t.name,
		Key:                      key,
		UpdateExpression:         aws.String(strings.TrimSpace(expr)),
		ExpressionAttributeNames: names,
		ConditionExpression:      aws.String("attribute_exists(pk)"),
	}
	if len(values) > 0 {
		input.ExpressionAttributeValues = values
	}
	_, err = t.client.UpdateItem(ctx, input)
	if err != nil {
		var condFailed *types.ConditionalCheckFailedException
		if errors.As(err, &condFailed) {
			return fmt.Errorf("insight %q not found", id)
		}
		return err
	}
	return nil
}

func computeReturnsPct(action string, entryPrice, target float64) float64 {
	if entryPrice == 0 {
		return 0
	}
	pct := (target - entryPrice) / entryPrice * 100
	if action == "SELL" {
		pct = -pct
	}
	return math.Round(pct*10) / 10
}

func formatFloat(f float64) string {
	return strconv.FormatFloat(f, 'f', -1, 64)
}
