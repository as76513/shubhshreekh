// Package secrets loads production credentials from SSM Parameter Store
// into the process environment. Lambda reads them at cold start so the
// values never sit in the function configuration.
package secrets

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ssm"
)

// paramEnv binds a process env var to the env var that holds its SSM name.
// OTP_TEST_CODE is not loaded here. It stays on the Lambda environment so
// whitelist phones, including the analyst admin number, keep the fixed code.
var paramEnv = []struct {
	value string
	name  string
}{
	{"SESSION_TOKEN_SIGNING_SECRET", "SESSION_TOKEN_SIGNING_SECRET_PARAM"},
	{"MSG91_AUTH_KEY", "MSG91_AUTH_KEY_PARAM"},
}

// Load fetches each configured parameter and exports it. When no parameter
// names are set (local cmd/server), it does nothing and .env is used as-is.
func Load(ctx context.Context) error {
	bindings := map[string]string{}
	for _, b := range paramEnv {
		name := strings.TrimSpace(os.Getenv(b.name))
		if name == "" {
			continue
		}
		bindings[b.value] = name
	}
	if len(bindings) == 0 {
		return nil
	}

	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return fmt.Errorf("ssm config: %w", err)
	}
	out, err := ssm.NewFromConfig(cfg).GetParameters(ctx, &ssm.GetParametersInput{
		Names:          paramNames(bindings),
		WithDecryption: aws.Bool(true),
	})
	if err != nil {
		return fmt.Errorf("ssm get: %w", err)
	}
	fetched := map[string]string{}
	for _, p := range out.Parameters {
		fetched[aws.ToString(p.Name)] = aws.ToString(p.Value)
	}
	updates, err := valuesForEnv(bindings, fetched)
	if err != nil {
		return err
	}
	for key, value := range updates {
		if err := os.Setenv(key, value); err != nil {
			return err
		}
	}
	return nil
}

func paramNames(bindings map[string]string) []string {
	names := make([]string, 0, len(bindings))
	for _, name := range bindings {
		names = append(names, name)
	}
	return names
}

// valuesForEnv maps fetched SecureString values onto env keys. A missing or
// empty parameter is an error. The error names the parameter, never the value.
func valuesForEnv(bindings, fetched map[string]string) (map[string]string, error) {
	out := make(map[string]string, len(bindings))
	for envKey, param := range bindings {
		value, ok := fetched[param]
		if !ok || strings.TrimSpace(value) == "" {
			return nil, fmt.Errorf("ssm parameter %s is missing", param)
		}
		out[envKey] = value
	}
	return out, nil
}
