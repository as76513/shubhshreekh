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

// Two rows per phone, not one (fixed in code review 2026-10-06 — the
// original single day-keyed row mixed two different kinds of state and
// silently truncated one of them):
//
//   - stateItem, keyed by phone alone: LastSentAt (60s cooldown) and
//     VerifyFailures/LockedUntil (15min lockout) are duration-based
//     guarantees that must hold across a UTC-midnight boundary. A 15-minute
//     lockout starting at 23:59 has to still be in effect at 00:01 the next
//     day — it must NOT reset just because the calendar date changed.
//   - dailyItem, keyed by phone+UTC-date: SendCount is the one value that's
//     *supposed* to reset at midnight (the daily send cap), so it's the
//     only thing that stays date-keyed.
//
// Both still carry a TTL so an idle phone's rows eventually garbage-collect
// — this remains an abuse-prevention gate, not a ledger (TECH_DEBT.md
// TD-006), so a plain read-then-write per row is an acceptable
// simplification at this scale; it just needs to be the *right* two rows.

type rateLimitStateItem struct {
	Key            string `dynamodbav:"phone_date"` // just the phone — no date suffix
	LastSentAt     string `dynamodbav:"lastSentAt,omitempty"`
	VerifyFailures int    `dynamodbav:"verifyFailures"`
	LockedUntil    string `dynamodbav:"lockedUntil,omitempty"`
	TTL            int64  `dynamodbav:"ttl"`
}

type rateLimitDailyItem struct {
	Key       string `dynamodbav:"phone_date"` // phone + "#" + UTC date
	SendCount int    `dynamodbav:"sendCount"`
	TTL       int64  `dynamodbav:"ttl"`
}

func stateKey(phone string) string {
	return phone
}

func dailyKey(phone string, now time.Time) string {
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
	stateKeyAV, err := attributevalue.MarshalMap(map[string]string{"phone_date": stateKey(phone)})
	if err != nil {
		return ratelimit.Record{}, err
	}
	stateOut, err := t.client.GetItem(ctx, &dynamodb.GetItemInput{TableName: &t.name, Key: stateKeyAV})
	if err != nil {
		return ratelimit.Record{}, err
	}
	var state rateLimitStateItem
	if stateOut.Item != nil {
		if err := attributevalue.UnmarshalMap(stateOut.Item, &state); err != nil {
			return ratelimit.Record{}, err
		}
	}

	dailyKeyAV, err := attributevalue.MarshalMap(map[string]string{"phone_date": dailyKey(phone, now)})
	if err != nil {
		return ratelimit.Record{}, err
	}
	dailyOut, err := t.client.GetItem(ctx, &dynamodb.GetItemInput{TableName: &t.name, Key: dailyKeyAV})
	if err != nil {
		return ratelimit.Record{}, err
	}
	var daily rateLimitDailyItem
	if dailyOut.Item != nil {
		if err := attributevalue.UnmarshalMap(dailyOut.Item, &daily); err != nil {
			return ratelimit.Record{}, err
		}
	}

	return ratelimit.Record{
		LastSentAt:     parseTime(state.LastSentAt),
		VerifyFailures: state.VerifyFailures,
		LockedUntil:    parseTime(state.LockedUntil),
		SendCount:      daily.SendCount,
	}, nil
}

func (t *RateLimitTable) save(ctx context.Context, phone string, now time.Time, rec ratelimit.Record) error {
	state := rateLimitStateItem{
		Key:            stateKey(phone),
		LastSentAt:     formatTime(rec.LastSentAt),
		VerifyFailures: rec.VerifyFailures,
		LockedUntil:    formatTime(rec.LockedUntil),
		TTL:            now.Add(26 * time.Hour).Unix(), // refreshed on every write; only matters once the phone goes idle
	}
	stateAV, err := attributevalue.MarshalMap(state)
	if err != nil {
		return err
	}
	if _, err := t.client.PutItem(ctx, &dynamodb.PutItemInput{TableName: &t.name, Item: stateAV}); err != nil {
		return err
	}

	daily := rateLimitDailyItem{
		Key:       dailyKey(phone, now),
		SendCount: rec.SendCount,
		TTL:       now.Add(26 * time.Hour).Unix(), // a couple hours past the UTC day it belongs to
	}
	dailyAV, err := attributevalue.MarshalMap(daily)
	if err != nil {
		return err
	}
	_, err = t.client.PutItem(ctx, &dynamodb.PutItemInput{TableName: &t.name, Item: dailyAV})
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
