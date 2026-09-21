# Build Plan — ShubShreekh

**Active deadline:** **8 October 2026** — public Play Store (AAB) for end users.
See **§ October 8 sprint** below. That plan overrides the old part-time pacing
until the deadline.

**Baseline constraint (post-deadline):** 1.5 hrs/day weekdays ≈ 7.5 hrs/week.
**Approach:** MVP first (auth → plans → payment → ship), AI layer later.
**Honesty note:** the original part-time calendar cannot hit 8 Oct; the sprint
requires ~5–6 hrs/day and hard scope cuts (no live market; **full** CMS
deferred — **thin insights CMS is in scope** so the RA can publish daily
calls without a code deploy).

---

## October 8 sprint (11 Sep → 8 Oct 2026) — **active**

**Window:** 27 calendar days from 11 Sep. **Effort:** ~5–6 hrs/weekday + weekend
buffers (~100–120 hours). **Account:** Organization Play account only (Personal
12×14 closed test will miss the date).

### Definition of done (8 Oct)

End users in India can install from Google Play, sign in with phone OTP,
subscribe via a **Play-compliant** path (Play Billing in TWA, and/or enrolled
billing choice with PayU), and see **RA-published daily insights** from the
API (not only hardcoded `data.ts`). The Research Analyst can add/edit/publish
stock calls from `/admin` without a developer deploy. Privacy policy + SEBI
disclosures live. Web on Amplify stays in sync.

### Thin insights CMS (in sprint)

Minimal Pipe B — **insights / trading calls only**:

| Include | Exclude until after 8 Oct |
|---|---|
| DynamoDB `content` (insight rows) | MF / courses / videos admin |
| `POST/PATCH /admin/insights` + publish | Full compliance approval workflow |
| `GET /insights` (tier-gated) | Bulk import, WhatsApp bot, queues |
| `/admin` form: stock, BUY/SELL, CMP, target, SL, rationale, tier | Rich text / HTML editor |
| Wire Insights UI to API | `content_audit` v1 can be stubbed |

No SQS/webhooks — RA submits a form; customers see formatted cards on next fetch.

### In scope / out of scope

| Ship by 8 Oct | Defer past 8 Oct |
|---|---|
| MSG91 OTP live (`Auth.tsx` wired) | Full RA CMS (MF, courses, videos) |
| **Thin insights CMS** (`/admin` + `GET /insights`) | Live market indices |
| Org Play account + AAB + assetlinks | F&O feeds, AI, WebSocket |
| Privacy / Terms / grievance URLs | Full GST invoice automation |
| Play Billing in TWA (+ PayU on web) | iOS |
| Store listing + Data safety + Finance declaration | Marketing site beyond legal pages |
| SEBI RA # + risk disclaimer visible | Compliance multi-step review UI |

### Calendar

| When | Focus | Exit |
|---|---|---|
| **11–14 Sep** | Org Play signup; billing decision; privacy URLs; wire MSG91 Auth | **Auth + test OTP live**; legal stubs at `/legal/*`; Amplify API URL + Org Play still open |
| **15–21 Sep** | OTP harden; PayU web path; start Play Billing / SKUs; **DynamoDB `content` + admin insights API** | Web pay works; RA can create draft via API |
| **22–28 Sep** | Bubblewrap AAB; Internal testing; assetlinks; Play Billing entitlement; **`/admin` UI + wire Insights page to `GET /insights`**; App content forms | Internal install + pay; RA publishes from phone/browser |
| **29 Sep–5 Oct** | Closed testing; RA trains on `/admin`; fix P0s; **submit Production by 1 Oct** | In review; daily calls flowing |
| **6–8 Oct** | Clear review; 100% India rollout; monitor OTP/pay/CMS | Public on Play |

### Critical path

1. Org Play + D-U-N-S (start day 1)
2. Billing: not PayU-only inside Play app
3. Privacy HTTPS URL
4. Live OTP (+ `analyst` role claim for RA phone)
5. Thin insights CMS (admin write + customer read)
6. AAB + Play signing SHA-256 in `assetlinks.json`
7. Submit for production **by 1 Oct** (leave review buffer)

### Fallback if Production review slips past 8 Oct

Ship Internal/Closed invite link + live web (PayU + `/admin` insights) on that
date; promote to public Production as soon as approved.

---

## Phase 1 — Foundation & Landing (Weeks 1–3)

Goal: the responsive landing page live on a real URL, one codebase.

**Week 1 — Project setup**
- Mon: `create-next-app`, repo, push. Get "hello world" deploying via the `infra/` Terraform (S3 + CloudFront, Mumbai) — see `infra/README.md`.
  **Temporary:** CloudFront is currently blocked in the AWS account/org, so
  `infra/` defaults to provisioning an AWS Amplify app (`hosting_mode =
  "amplify"`) as a stand-in for testing instead. S3 + CloudFront remains the
  committed target (plan.md / architecture.md unchanged) — switch back via
  `hosting_mode = "cloudfront"` once access is restored. See
  `infra/README.md`'s "Amplify mode (temporary)" section.
