// Dev-only tool to mint a test session token before real OTP-based login
// (Phase 2) exists. Never imported by cmd/lambda, so it can't ship to
// production.
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/as76513/shubhshreekh/backend/internal/auth"
	"github.com/as76513/shubhshreekh/backend/internal/db"
)

func main() {
	userID := flag.String("user-id", "dev-user-1", "subject claim to mint")
	tier := flag.String("tier", "free", "subscription claim to mint")
	ttl := flag.Duration("ttl", 24*time.Hour, "token lifetime")
	seed := flag.Bool("seed", false, "also write a stub row to DYNAMODB_USERS_TABLE")
	flag.Parse()

	secret := os.Getenv("SESSION_TOKEN_SIGNING_SECRET")
	if secret == "" {
		log.Fatal("SESSION_TOKEN_SIGNING_SECRET not set — source backend/.env first")
	}

	token, err := auth.IssueToken([]byte(secret), *userID, *tier, *ttl)
	if err != nil {
		log.Fatal(err)
	}

	if *seed {
		ctx := context.Background()
		client, err := db.NewClient(ctx)
		if err != nil {
			log.Fatalf("dynamodb client: %v", err)
		}
		table := db.NewUsersTable(client, os.Getenv("DYNAMODB_USERS_TABLE"))
		if err := table.PutStub(ctx, *userID); err != nil {
			log.Fatalf("seed user: %v", err)
		}
	}

	fmt.Println(token)
}
