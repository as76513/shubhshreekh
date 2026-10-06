# Testing guide — post-deploy smoke test

A step-by-step checklist for verifying a deploy actually works, against the
**real** live app and API — not local dev. Use this after any Amplify
build or backend Terraform apply, not just the biometric-login / thin
insights CMS work it was first written for (see TECH_DEBT.md TD-048/TD-010).

**Live test accounts** (dev environment — same OTP code for all): phone
`223344` is the fixed OTP for every whitelisted number below (see
TECH_DEBT.md TD-001, `OTP_TEST_PHONES`). Never use a real phone number for
this kind of testing.

| Phone | Role / tier | Use for |
|---|---|---|
| `9999911111` | customer, free | Free-tier views, locked-card checks |
| `9999933333` | customer, pro | Full-access views, tier-unlock checks |
| `9991100001` | analyst | `/admin` — publishing, archiving |
| `9503438397` | customer (pre-existing) | General reviewer/demo account |

---

## 0. Stub tests (no AWS, no MSG91 — run this first, every time)

Before testing against the live API at all, run the Go test suite — it
exercises `/auth/send-otp`, `/auth/verify-otp`, `/auth/check-phone`, and the
OTP rate-limiting rules (TD-006) entirely with in-memory fakes, no network
calls:

```bash
cd backend && go test ./...
```

This is the cheapest way to catch a regression in the OTP flow — it costs
nothing and takes under 2 seconds. It does **not** replace the live checks
below (it can't catch a real MSG91 response-shape mismatch, TD-040), but it
should always be green before you move on to spending real SMS credits.

## 1. Before you start (live deploy)

1. Confirm the Amplify build for this commit actually finished: AWS Console
   → Amplify → the app → the `main` branch → latest build should say
   **Deployed**, not still running. Testing against a half-deployed build
   produces confusing, non-reproducible results.
2. Confirm the backend deployed too, if this change touched `backend/`:
   `curl https://c630c7v98g.execute-api.ap-south-1.amazonaws.com/healthz`
   should return `{"status":"ok"}`.

## 2. Biometric/PIN login (TD-048)

Do this on your **own phone or laptop** — it needs a real platform
authenticator (Face ID, fingerprint, Windows Hello), which nothing
automated can simulate.

1. Open `https://app.shubhshreeknowledgehub.com/login` and log in with
   `9999933333` + OTP `223344`.
2. Within a second or two of landing on the dashboard, your device should
   prompt for Face ID / fingerprint / Windows Hello — that's the silent
   passkey registration (`src/components/pages/Auth.tsx`). If your
   device/browser has no platform authenticator configured, this step is
   silently skipped — not a bug, see "Known gaps" below.
3. Fully close the browser tab (or the installed PWA) and reopen
   `/dashboard` directly.
   - **With** a platform authenticator: you get the native biometric/PIN
     prompt again, and land straight on the dashboard — no OTP.
   - **Without** one: you land on the dashboard anyway if the old token
     hasn't expired yet (it's valid 30 min), or get bounced to `/login` if
     it has.
4. To check the 7-day cutoff without waiting a week: ask me to
   backdate that phone's `verified_until` in DynamoDB (`shubhshreekh-users-dev`,
   `aws dynamodb update-item`), then repeat step 3 — it should now force a
   real OTP regardless of a successful biometric prompt.

## 3. Thin insights CMS (TD-010)

### 3a. Publish workflow (as the analyst)

1. Log in with `9991100001` + OTP `223344`. You should see an **Admin**
   tab in the nav that no other test account shows.
2. Open `/admin`, fill the form (leave **Instrument Type** at its default,
   "Equity", for this pass — see § 3c for F&O), **Save as draft**. It
   appears in the "All insights" list below with a `draft` badge.
3. In a **separate private/incognito window**, log in as `9999933333`
   (Pro) and open Market Insights → Active Trades. The draft must **not**
   appear. If it does, stop — that's a real bug, not a cosmetic one (see
   architecture.md's publish workflow).
4. Back in the admin window, click **Publish**. Reload the Pro customer's
   Insights page — the new call now appears with full numbers.
5. Click **Archive** on the admin side. Reload the customer page again —
   it's gone.

