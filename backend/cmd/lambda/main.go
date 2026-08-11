// Deployed entrypoint — wraps the same handler tree as cmd/server for API
// Gateway HTTP API (payload format 2.0) behind AWS Lambda.
package main

import (
	"context"
	"log"
	"os"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"

	"github.com/as76513/shubhshreekh/backend/internal/api"
	"github.com/as76513/shubhshreekh/backend/internal/db"
)

var adapter *httpadapter.HandlerAdapterV2

func init() {
	ctx := context.Background()

	client, err := db.NewClient(ctx)
	if err != nil {
		log.Fatalf("dynamodb client: %v", err)
	}

	secret := os.Getenv("SESSION_TOKEN_SIGNING_SECRET")
	if secret == "" {
		log.Fatal("SESSION_TOKEN_SIGNING_SECRET not set")
	}

	deps := api.Deps{
		SigningSecret: []byte(secret),
		Users:         db.NewUsersTable(client, os.Getenv("DYNAMODB_USERS_TABLE")),
	}

	adapter = httpadapter.NewV2(api.NewRouter(deps))
}

func handler(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	return adapter.ProxyWithContext(ctx, req)
}

func main() {
	lambda.Start(handler)
}
