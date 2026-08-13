# Architecture

**Status:** web-first is the committed direction (see [plan.md](plan.md) for
the stack-decision record). The earlier native-Flutter plan is retired.

## Guiding principle
**Never trust the client.** The Next.js frontend (web, installable PWA, and a
TWA-wrapped Android build for the Play Store) is a presentation layer only.
Every security decision — who you are, what tier you're on, what data you may
see — is made server-side from a **verified session token**.

## MVP components

### Next.js frontend (src/)
- Web app + installable PWA; later wrapped as a TWA for the Play Store (see
  [build-plan.md](build-plan.md) Phase 4) — same codebase, no separate mobile client
- Handles login, stores the session token (secure storage / httpOnly cookie)
- Sends `Authorization: Bearer <token>` on every API call
- Renders whatever the API returns — it does **not** decide entitlements

### Go API (backend/)
- **auth.Middleware** — verifies the self-signed session JWT (HMAC secret
  held server-side), puts trusted claims in the request context — see
  `backend/internal/auth`, already built
- **auth.RequireSubscription** — gates premium routes server-side
- Handlers read identity only from verified context claims

### Identity provider — **decided: MSG91 SendOTP (SMS)**
Decided 2026-08-13 (see [plan.md](plan.md) for the full tradeoff record
against Cognito and Firebase). MSG91's send-OTP/verify-OTP endpoints
(build-plan.md Phase 2) sit in front of the already-built `backend/internal/auth`
package: on successful OTP verification, the backend creates/looks up the
user row in DynamoDB and issues its own signed session token
(`auth.IssueToken`) carrying the tier claim — no JWKS, no third-party token
format, MSG91 never sees anything past OTP delivery/verification.

### DynamoDB
- `users`, `subscriptions`, `orders` tables (always-free tier, unlike RDS)

## Where each piece of data lives
Nothing sensitive is stored in the browser/app — only a session token in
memory/secure storage. All real data is server-side.

| Data | Home | Notes |
|---|---|---|
| Identity (phone, verified flag, user ID) | Identity provider + **DynamoDB** | Provider runs OTP; your DB stores the resulting user record |
| Profile, subscription tier, watchlist, prefs | **DynamoDB** | `users`, `subscriptions`, `watchlists` tables |
| Payment / order records | **DynamoDB** (`orders`) | Store Razorpay IDs + verified status only — **never card/UPI details** |
| Card / UPI sensitive data | **Razorpay** (not us) | Keeps you out of PCI scope entirely |
| Advisory content (ideas, ratings) | **DynamoDB** or small relational | Your actual RA product data |
| Advice audit log (who saw what, when) | **DynamoDB / S3 (append-only)** | SEBI RAs must retain records — see plan.md compliance section |
| Static assets | **S3 + CloudFront** | App shell, images |

## Request flow

```
1. User logs in (phone + MSG91 OTP) → app gets a session token
2. App calls GET /market/premium-signals      → sends Bearer token
3. auth.Middleware verifies token             → claims in context
4. auth.RequireSubscription("premium") checks → 403 if not entitled
5. Handler returns data                        → only if all checks pass
```

## Why subscription lives in the token
If entitlement came from a request field or a client flag, any user could
forge it. Because it's derived from a **server-signed** claim the client
can't alter, the tier check is trustworthy. This is the same principle behind
the Phase 5 AI layer: the AI agent's tools do the same server-side
entitlement check before returning any data.

## Payment flow (the security-critical part)

```
1. User taps "Choose Premium"        (browser)
2. Browser asks backend to create an order   → POST /orders {planId:"premium"}
3. Backend looks up price SERVER-SIDE (never trusts client amount),
   calls Razorpay, returns razorpay_order_id
4. Browser opens Razorpay checkout with that order_id
5. User pays; Razorpay returns order_id + payment_id + SIGNATURE to browser
6. Browser sends all three to backend   → POST /payments/verify
7. Backend RE-COMPUTES the HMAC signature with the Razorpay key secret
   and compares. Only if it matches:
8. Backend writes the subscription to DynamoDB and grants access
```

The golden rule: **the browser never decides that a payment succeeded.**
Razorpay signs the result; the Go backend verifies that signature
(`payments.VerifyPaymentSignature`) before granting anything. A tampered
client can't fake a payment or pay the wrong amount, because both the price
and the verification live server-side.

