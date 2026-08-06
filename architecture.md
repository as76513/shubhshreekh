# Architecture

## Guiding principle
**Never trust the client.** The Flutter app is a presentation layer. Every
security decision — who you are, what tier you're on, what data you may see —
is made server-side from a **verified Cognito JWT**.

## MVP components

### Flutter app (mobile/)
- Handles login via Cognito hosted UI, stores tokens in secure storage
- Sends `Authorization: Bearer <access_token>` on every API call
- Renders whatever the API returns — it does **not** decide entitlements

### Go API (backend/)
- **auth.Middleware** — verifies the JWT against the Cognito pool's JWKS,
  puts trusted claims in the request context
- **auth.RequireSubscription** — gates premium routes server-side
- Handlers read identity only from verified context claims

### AWS Cognito
- User pool = source of truth for identity
- Cognito **groups** map to subscription tiers (`basic`, `premium`)
- Group membership rides in the token → becomes `claims.Subscription`

### DynamoDB
- `users` and `subscriptions` tables (always-free tier, unlike RDS)

## Request flow

```
1. User logs in via Cognito hosted UI        → app gets JWT
2. App calls GET /market/premium-signals      → sends Bearer token
3. auth.Middleware verifies token (JWKS)      → claims in context
4. auth.RequireSubscription("premium") checks → 403 if not entitled
5. Handler returns data                        → only if all checks pass
```

## Why subscription lives in the token
If entitlement came from a request field or a client flag, any user could
forge it. Because it's derived from a **Cognito-signed** claim the client
can't alter, the tier check is trustworthy. This is the same principle behind
the Phase 4 MCP layer: the AI agent's tools do the same server-side
entitlement check before returning any data.

## Phase 4 — AI layer (later)
```
User question → Agent → MCP tools (entitlement-checked) → RAG → grounded answer
```
The MCP server reuses the *same* entitlement logic, so the AI can never surface
data above the user's tier.
