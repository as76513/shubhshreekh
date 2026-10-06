# Tech debt & deferred work

Living list of known gaps, shortcuts, and items deferred past the
**18 October 2026** Play Store sprint (moved from 8 October 2026 on
2026-10-05). Update this file when you add or clear debt — do not let
“temporary” stay silent in code only.

**Last updated:** 2026-10-06

---

## P0 — Must clear soon after launch (or before public users)

| ID | Item | Why it exists | Clear when |
|---|---|---|---|
| TD-001 | **`OTP_TEST_PHONES` / fixed OTP whitelist** | **Status 2026-10-06: TM approval cleared** — re-tested send-otp against real MSG91 with 9503438397 (temporarily pulled from the whitelist), and the SMS was actually delivered this time (previously blocked by a DLT "PE-TM Chain Error," see TD-040's history). Real MSG91 delivery is now confirmed working end-to-end for at least one number/carrier. Still keeping the whitelist live for now — one successful delivery isn't the same as "DLT approved for all users/carriers," and removing it entirely is a separate, deliberate decision for closer to launch | Confirmed working across the full user base (not just one test number) + empty `OTP_TEST_PHONES` in prod |
| TD-002 | **Frontend `Auth.tsx` wired to API** | Done 2026-09-11 | Cleared for login UI; use TD-046 for remaining Bearer wiring |
| TD-003 | **Lambda Terraform MSG91 / CORS / OTP_TEST_*** | Was incomplete; vars wired in `infra/backend/lambda.tf` — still must pass real TF_VAR / tfvars in each env | Set values in deploy; empty MSG91 OK if `otp_test_phones` set |
| TD-004 | **Play Billing not implemented** | PayU is web path; Play policy requires Play Billing (or billing choice) in TWA | Before public Production listing |
| TD-005 | **Privacy / Terms / grievance URLs** | Stub pages live at `/legal/privacy`, `/legal/terms`, `/legal/grievance` | Replace with counsel-approved copy; set Play listing privacy URL to `https://app.shubhshreeknowledgehub.com/legal/privacy` after Amplify deploy |
| TD-046 | **Session token persistence + Bearer helper** | `localStorage` session + `authHeaders()` added 2026-09-11 | Wire Bearer into future authenticated `fetch` calls (`/me`, insights, etc.) |
| TD-006 | **OTP rate limiting** | Built 2026-10-05, deployed 2026-10-06. `/auth/send-otp` enforces a 60s per-phone cooldown + 5/day cap; `/auth/verify-otp` locks a phone out for 15 min after 5 wrong codes. DynamoDB-backed (`shubhshreekh-otp-ratelimit-<env>`, native TTL) via `backend/internal/db/ratelimit.go`; the actual rules are pure, unit-tested functions in `backend/internal/ratelimit`. `OTP_TEST_PHONES` numbers are exempt. **Fixed 2026-10-06 (code review):** the lockout/cooldown state was stored in the same UTC-day-keyed row as the daily send counter, so a 15-min lockout or 60s cooldown starting near midnight silently reset early at UTC 00:00 instead of lasting its real duration. Split into two rows per phone — a non-date-keyed row for the duration-based cooldown/lockout, and a separate day-keyed row just for the daily send count — so only the thing meant to reset daily does |
| TD-047 | **401 → refresh-or-logout handling is opt-in, not automatic** | Built 2026-10-05 as `useAuth().withAuth()` (`src/lib/auth-context.tsx`) — on a 401 it retries once via biometric/PIN refresh, then force-logs-out if that also fails. Wired into both current protected call sites (`TradingCalls.tsx`'s `GET /insights`, `Admin.tsx`'s `/admin/insights/*`). Not a global fetch interceptor — any *future* protected call site has to remember to route through `withAuth` itself | Low priority now that both existing call sites use it; revisit only if a protected fetch ever gets added without going through `withAuth` |
| TD-048 | **Biometric/PIN unlock (WebAuthn) + 7-day OTP window** | Built 2026-10-05, ahead of the launch critical path per explicit instruction. Access tokens now 30 min (`accessTokenTTL`); a registered WebAuthn credential can mint fresh ones without OTP until `verified_until` (OTP login + 7 days) lapses — see `backend/internal/api/webauthn.go`. Cuts MSG91 cost back toward the original ~2–3 OTP/user/month budget instead of 1/day | Needs `terraform apply` in `infra/backend` (new env vars have safe defaults, nothing live yet) + a Lambda deploy before it does anything in production |

---

## P1 — In Oct 18 sprint but not built yet

| ID | Item | Notes |
|---|---|---|
| TD-010 | **Thin insights CMS** | Built 2026-10-05: DynamoDB `content` table + GSI1 (`infra/backend/dynamodb.tf`), `POST/PATCH/publish/archive /admin/insights` + `GET /insights` (`backend/internal/{db,api}/`), `/admin` page (`src/components/pages/Admin.tsx`), `TradingCalls.tsx`'s Active Trades tab and Dashboard's "Recent insights" widget both wired to the real API. Extended same day: `instrumentType` (`equity`\|`fno`) + `targets []float64` replace the old single `target` field — equity carries exactly 1 target, F&O carries 1-3 scaled booking levels, one admin form/one customer card handles both (see architecture.md's `content` table section). Validated server-side in `insights.go`'s `validate()`. See TD-051 for the legacy-data shim this introduced |
| TD-011 | **PayU web checkout** | `POST /orders`, verify hash, webhooks; `internal/payments` |
| TD-012 | **Bubblewrap AAB + assetlinks** | Play App Signing SHA-256 in `TWA_SHA256_FINGERPRINT` |
| TD-013 | **`analyst` role on JWT** | Built 2026-10-05: `Role` claim on the session JWT, derived live from `ANALYST_PHONES` env var (same CSV pattern as `OTP_TEST_PHONES`) at login/refresh time — not stored on the user row, so changing who's an analyst is just an env var + redeploy. Gates `/admin/insights/*` server-side via `requireRole` |
| TD-014 | **Org Play account + listing assets** | D-U-N-S, screenshots, Data safety, Finance declaration. **Watch for TD-054 interaction:** a *freshly created* Play Console reviewer test account now gets a normal 7-day trial like any signup (pre-existing `OTP_TEST_PHONES` rows are grandfathered in, but new ones aren't) — if Play review runs past 7 days from account creation, the reviewer's login starts failing `trial_expired`. Create reviewer test accounts as early as possible relative to submission, or give them a far-future `trial_ends_at` manually |
| TD-052 | **Entry Price rename (CMP → Entry Price)** | Built 2026-10-06: renamed across `db.Insight` (`EntryPrice`, with a `LegacyCMP` backfill shim for pre-existing rows, same pattern as TD-051), the API request/response shape, the admin form label, and the customer card label |
| TD-053 | **Trade lifecycle: open/closed + outcome** | Built 2026-10-06: `Insight.TradeStatus`/`Outcome`/`ClosedAt`, `POST /admin/insights/{id}/close` (`target_hit`\|`sl_hit`), ✅/🛑 buttons in `/admin`. The RA closes a trade by hand — no live price feed to detect it automatically. Not yet wired into any customer-facing Live/Past/Closed view — that's TD-056, deferred past 18 Oct |
| TD-054 | **Pro-only + 7-day trial + 2-device anti-piracy login** | Built 2026-10-06, deployed same day. `db.HasActiveEntitlement` (trial or paid) gates `/auth/verify-otp` and `/auth/refresh/finish`; a trial-expired login is refused outright (403 `trial_expired`), not downgraded to a browsable free tier. Max 2 registered devices (`db.Device`, `User.Devices`) — a 3rd unrecognized `deviceId` gets 403 `device_limit_reached` + the occupied devices + a 10-min-TTL `deviceSwapRole` token; `POST /auth/devices/swap` completes the login after the user picks a device to log out, rate-limited to 1/24h (`db.CanSwapDevice`). Pure rules in `backend/internal/db/devices.go`, unit-tested with no AWS involved. **3 bugs found and fixed same day via independent code review (2026-10-06):** (1) device registration was read-then-write with no `ConditionExpression`, so two logins racing at nearly the same instant could both pass the 2-device check and both get issued real tokens — fixed with optimistic concurrency (`User.DevicesVersion`, retried up to 3x on conflict in `RegisterDevice`/`SwapDevice`); (2) the short-lived `deviceSwapRole` token worked against any route behind plain `auth.Middleware` (`GET /me`, `GET /insights`, WebAuthn registration), not just `/auth/devices/swap`, letting a rejected device get repeating 10-minute windows of real access without ever freeing a slot — fixed by role-gating those routes to the real customer-facing roles; (3) "log out other device" never revoked anything live — since WebAuthn credentials are one-per-user not one-per-device (TD-049), an evicted device could keep refreshing for up to 7 days — fixed by clearing the shared credential on every swap, forcing re-registration |
| TD-055 | **Admin-configurable discount pricing** | Built 2026-10-06: `GET /pricing` (public) and `PATCH /admin/pricing` (analyst/admin), backed by a `shubhshreekh-settings-<env>` singleton row — discount % changes with no deploy, anchor prices (₹3000/6000/20000 monthly/quarterly/annual, carried over from the original stakeholder dictation) are plain constants. Admin UI is a small panel in `/admin`. **Landing page wired same day:** `PlanSlider.tsx` now fetches `GET /pricing` live and renders a single Pro plan (Monthly/Quarterly/Annual toggle, real anchor/discounted price, discount badge) — the old static Free/Pro/Premium mockup (`PlanComparison.tsx`, only reachable from the unmounted `SignupModal.tsx` per TD-032) is gone from the live page. Still no countdown timer (needs a per-user trial-start reference point, i.e. a logged-in dashboard treatment) and no real checkout — the CTA starts the free trial via signup, payment stays with TD-011 |

---

## P2 — Explicitly deferred past 18 Oct

| ID | Item | Deferred reason |
|---|---|---|
| TD-020 | **Full RA CMS** (courses, videos admin) | Insights-only thin CMS for launch |
| TD-021 | **`content_audit` view logging** | SEBI nice-to-have; stub OK at launch |
| TD-022 | **Compliance multi-step approve UI** | Optional; RA may publish direct in v1 |
| TD-023 | **Live market indices (Pipe A)** | TrueData no API; ticker stays `data.ts` |
| TD-024 | **F&O market data / live desk feeds** | Later stage by product decision. This is the Dashboard's static "F&O Desk" card (`foCalls` in `data.ts`) — **not** the same thing as an `instrumentType: "fno"` row in the real insights CMS (TD-010), which is already live. See architecture.md's note under the `content` table example |
| TD-025 | **Phase 8 user WebSocket prices** | Needs vendor + always-on path |
| TD-026 | **Zoho CRM sync** | Startup credits OK; post-launch Contacts sync only — never entitlement source of truth |
| TD-027 | **Zoho Books / GST invoices** | After payments stable |
| TD-028 | **AI layer / MCP / RAG** | Phase 7 |
| TD-029 | **iOS / TestFlight** | Android Play first |
| TD-030 | **MSG91 WhatsApp OTP channel** | SMS only until volume justifies WA fee |
| TD-031 | **CloudFront hosting restore** | Amplify stand-in until account access restored |
| TD-032 | **SignupModal not mounted / dual auth entry** | Consolidate login UX |
| TD-056 | **Nav restructure: Live / Past / Closed / Blogs / Courses tabs** | Decided 2026-10-06 — replaces the current Active/Past Performances split with a 3-way status model (Live = today + open, Past = earlier + still open, Closed = resolved) plus an F&O/Equity radio toggle; depends on TD-053 existing first. Deferred past 18 Oct — the critical path only needs TD-052–055, not the nav itself |
| TD-057 | **Blogs tab (customer-facing)** | Decided 2026-10-06 — reuses the Daily Market Overview content (paragraph + photos, admin-authored) as its source; Courses/Videos stay untouched |
| TD-058 | **Weekly Market Outlook PDF — admin upload** | Decided 2026-10-06 — replaces the static `public/assets/todays-market-update.pdf` with an admin-uploadable S3 file; ties into the earlier CDN/S3-for-media question |
| TD-059 | **F&O SMS alert + app-open live-trade popup** | Decided 2026-10-06 — new MSG91 template for F&O publish alerts (user is registering it — a *second* PE-TM-template DLT chain, on top of the OTP one already stuck on TM approval, see TD-001/TD-040); plus a "latest unseen live trade" popup on app open |

---

## P3 — Code quality / hardening

| ID | Item | Notes |
|---|---|---|
| TD-040 | **MSG91 response schema re-verify** | Mostly cleared 2026-10-06: after the PE-TM Chain Error resolved (TM approval cleared on MSG91's dashboard), re-ran the same live test — `Send()`'s `{"type":"success",...}` assumption confirmed again, and this time the SMS actually arrived at 9503438397. `Verify()`'s response shape is still unexercised against a live call (would need the real received code run through `/auth/verify-otp`, which also now requires `deviceId` per TD-054) — low risk given `Send()`'s identical response envelope checked out, but not yet proven |
| TD-042 | **No idempotent payment grant** | Needed with PayU + Play Billing |
| TD-043 | **PWA service worker is minimal** | Shell only; offline polish later |
| TD-044 | **Maskable icon is copy of 512** | Safe padding / maskable asset later |
| TD-045 | **CORS / secrets via SSM** | Prefer SSM over plain Lambda env long-term |
| TD-049 | **WebAuthn: one credential per user** | Registering a passkey on a second device silently replaces the first device's — no multi-device support yet (see `db.User.WebAuthnCredential`, a single field not a list) |
| TD-050 | **No UI for "biometric unlock enabled"** | Registration is a silent best-effort call right after OTP login (`Auth.tsx`); no settings toggle, no retry if the browser prompt is dismissed — user just keeps doing OTP every 7 days until it succeeds once |
| TD-060 | **`PATCH /admin/pricing` allows `analyst`, not just admin** | Found in code review 2026-10-06. Reuses the same `requireRole("analyst","admin")` middleware as insight editing — self-consistent with what's written, but an analyst changing live discount pricing wasn't a deliberate decision, just reused middleware. Needs a yes/no from whoever owns pricing policy |
| TD-061 | **Can't set discount to exactly 0% (disable it)** | `pricing.go`/`Admin.tsx` both reject `<=0`, so there's no clean "discount off" value, only a near-zero workaround |
| TD-062 | **Insight `Tier`/`Locked` gating is now dead code** | Found in code review 2026-10-06. Since TD-054 made every issued session `subscription:"pro"` unconditionally, `locked := in.Tier == "pro" && claims.Subscription != "pro"` (`insights.go`) can never be true — the admin form's tier field, `customerInsight.Locked`, and the frontend's paywall/`isPro` branches in `TradingCalls.tsx`/`Dashboard.tsx` are all unreachable. Not broken, just confusing; clean up if the one-tier model is staying |
| TD-063 | **`claims, _ := auth.FromContext(...)` pattern repeated without checking `ok`** | Found in code review 2026-10-06. `handlePublishInsight` and `handleUpdatePricing` both discard the bool and dereference `claims.Subject` — safe today only because router.go always wraps them in `auth.Middleware` first; a latent nil-deref if that wiring ever changes |
| TD-064 | **No length bound on client-supplied `deviceId`/`deviceLabel`** | Found in code review 2026-10-06. Not exploitable today, but nothing stops a pathologically large value from bloating the `devices` list item; a sane cap is cheap insurance |
| TD-051 | **`Insight.LegacyTarget` backward-compat shim** | Added 2026-10-05 alongside the `targets` array (TD-010) so insight rows written before that change (single `target` N, no `instrumentType`) keep rendering — `backfillLegacy()` in `backend/internal/db/content.go` fills `targets`/`instrumentType` on read. Clear by re-saving (edit + re-publish) every pre-existing dev row through the `/admin` form, then delete `LegacyTarget` and `backfillLegacy` |

---

## How to use `OTP_TEST_PHONES` (TD-001)

```bash
# Lambda / backend/.env — whitelist only (DLT pending)
OTP_TEST_PHONES=9876543210,9811111111
OTP_TEST_CODE=123456

# Optional: MSG91 + whitelist together (real SMS for everyone else)
MSG91_AUTH_KEY=...
MSG91_TEMPLATE_ID=...
OTP_TEST_PHONES=9876543210
OTP_TEST_CODE=123456
```

- Phones: 10-digit Indian or `91…` / `+91…` (comma-separated).
- Send OTP to a whitelist number → **no SMS**; enter `OTP_TEST_CODE`.
- Put the same phone + code in Play Console **App access** for reviewers.
- **Clear TD-001** when DLT is live: remove test phones from production env.

Local without MSG91 and without test phones → existing **Mock** (codes in server logs).

---

## Related docs

- [TESTING.md](TESTING.md) — post-deploy smoke test checklist
- [build-plan.md](build-plan.md) — § October 18 sprint  
- [plan.md](plan.md) — stack decisions, PayU, deferred market data  
- [architecture.md](architecture.md) — Pipe B thin CMS, auth, payments  
- [android/README.md](android/README.md) — TWA / AAB  
