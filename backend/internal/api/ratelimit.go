package api

import (
	"context"
	"time"
)

// RateLimiter is TECH_DEBT.md TD-006's abuse-prevention gate for
// /auth/send-otp and /auth/verify-otp. *db.RateLimitTable implements this
// for production (DynamoDB-backed, correct across Lambda's stateless
// invocations); tests use an in-memory fake instead — see auth_test.go.
type RateLimiter interface {
	// AllowSend reports whether phone may be sent a new OTP right now.
	AllowSend(ctx context.Context, phone string) (ok bool, retryAfter time.Duration, err error)
	// RecordSend persists that a send was just attempted.
	RecordSend(ctx context.Context, phone string) error
	// AllowVerify reports whether phone may attempt a verify right now.
	AllowVerify(ctx context.Context, phone string) (ok bool, retryAfter time.Duration, err error)
	// RecordVerifyFailure records a failed OTP check (may start a lockout).
	RecordVerifyFailure(ctx context.Context, phone string) error
	// RecordVerifySuccess clears failure/lockout state after a correct OTP.
	RecordVerifySuccess(ctx context.Context, phone string) error
}
