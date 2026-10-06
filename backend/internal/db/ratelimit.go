package db

import (
	"context"
	"time"

	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"

	"github.com/as76513/shubhshreekh/backend/internal/ratelimit"
)

// RateLimitTable is the DynamoDB-backed half of TECH_DEBT.md TD-006 — all
// the actual cooldown/cap/lockout rules live in internal/ratelimit as pure
// functions; this is just the read-rules-write-back glue. Implements
// backend/internal/api's RateLimiter interface.
type RateLimitTable struct {
	client *dynamodb.Client
	name   string
}

func NewRateLimitTable(client *dynamodb.Client, tableName string) *RateLimitTable {
	return &RateLimitTable{client: client, name: tableName}
}

// rateLimitItem is keyed by phone+UTC-date (see dayKey), so SendCount and
// VerifyFailures naturally reset at UTC midnight without any cleanup job —
// and the DynamoDB `ttl` attribute lets stale days garbage-collect
// themselves. Good enough for pre-launch volume; not meant to survive a
// request racing another request for the same phone in the same instant
// (an abuse-prevention gate, not a ledger — see TECH_DEBT.md TD-006's own
// note on this being an acceptable simplification at this scale).
type rateLimitItem struct {
	Key            string `dynamodbav:"phone_date"`
	LastSentAt     string `dynamodbav:"lastSentAt,omitempty"`
	SendCount      int    `dynamodbav:"sendCount"`
	VerifyFailures int    `dynamodbav:"verifyFailures"`
	LockedUntil    string `dynamodbav:"lockedUntil,omitempty"`
	TTL            int64  `dynamodbav:"ttl"`
}

func dayKey(phone string, now time.Time) string {
	return phone + "#" + now.UTC().Format("20060102")
}

func parseTime(s string) time.Time {
	if s == "" {
		return time.Time{}
	}
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		return time.Time{}
	}
	return t
}

func formatTime(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.UTC().Format(time.RFC3339)
}

func (t *RateLimitTable) get(ctx context.Context, phone string, now time.Time) (ratelimit.Record, error) {
	key, err := attributevalue.MarshalMap(map[string]string{"phone_date": dayKey(phone, now)})
	if err != nil {
		return ratelimit.Record{}, err
	}
	out, err := t.client.GetItem(ctx, &dynamodb.GetItemInput{TableName: &t.name, Key: key})
	if err != nil {
		return ratelimit.Record{}, err
	}
	if out.Item == nil {
		return ratelimit.Record{}, nil
	}
	var item rateLimitItem
	if err := attributevalue.UnmarshalMap(out.Item, &item); err != nil {
		return ratelimit.Record{}, err
	}
	return ratelimit.Record{
		LastSentAt:     parseTime(item.LastSentAt),
		SendCount:      item.SendCount,
		VerifyFailures: item.VerifyFailures,
		LockedUntil:    parseTime(item.LockedUntil),
	}, nil
}

func (t *RateLimitTable) save(ctx context.Context, phone string, now time.Time, rec ratelimit.Record) error {
	item := rateLimitItem{
		Key:            dayKey(phone, now),
		LastSentAt:     formatTime(rec.LastSentAt),
		SendCount:      rec.SendCount,
		VerifyFailures: rec.VerifyFailures,
		LockedUntil:    formatTime(rec.LockedUntil),
		TTL:            now.Add(26 * time.Hour).Unix(), // a couple hours past the UTC day it belongs to
	}
	av, err := attributevalue.MarshalMap(item)
	if err != nil {
		return err
	}
	_, err = t.client.PutItem(ctx, &dynamodb.PutItemInput{TableName: &t.name, Item: av})
	return err
}

// AllowSend reports whether phone may be sent a new OTP right now.
func (t *RateLimitTable) AllowSend(ctx context.Context, phone string) (bool, time.Duration, error) {
	now := time.Now()
	rec, err := t.get(ctx, phone, now)
	if err != nil {
		return false, 0, err
	}
	ok, retryAfter := ratelimit.CheckSend(rec, now, ratelimit.DefaultLimits())
	return ok, retryAfter, nil
}

// RecordSend persists that a send just happened — call only after AllowSend
// returned true and the send was actually attempted.
func (t *RateLimitTable) RecordSend(ctx context.Context, phone string) error {
	now := time.Now()
	rec, err := t.get(ctx, phone, now)
	if err != nil {
		return err
	}
	rec = ratelimit.RecordSend(rec, now)
	return t.save(ctx, phone, now, rec)
}

// AllowVerify reports whether phone may attempt a verify right now (false
// while locked out from prior failures).
func (t *RateLimitTable) AllowVerify(ctx context.Context, phone string) (bool, time.Duration, error) {
	now := time.Now()
	rec, err := t.get(ctx, phone, now)
	if err != nil {
		return false, 0, err
	}
	ok, retryAfter := ratelimit.CheckVerify(rec, now)
	return ok, retryAfter, nil
}

// RecordVerifyFailure records a failed OTP check — may start a lockout.
func (t *RateLimitTable) RecordVerifyFailure(ctx context.Context, phone string) error {
	now := time.Now()
	rec, err := t.get(ctx, phone, now)
	if err != nil {
		return err
	}
	rec = ratelimit.RecordVerifyFailure(rec, now, ratelimit.DefaultLimits())
	return t.save(ctx, phone, now, rec)
}

// RecordVerifySuccess clears failure/lockout state after a correct OTP.
func (t *RateLimitTable) RecordVerifySuccess(ctx context.Context, phone string) error {
	now := time.Now()
	rec, err := t.get(ctx, phone, now)
	if err != nil {
		return err
	}
	rec = ratelimit.RecordVerifySuccess(rec)
	return t.save(ctx, phone, now, rec)
}
