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
- `users`, `subscriptions`, `orders` — auth & billing (partially built)
- `content` — RA-authored product data (insights, courses, videos)
- `content_audit` — append-only delivery/view log (SEBI retention)
- ~~`market_snapshots`~~ — **deferred** (no live vendor feed in MVP)

## Two data pipes (do not mix them)

Customers see two **independent** data sources on the dashboard. They must
never be confused in code or ops:

| Pipe | Source | Who creates it | MVP status |
|---|---|---|---|
| **A — Market indices** | Authorised vendor API | Automated (exchange prices) | **Deferred** — TrueData no API; ticker stays static in `data.ts` |
| **B — RA research & education** | Your analyst team via admin CMS | Human (SEBI RA) | Not built — static mock in `data.ts` |

Pipe B is **your product** — trading calls, courses, videos —
published through an internal admin tool, stored in DynamoDB, gated by
subscription tier server-side. Pipe A is optional ticker context only.

```
  PIPE A (market) — DEFERRED               PIPE B (RA content) — MVP
  ─────────────────                       ────────────────────
  NSE/BSE indices                         Research Analyst
       │                                       │
       ▼                                       ▼
  (vendor API when available)          Admin CMS (internal)
       │                               app…/admin or admin.*
       ▼                                       │
  GET /market/indices (later)                  ▼
                                       Go API writes/reads
                                       POST /admin/insights …
                                               │
       ┌──────────────┬────────────────────────┘
       ▼              ▼
  Static ticker   Next.js customer app
  (data.ts)       (never decides tier)
```

**Current state:** Pipe B does not exist yet — all product content is static
mock data in `src/lib/data.ts`. Pipe A is **out of MVP** — ticker values stay
hardcoded in the same file until a vendor grants API access.

**Oct 8 sprint:** ship a **thin insights CMS** (admin form + DynamoDB insight
rows + `GET /insights`) so the RA can publish daily stock calls without a
deploy. Courses / videos remain on `data.ts` until Phase 4 completes.

## RA content platform (Pipe B)

### Roles (carried in session JWT after OTP login)

| Role | Who | Can do |
|---|---|---|
| `customer` | Subscriber | Read published content their tier allows |
| `analyst` | RA team | Create/edit drafts, submit for review |
| `compliance` | Compliance officer | Approve/reject before publish (optional v1) |
| `admin` | Owner / tech | Publish, archive, manage all content |

v1 can collapse `analyst` + `admin` if the RA principal publishes directly;
add `compliance` approval step before charging real users (coordinate with
SEBI advisor — see plan.md).

### Publish workflow

```
  draft → [review] → published → archived
           ↑ optional
      compliance role
```

1. Analyst fills form in **admin CMS** (internal web UI, not customer-facing).
2. Content saved as `status: draft` in DynamoDB.
3. Optional: compliance approves → `status: approved`.
4. Admin/analyst hits **Publish** → `status: published`, `publishedAt` set.
5. Customer app calls `GET /insights` (etc.) → API returns only
   `published` items the user's tier may see.
6. Every customer view of a call can append to `content_audit` (userId,
   contentId, viewedAt) for SEBI record-keeping.

### DynamoDB — `content` table (single-table design)

One table keeps access patterns simple at MVP scale. Partition key + sort key
plus GSIs for listing by type and publish date.

**Primary keys**

| PK | SK | Entity |
|---|---|---|
| `INSIGHT#<id>` | `META` | Trading call / market insight |
| `MF#<id>` | `META` | MF alert |
| `COURSE#<id>` | `META` | Course metadata |
| `COURSE#<id>` | `CHAPTER#<n>` | Course chapter |
| `VIDEO#<id>` | `META` | Video tutorial |

**GSI1 — list published content by type** (customer feeds)

| GSI1PK | GSI1SK | Purpose |
|---|---|---|
| `TYPE#insight` | `PUBLISHED#<iso8601>` | Insights page, newest first |
| `TYPE#course` | `PUBLISHED#<iso8601>` | Courses page |
| `TYPE#video` | `PUBLISHED#<iso8601>` | Videos page |

