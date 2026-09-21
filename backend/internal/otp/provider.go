// Package otp abstracts the OTP vendor behind one interface so the HTTP
// handlers in internal/api never know whether they're talking to MSG91, a
// local mock, or the Play/QA test-phone gate — wiring is via ProviderFromEnv
// in cmd/server and cmd/lambda.
package otp

import "context"

// Provider sends and verifies OTPs. phone is always digits only, country
// code included, no leading '+' (e.g. "919876543210") — callers normalize
// before reaching this interface.
type Provider interface {
	Send(ctx context.Context, phone string) error
	// Verify reports whether code matches what was last sent to phone.
	Verify(ctx context.Context, phone, code string) (bool, error)
}
