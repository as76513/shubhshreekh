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

	ID             string `dynamodbav:"id" json:"id"`
	Status         string `dynamodbav:"status" json:"status"`                 // draft | published | archived
	Tier           string `dynamodbav:"tier" json:"tier"`                     // free | pro
	Action         string `dynamodbav:"action" json:"action"`                 // BUY | SELL
	InstrumentType string `dynamodbav:"instrumentType" json:"instrumentType"` // equity | fno
	Stock          string `dynamodbav:"stock" json:"stock"`
	Symbol         string `dynamodbav:"symbol" json:"symbol"`
	// Timeframe only applies to equity (e.g. "Short Term") — F&O calls are
	// intraday by nature (never held past same day), so the RA isn't asked
	// for one and it's force-cleared server-side for fno regardless of
	// what's sent (see insights.go's toInput). Category (Large Cap/Mid Cap/
	// etc.) was dropped entirely 2026-10-10 per RA feedback — removed, not
	// just hidden, so there's no dead field lingering in new rows.
	Timeframe      string    `dynamodbav:"timeframe,omitempty" json:"timeframe,omitempty"`
	EntryPriceLow  float64   `dynamodbav:"entryPriceLow" json:"entryPriceLow"`
	EntryPriceHigh float64   `dynamodbav:"entryPriceHigh" json:"entryPriceHigh"`
	Targets        []float64 `dynamodbav:"targets" json:"targets"` // 1 for equity, 1-3 for F&O (scaled booking levels)
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
	TradeStatus string `dynamodbav:"tradeStatus" json:"tradeStatus"`             // open | closed
	Outcome     string `dynamodbav:"outcome,omitempty" json:"outcome,omitempty"` // "" | target_hit | sl_hit
	ClosedAt    string `dynamodbav:"closedAt,omitempty" json:"closedAt,omitempty"`

	// TargetHitIndex (added 2026-10-07): which element of Targets was
	// actually hit, for a target_hit close on a F&O call with more than one
	// booking level — a RA closing a 3-target call might see T1, T2, or T3
	// hit, not always the first. Pointer so index 0 (T1) is distinguishable
	// from "not set"; only meaningful when Outcome == "target_hit". nil for
	// sl_hit closes and for every still-open row.
	TargetHitIndex *int `dynamodbav:"targetHitIndex,omitempty" json:"targetHitIndex,omitempty"`

	// LegacyTarget/LegacyCMP/LegacyEntryPrice read rows written before
	// Targets/EntryPriceLow+High existed — never set on write. See
	// backfillLegacy below; drop once all dev data has been re-saved
	// through the current admin form.
	LegacyTarget     float64 `dynamodbav:"target,omitempty" json:"-"`
	LegacyCMP        float64 `dynamodbav:"cmp,omitempty" json:"-"`
	LegacyEntryPrice float64 `dynamodbav:"entryPrice,omitempty" json:"-"` // single-value field, pre-2026-10-10 range migration
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
	// A nil Targets marshals to JSON `null`, not `[]` — found 2026-10-10 via
	// a real crash: the admin UI unconditionally calls `.targets.join(...)`
	// and `.map(...)` on every row, so a malformed row with neither a
	// targets list nor a legacy single target (nothing for the branch
	// above to backfill) took down the whole admin list render, not just
	// its own row. Every row leaving this function must have a real
	// (possibly empty) array, never null.
	if i.Targets == nil {
		i.Targets = []float64{}
	}
	if i.EntryPriceLow == 0 && i.EntryPriceHigh == 0 {
		legacySingle := i.LegacyEntryPrice
		if legacySingle == 0 {
			legacySingle = i.LegacyCMP
		}
		if legacySingle != 0 {
			i.EntryPriceLow = legacySingle
			i.EntryPriceHigh = legacySingle
		}
	}
	if i.InstrumentType == "" {
		i.InstrumentType = "equity"
	}
	if i.TradeStatus == "" {
		i.TradeStatus = "open"
	}
}

