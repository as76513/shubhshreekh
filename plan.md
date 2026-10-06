# Plan — Requirements & Technical Decisions

This is the requirements/decision-record file: what was decided, why, what's
still open, what it costs, and what's regulatory. For *how the system works*
see [architecture.md](architecture.md); for *when things get built* see
[build-plan.md](build-plan.md).

---

## Stack decisions

| Layer | Earlier plan | Now | Why it changed |
|---|---|---|---|
| Frontend | Flutter (mobile) | **Next.js / React (web + PWA)** | One codebase serves desktop web, mobile web, and installable app (TWA → Play Store) |
| Frontend hosting | *(unspecified)* | **CloudFront + S3** (static export, Mumbai origin) | All-AWS, IaC-native, full control, best AWS learning; frontend is a static Next.js export that calls the Go API |
| Backend | Go API | **Go API** (unchanged) | — |
| Primary DB | DynamoDB | **DynamoDB** (unchanged) | Key-based access patterns fit |
| Auth | Cognito | **MSG91 phone-OTP (SendOTP), SMS channel** — decided, see below | Phone-OTP + Indian SMS/DLT fit; own the backend |
| Payments | Stripe / Razorpay | **PayU** (web) + **Google Play Billing** (Play TWA) | PayU for browser; Play policy requires Play Billing (or billing choice) inside Play-distributed app — see Oct 18 sprint |
| Hosting | Serverless | **Lambda + API Gateway** (unchanged) | Scales to zero |

## Decided: identity provider — MSG91 (SendOTP, SMS channel)

**Decided 2026-08-13** (build-plan.md Week 4 Monday). Chosen over both AWS
Cognito and Firebase phone-auth:

| | AWS Cognito | Firebase Phone Auth | **MSG91 SendOTP (chosen)** |
|---|---|---|---|
| Entitlement model | Cognito groups → JWT, verified via JWKS | Firebase-issued token | Custom signed session token (self-signed HMAC JWT — already built, see architecture.md) |
| Indian SMS/DLT fit | Manual DLT linking to SNS; silent delivery failures if done wrong | Same underlying DLT problem, not India-specialized | Purpose-built for India; guided DLT onboarding |
| Cost per OTP (India, SMS) | ~₹0.24–0.25 *(only if DLT correctly linked)* | ~₹0.85–0.88 (3.5–6x pricier) | ~₹0.15–0.25 (volume-based) |
| Custom domain | `auth.<domain>` needs an ACM cert in us-east-1 | Not needed | Not needed — OTP flow lives under `api.<domain>` |
| Backend work | Less custom auth code (JWKS verification is standard) | Firebase Admin SDK integration | You own send-OTP/verify-OTP/session-issuance — already scaffolded (`backend/internal/auth`) |

**Why MSG91 over Cognito specifically:** near-identical per-message cost, but
MSG91's guided DLT registration removes the single biggest early-stage risk —
a new user's OTP silently failing to deliver because DLT wasn't linked
correctly. Also keeps the vendor stack India-first, consistent with PayU.

**Channel: SMS only for now, not WhatsApp.** WhatsApp OTP is cheaper per
message (~₹0.115–0.134 domestic) but MSG91's WhatsApp product carries its own
₹500/month platform fee (after a 2-month promo) on top of the per-message
rate — at MVP volume that fixed cost outweighs the per-message savings
(breakeven is roughly 6,000–7,000+ OTPs/month). Revisit once volume justifies
it; the SendOTP integration doesn't need to change to add it later.

The tier claim is still server-signed and client-unforgeable either way —
this doesn't change the entitlement model in architecture.md.

---

## Decided: two data pipes — market vs RA content

**Decided 2026-09-07** (pipes). **Updated 2026-09-11:** Pipe A deferred.

Customer-facing data conceptually has two independent sources (see
architecture.md § Two data pipes):

