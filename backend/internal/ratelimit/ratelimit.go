// Package ratelimit holds the OTP abuse-prevention rules (TECH_DEBT.md
// TD-006) as pure functions — no AWS SDK, no clock reads, no I/O. The
// DynamoDB-backed storage adapter (backend/internal/db/ratelimit.go) is a
// thin wrapper around these: read a Record, pass it through here, write
// the result back. Keeping the rules pure means they're testable with
// plain table-driven tests, no fakes or mocks required.
package ratelimit

import "time"

// Default* mirror build-plan.md Week 6's rate-limiting note: cheap to
// change later (they're plain constants, not env-configurable) since
// pre-launch volume doesn't yet justify per-environment tuning — see
// otpVerifiedWindow/accessTokenTTL in backend/internal/api/webauthn.go for
// the same convention elsewhere in this codebase.
const (
	DefaultSendCooldown      = 60 * time.Second
	DefaultSendDailyCap      = 5
	DefaultVerifyMaxAttempts = 5
	DefaultVerifyLockout     = 15 * time.Minute
)

// Record is one phone's rate-limit state for a single UTC day — the
// storage adapter keys its DynamoDB item by phone+date, so SendCount and
// VerifyFailures naturally reset at midnight UTC without any extra cleanup
// logic. A zero-value Record is exactly "no activity yet today."
type Record struct {
	LastSentAt     time.Time
	SendCount      int
	VerifyFailures int
	LockedUntil    time.Time // zero value means "not locked"
}

// Limits is injected rather than read from globals so tests can exercise
// edge cases (e.g. a cap of 1) without waiting out real durations.
type Limits struct {
	SendCooldown      time.Duration
	SendDailyCap      int
	VerifyMaxAttempts int
	VerifyLockout     time.Duration
}

func DefaultLimits() Limits {
	return Limits{
		SendCooldown:      DefaultSendCooldown,
		SendDailyCap:      DefaultSendDailyCap,
		VerifyMaxAttempts: DefaultVerifyMaxAttempts,
		VerifyLockout:     DefaultVerifyLockout,
	}
}

// CheckSend reports whether a new OTP may be sent right now. retryAfter is
// only meaningful when ok is false because of the cooldown (not the daily
// cap, which doesn't have a single well-defined retry instant within the
// same UTC day).
func CheckSend(rec Record, now time.Time, lim Limits) (ok bool, retryAfter time.Duration) {
	if !rec.LastSentAt.IsZero() {
		if wait := rec.LastSentAt.Add(lim.SendCooldown).Sub(now); wait > 0 {
			return false, wait
		}
	}
	if rec.SendCount >= lim.SendDailyCap {
		return false, 0
	}
	return true, 0
}

// RecordSend returns rec updated after a send CheckSend already allowed.
func RecordSend(rec Record, now time.Time) Record {
	rec.LastSentAt = now
	rec.SendCount++
	return rec
}

// CheckVerify reports whether a verify attempt is allowed right now — false
// only while a prior lockout (see RecordVerifyFailure) hasn't yet expired.
func CheckVerify(rec Record, now time.Time) (ok bool, retryAfter time.Duration) {
	if !rec.LockedUntil.IsZero() && rec.LockedUntil.After(now) {
		return false, rec.LockedUntil.Sub(now)
	}
	return true, 0
}

// RecordVerifyFailure increments the failure count and starts a lockout
// once it reaches VerifyMaxAttempts.
func RecordVerifyFailure(rec Record, now time.Time, lim Limits) Record {
	rec.VerifyFailures++
	if rec.VerifyFailures >= lim.VerifyMaxAttempts {
		rec.LockedUntil = now.Add(lim.VerifyLockout)
	}
	return rec
}

// RecordVerifySuccess clears failure/lockout state — a legitimate login
// shouldn't carry forward failed attempts from earlier the same day.
func RecordVerifySuccess(rec Record) Record {
	rec.VerifyFailures = 0
	rec.LockedUntil = time.Time{}
	return rec
}