Only rows with `status: published` get GSI1 keys written.

**Example — insight (`INSIGHT#` / `META`)**

```json
{
  "pk": "INSIGHT#7f3a…",
  "sk": "META",
  "gsi1pk": "TYPE#insight",
  "gsi1sk": "PUBLISHED#2026-08-24T10:30:00Z",
  "status": "published",
  "tier": "pro",
  "action": "BUY",
  "stock": "Reliance Industries",
  "symbol": "RELIANCE",
  "category": "Large Cap",
  "timeframe": "Short Term",
  "cmp": 2920,
  "target": 3200,
  "stopLoss": 2780,
  "returnsPct": 9.6,
  "rationale": "Breakout above 200-DMA with volume…",
  "publishedAt": "2026-08-24T10:30:00Z",
  "publishedBy": "user#analyst-uuid",
  "createdAt": "…",
  "updatedAt": "…"
}
```

**Example — course chapter**

```json
{
  "pk": "COURSE#abc…",
  "sk": "CHAPTER#3",
  "title": "Support and Resistance",
  "duration": "12 min",
  "free": false,
  "videoKey": "s3://content-bucket/courses/abc/ch3.mp4"
}
```

Media files (video MP4, thumbnails, PDFs) live in **S3**; DynamoDB stores
metadata + S3 keys only. CloudFront signed URLs for Pro content.

### DynamoDB — `content_audit` table (append-only)

| PK | SK | Fields |
|---|---|---|
| `USER#<userId>` | `VIEW#<iso8601>#<contentId>` | contentType, contentId, tierAtView |

Optional publish-side audit in same table or S3 parquet export for long retention.

### API routes

**Customer routes** (Bearer JWT, tier checked server-side)

| Method | Path | Returns |
|---|---|---|
| `GET` | `/insights` | Published trading calls (filter: category, action) |
| `GET` | `/insights/:id` | Single call + writes audit log |
| `GET` | `/courses` | Published courses (metadata) |
| `GET` | `/courses/:id` | Course + chapters; Pro chapters gated |
| `GET` | `/videos` | Published videos |

Free-tier responses omit Pro-only fields or return `locked: true` stubs —
**never** send full Pro content and rely on the UI to hide it.

**Admin routes** (Bearer JWT + `role ∈ {analyst, admin, compliance}`)

| Method | Path | Action |
|---|---|---|
| `POST` | `/admin/insights` | Create draft |
| `PATCH` | `/admin/insights/:id` | Edit draft |
| `POST` | `/admin/insights/:id/publish` | Set published + GSI1 keys |
| `POST` | `/admin/insights/:id/archive` | Remove from customer feeds |
| `POST` | `/admin/courses` | Create course + chapters |
| `POST` | `/admin/videos` | Create video metadata |
| `POST` | `/admin/media/upload-url` | Presigned S3 URL for video/thumbnail |

Admin UI: internal route on the Next.js app (`/admin/*`) or separate
`admin.shubhshreeknowledgehub.com` subdomain — see plan.md.

### Replacing `src/lib/data.ts`

Migration path:

1. Build content APIs + seed DynamoDB from current mock data.
2. Switch `TradingCalls.tsx`, etc. to `fetch` from API.
3. Delete static arrays from `data.ts` (keep types only).
4. Admin CMS becomes the only way to add/update calls — no deploy needed
   for each new insight.

## Market indices API (Pipe A) — **deferred (out of MVP)**

**Decided 2026-09-11:** TrueData did not provide API access. Live / delayed
vendor indices are **not in MVP**. Dashboard and landing tickers keep using
**static mock values** in `src/lib/data.ts`. Do not build `GET /market/indices`,
a vendor poller, or `market_snapshots` until a vendor is confirmed.

When revived later, preferred shape:

- **5 symbols:** NIFTY 50, NIFTY BANK, SENSEX, NIFTY IT, optional INDIA VIX
- **Fields:** LTP, prev close, open/high/low, change %, timestamp
- **Backend:** vendor REST (preferred) or WebSocket → cache → `GET /market/indices`
- **Frontend never** holds vendor keys; show delay disclaimer if not real-time
- **F&O feeds** remain a later stage (unchanged)