| Pipe | Source | MVP status |
|---|---|---|
| **A — Market indices** | Authorised vendor API (was TrueData) | **Deferred** — no vendor API; ticker stays static mock in `data.ts` |
| **B — RA research & education** | Analyst team via internal admin CMS → DynamoDB | **Thin insights CMS in Oct 18 sprint**; courses/videos still static until after launch |

Pipe B is the **core product** (insights, courses, videos) and is
what MVP builds. Pipe A is optional context for the headline ticker — **not
in MVP scope** until a vendor grants API + redistribution terms.

---

## Decided: Pro-only pricing & trial model

**Decided 2026-10-06**, via RA/business-stakeholder input (see TECH_DEBT.md
TD-052–059). Supersedes the earlier assumed free/pro split:

- **One product, not two tiers.** The Free tier is removed entirely. What
  was "Pro" is now the only paid product, marketed as **"Pro (7-day free
  trial)"** — every new signup gets 7 days of full access automatically,
  not a separate lower tier to fall back to.
- **Hard revoke on trial expiry.** If the client hasn't paid by day 7,
  access is revoked entirely — there is no reduced/free fallback state to
  land in, unlike the old free tier.
- **Anti-piracy device limit, not session-kicking.** Each account may have
  at most **2 registered/identified devices** (the brief: "one mobile, one
  laptop"). A 3rd, unrecognized device is **rejected at login** — existing
  registered devices are never silently logged out to make room. Freeing a
  slot is self-service ("log out other device") with a cooldown, to stop
  that itself being used to get more than 2 effective devices in rotation.
- **Three plans, discount is admin-configurable.** Monthly / Quarterly /
  Annual, displayed with a struck-through anchor price and a discounted
  price (50% at launch, landing ~₹1000–1200/month), behind a **72-hour**
  countdown timer per client (starts at trial signup) with "bright, flashy"
  urgency styling. The discount **percentage is stored server-side and
  admin-editable** (not a hardcoded constant) specifically so it can be
  bumped during festive sales without a deploy.
- **`/orders` (TD-011, not yet built) must be designed against this model
  from the start** — it's the reason TD-052–055 were pulled into the Oct 18
  critical path (see build-plan.md) rather than deferred: a checkout can't
  be built correctly against a pricing/entitlement model that doesn't exist
  yet in the backend.

**Explicitly deferred past 18 Oct** (same stakeholder round, but no payment
dependency — see TECH_DEBT.md TD-056–059): a Live/Past/Closed-trades nav
restructure with an F&O/Equity toggle, a customer-facing "Blogs" tab
sourced from the admin's daily market-overview posts, admin-uploadable
weekly PDF (replacing the static file), and an F&O-specific SMS alert +
app-open popup for the latest live trade.

---

## RA content publishing (Pipe B)

### Who publishes what

| Content | Published by | Stored in | Customer sees via |
|---|---|---|---|
| Trading insights / calls | Research Analyst | DynamoDB `content` | `GET /insights` |
| Courses + chapters | Research Analyst / ops | DynamoDB + S3 video | `GET /courses` |
| Video tutorials | Research Analyst / ops | DynamoDB + S3 | `GET /videos` |
| NIFTY / SENSEX ticker | **Static mock** (MVP) | `src/lib/data.ts` | Frontend only — no `/market/*` until a vendor is available |

### Admin CMS (internal — not built yet)

- **Who uses it:** RA team (`analyst` role) and optionally compliance (`compliance` role).
- **Where:** `/admin` routes on the app subdomain, or `admin.shubhshreeknowledgehub.com` (open — prefer `/admin` for MVP to avoid another cert).
- **Workflow:** draft → optional compliance review → published → archived.
- **No deploy for new calls:** analyst publishes in CMS; customers see it on next API fetch.

**Oct 18 sprint slice (decided 2026-09-11, deadline moved 2026-10-05):** ship
a **thin insights CMS**
only — `/admin` form + DynamoDB insight rows + `GET /insights`. Courses
and videos stay on static `data.ts` until after launch. No queues/webhooks.

### Roles (JWT claims)

| Role | Purpose |
|---|---|
| `customer` | Default after OTP signup |
| `analyst` | Create/edit/publish RA content |
| `compliance` | Approve before publish (add before charging users) |
| `admin` | Full access + user management |

### SEBI implications (coordinate with compliance advisor)

- Each published call should retain: author, publish time, text of recommendation, tier, and who viewed it (`content_audit`).
- Disclaimers and RA registration number on every insights page (already in UI placeholders).
- When live market data returns later, ticker must show **data delay** if
  not real-time per license.

---

## Market data — indices API (Pipe A) — **deferred**

### Decided 2026-09-11: no live vendor feed in MVP

**TrueData did not provide API access**, so we are **dropping live market
data from MVP**. The dashboard / landing ticker continues to use **static
values in `src/lib/data.ts`**. No `GET /market/indices`, no vendor poller,
no `market_snapshots` table for launch.

| In MVP | Out of MVP (revisit later) |
|---|---|
| Static NIFTY / SENSEX-style ticker (mock) | Authorised vendor REST/WebSocket |
| RA content platform (Pipe B) | `GET /market/indices` + DynamoDB cache |
| Auth, payments, PWA / Android | Live / delayed redistribution licence |

If a vendor (TrueData, Global Datafeeds, DhanHQ, or other) later grants
**indices-only API + commercial redistribution**, revive the design in
architecture.md § Market indices API (deferred) and build-plan Phase 5
(deferred). Prefer **REST** for a Lambda poller if both options exist.

**F&O market data** remains later-stage only (unchanged).

---

## Domain & subdomains

**Registered domain:** `shubhshreeknowledgehub.com` (superseded the earlier
`shubhshreekh.com` placeholder used in early drafts of these docs — the
product/brand name is unchanged, only the registered domain string is
different).

**Status:** web-first (Next.js web app + installable PWA), with a **TWA**
(Trusted Web Activity) wrapper for the Play Store listing — see
[build-plan.md](build-plan.md) Phase 4. There is no separate native app
codebase; the TWA just wraps the same PWA.

**Root vs. app split (decided):** unlike the original single-domain draft,
the product and the marketing site live on different subdomains:
- `app.shubhshreeknowledgehub.com` — the actual Next.js PWA/product. **Already
  live**: the Amplify stand-in (see build-plan.md Week 1 / infra/README.md)
  is pointed here.
- `shubhshreeknowledgehub.com` (root) — a separate marketing/landing site,
  not yet built.

A domain plays **five distinct roles** here.

### 1. App subdomain — `app.shubhshreeknowledgehub.com`
Where the Next.js PWA itself is served from (Amplify now; CloudFront once
restored — see infra/README.md's "Amplify mode (temporary)" section).

### 2. API subdomain — `api.shubhshreeknowledgehub.com`
The Next.js frontend needs a stable, branded endpoint to call.
- Route 53 record → API Gateway (or ALB / your Go server)
- ACM certificate for HTTPS
- Frontend config points at `https://api.shubhshreeknowledgehub.com`

### 3. Auth custom domain — not needed
Was reserved for a Cognito-hosted login screen (`auth.shubhshreeknowledgehub.com`)
as one branch of the identity-provider decision. Now that MSG91 SendOTP
phone-OTP is decided (see "Decided: identity provider" above), there's no
Cognito hosted UI to brand — the OTP flow is just two endpoints under
`api.shubhshreeknowledgehub.com` (`/auth/send-otp`, `/auth/verify-otp`). No
separate auth subdomain, no us-east-1 ACM cert.

### 4. Android App Links (deep linking) — the well-known file
Lets `https://app.shubhshreeknowledgehub.com/...` links open **directly in
the installed TWA** instead of a browser (password resets, verification
links, share links) — the TWA wraps the `app.` subdomain, not the marketing
root, so this file and the deep links it verifies both live under `app.`.

Host this at `https://app.shubhshreeknowledgehub.com/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.shubhshreekh.app",
    "sha256_cert_fingerprints": ["<YOUR_APP_SIGNING_SHA256>"]
  }
}]
```

Bubblewrap generates this file (and the Android manifest's intent filter)
automatically from your PWA manifest when you build the TWA — see
build-plan.md Phase 4, Week 11. (iOS later uses
`apple-app-site-association` the same way, if an equivalent wrapper is ever
built for iOS.)

### 5. Marketing / landing page — `shubhshreeknowledgehub.com` (root)
A separate public face, not yet built:
- App description + screenshots
- "Get it on Google Play" button → your Play Store listing
- Privacy policy + terms (Play Store **requires** a privacy-policy URL — host it here)

### Summary

| Subdomain / path | Role |
|:---|:---|
| `shubhshreeknowledgehub.com` (root) | Marketing site + privacy policy (required by Play Store) — not yet built |
| `app.shubhshreeknowledgehub.com` | The Next.js PWA/product — **live now** via Amplify |
| `api.shubhshreeknowledgehub.com` | Backend API the frontend calls, incl. `/auth/*`, `/insights`, `/admin/*` (no `/market/*` in MVP) |
| `app.shubhshreeknowledgehub.com/.well-known/assetlinks.json` | Android App Links (TWA deep linking) |

All of this fits comfortably in Route 53 + ACM, and the certs are free.

---

## 💰 Cost breakdown (AWS Mumbai / ap-south-1)

> Region: **ap-south-1 (Mumbai)** · Currency: **INR** · Rate used: **~₹88/USD**
> **GST (18%)** applies on top unless reclaimed as input tax credit.
> Figures are converted from AWS USD list prices and are **tentative** — verify with the [AWS Pricing Calculator](https://calculator.aws) set to Mumbai.

### Design principle: scale to zero
At every early stage, each service is **serverless and scales to zero when
idle** — you pay per request, not for idle servers. Heavy always-on
infrastructure (Multi-AZ RDS, Fargate clusters, ALB, WAF) is deferred until
real usage and downtime cost justify it.

**Core stack:** Next.js (web/PWA, S3 + CloudFront) → API Gateway (HTTP API)
→ Lambda (Go) → **DynamoDB**, with the identity provider (open decision
above) for auth.

**Why DynamoDB (not RDS) early:** this app's access patterns are key-based —
look up a user, their subscription, their watchlist. DynamoDB fits
perfectly, is serverless (≈₹0 at low volume), and its 25 GB free tier never
expires. RDS only earns its place later, *if* complex relational queries
appear — and even then, single-AZ first. Multi-AZ is only for when downtime
costs real money.

### 🟢 Stage 1 — Launch (first ~2 months, ~50 users)
Fully serverless. Everything scales to zero.

| Service | Config | Monthly (INR) |
|---|---|---|
| S3 + CloudFront | Frontend static hosting (Next.js export) — see `infra/` | ₹0–₹50 |
| MSG91 SendOTP | ~50 users × a few OTPs each during launch testing, ~₹0.20/OTP | ₹0–₹50 |
| DynamoDB | On-demand, tiny volume | ₹0–₹50 |
| Lambda | Go API, few thousand calls | ₹0–₹50 |
| API Gateway | HTTP API, low volume | ₹0–₹90 |
| SSM Parameter Store | secrets (instead of Secrets Manager) | ₹0 |
| Route 53 | 1 hosted zone | ~₹45 |
| ACM (SSL) | certs | ₹0 |
| CloudWatch | minimal logs | ₹0–₹100 |
| **Total** | | **≈ ₹100–₹400 / month** |

### 🟡 Stage 2 — Traction (~1,000 users)
Still fully serverless. Costs rise only with actual usage (MSG91 + DynamoDB
+ Lambda). No market-data vendor line item while Pipe A is deferred.

| Service | Monthly (INR) |
|---|---|
| MSG91 SendOTP (~1k users, ~2–3 OTPs/user/mo) | ₹400–₹600 |
| DynamoDB (on-demand) | ₹200–₹800 |
| Lambda | ₹300–₹1,000 |
| API Gateway | ₹300–₹900 |
| CloudWatch + Route 53 + SSM | ~₹300 |
| **Total** | **≈ ₹1,500–₹3,600 / month** |

### 🔴 Stage 3 — Scaling up (~10,000+ users, when it's real)
Introduce heavier pieces **only when metrics justify them**:
- **CloudFront data transfer** grows with traffic — the distribution itself exists from Stage 1 (frontend hosting), but egress cost becomes a real line item at this volume
- **WAF** — fintech security posture (~₹900/mo) — recommended once you have real users
- **Always-on compute** (small ECS/EC2) — only if Lambda cold-starts hurt UX on hot paths
- **RDS single-AZ** — only if you need relational queries DynamoDB can't serve well (Multi-AZ only when downtime costs real money)

| Service | Monthly (INR) |
|---|---|
| MSG91 SendOTP (~10k users, ~2–3 OTPs/user/mo, volume pricing) | ₹3,000–₹6,000 |
| DynamoDB (higher throughput) | ₹2,000–₹5,000 |
| Lambda + API Gateway | ₹2,000–₹5,000 |
| CloudFront + data transfer | ₹2,000–₹4,000 |
| WAF + CloudWatch + SSM | ₹2,000 |
| **Total** | **≈ ₹12,000–₹22,000 / month** |

Driven mostly by **MSG91 volume and DynamoDB throughput**, not fixed
infrastructure. Add a market-data vendor line only if Pipe A is revived.

### ⚡ Optional: AI layer (later phase, adds on top of any stage)
The AI insights layer can **exceed the entire infra cost** — almost all of
it is LLM API calls.

| Component | Monthly (INR) |
|---|---|
| Vector DB (pgvector cheap / Pinecone free tier early) | ₹0–₹25,000 |
| LLM inference (usage-dependent) | ₹5,000–₹80,000+ |
| Embeddings + indexing | ~₹2,000 |

**Control it with:** caching, rate limits, a smaller/cheaper model for
routine queries. For a demo, keep it under ~₹500/month with light usage + a
free vector-DB tier.

### Cost-control guardrails (do these on day one)
1. **AWS Budget alert at ₹500/month** — serverless is cheap, not zero; a runaway Lambda can surprise you.
2. **Use SSM Parameter Store** over Secrets Manager early (free vs ~₹35/secret).
3. **Avoid NAT Gateway** (~₹2,000/mo silent charge) — keep Lambda out of a VPC or use VPC endpoints.
4. **HTTP API** over REST API Gateway (71% cheaper).
5. **Reserved Instances / Savings Plans** — only once you have a *fixed* always-on component (Stage 3+); up to ~69% off with commitment.
6. **No live market-data vendor in MVP** — ticker stays static; revisit only after a vendor grants API + redistribution.

### Bottom line

| Stage | Users | Monthly (INR) |
|---|---|---|
| 🟢 Launch | ~50 | **₹100–₹400** |
| 🟡 Traction | ~1,000 | **₹1,500–₹3,600** |
| 🔴 Scaling | ~10,000+ | **₹12,000–₹22,000** |
| ⚡ + AI layer | any | **+₹500 (demo) → ₹35,000+ (heavy)** |

*Prices tentative, converted at ~₹88/USD from AWS list rates; add 18% GST if
not reclaimable. Verify exact figures in the AWS Pricing Calculator (region:
Mumbai).*

---

## Compliance requirements (SEBI RA — your compliance advisor owns these)

Coordinate with your SEBI compliance advisor from Week 1. These gate
*charging real users*, not building:

- Subscription fees must follow SEBI RA fee norms; proper GST invoicing required
- KYC of subscribers where mandated
- Mandatory grievance-redressal + refund handling
- Retain advice/audit records (the audit-log table in architecture.md)
- Display RA reg. no., BASL membership, standard risk disclaimer

The code implements the *mechanics* correctly (see architecture.md's payment
flow); the *compliance layer* sits on top and is signed off separately.