### 3b. Tier-gating (as a customer)

1. Log in as `9999911111` (free) and `9999933333` (Pro) in two windows.
2. Open Market Insights → Active Trades in both. The free account should
   show fewer unlocked cards and a "N more research ideas available on
   Pro" banner with blurred "Pro Content" cards; the Pro account shows all
   of them with real numbers.
3. **The check that actually matters**: open DevTools → Network on the
   free account, find the `/insights` response, and confirm the locked
   entries' `cmp`/`targets`/`stopLoss`/`rationale` are `0`/`[]`/`0`/`""` —
   not just hidden by CSS. If real numbers are sitting in that response, the
   server-side gating broke and the UI overlay is the only thing protecting
   Pro content, which is exactly what architecture.md says never to do.

### 3c. F&O multi-target (equity vs. 1-3 targets)

Equity calls carry one target; F&O calls (futures/options directional
calls — **not** the Dashboard's separate static "F&O Desk" teaser, see
architecture.md's note) carry up to 3 scaled booking levels.

1. As the analyst (`9991100001`), open `/admin`, set **Instrument Type** to
   **F&O**. The single Target field should be replaced by Target 1/2/3
   (only Target 1 required). Fill at least Target 1, **Save as draft**,
   **Publish**.
2. As a Pro customer, open Market Insights → Active Trades. The card's main
   ladder shows Target 1 same as an equity card, with Target 2/3 as extra
   chips below the progress bar if you filled them in.
3. Switch Instrument Type back to **Equity** on a new draft and confirm only
   one Target field shows and the card renders the original single-target
   layout — the two modes share one form/one card component, not a fork.
4. Negative check: try publishing an Equity draft with Target left at 0, and
   an F&O draft with all three Targets at 0 — both should be rejected with a
   400 (`backend/internal/api/insights.go`'s `validate()`), not silently
   saved as zero.

## 4. OTP rate limiting (TD-006)

Section 0 already covers the pure-logic/handler unit tests. This is the
live-deploy check that the DynamoDB wiring actually works, since that's the
one part the stub tests can't exercise.

1. Use a phone number **not** in `OTP_TEST_PHONES` (so requests actually
   reach the rate limiter instead of bypassing it) but also not a real
   number you want SMS on — if MSG91 isn't live yet in this environment,
   `d.OTP.Send` will still fail downstream, which is fine for this check;
   we only care what happens *before* that call.
2. `curl` `/auth/send-otp` for that phone twice in under 60 seconds. The
   second call should come back `429` with a `Retry-After` header and body
   `{"error":"too many OTP requests for this number — try again in ...s"}`.
3. `aws dynamodb get-item --table-name shubhshreekh-otp-ratelimit-dev --key
   '{"phone_date":{"S":"91XXXXXXXXXX#YYYYMMDD"}}'` (today's UTC date) should
   show `sendCount` incremented and `lastSentAt` set.
4. `curl` `/auth/verify-otp` for that phone with a wrong code 5 times. The
   5th response locks it out; a 6th attempt (even with a correct code,
   there isn't one here) should come back `429` immediately, before ever
   reaching `d.OTP.Verify` — confirm via CloudWatch logs that the provider
   wasn't called a 6th time.
5. Confirm an `OTP_TEST_PHONES` number is immune to both of the above — it
   should never produce a `429` no matter how many times you hit it.

## 5. Known gaps — not bugs, don't file them as such

- **Desktop without Face ID/Touch ID/Windows Hello gets no biometric
  benefit** — registration is silently skipped, and there's currently no
  "session expired, please log in again" prompt if a 30-minute-old token
  goes stale mid-session outside of `/insights` and `/admin` (TD-047 only
  covers those two call sites so far).
- **One passkey per account** — registering on a second device silently
  replaces the first device's credential (TD-049).

## Related docs

- [TECH_DEBT.md](TECH_DEBT.md) — TD-006, TD-010, TD-047, TD-048, TD-049, TD-050, TD-051
- [backend/README.md](backend/README.md) — the actual request-by-request
  flow this checklist is testing
- [architecture.md](architecture.md) — why free-tier gating must happen
  server-side, not in the UI
