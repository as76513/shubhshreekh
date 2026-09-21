package otp

import (
	"context"
	"fmt"
	"log"
	"strings"
)

// Gate wraps an inner Provider and short-circuits configured test phones so
// Play reviewers / QA can log in with a fixed OTP without SMS (DLT pending).
// Non-test phones always use Inner. If Inner is nil, non-test numbers fail.
//
// Tech debt: remove or empty OTP_TEST_PHONES once MSG91 DLT is live for all
// users — see TECH_DEBT.md. Never ship an empty Inner with a public listing
// that expects real customers.
type Gate struct {
	Inner    Provider
	Phones   map[string]struct{} // full digits, e.g. "919876543210"
	TestCode string
}

// NewGate returns a Provider. phonesCSV is comma-separated 10-digit Indian
// mobiles or 12-digit 91… forms. testCode is the fixed OTP (typically 6 digits).
// If phonesCSV is empty, Inner is returned unchanged (nil-safe: returns Inner).
func NewGate(inner Provider, phonesCSV, testCode string) Provider {
	phones := ParseTestPhones(phonesCSV)
	if len(phones) == 0 {
		return inner
	}
	code := strings.TrimSpace(testCode)
	if code == "" {
		code = "123456"
		log.Println("[otp:gate] OTP_TEST_CODE unset — defaulting to 123456 for whitelist phones")
	}
	log.Printf("[otp:gate] test OTP enabled for %d phone(s) (fixed code; no SMS)", len(phones))
	return &Gate{Inner: inner, Phones: phones, TestCode: code}
}

// ParseTestPhones normalizes a CSV of phones to 91XXXXXXXXXX keys.
func ParseTestPhones(csv string) map[string]struct{} {
	out := make(map[string]struct{})
	for _, part := range strings.Split(csv, ",") {
		p := normalizePhone(strings.TrimSpace(part))
		if p == "" {
			continue
		}
		out[p] = struct{}{}
	}
	return out
}

func normalizePhone(raw string) string {
	raw = strings.TrimPrefix(raw, "+")
	raw = strings.ReplaceAll(raw, " ", "")
	if raw == "" {
		return ""
	}
	// 10-digit Indian mobile
	if len(raw) == 10 && raw[0] >= '6' && raw[0] <= '9' {
		return "91" + raw
	}
	// already 91 + 10 digits
	if len(raw) == 12 && strings.HasPrefix(raw, "91") {
		return raw
	}
	return ""
}

func (g *Gate) isTest(phone string) bool {
	_, ok := g.Phones[phone]
	return ok
}

func (g *Gate) Send(ctx context.Context, phone string) error {
	if g.isTest(phone) {
		log.Printf("[otp:gate] send skipped for test phone %s (use OTP_TEST_CODE)", phone)
		return nil
	}
	if g.Inner == nil {
		return fmt.Errorf("otp: SMS not configured for this number (MSG91 unavailable; add to OTP_TEST_PHONES for QA)")
	}
	return g.Inner.Send(ctx, phone)
}

func (g *Gate) Verify(ctx context.Context, phone, code string) (bool, error) {
	if g.isTest(phone) {
		return code == g.TestCode, nil
	}
	if g.Inner == nil {
		return false, fmt.Errorf("otp: SMS not configured for this number")
	}
	return g.Inner.Verify(ctx, phone, code)
}