- Tue: Port the chosen landing HTML (hybrid) into a Next.js page/component.
- Wed: Make the plan-comparison a reusable component (Free/Pro/Premium data-driven).
- Thu: Wire the signup popup + phone field as a React component (state, not vanilla JS).
- Fri: Responsive pass — test on real phone. Fix mobile breakpoints.

**Week 2 — Backend skeleton**
- Mon–Tue: Go API running locally + deployed (Lambda + API Gateway). `/healthz` live.
- Wed: DynamoDB tables created (`users`, `subscriptions`, `orders`).
- Thu–Fri: `/me` endpoint + JWT middleware wired (from `internal/auth`).

**Week 3 — Domain & polish**
- Mon: ~~Point domain at the deployment.~~ **Done ahead of schedule** —
  `app.shubhshreeknowledgehub.com` already points at the Amplify deployment,
  HTTPS live. See plan.md's "Domain & subdomains" section.
- Tue–Wed: Content pass — real copy, testimonials, disclosures placeholder.
- Thu: Add the SEBI disclosure block (real reg. no. when you have it).
- Fri: Lighthouse audit — performance, accessibility, SEO. Fix top issues.

*Milestone: landing page live, backend reachable, DB ready.*

---

## Phase 2 — Auth (phone OTP) (Weeks 4–6)

Goal: a user can sign up and log in with phone + OTP.