// ContentStore is what backend/internal/api's handlers depend on for the RA
// content platform (insights + daily overview) — *ContentTable satisfies it
// for production (DynamoDB-backed); tests inject an in-memory fake instead
// so the admin/customer content handlers are testable without real AWS
// access, the same pattern as db.UsersStore (see users.go).
type ContentStore interface {
	CreateInsight(ctx context.Context, in InsightInput) (*Insight, error)
	UpdateInsight(ctx context.Context, id string, in InsightInput) error
	PublishInsight(ctx context.Context, id, publishedBy string) error
	ArchiveInsight(ctx context.Context, id string) error
	CloseInsight(ctx context.Context, id, outcome string, targetIndex *int) error
	MarkTargetHit(ctx context.Context, id string, targetIndex *int) error
	GetInsight(ctx context.Context, id string) (*Insight, error)
	ListAll(ctx context.Context) ([]Insight, error)
	ListPublished(ctx context.Context) ([]Insight, error)
	CreateOverview(ctx context.Context, text string, photoURLs []string, publishedBy string) (*Overview, error)
	ListOverviews(ctx context.Context) ([]Overview, error)
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
	Timeframe      string // equity only — force-cleared for fno, see insights.go's toInput
	EntryPriceLow  float64
	EntryPriceHigh float64
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

// entryMidpoint is the single representative price used for the
// returnsPct headline figure now that entry is a low-high range rather
// than one value.
func entryMidpoint(low, high float64) float64 {
	return (low + high) / 2
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
		Timeframe:      in.Timeframe,
		EntryPriceLow:  in.EntryPriceLow,
		EntryPriceHigh: in.EntryPriceHigh,
		Targets:        in.Targets,
		StopLoss:       in.StopLoss,
		ReturnsPct:     computeReturnsPct(in.Action, entryMidpoint(in.EntryPriceLow, in.EntryPriceHigh), primaryTarget(in.Targets)),
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
		"timeframe":      &types.AttributeValueMemberS{Value: in.Timeframe},
		"entryPriceLow":  &types.AttributeValueMemberN{Value: formatFloat(in.EntryPriceLow)},
		"entryPriceHigh": &types.AttributeValueMemberN{Value: formatFloat(in.EntryPriceHigh)},
		"targets":        &types.AttributeValueMemberL{Value: targetAVs},
		"stopLoss":       &types.AttributeValueMemberN{Value: formatFloat(in.StopLoss)},
		"returnsPct":     &types.AttributeValueMemberN{Value: formatFloat(computeReturnsPct(in.Action, entryMidpoint(in.EntryPriceLow, in.EntryPriceHigh), primaryTarget(in.Targets)))},
		"rationale":      &types.AttributeValueMemberS{Value: in.Rationale},
		"updatedAt":      &types.AttributeValueMemberS{Value: time.Now().UTC().Format(time.RFC3339)},
	}
	// Drop the pre-migration singular/dropped attributes once a row is
	// re-saved through the current form, so they don't linger alongside
	// the renamed/removed ones.
	return t.updateItem(ctx, id, set, []string{"target", "cmp", "entryPrice", "category"})
}

// ErrTargetIndexOutOfRange means a target_hit close named a target index
// that doesn't exist on this insight's own Targets array — caught here
// (against server-held data), not trusted from the client's own count.
var ErrTargetIndexOutOfRange = errors.New("target index out of range for this insight's targets")

// ResolveTargetHitIndex is the pure bounds-check behind CloseInsight's
// "target_hit" path, pulled out (exported) so it's unit-testable without a
// real DynamoDB round trip, and so a fake ContentStore used in api package
// tests can reuse the real rule instead of reimplementing it (same
// pure-function/DB-glue split as devices.go's CheckDevice). nil
// targetIndex defaults to 0 (T1) — the only valid index for an equity
// call's single target; any index must fall within this insight's own
// Targets array, never trusted from the client's own count.
func ResolveTargetHitIndex(targets []float64, targetIndex *int) (int, error) {
	idx := 0
	if targetIndex != nil {
		idx = *targetIndex
	}
	if idx < 0 || idx >= len(targets) {
		return 0, ErrTargetIndexOutOfRange
	}
	return idx, nil
}

