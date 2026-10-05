// Package auth issues and verifies the app's session token. The identity
// provider (Cognito vs phone-OTP) is still an open decision — see plan.md's
// "Open decision" section — so this package uses a self-signed HMAC JWT for
// now. If Cognito is chosen instead, only VerifyToken's key source changes
// (HMAC secret -> JWKS); callers of FromContext are unaffected either way.
package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims mirrors architecture.md's entitlement model: the subscription tier
// and role ride in the token itself so neither can be forged by the client.
type Claims struct {
	Subscription string `json:"subscription"`
	// Role is "customer" (default), "analyst", "compliance", or "admin" —
	// see architecture.md's RA content platform roles table. Only
	// analyst/admin may write to /admin/insights/*.
	Role string `json:"role"`
	jwt.RegisteredClaims
}

func IssueToken(secret []byte, userID, subscription, role string, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := Claims{
		Subscription: subscription,
		Role:         role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			Issuer:    "shubhshreekh-backend",
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secret)
}

// VerifyToken pins the signing algorithm to HS256 — without this, a client
// could set alg:"none" or switch algorithms to forge a token that
// ParseWithClaims would otherwise accept.
func VerifyToken(secret []byte, raw string) (*Claims, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(raw, claims, func(t *jwt.Token) (interface{}, error) {
		return secret, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Name}))
	if err != nil {
		return nil, err
	}
	return claims, nil
}
