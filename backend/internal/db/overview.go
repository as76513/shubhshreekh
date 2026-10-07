package db

import (
	"context"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/google/uuid"
)

// Overview is the RA's Daily Market Overview (TD-057) — a short paragraph
// + optional photos about today's market, shown on the customer Dashboard
// (latest one) and the Blogs page (full history). Shares the content
// table's single-table design with Insight (architecture.md), its own
// OVERVIEW#<id>/META row. Unlike insights, there's no draft/publish split
// — the RA posts once and it's immediately live, matching the lighter-
// weight "quick update" nature of this content type (see plan.md).
type Overview struct {
	PK     string `dynamodbav:"pk" json:"-"`
	SK     string `dynamodbav:"sk" json:"-"`
	GSI1PK string `dynamodbav:"gsi1pk,omitempty" json:"-"`
	GSI1SK string `dynamodbav:"gsi1sk,omitempty" json:"-"`

	ID          string   `dynamodbav:"id" json:"id"`
	Text        string   `dynamodbav:"text" json:"text"`
	PhotoURLs   []string `dynamodbav:"photoUrls,omitempty" json:"photoUrls,omitempty"`
	PublishedAt string   `dynamodbav:"publishedAt" json:"publishedAt"`
	PublishedBy string   `dynamodbav:"publishedBy,omitempty" json:"publishedBy,omitempty"`
}

// CreateOverview posts immediately — no draft stage (see type doc comment).
func (t *ContentTable) CreateOverview(ctx context.Context, text string, photoURLs []string, publishedBy string) (*Overview, error) {
	now := time.Now().UTC().Format(time.RFC3339)
	id := uuid.NewString()
	ov := Overview{
		PK:          "OVERVIEW#" + id,
		SK:          "META",
		GSI1PK:      "TYPE#overview",
		GSI1SK:      "PUBLISHED#" + now,
		ID:          id,
		Text:        text,
		PhotoURLs:   photoURLs,
		PublishedAt: now,
		PublishedBy: publishedBy,
	}
	item, err := attributevalue.MarshalMap(ov)
	if err != nil {
		return nil, err
	}
	if _, err := t.client.PutItem(ctx, &dynamodb.PutItemInput{TableName: &t.name, Item: item}); err != nil {
		return nil, err
	}
	return &ov, nil
}

// ListOverviews returns every post newest-first via GSI1 — used both for
// the Dashboard's "latest" card (caller takes [0]) and the full Blogs
// archive. Low volume (daily cadence) so no pagination yet.
func (t *ContentTable) ListOverviews(ctx context.Context) ([]Overview, error) {
	keyCond := "gsi1pk = :pk"
	out, err := t.client.Query(ctx, &dynamodb.QueryInput{
		TableName:              &t.name,
		IndexName:              aws.String(gsi1IndexName),
		KeyConditionExpression: &keyCond,
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":pk": &types.AttributeValueMemberS{Value: "TYPE#overview"},
		},
		ScanIndexForward: aws.Bool(false),
	})
	if err != nil {
		return nil, err
	}
	var overviews []Overview
	if err := attributevalue.UnmarshalListOfMaps(out.Items, &overviews); err != nil {
		return nil, err
	}
	return overviews, nil
}
