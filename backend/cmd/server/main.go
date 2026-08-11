// Local dev entrypoint — runs the same handler tree as cmd/lambda over a
// plain net/http server.
package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/as76513/shubhshreekh/backend/internal/api"
	"github.com/as76513/shubhshreekh/backend/internal/db"
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

	deps := api.Deps{
		SigningSecret: []byte(secret),
		Users:         db.NewUsersTable(client, os.Getenv("DYNAMODB_USERS_TABLE")),
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, api.NewRouter(deps)))
}
