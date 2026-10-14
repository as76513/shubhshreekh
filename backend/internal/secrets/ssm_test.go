package secrets

import "testing"

func TestValuesForEnv(t *testing.T) {
	got, err := valuesForEnv(
		map[string]string{"SESSION_TOKEN_SIGNING_SECRET": "/shubhshreekh/dev/session_token_signing_secret"},
		map[string]string{"/shubhshreekh/dev/session_token_signing_secret": "secret-value"},
	)
	if err != nil {
		t.Fatal(err)
	}
	if got["SESSION_TOKEN_SIGNING_SECRET"] != "secret-value" {
		t.Fatalf("got %#v", got)
	}
}

func TestValuesForEnvMissing(t *testing.T) {
	_, err := valuesForEnv(
		map[string]string{"MSG91_AUTH_KEY": "/shubhshreekh/dev/msg91_auth_key"},
		map[string]string{},
	)
	if err == nil {
		t.Fatal("expected missing parameter error")
	}
	if got := err.Error(); got != "ssm parameter /shubhshreekh/dev/msg91_auth_key is missing" {
		t.Fatalf("error = %q", got)
	}
}
