package db

import (
	"context"
	"time"

	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
)

type User struct {
	UserID      string `dynamodbav:"user_id"`
	PhoneNumber string `dynamodbav:"phone_number"`
	Name        string `dynamodbav:"name"`
	CreatedAt   string `dynamodbav:"created_at"`
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
