# Build Plan — ShubShreekh (part-time, ~7.5 hrs/week)

**Constraint:** 1.5 hrs/day, weekdays only (no weekends) = ~7.5 hrs/week.
**Approach:** MVP first (auth → plans → payment → ship), AI layer later.
**Honesty note:** timelines are padded for a part-time learning curve on Next.js, Razorpay, and PWA. Slipping a week here or there is normal — a live, secure MVP is the goal, not speed.

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
  `app.shubhshreeknowldgehub.com` already points at the Amplify deployment,
  HTTPS live. See plan.md's "Domain & subdomains" section.
- Tue–Wed: Content pass — real copy, testimonials, disclosures placeholder.
- Thu: Add the SEBI disclosure block (real reg. no. when you have it).
- Fri: Lighthouse audit — performance, accessibility, SEO. Fix top issues.

*Milestone: landing page live, backend reachable, DB ready.*

---

## Phase 2 — Auth (phone OTP) (Weeks 4–6)

Goal: a user can sign up and log in with phone + OTP.

**Week 4 — OTP provider decision + setup**
- Mon: Decide Cognito vs MSG91/Firebase (Indian SMS + DLT). Set up account.
- Tue–Wed: Backend: send-OTP endpoint (calls provider).
- Thu–Fri: Backend: verify-OTP endpoint → issues your session token.

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

## Phase 3 — Payments (Razorpay) (Weeks 7–9)

Goal: a user can pick a plan and pay; access is granted only after server-side verification.

**Week 7 — Order creation**
- Mon: Razorpay account, test keys, keys into Secrets Manager/env.
- Tue–Wed: Go handler `POST /orders` — looks up price server-side, calls Razorpay, returns order_id. (Uses `internal/payments`.)
- Thu–Fri: Frontend: plan button → calls `/orders` → opens Razorpay checkout (`razorpay-checkout.js`).

**Week 8 — Verification & granting access**
- Mon–Tue: Go handler `POST /payments/verify` — `VerifyPaymentSignature`, then write subscription to DynamoDB.
- Wed: Frontend success/failure handling → land verified users in the app.
- Thu–Fri: Subscription state everywhere — gate Pro/Premium features by tier.

**Week 9 — Robustness**
- Mon: Razorpay webhook (backup confirmation if browser closes mid-flow).
- Tue: Failed/abandoned payment handling; idempotency (don't double-grant).
- Wed–Thu: Test with Razorpay test cards end-to-end.
- Fri: Basic invoice/receipt (compliance hook — coordinate with advisor).

*Milestone: paid subscriptions work, verified server-side.*

---

## Phase 4 — Ship it (PWA + Android) (Weeks 10–12)

Goal: installable app, on the Play Store internal track.

**Week 10 — PWA**
- Mon: Wire `manifest.json` + register `service-worker.js`.
- Tue: Generate real icons (192/512, maskable).
- Wed–Thu: Test "Add to Home Screen" + offline shell on Android.
- Fri: Lighthouse PWA audit → green.

**Week 11 — Android wrapper (TWA)**
- Mon–Tue: Bubblewrap — generate the TWA project from the PWA.
- Wed: `assetlinks.json` on the domain (deep-link verification).
- Thu–Fri: Build signed APK/AAB, test on a real device.

**Week 12 — Play Store**
- Mon: Play Console account, app listing, screenshots, privacy policy URL.
- Tue–Wed: Upload to internal testing track, add testers.
- Thu–Fri: Fix review flags, CI/CD for the web build (GitHub Actions).

*Milestone: installable app live on internal track.*

---

## Phase 5 — AI layer (later, Weeks 13+)

Only after MVP is live, tested, and has users. See [architecture.md](architecture.md)'s Phase 5 section.
- MCP server exposing governed app data
- RAG over market news/filings
- Agent answering tier-aware questions

## Phase 6 — Live price feed (later, after Phase 5 or in parallel)

A WebSocket fast path for streaming quotes, separate from the standard
request/response API. Design is already sketched in
[architecture.md](architecture.md) §3 — not scheduled with specific weeks
yet since it depends on which market-data provider is chosen and real usage
data from the live MVP.

---

## Realistic totals

| Phase | Weeks | Calendar (part-time) |
|---|---|---|
| 1 · Foundation + landing | 1–3 | ~3 weeks |
| 2 · Auth (OTP) | 4–6 | ~3 weeks |
| 3 · Payments | 7–9 | ~3 weeks |
| 4 · Ship (PWA + Android) | 10–12 | ~3 weeks |
| **MVP total** | | **~12 weeks (3 months)** |
| 5 · AI layer | 13+ | +6–8 weeks |

Buffer expectation: at 7.5 hrs/week, plan for **3–4 months to a live MVP**. If it stretches, that's normal — protect momentum by shipping something every single session, however small.

Compliance runs in parallel with all of this, not as a phase of its own —
see [plan.md](plan.md)'s compliance section.