Reference design (kept for when a vendor unlocks):

```json
{
  "asOf": "2026-08-24T09:15:32+05:30",
  "delayMinutes": 0,
  "source": "<vendor>",
  "indices": [
    {
      "symbol": "NIFTY 50",
      "name": "NIFTY 50",
      "ltp": 24312.45,
      "prevClose": 24150.15,
      "change": 162.30,
      "changePct": 0.67,
      "up": true
    }
  ]
}
```

Nothing sensitive is stored in the browser/app — only a session token in
memory/secure storage. All real data is server-side.

| Data | Home | Notes |
|---|---|---|
| Identity (phone, verified flag, user ID) | Identity provider + **DynamoDB** | Provider runs OTP; your DB stores the resulting user record |
| Profile, subscription tier, watchlist, prefs | **DynamoDB** | `users`, `subscriptions`, `watchlists` tables |
| Payment / order records | **DynamoDB** (`orders`) | Store PayU txn / mihpayid + verified status only — **never card/UPI details** |
| Card / UPI sensitive data | **PayU** (not us) | Keeps you out of PCI scope entirely |
| Advisory content (insights, courses, videos) | **DynamoDB** (`content`) + **S3** (media) | RA team publishes via admin CMS — see § RA content platform |
| Market index quotes (NIFTY, SENSEX, …) | **Static `data.ts` (MVP)** | Live vendor path deferred — see § Market indices API |
| Advice audit log (who saw what, when) | **DynamoDB** (`content_audit`) / S3 export | SEBI RAs must retain records — see plan.md compliance section |
| Static assets | **S3 + CloudFront** | App shell, images, course videos (signed URLs for Pro) |

## Request flow

```
1. User logs in (phone + MSG91 OTP) → app gets a session token
2. App calls GET /insights                      → sends Bearer token
3. auth.Middleware verifies token             → claims in context
4. auth.RequireSubscription("pro") checks     → 403 if not entitled
5. Handler reads DynamoDB `content` table       → only published + allowed tier
6. Optional: append row to `content_audit`      → SEBI delivery record
```

Market ticker (MVP) is **frontend-only static data** — no market API call.

## Why subscription lives in the token
If entitlement came from a request field or a client flag, any user could
forge it. Because it's derived from a **server-signed** claim the client
can't alter, the tier check is trustworthy. This is the same principle behind
the Phase 7 AI layer: the AI agent's tools do the same server-side
entitlement check before returning any data.

## Payment flow (the security-critical part)

```
1. User taps "Choose Premium"        (browser)
2. Browser asks backend to create an order   → POST /orders {planId:"premium"}
3. Backend looks up price SERVER-SIDE (never trusts client amount),
   builds PayU payment hash with merchant salt, returns checkout params
4. Browser opens PayU checkout (Bolt / hosted) with those params
5. User pays; PayU returns success/failure + response hash to browser (or redirects)
6. Browser sends result to backend   → POST /payments/verify
7. Backend RE-COMPUTES the response hash with the PayU merchant salt
   and compares. Only if it matches and status is success:
8. Backend writes the subscription to DynamoDB and grants access
   (also accept PayU server-to-server / webhook as backup)
```

The golden rule: **the browser never decides that a payment succeeded.**
PayU signs the result; the Go backend verifies that hash
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
   ┌─────────┐     ┌──────────────┐
   │DynamoDB │     │ S3 (media)   │
   │users    │     │ content/media│
   │content  │     └──────────────┘
   │audit    │
   └─────────┘
   (market vendor cache deferred)

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

**Deferred** — requires a market-data vendor first (Pipe A). Not in MVP
(see build-plan.md Phase 8 / deferred Phase 5). Kept here so the eventual
design is on record.

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

## Post-MVP: Phase 7 — AI layer
```
User question → Agent → MCP tools (entitlement-checked) → RAG → grounded answer
```
The MCP server reuses the *same* entitlement logic, so the AI can never surface
data above the user's tier.
