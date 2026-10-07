// Local dev entrypoint — runs the same handler tree as cmd/lambda over a
// plain net/http server.
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/as76513/shubhshreekh/backend/internal/api"
	"github.com/as76513/shubhshreekh/backend/internal/db"
	"github.com/as76513/shubhshreekh/backend/internal/otp"
)

func main() {
	ctx := context.Background()

	client, err := db.NewClient(ctx)
	if err != nil {
		log.Fatalf("dynamodb client: %v", err)
	}
	s3Client, err := db.NewS3Client(ctx)
	if err != nil {
		log.Fatalf("s3 client: %v", err)
	}

	secret := os.Getenv("SESSION_TOKEN_SIGNING_SECRET")
	if secret == "" {
		log.Fatal("SESSION_TOKEN_SIGNING_SECRET not set — source backend/.env first")
	}

	provider, mode := otp.ProviderFromEnv()
	log.Printf("OTP provider mode: %s", mode)

	origins := os.Getenv("CORS_ALLOWED_ORIGINS")
	if origins == "" {
		origins = "http://localhost:3000" // local frontend dev server
	}

	webAuthn, err := api.NewWebAuthnFromEnv()
	if err != nil {
		log.Fatalf("webauthn config: %v", err)
	}

	deps := api.Deps{
		SigningSecret:     []byte(secret),
		Users:             db.NewUsersTable(client, os.Getenv("DYNAMODB_USERS_TABLE")),
		Content:           db.NewContentTable(client, os.Getenv("DYNAMODB_CONTENT_TABLE")),
		Settings:          db.NewSettingsTable(client, os.Getenv("DYNAMODB_SETTINGS_TABLE")),
		OTP:               provider,
		RateLimit:         db.NewRateLimitTable(client, os.Getenv("DYNAMODB_RATELIMIT_TABLE")),
		WebAuthn:          webAuthn,
		S3:                s3Client,
		MediaBucket:       os.Getenv("CONTENT_MEDIA_BUCKET"),
		MediaBucketRegion: os.Getenv("AWS_REGION"),
		AllowedOrigins:    strings.Split(origins, ","),
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, api.NewRouter(deps)))
}
