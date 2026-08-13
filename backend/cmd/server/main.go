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

	secret := os.Getenv("SESSION_TOKEN_SIGNING_SECRET")
	if secret == "" {
		log.Fatal("SESSION_TOKEN_SIGNING_SECRET not set — source backend/.env first")
	}

	var provider otp.Provider
	if authKey := os.Getenv("MSG91_AUTH_KEY"); authKey != "" {
		provider = otp.NewMSG91(authKey, os.Getenv("MSG91_TEMPLATE_ID"))
	} else {
		log.Println("MSG91_AUTH_KEY not set — using mock OTP provider (local dev only, see internal/otp/mock.go)")
		provider = otp.NewMock()
	}

	origins := os.Getenv("CORS_ALLOWED_ORIGINS")
	if origins == "" {
		origins = "http://localhost:3000" // local frontend dev server
	}

	deps := api.Deps{
		SigningSecret:  []byte(secret),
		Users:          db.NewUsersTable(client, os.Getenv("DYNAMODB_USERS_TABLE")),
		OTP:            provider,
		AllowedOrigins: strings.Split(origins, ","),
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, api.NewRouter(deps)))
}
