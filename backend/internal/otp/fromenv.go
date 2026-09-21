package otp

import (
	"os"
	"strings"
)

// ProviderFromEnv builds the OTP stack used by cmd/server and cmd/lambda.
//
// Env:
//   MSG91_AUTH_KEY, MSG91_TEMPLATE_ID — real SMS when set
//   OTP_TEST_PHONES — comma-separated 10-digit or 91… numbers (Play/QA whitelist)
//   OTP_TEST_CODE — fixed OTP for whitelist (default 123456 if phones set)
//
// Modes: "msg91", "msg91+test-phones", "test-phones-only", "mock".
func ProviderFromEnv() (provider Provider, mode string) {
	var inner Provider
	if key := strings.TrimSpace(os.Getenv("MSG91_AUTH_KEY")); key != "" {
		inner = NewMSG91(key, os.Getenv("MSG91_TEMPLATE_ID"))
	}

	phones := strings.TrimSpace(os.Getenv("OTP_TEST_PHONES"))
	code := strings.TrimSpace(os.Getenv("OTP_TEST_CODE"))

	switch {
	case phones != "" && inner != nil:
		return NewGate(inner, phones, code), "msg91+test-phones"
	case phones != "":
		return NewGate(nil, phones, code), "test-phones-only"
	case inner != nil:
		return inner, "msg91"
	default:
		return NewMock(), "mock"
	}
}

// HasProductionOTPConfig is true when Lambda may start: MSG91 and/or test phones.
func HasProductionOTPConfig() bool {
	hasMSG91 := strings.TrimSpace(os.Getenv("MSG91_AUTH_KEY")) != "" &&
		strings.TrimSpace(os.Getenv("MSG91_TEMPLATE_ID")) != ""
	hasTest := strings.TrimSpace(os.Getenv("OTP_TEST_PHONES")) != ""
	return hasMSG91 || hasTest
}
