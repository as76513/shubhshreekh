# Tech debt & deferred work

Living list of known gaps, shortcuts, and items deferred past the
**8 October 2026** Play Store sprint. Update this file when you add or clear
debt — do not let “temporary” stay silent in code only.

**Last updated:** 2026-09-11

---

## P0 — Must clear soon after launch (or before public users)

| ID | Item | Why it exists | Clear when |
|---|---|---|---|
| TD-001 | **`OTP_TEST_PHONES` / fixed OTP whitelist** | MSG91 DLT/KYC pending; Play reviewers & QA need login without SMS | DLT approved + real MSG91 for all users; empty `OTP_TEST_PHONES` in prod |
| TD-002 | **Frontend `Auth.tsx` wired to API** | Done 2026-09-11 | Cleared for login UI; use TD-046 for remaining Bearer wiring |
| TD-003 | **Lambda Terraform MSG91 / CORS / OTP_TEST_*** | Was incomplete; vars wired in `infra/backend/lambda.tf` — still must pass real TF_VAR / tfvars in each env | Set values in deploy; empty MSG91 OK if `otp_test_phones` set |
| TD-004 | **Play Billing not implemented** | PayU is web path; Play policy requires Play Billing (or billing choice) in TWA | Before public Production listing |
| TD-005 | **Privacy / Terms / grievance URLs** | Stub pages live at `/legal/privacy`, `/legal/terms`, `/legal/grievance` | Replace with counsel-approved copy; set Play listing privacy URL to `https://app.shubhshreeknowledgehub.com/legal/privacy` after Amplify deploy |
| TD-046 | **Session token persistence + Bearer helper** | `localStorage` session + `authHeaders()` added 2026-09-11 | Wire Bearer into future authenticated `fetch` calls (`/me`, insights, etc.) |
| TD-006 | **OTP rate limiting missing** | SMS pumping / brute-force risk on public `/auth/*` | Before opening OTP to arbitrary phones (with or without MSG91) |

---

## P1 — In Oct 8 sprint but not built yet

| ID | Item | Notes |
|---|---|---|
| TD-010 | **Thin insights CMS** | DynamoDB `content` + `/admin` + `GET /insights`; RA daily calls |
| TD-011 | **PayU web checkout** | `POST /orders`, verify hash, webhooks; `internal/payments` |
| TD-012 | **Bubblewrap AAB + assetlinks** | Play App Signing SHA-256 in `TWA_SHA256_FINGERPRINT` |
| TD-013 | **`analyst` role on JWT** | RA phone must get `analyst` (not only `free` customer) for `/admin` |
| TD-014 | **Org Play account + listing assets** | D-U-N-S, screenshots, Data safety, Finance declaration |

---

## P2 — Explicitly deferred past 8 Oct

| ID | Item | Deferred reason |
|---|---|---|
| TD-020 | **Full RA CMS** (MF, courses, videos admin) | Insights-only thin CMS for launch |
| TD-021 | **`content_audit` view logging** | SEBI nice-to-have; stub OK at launch |
| TD-022 | **Compliance multi-step approve UI** | Optional; RA may publish direct in v1 |
| TD-023 | **Live market indices (Pipe A)** | TrueData no API; ticker stays `data.ts` |
| TD-024 | **F&O market data / live desk feeds** | Later stage by product decision |
| TD-025 | **Phase 8 user WebSocket prices** | Needs vendor + always-on path |
| TD-026 | **Zoho CRM sync** | Startup credits OK; post-launch Contacts sync only — never entitlement source of truth |
| TD-027 | **Zoho Books / GST invoices** | After payments stable |
| TD-028 | **AI layer / MCP / RAG** | Phase 7 |
| TD-029 | **iOS / TestFlight** | Android Play first |
| TD-030 | **MSG91 WhatsApp OTP channel** | SMS only until volume justifies WA fee |
| TD-031 | **CloudFront hosting restore** | Amplify stand-in until account access restored |
| TD-032 | **SignupModal not mounted / dual auth entry** | Consolidate login UX |

---

## P3 — Code quality / hardening

| ID | Item | Notes |
|---|---|---|
| TD-040 | **MSG91 response schema re-verify** | `msg91.go` notes untested against live account |
| TD-041 | **IssueToken always `free` on verify** | Must load real subscription tier from DynamoDB |
| TD-042 | **No idempotent payment grant** | Needed with PayU + Play Billing |
| TD-043 | **PWA service worker is minimal** | Shell only; offline polish later |
| TD-044 | **Maskable icon is copy of 512** | Safe padding / maskable asset later |
| TD-045 | **CORS / secrets via SSM** | Prefer SSM over plain Lambda env long-term |

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

- [build-plan.md](build-plan.md) — § October 8 sprint  
- [plan.md](plan.md) — stack decisions, PayU, deferred market data  
- [architecture.md](architecture.md) — Pipe B thin CMS, auth, payments  
- [android/README.md](android/README.md) — TWA / AAB  
