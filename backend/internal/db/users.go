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

	// TrialEndsAt (RFC3339, TD-054, added 2026-10-06) is set once at account
	// creation to now+7days. Empty on any row created before this field
	// existed — HasActiveEntitlement treats that as "pre-trial-model
	// account" and falls back to the legacy Subscription field rather than
	// treating a blank timestamp as "expired" (see that function's comment).
	TrialEndsAt string `dynamodbav:"trial_ends_at,omitempty"`

	// Devices (TD-054): at most MaxDevices entries — anti-piracy, not
	// session-kicking. A login from an unrecognized device beyond the cap
	// is rejected (see devices.go), never silently evicting an existing one.
	Devices []Device `dynamodbav:"devices,omitempty"`

	// LastDeviceSwapAt (TD-054) gates the self-service "log out other
	// device" cooldown — see devices.go's CanSwapDevice.
	LastDeviceSwapAt string `dynamodbav:"last_device_swap_at,omitempty"`

	// DevicesVersion is optimistic-concurrency control for Devices — without
	// it, two logins racing to register a new device could both read the
	// same starting list, both pass the MaxDevices check, and both get
	// issued a session, landing at more than MaxDevices concurrently-valid
	// logins (found in code review 2026-10-06). Every write to Devices goes
	// through updateDevicesAtomic, which only succeeds if this still matches
	// what was just read; a mismatch means someone else wrote first, and the
	// caller retries from a fresh read instead of blindly overwriting.
	DevicesVersion int `dynamodbav:"devices_version,omitempty"`
}

// UsersStore is what backend/internal/api's handlers depend on — *UsersTable
// satisfies it for production (DynamoDB-backed); tests inject an in-memory
// fake instead so the auth/OTP handlers are testable without real AWS
// access (see backend/internal/api/auth_test.go).
type UsersStore interface {
	Get(ctx context.Context, userID string) (*User, error)
	GetOrCreateByPhone(ctx context.Context, phone, name, email string) (*User, error)
	PutStub(ctx context.Context, userID string) error
	SetWebAuthnSession(ctx context.Context, userID, sessionJSON string) error
	ClearWebAuthnSession(ctx context.Context, userID string) error
	SetWebAuthnCredential(ctx context.Context, userID, credentialJSON string) error
	ClearWebAuthnCredential(ctx context.Context, userID string) error
	SetVerifiedUntil(ctx context.Context, userID string, until time.Time) error
	RegisterDevice(ctx context.Context, userID, deviceID, label string) (allowed bool, devices []Device, err error)
	SwapDevice(ctx context.Context, userID, removeDeviceID, newDeviceID, newLabel string) (ok bool, retryAfter time.Duration, err error)
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

	now := time.Now().UTC()
	user := User{
		UserID:       phone,
		PhoneNumber:  "+" + phone,
		Name:         name,
		Email:        email,
		Subscription: "free",
		CreatedAt:    now.Format(time.RFC3339),
		// TD-054: every new signup gets a 7-day Pro trial — there's no
		// separate Free tier to fall into instead.
		TrialEndsAt: now.Add(TrialDuration).Format(time.RFC3339),
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

// update sets and/or removes a handful of top-level string attributes on a
// user row without reading-then-writing the whole item — used by the
// WebAuthn ceremony handlers, which only ever touch one or two fields at a
// time. Thin wrapper over updateAV for the common string-only case.
func (t *UsersTable) update(ctx context.Context, userID string, set map[string]string, remove []string) error {
	av := make(map[string]types.AttributeValue, len(set))
	for attr, val := range set {
		av[attr] = &types.AttributeValueMemberS{Value: val}
	}
	return t.updateAV(ctx, userID, av, remove)
}

// updateAV is the general form: any attribute value, not just strings —
// needed for Devices (a list of structs), unlike update's string-only set.
func (t *UsersTable) updateAV(ctx context.Context, userID string, set map[string]types.AttributeValue, remove []string) error {
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
		values[valKey] = val
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

// updateAVConditional is updateAV with a ConditionExpression attached —
// used for optimistic concurrency (see Devices/DevicesVersion). Returns
// ok=false (not an error) specifically when the condition fails, so the
// caller can retry from a fresh read instead of treating it as a hard
// failure.
func (t *UsersTable) updateAVConditional(ctx context.Context, userID string, set map[string]types.AttributeValue, condition string, condValues map[string]types.AttributeValue) (ok bool, err error) {
	key, err := attributevalue.MarshalMap(map[string]string{"user_id": userID})
	if err != nil {
		return false, err
	}

	names := map[string]string{}
	values := map[string]types.AttributeValue{}
	var setClauses []string

	i := 0
	for attr, val := range set {
		nameKey, valKey := fmt.Sprintf("#n%d", i), fmt.Sprintf(":v%d", i)
		names[nameKey] = attr
		values[valKey] = val
		setClauses = append(setClauses, fmt.Sprintf("%s = %s", nameKey, valKey))
		i++
	}
	for k, v := range condValues {
		values[k] = v
	}

	input := &dynamodb.UpdateItemInput{
		TableName:                 &t.name,
		Key:                       key,
		UpdateExpression:          aws.String("SET " + strings.Join(setClauses, ", ")),
		ConditionExpression:       aws.String(condition),
		ExpressionAttributeNames:  names,
		ExpressionAttributeValues: values,
	}
	_, err = t.client.UpdateItem(ctx, input)
	if err != nil {
		var condFailed *types.ConditionalCheckFailedException
		if errors.As(err, &condFailed) {
			return false, nil
		}
		return false, err
	}
	return true, nil
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

// ClearWebAuthnCredential forces a fresh OTP + re-registration before any
// device can use biometric/PIN refresh again — called after a device swap
// (TD-054), since a single shared credential (TD-049: one per user, not per
// device) can't be selectively revoked for just the evicted device. Without
// this, an evicted device could keep refreshing for up to otpVerifiedWindow
// (7 days) via a credential it registered before being swapped out (found
// in code review 2026-10-06).
func (t *UsersTable) ClearWebAuthnCredential(ctx context.Context, userID string) error {
	return t.update(ctx, userID, nil, []string{"webauthn_credential"})
}

// SetVerifiedUntil records how long a biometric/PIN refresh may mint new
// access tokens without another OTP — see User.VerifiedUntil.
func (t *UsersTable) SetVerifiedUntil(ctx context.Context, userID string, until time.Time) error {
	return t.update(ctx, userID, map[string]string{"verified_until": until.UTC().Format(time.RFC3339)}, nil)
}