**Week 4 — OTP provider decision + setup**
- Mon: **Decided: MSG91 SendOTP, SMS channel** (see plan.md's "Decided:
  identity provider" section for the full tradeoff record). Next: sign up
  for a business MSG91 account and start DLT registration (3–7 day
  turnaround — kick this off first, it can run in parallel with the backend
  work below).
- Tue–Wed: Backend: send-OTP endpoint (calls MSG91).
- Thu–Fri: Backend: verify-OTP endpoint → creates/looks up user in
  DynamoDB → issues session token via the already-built `auth.IssueToken`.

**Pending — decide next session (not yet built):**
- **No rate-limiting on `/auth/send-otp` or `/auth/verify-otp` yet.**
  `send-otp` has no cooldown per phone/IP, and `verify-otp` has no
  attempt-limit beyond the OTP's own expiry. Why this matters more than
  the endpoints merely existing (they're already visible via the public
  frontend's network calls and the public source regardless): unthrottled
  `send-otp` enables **SMS pumping / toll fraud** — an attacker hammering
  it with (often premium-rate) numbers to run up the MSG91 bill, sometimes
  profiting off a revenue-share route on the receiving end. Unthrottled
  `verify-otp` enables brute-forcing a 6-digit code. Decide tomorrow:
  per-phone cooldown + attempt-limit/lockout, and whether it's DynamoDB-backed
  (correct across Lambda's stateless invocations) or something simpler for
  now given pre-launch volume is tiny. This is the same gap Week 6 Thu–Fri
  below already names generically ("Rate-limit OTP") — this note is the
  reasoning for *why*, ahead of actually building it.

**Week 5 — Frontend auth flow**
- Mon–Tue: Popup calls send-OTP, shows OTP stage.
- Wed–Thu: Verify-OTP, store session token securely, redirect to app.
- Fri: Session persistence + "logged in" state across pages.

**Week 6 — User records & hardening**
- Mon–Tue: On first verify, create the user in DynamoDB.
- Wed: Protect routes — unauthenticated users bounce to login.
- Thu–Fri: Rate-limit OTP, handle resend, error states. Test edge cases.

*Milestone: real signup/login works end-to-end.*

---

## Phase 3 — Payments (PayU) (Weeks 7–9)

Goal: a user can pick a plan and pay; access is granted only after server-side verification.

**Week 7 — Order creation**
- Mon: PayU merchant account, test keys, keys into Secrets Manager/env.
- Tue–Wed: Go handler `POST /orders` — looks up price server-side, builds PayU payment request / hash, returns checkout params. (Uses `internal/payments`.)
- Thu–Fri: Frontend: plan button → calls `/orders` → opens PayU checkout (Bolt / hosted).

**Week 8 — Verification & granting access**
- Mon–Tue: Go handler `POST /payments/verify` (or success callback) — verify PayU response hash with merchant salt, then write subscription to DynamoDB.
- Wed: Frontend success/failure handling → land verified users in the app.
- Thu–Fri: Subscription state everywhere — gate Pro/Premium features by tier.

**Week 9 — Robustness**
- Mon: PayU webhook / server-to-server callback (backup if browser closes mid-flow).
- Tue: Failed/abandoned payment handling; idempotency (don't double-grant).
- Wed–Thu: Test with PayU test cards / UPI end-to-end.
- Fri: Basic invoice/receipt (compliance hook — coordinate with advisor).

*Milestone: paid subscriptions work, verified server-side.*

---

## Phase 4 — RA content platform (Weeks 10–11)

Goal: analysts can publish insights, MF alerts, courses, and videos; customers
read from the API instead of `src/lib/data.ts`.

**Oct 8 sprint pulls forward a thin slice:** insights-only admin +
`GET /insights` (see § October 8 sprint). Weeks 10–11 below cover the **rest**
(MF, courses, videos, audit) after public launch.

**Week 10 — Backend content layer**
- Mon: DynamoDB `content` + `content_audit` tables + GSIs (see architecture.md).
  *(Insight rows + admin/customer insight routes may already exist from sprint.)*
- Tue–Wed: Admin CRUD for MF / courses — extend beyond insights.
- Thu: Customer read handlers — `GET /mf-alerts`, courses, videos with tier gating.
- Fri: Seed remaining types from `data.ts`; smoke-test with curl.

**Week 11 — Admin CMS + frontend wiring**
- Mon–Tue: Extend `/admin` beyond insights — MF / course forms.
- Wed: Wire `MFAlerts.tsx`, `Courses.tsx`, `Videos.tsx` to APIs.
- Thu: Course/video admin forms + S3 (if not done).
- Fri: Harden tier gating + optional `content_audit` view logging.

*Milestone: RA can publish all content types without a code deploy.*

---

## Phase 5 — Market indices ticker — **deferred (out of MVP)**

**Decided 2026-09-11:** TrueData did not provide API access. Live vendor
indices are **dropped from MVP**. Ticker stays static in `src/lib/data.ts`.

When a vendor unlocks API + redistribution later:

- Confirm REST vs WebSocket (prefer REST for Lambda poller).
- Backend vendor client + poller → `market_snapshots` cache.
- `GET /market/indices` normalised JSON (see architecture.md).
- Wire `Dashboard.tsx` + landing ticker; show delay disclaimer if needed.

*Milestone (later): ticker is live/delayed data, not hardcoded.*

---

## Phase 6 — Ship it (PWA + Android) (Weeks 12–14)

Goal: installable app, on the Play Store internal track.

**Week 12 — PWA**
- Mon: Wire `manifest.json` + register `service-worker.js` (partially done).
- Tue: Generate real icons (192/512, maskable) (partially done).
- Wed–Thu: Test "Add to Home Screen" + offline shell on Android.
- Fri: Lighthouse PWA audit → green.

**Week 13 — Android wrapper (TWA)**
- Mon–Tue: Bubblewrap — generate the TWA project from the PWA.
- Wed: `assetlinks.json` on the domain (deep-link verification).
- Thu–Fri: Build signed APK/AAB, test on a real device.

**Week 14 — Play Store**
- Mon: Play Console account, app listing, screenshots, privacy policy URL.
- Tue–Wed: Upload to internal testing track, add testers.
- Thu–Fri: Fix review flags, CI/CD for the web build (GitHub Actions).

*Milestone: installable app live on internal track.*

---

## Phase 7 — AI layer (later, Weeks 15+)

Only after MVP is live, tested, and has users. See [architecture.md](architecture.md)'s Phase 7 section.
- MCP server exposing governed app data
- RAG over market news/filings
- Agent answering tier-aware questions

## Phase 8 — Live price feed (WebSocket, later)

A WebSocket fast path for streaming quotes, separate from the standard
request/response API. Requires **Pipe A (vendor indices) first** — currently
deferred. This phase would add **sub-second streaming** for F&O desk and
charts. Design is in [architecture.md](architecture.md) § Post-MVP live
price feed.

---

## Realistic totals

| Phase | Weeks | Calendar (part-time) |
|---|---|---|
| 1 · Foundation + landing | 1–3 | ~3 weeks |
| 2 · Auth (OTP) | 4–6 | ~3 weeks |
| 3 · Payments | 7–9 | ~3 weeks |
| 4 · RA content platform | 10–11 | ~2 weeks |
| 5 · Market indices ticker | — | **Deferred** (no vendor API) |
| 6 · Ship (PWA + Android) | 12–14 | ~3 weeks |
| **MVP total** | | **~14 weeks (~3.5 months)** |
| 7 · AI layer | 15+ | +6–8 weeks |
| 8 · Live WebSocket feed | later | TBD (needs vendor) |

Buffer expectation: at 7.5 hrs/week, plan for **~3.5–4 months to a live MVP**
(auth + payments + RA publishing + Play Store; **static ticker**). If it
stretches, that's normal — protect momentum by shipping something every
single session, however small.

Compliance runs in parallel with all of this, not as a phase of its own —
see [plan.md](plan.md)'s compliance section.
