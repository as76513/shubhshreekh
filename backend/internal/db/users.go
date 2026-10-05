package db

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

type User struct {
	UserID       string `dynamodbav:"user_id"`
	PhoneNumber  string `dynamodbav:"phone_number"`
	Name         string `dynamodbav:"name"`
	Email        string `dynamodbav:"email"`
	Subscription string `dynamodbav:"subscription"`
	CreatedAt    string `dynamodbav:"created_at"`

	// WebAuthnCredential is a JSON-serialized webauthn.Credential (public key
	// only — the private key never leaves the user's device/secure enclave),
	// set once the user registers biometric/PIN unlock. Empty until then.
	WebAuthnCredential string `dynamodbav:"webauthn_credential,omitempty"`

	// WebAuthnSession is a JSON-serialized webauthn.SessionData — the
	// challenge issued by a Begin* call, read back and cleared by the
	// matching Finish* call. It's ephemeral (carries its own Expires field)
	// and never valid outside a single in-flight ceremony.
	WebAuthnSession string `dynamodbav:"webauthn_session,omitempty"`

	// VerifiedUntil (RFC3339) is set only by a full phone+OTP login, to
	// now+7days — see backend/internal/api/auth.go's otpVerifiedWindow. A
	// biometric/PIN refresh may mint new short-lived access tokens up until
	// this deadline, but never extends it; only another OTP verification
	// does. This bounds how long a WebAuthn credential alone (without
	// repeating OTP) can keep a session alive.
	VerifiedUntil string `dynamodbav:"verified_until,omitempty"`
}

type UsersTable struct {
	client *dynamodb.Client
	name   string
}

func NewUsersTable(client *dynamodb.Client, tableName string) *UsersTable {
	return &UsersTable{client: client, name: tableName}
}

// Get returns (nil, nil) if no row exists yet — real users are created by
// the OTP-verify flow in Phase 2; until then, minted test tokens may not
// have a matching row.
func (t *UsersTable) Get(ctx context.Context, userID string) (*User, error) {
	key, err := attributevalue.MarshalMap(map[string]string{"user_id": userID})
	if err != nil {
		return nil, err
	}
	out, err := t.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: &t.name,
		Key:       key,
	})
	if err != nil {
		return nil, err
	}
	if out.Item == nil {
		return nil, nil
	}
	var user User
	if err := attributevalue.UnmarshalMap(out.Item, &user); err != nil {
		return nil, err
	}
	return &user, nil
}

// GetOrCreateByPhone returns the existing user for phone (digits only,
// country code included, e.g. "919876543210") or creates one. Phone IS the
// user_id — there's no separate signup step in this app, so a phone->user_id
// GSI would be a layer of indirection with nothing yet to justify it.
//
// name/email are only used when creating a new row (the frontend's signup
// step collects them); an existing user's profile is never overwritten by
// them, which is also what makes the conditional-put race fallback below
// safe — the loser of that race re-reads what the winner wrote instead of
// re-applying its own (possibly different) name/email.
//
// The conditional put closes the race where two verify-OTP requests for the
// same new phone land concurrently: only one PutItem succeeds, the loser
// re-reads what the winner wrote instead of overwriting it.
func (t *UsersTable) GetOrCreateByPhone(ctx context.Context, phone, name, email string) (*User, error) {
	existing, err := t.Get(ctx, phone)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return existing, nil
	}

	user := User{
		UserID:       phone,
		PhoneNumber:  "+" + phone,
		Name:         name,
		Email:        email,
		Subscription: "free",
		CreatedAt:    time.Now().UTC().Format(time.RFC3339),
	}
	item, err := attributevalue.MarshalMap(user)
	if err != nil {
		return nil, err
	}
	_, err = t.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName:           &t.name,
		Item:                item,
		ConditionExpression: aws.String("attribute_not_exists(user_id)"),
	})
	if err != nil {
		var condFailed *types.ConditionalCheckFailedException
		if errors.As(err, &condFailed) {
			return t.Get(ctx, phone)
		}
		return nil, err
	}
	return &user, nil
}