// MarkTargetHit records progress toward a scaled F&O call's targets
// *without* closing the trade — a real multi-target F&O call often reaches
// more than one booking level over its life (T1, then later T2, then later
// T3), and the RA needs to record each as it happens while the trade stays
// open, rather than the old behavior where hitting any target immediately
// and permanently closed it. Unlike CloseInsight, this never touches
// TradeStatus/Outcome/ClosedAt — only an explicit CloseInsight call
// finalizes the trade. ReturnsPct is updated to preview the return at this
// target so the admin list reflects current progress even before close.
func (t *ContentTable) MarkTargetHit(ctx context.Context, id string, targetIndex *int) error {
	insight, err := t.GetInsight(ctx, id)
	if err != nil {
		return err
	}
	if insight == nil {
		return fmt.Errorf("insight %q not found", id)
	}
	idx, err := ResolveTargetHitIndex(insight.Targets, targetIndex)
	if err != nil {
		return err
	}
	set := map[string]types.AttributeValue{
		"targetHitIndex": &types.AttributeValueMemberN{Value: strconv.Itoa(idx)},
		"returnsPct":     &types.AttributeValueMemberN{Value: formatFloat(computeReturnsPct(insight.Action, entryMidpoint(insight.EntryPriceLow, insight.EntryPriceHigh), insight.Targets[idx]))},
		"updatedAt":      &types.AttributeValueMemberS{Value: time.Now().UTC().Format(time.RFC3339)},
	}
	return t.updateItem(ctx, id, set, nil)
}

// CloseInsight marks a trade resolved — the RA does this by hand (TD-053),
// since there's no live price feed to detect a target/SL hit automatically.
// Leaves Status/GSI1 untouched: a closed trade can still be "published" and
// visible, just no longer "open". For outcome "target_hit", targetIndex says
// which of the insight's own Targets was actually hit; a nil targetIndex
// falls back to whatever MarkTargetHit last recorded (insight.TargetHitIndex),
// or index 0 if neither was ever set — the only valid index for an equity
// call's single target. returnsPct is recomputed off that real hit price
// (or the stop-loss for "sl_hit") so the customer Closed tab shows the
// actual realised return, not the original "expected" figure from publish
// time.
func (t *ContentTable) CloseInsight(ctx context.Context, id, outcome string, targetIndex *int) error {
	insight, err := t.GetInsight(ctx, id)
	if err != nil {
		return err
	}
	if insight == nil {
		return fmt.Errorf("insight %q not found", id)
	}

	now := time.Now().UTC().Format(time.RFC3339)
	set := map[string]types.AttributeValue{
		"tradeStatus": &types.AttributeValueMemberS{Value: "closed"},
		"outcome":     &types.AttributeValueMemberS{Value: outcome},
		"closedAt":    &types.AttributeValueMemberS{Value: now},
		"updatedAt":   &types.AttributeValueMemberS{Value: now},
	}
	if outcome == "target_hit" {
		effectiveIndex := targetIndex
		if effectiveIndex == nil {
			effectiveIndex = insight.TargetHitIndex
		}
		idx, err := ResolveTargetHitIndex(insight.Targets, effectiveIndex)
		if err != nil {
			return err
		}
		set["targetHitIndex"] = &types.AttributeValueMemberN{Value: strconv.Itoa(idx)}
		set["returnsPct"] = &types.AttributeValueMemberN{Value: formatFloat(computeReturnsPct(insight.Action, entryMidpoint(insight.EntryPriceLow, insight.EntryPriceHigh), insight.Targets[idx]))}
	} else {
		set["returnsPct"] = &types.AttributeValueMemberN{Value: formatFloat(computeReturnsPct(insight.Action, entryMidpoint(insight.EntryPriceLow, insight.EntryPriceHigh), insight.StopLoss))}
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