---

## Diagrams

Two views of the **MVP** (see [build-plan.md](build-plan.md)): the
end-to-end user scenario, and the system architecture. A third section covers
the live price feed, which is a **post-MVP addition**, not part of either.

### 1. End-to-end user scenario (MVP)

What the user actually experiences, from opening the app to seeing their
watchlist.

```
              ┌─────────────────────┐
              │   User opens app    │
              │ Next.js web / PWA   │
              └──────────┬──────────┘
                         ▼
              ┌─────────────────────┐
              │      Logs in        │
              │ phone + MSG91 OTP   │
              └──────────┬──────────┘
                         ▼
              ┌─────────────────────┐
              │  Receives session   │
              │ token, stored securely│
              └──────────┬──────────┘
                         ▼
              ┌─────────────────────┐
              │ Backend verifies    │
              │ token + reads tier  │
              └──────────┬──────────┘
                 ┌───────┴───────┐
                 ▼               ▼
         ┌─────────────┐   ┌─────────────┐
         │ Basic tier  │   │Premium tier │
         │ std watchlist│  │prem signals │
         └─────────────┘   └─────────────┘
```

**The flow:** open → log in → receive token → backend checks identity and
subscription tier → user sees exactly the data their tier allows. (No live
price feed yet — see the post-MVP section below.)

### 2. System architecture (MVP)

The components and the single standard request/response path.

```
   ┌──────────────┐                    ┌──────────────────────┐
   │ Next.js app  │───── authn ───────▶│ Identity provider     │
   │ (web / PWA,  │                    │ MSG91 SendOTP (SMS)   │
   │ later TWA)   │                    │ + self-signed session │
   └──────┬───────┘                    └──────────────────────┘
          │
   STANDARD PATH
   200–400ms
          │
          ▼
   ┌─────────┐
   │   API   │
   │ Gateway │
   │(HTTP API)│
   └────┬────┘
        ▼
   ┌─────────┐
   │ Lambda  │
   │  (Go)   │
   │ auth+authz│
   └────┬────┘
        ▼
   ┌─────────┐
   │DynamoDB │
   │users/subs│
   └─────────┘

 Frontend hosting: S3 (private) + CloudFront — see infra/README.md
 Cross-cutting: SSM Parameter Store · CloudWatch · Route 53
 Domain: app.shubhshreeknowledgehub.com (frontend, live via Amplify) ·
         api.shubhshreeknowledgehub.com (backend, incl. /auth/send-otp +
         /auth/verify-otp — no separate auth subdomain needed) — see plan.md
```

**Standard path** (API Gateway → Lambda → DynamoDB): login, profile,
watchlist, subscription checks. Request-in/response-out. 200–400ms is
imperceptible for these — no need for always-on compute.

### 3. Post-MVP: live price feed (WebSocket fast path)

**Not built in the 12-week MVP** (see build-plan.md Phase 6) — added later
once the core product is live. Kept here so the eventual design is on record.

```
   ┌──────────────┐
   │ Next.js app  │
   └──────┬───────┘
          │ FAST PATH (low latency)
          ▼
   ┌─────────────────┐
   │  WebSocket feed  │
   │  persistent conn │
   └────────┬─────────┘
            ▼
   ┌─────────────────┐
   │ Market data API  │
   │ external provider│
   └──────────────────┘
```

**Why a separate path:** the live price ticker needs a persistent connection
that streams updates continuously, so there's no per-tick request/response
and no Lambda cold-start penalty — the standard path above isn't built for
that. This is how the app would meet a low-latency requirement without
running always-on Fargate for everything.

The identity provider governs identity for both paths. Entitlement (tier)
would be enforced server-side in the Lambda authz layer and re-used by the
WebSocket filter, so a Basic user's feed can't carry Premium symbols.

**Scaling note:** start with API Gateway's WebSocket API. A small always-on
connection manager is only needed if you outgrow that — see
[plan.md](plan.md) costs, Stage 3.

## Post-MVP: Phase 5 — AI layer
```
User question → Agent → MCP tools (entitlement-checked) → RAG → grounded answer
```
The MCP server reuses the *same* entitlement logic, so the AI can never surface
data above the user's tier.