// PutStub writes a minimal row for the given user ID — used only by
// cmd/minttoken --seed so /me has something to read before real OTP-based
// signup (Phase 2) exists.
func (t *UsersTable) PutStub(ctx context.Context, userID string) error {
	item, err := attributevalue.MarshalMap(User{
		UserID:      userID,
		PhoneNumber: "+910000000000",
		Name:        "Dev User",
		CreatedAt:   time.Now().UTC().Format(time.RFC3339),
	})
	if err != nil {
		return err
	}
	_, err = t.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: &t.name,
		Item:      item,
	})
	return err
}

// update sets and/or removes a handful of top-level attributes on a user
// row without reading-then-writing the whole item — used by the WebAuthn
// ceremony handlers, which only ever touch one or two fields at a time.
func (t *UsersTable) update(ctx context.Context, userID string, set map[string]string, remove []string) error {
	key, err := attributevalue.MarshalMap(map[string]string{"user_id": userID})
	if err != nil {
		return err
	}

	names := map[string]string{}
	values := map[string]types.AttributeValue{}
	var setClauses, removeClauses []string

	i := 0
	for attr, val := range set {
		nameKey, valKey := fmt.Sprintf("#n%d", i), fmt.Sprintf(":v%d", i)
		names[nameKey] = attr
		values[valKey] = &types.AttributeValueMemberS{Value: val}
		setClauses = append(setClauses, fmt.Sprintf("%s = %s", nameKey, valKey))
		i++
	}
	for _, attr := range remove {
		nameKey := fmt.Sprintf("#n%d", i)
		names[nameKey] = attr
		removeClauses = append(removeClauses, nameKey)
		i++
	}

	expr := ""
	if len(setClauses) > 0 {
		expr += "SET " + strings.Join(setClauses, ", ") + " "
	}
	if len(removeClauses) > 0 {
		expr += "REMOVE " + strings.Join(removeClauses, ", ")
	}

	input := &dynamodb.UpdateItemInput{
		TableName:                &t.name,
		Key:                      key,
		UpdateExpression:         aws.String(strings.TrimSpace(expr)),
		ExpressionAttributeNames: names,
	}
	if len(values) > 0 {
		input.ExpressionAttributeValues = values
	}
	_, err = t.client.UpdateItem(ctx, input)
	return err
}

// SetWebAuthnSession persists the challenge from a Begin* ceremony so the
// matching Finish* call (a separate, stateless Lambda invocation) can read
// it back.
func (t *UsersTable) SetWebAuthnSession(ctx context.Context, userID, sessionJSON string) error {
	return t.update(ctx, userID, map[string]string{"webauthn_session": sessionJSON}, nil)
}

// ClearWebAuthnSession removes a consumed (or abandoned) ceremony's
// challenge so it can never be replayed.
func (t *UsersTable) ClearWebAuthnSession(ctx context.Context, userID string) error {
	return t.update(ctx, userID, nil, []string{"webauthn_session"})
}

// SetWebAuthnCredential stores the registered credential (register/finish)
// or rewrites it with an updated signature counter (every successful
// refresh/finish) — the library's storage guidance requires writing the
// counter back each time to detect a cloned authenticator.
func (t *UsersTable) SetWebAuthnCredential(ctx context.Context, userID, credentialJSON string) error {
	return t.update(ctx, userID, map[string]string{"webauthn_credential": credentialJSON}, nil)
}

// SetVerifiedUntil records how long a biometric/PIN refresh may mint new
// access tokens without another OTP — see User.VerifiedUntil.
func (t *UsersTable) SetVerifiedUntil(ctx context.Context, userID string, until time.Time) error {
	return t.update(ctx, userID, map[string]string{"verified_until": until.UTC().Format(time.RFC3339)}, nil)
}
