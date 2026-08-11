// Package db wraps DynamoDB access. Local dev and the deployed Lambda both
// use the real tables (no emulator) via the standard AWS credential chain —
// a named profile locally, the Lambda execution role when deployed.
package db

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
)

func NewClient(ctx context.Context) (*dynamodb.Client, error) {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, err
	}
	return dynamodb.NewFromConfig(cfg), nil
}
