# Backend (Go) — ShubhShreekh API

For the system-wide picture (why this exists, entitlement model, where it
sits relative to the frontend) see [../architecture.md](../architecture.md).
This doc is the technical map of *this* directory: how the pieces here
connect, concretely, file to file.

## Structure

```
backend/
├── cmd/
│   ├── server/     — local dev entrypoint (plain net/http)
│   ├── lambda/      — deployed entrypoint (API Gateway, via httpadapter)
│   └── minttoken/  — dev-only: mint a test session token without going
│                      through OTP at all (never imported by cmd/lambda)
└── internal/
    ├── api/        — HTTP handlers + router; the exact same handler tree
    │                  is shared by both cmd/server and cmd/lambda
    ├── auth/       — session token issue/verify (self-signed HMAC JWT)
    │                  + the middleware that guards routes
    ├── otp/        — OTP provider abstraction: Mock (local dev) or MSG91
    │                  (real), selected at wiring time in cmd/*
    └── db/         — DynamoDB access (users table)
```

## Request dispatch: from `main.go` to a handler

Before the auth flow below makes sense, it helps to see the plumbing it
rides on. Two different entrypoints build the *exact same* handler tree —
that's the whole point of `internal/api.NewRouter`: `cmd/server` and
`cmd/lambda` are behaviorally identical despite completely different
transports underneath.

### 1. Startup — both entrypoints build the same router

```
┌────────────────────────┐         ┌──────────────────────────┐
│ cmd/server/main.go      │         │ cmd/lambda/main.go        │
│ func main()              │         │ func init()                │
│ (local dev)              │         │ (deployed — runs once per  │
│                          │         │  cold start, not per req)  │
└────────────┬─────────────┘         └────────────┬───────────────┘
             │                                     │
             │  MSG91_AUTH_KEY unset?               │  MSG91_AUTH_KEY /
             │   → otp.NewMock()                    │  TEMPLATE_ID /
             │  else                                │  CORS_ALLOWED_ORIGINS
             │   → otp.NewMSG91(...)                 │  missing?
             │                                       │   → log.Fatal
             │  CORS_ALLOWED_ORIGINS unset?          │  (deployed path never
             │   → default localhost:3000            │   falls back silently)
             │                                       │
             ▼                                       ▼
      api.Deps{ SigningSecret, Users, OTP, AllowedOrigins }
                             │
                             │  both call:
                             ▼
                    api.NewRouter(deps)
                             │
                             ▼
        backend/internal/api/router.go
        ┌───────────────────────────────────────────────────────────┐
        │ mux := http.NewServeMux()                                    │
        │ mux.HandleFunc("GET /healthz", handleHealthz)                 │
        │ mw := auth.Middleware(secret)                                 │
        │ mux.Handle("GET /me", mw(handleMe))                 ◀── these │
        │ mux.HandleFunc("POST /auth/send-otp", ...)                    │  routes
        │ mux.HandleFunc("POST /auth/check-phone", ...)                 │  require
        │ mux.HandleFunc("POST /auth/verify-otp", ...)                  │  a valid
        │ mux.Handle("POST /auth/webauthn/register/begin", mw(...))  ◀──┤  Bearer
        │ mux.Handle("POST /auth/webauthn/register/finish", mw(...)) ◀──┘  token
        │ mux.HandleFunc("POST /auth/refresh/begin", ...)      ◀── NOT wrapped —
        │ mux.HandleFunc("POST /auth/refresh/finish", ...)     ◀── see below
        │                                                                │
        │ return CORS(allowedOrigins)(mux)                               │
        └─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
              one http.Handler — handed back to
              whichever entrypoint called NewRouter
```

`cmd/server` keeps that `http.Handler` and calls `http.ListenAndServe`
directly. `cmd/lambda` wraps it in an adapter instead — same handler, two
different ways of feeding it requests. That's steps 2 and 3 below.

### 2. A request arriving locally (`cmd/server`)

```
browser / frontend fetch()
        │  HTTP request
        ▼
http.ListenAndServe(":8080", router)     — cmd/server/main.go
        │
        ▼
CORS middleware                          — internal/api/cors.go
  • method == OPTIONS?  → respond 204, request stops here
  • else: Origin in allowlist? → set Access-Control-* headers
        │
        ▼
mux.ServeHTTP                            — the http.ServeMux built above
  matches "<METHOD> <path>" against the registered patterns:
        │
        ├─ GET  /healthz          → handleHealthz
        ├─ POST /auth/send-otp    → deps.handleSendOTP
        ├─ POST /auth/verify-otp  → deps.handleVerifyOTP
        └─ GET  /me               → auth.Middleware(secret) runs FIRST:
                                       verifies the Bearer token; only on
                                       success does it call deps.handleMe.
                                       Invalid/missing token → 401,
                                       handleMe never executes.
```

### 3. A request arriving deployed (`cmd/lambda`)

```
API Gateway (HTTP API)
        │  APIGatewayV2HTTPRequest event (JSON)
        ▼
lambda.Start(handler)                    — cmd/lambda/main.go, func main()
        │
        ▼
handler(ctx, req)
        │  adapter.ProxyWithContext(ctx, req)
        ▼
httpadapter.HandlerAdapterV2             — translates the API Gateway
                                            event into a plain
                                            http.Request/ResponseWriter
        │
        ▼
(same CORS → mux → handler chain as local — identical code,
 because both entrypoints called the same api.NewRouter(deps))
```

The `init()` vs `main()` split in `cmd/lambda` matters: `init()` runs once
per Lambda cold start (building the router, connecting to DynamoDB), while
`handler()` runs on every single invocation — the expensive setup isn't
repeated per request.

## The auth flow, end to end

This is the concrete path a phone number takes from the signup dialog to a
usable session token — every arrow below is a real function call, not a
simplification. Frontend files are relative to the repo root.

```
1. User types a phone number
   src/components/SignupModal.tsx
        │
        │  requestOtp(phone)        — src/lib/api.ts
        ▼
2. POST /auth/send-otp
   backend/internal/api/auth.go → handleSendOTP
   Validates phone format server-side (10 digits, starts 6-9) —
   never trusts whatever the frontend already checked.
        │
        │  d.OTP.Send(ctx, "91"+phone)
        ▼
3. otp.Provider.Send
   backend/internal/otp/
     • Mock   (local dev): generates a code, logs it to stdout,
                remembers it in memory. No real SMS is sent.
     • MSG91  (production): POST control.msg91.com/api/v5/otp

        [ user reads the code — from the terminal locally, or a
          real SMS in production — and types it into the UI ]

4. User types the OTP
   src/components/SignupModal.tsx
        │
        │  confirmOtp(phone, otp)   — src/lib/api.ts
        ▼
5. POST /auth/verify-otp
   backend/internal/api/auth.go → handleVerifyOTP
   Validates phone + OTP format again server-side.
        │
        │  d.OTP.Verify(ctx, phone, code)
        ▼
6. otp.Provider.Verify
   backend/internal/otp/
     • Mock:  matches against the in-memory code, one-time use
     • MSG91: GET control.msg91.com/api/v5/otp/verify
        │
        │  ok == true
        ▼
7. db.UsersTable.GetOrCreateByPhone
   backend/internal/db/users.go
   Phone number IS the user_id — there's no separate signup step,
   so a phone→user_id index would be indirection with nothing to
   justify it. Conditional put avoids a race on first-time signup.
        │
        ▼
8. auth.IssueToken
   backend/internal/auth/token.go
   Self-signed HMAC JWT. Carries the subscription tier claim
   (architecture.md: "never trust the client" — this is why the
   tier rides in a server-signed token instead of a request field).
        │
        │  { "token": "...", "subscription": "free" }
        ▼
9. Token stored, dialog closes
   src/components/SignupModal.tsx  → localStorage.setItem(...)
```

Every subsequent authenticated request follows a shorter, separate path:

```
Frontend                                    Backend
────────                                    ───────
Authorization: Bearer <token>  ────────▶   auth.Middleware
                                            backend/internal/auth/middleware.go
                                              • verifies the HMAC signature
                                              • pins alg to HS256 (blocks an
                                                alg:"none" forgery attempt)
                                              • puts claims in request context
                                                        │
                                                        ▼
                                            handler reads auth.FromContext(ctx)
                                            — e.g. handleMe in api/me.go —
                                            never from anything the client
                                            sent directly in the request body
```

## OTP rate limiting (TD-006)

Added 2026-10-05, ahead of sending any real MSG91 OTPs (they cost money per
send). Both `handleSendOTP` and `handleVerifyOTP` check in with a
`RateLimiter` before doing anything else:

```
POST /auth/send-otp                         POST /auth/verify-otp
      │                                            │
      ▼                                            ▼
RateLimiter.AllowSend(phone)                RateLimiter.AllowVerify(phone)
      │                                            │
  not ok → 429 + Retry-After              not ok (locked out) → 429 + Retry-After
      │                                            │
  ok → RecordSend, then                        ok → OTP.Verify(phone, code)
       OTP.Send(phone)                               │
                                              wrong  │  right
                                        RecordVerifyFailure   RecordVerifySuccess
                                        (may start a lockout)  (clears failure count)
```

**Limits** (plain Go constants in `internal/ratelimit/ratelimit.go`, not
env-configurable — see that file's comment for why): 60s cooldown + 5/day
cap per phone on sends; 5 wrong codes locks a phone out of verify for 15
minutes. `OTP_TEST_PHONES` numbers (TD-001) are exempt from both — see
`auth.go`'s `isTestPhone` — so QA/Play reviewers repeatedly using the fixed
test code can't lock themselves out.

**Storage:** `shubhshreekh-otp-ratelimit-<env>` (`infra/backend/dynamodb.tf`),
one item per phone **per UTC day** (`<phone>#<YYYYMMDD>`), so counts reset
at midnight UTC with no cleanup job, and DynamoDB's native TTL deletes each
day's row a couple of hours after it's no longer needed. This is a
read-then-write (not a single atomic conditional update) — an intentional
simplification for an abuse-prevention gate at pre-launch volume (see
TECH_DEBT.md TD-006), not something that needs to be airtight against a
same-instant race the way a payment ledger would.

**Why it's layered this way:** `internal/ratelimit` holds the actual rules
(`CheckSend`, `RecordSend`, `CheckVerify`, `RecordVerifyFailure`,
`RecordVerifySuccess`) as pure functions with zero AWS dependency — unit
tested directly, no mocking. `internal/db/ratelimit.go` is only the
DynamoDB read/write glue around those functions. The `api` package depends
on a small `RateLimiter` interface (`internal/api/ratelimit.go`), not the
concrete DynamoDB type, so `internal/api/auth_test.go` can exercise
`handleSendOTP`/`handleVerifyOTP` with an in-memory fake over
`net/http/httptest` — no real AWS or MSG91 call in the test suite at all.

## Refresh without OTP: biometric/PIN unlock (WebAuthn)

Added 2026-10-05 — see TECH_DEBT.md TD-048. OTP costs real money per send
(plan.md's MSG91 cost table), so the access token `auth.IssueToken` issues
is now short-lived (`accessTokenTTL`, 30 min — see `internal/api/webauthn.go`)
instead of the original 30 days, and a separate server-tracked deadline
(`db.User.VerifiedUntil`, set to **OTP time + 7 days**, never extended by a
refresh) bounds how long the device can go without another real OTP. A
registered WebAuthn credential — the actual browser/OS API behind Face ID,
fingerprint, Windows Hello, or a device PIN — can mint fresh access tokens
inside that window without ever touching MSG91 again.

```
Right after a successful OTP login (step 8 above), best-effort, non-blocking:

  src/components/pages/Auth.tsx
        │  isPlatformAuthenticatorAvailable()?  — no biometric/PIN set up
        │  on this device/OS → skip silently, nothing below ever runs
        ▼
  registerPasskey(accessToken)          — src/lib/webauthn.ts
        │  POST /auth/webauthn/register/begin   (Bearer required)
        ▼
  webauthn.BeginRegistration            — internal/api/webauthn.go
        │  challenge stored on the user row (db.User.WebAuthnSession)
        ▼
  navigator.credentials.create()        — triggers the OS's native
                                            Face ID / fingerprint / Windows
                                            Hello / PIN dialog
        │  POST /auth/webauthn/register/finish  (Bearer required)
        ▼
  webauthn.FinishRegistration           — verifies the signature, stores
                                            the PUBLIC key only
                                            (db.User.WebAuthnCredential)
                                            — the private key never left
                                            the device's secure hardware


Every later app (re)open, before falling back to whatever's in storage:

  src/lib/auth-context.tsx (mount effect)
        │  refreshWithPasskey(userId)          — src/lib/webauthn.ts
        ▼
  POST /auth/refresh/begin  {user_id}   — NOT wrapped in auth.Middleware;
        │                                  a possibly-expired access token
        │                                  is exactly the case this exists
        │                                  for, so it re-derives trust
        │                                  itself:
        │                                    • user has a credential? else 401
        │                                    • time.Now() < VerifiedUntil? else 401
        ▼
  webauthn.BeginLogin                   — issues a fresh challenge
        │
        ▼
  navigator.credentials.get()           — same native OS dialog as above
        │  POST /auth/refresh/finish?user_id=…
        ▼
  webauthn.FinishLogin                  — verifies the signature + the
        │                                  authenticator's signature
        │                                  counter (clone detection),
        │                                  re-checks VerifiedUntil once more
        ▼
  auth.IssueToken (30 min)              — same token shape as OTP login;
                                            VerifiedUntil is NOT touched —
                                            only another real OTP resets it
```

**Desktop vs. mobile — this is not the same on every device.** A platform
authenticator means an OS-level biometric/PIN is actually configured —
Windows Hello, Touch ID, Android's lock screen. Where one exists, desktop
behaves exactly like mobile: OTP once, then the OS's native dialog for 7
days. Where one doesn't (a plain password-only Windows/Mac account, most
Linux setups, or an older browser), `isPlatformAuthenticatorAvailable()`
returns `false`, registration is skipped with no visible error, and every
refresh attempt fails fast at `/auth/refresh/begin` (no credential on file)
— the frontend just keeps using whatever's already in `localStorage`. That's
silent and harmless **today** only because nothing in the UI yet calls a
Bearer-protected customer endpoint; once `GET /insights` (Oct 18 sprint)
does, those users' 30-minute access tokens will go stale with nothing
prompting re-login until TD-047 (global 401 → refresh-or-logout handling)
is built.

## Trial entitlement + 2-device anti-piracy login (TD-054)

Added 2026-10-06, replacing the Free tier entirely — see plan.md's
"Decided: Pro-only pricing & trial model." Every signup gets a 7-day Pro
trial (`User.TrialEndsAt`, set once by `GetOrCreateByPhone`); past that,
without a paid subscription, login is refused outright:

```
POST /auth/verify-otp                    POST /auth/refresh/finish
      │                                         │
  OTP matched                             WebAuthn assertion verified
      │                                         │
  db.HasActiveEntitlement(user)?          db.HasActiveEntitlement(user)?
      │ no → 403 trial_expired                  │ no → 403 trial_expired
      │ yes                                     │ yes → mint token (subscription always "pro")
      ▼
  RegisterDevice(deviceId)
      │ already 2 devices, this one unknown → 403 device_limit_reached
      │    + the 2 occupied devices + a 10-min deviceSwapRole token
      │ room, or already registered → mint token (subscription always "pro")
```

A rejected device_limit_reached login isn't a dead end: the frontend shows
the 2 occupied devices (label + last-active, from `User.Devices`) and the
short-lived token lets `POST /auth/devices/swap` (claims.Role must be
`deviceSwapRole`, not a normal session) remove one and complete the same
login — OTP was already proven, so this doesn't ask for it again. Swapping
is capped at once per 24h (`db.CanSwapDevice`) so it can't be used to rotate
through more than 2 effective devices. The actual cooldown/cap/swap rules
are pure functions in `backend/internal/db/devices.go` (`HasActiveEntitlement`,
`CheckDevice`, `TouchOrRegisterDevice`, `SwapDevice`, `CanSwapDevice`) —
unit-tested with zero AWS involved, same pattern as TD-006's rate limiter.

Since there's no Free tier left, `subscription` in every issued token is
now always `"pro"` once entitlement/device checks pass — there's nothing
else left to issue. This is also why `insights.go`'s tier-zeroing logic
needed no changes: `claims.Subscription != "pro"` simply never triggers for
any user who's still logged in.

## Provider swap: Mock ↔ MSG91 ↔ test phones

Which `otp.Provider` gets used is decided once, at process startup
(`otp.ProviderFromEnv`), not per-request:

| Entrypoint | Config | Provider |
|---|---|---|
| `cmd/server` (local) | no MSG91, no `OTP_TEST_PHONES` | `otp.Mock` (codes in logs) |
| either | `OTP_TEST_PHONES` set | `otp.Gate` — fixed `OTP_TEST_CODE`, no SMS for those numbers |
| either | `MSG91_AUTH_KEY` set | MSG91 (± Gate if test phones also set) |
| `cmd/lambda` | neither MSG91 nor test phones | **`log.Fatal`** |

Play reviewers: whitelist their phone in `OTP_TEST_PHONES`, put the same
number + `OTP_TEST_CODE` in Play Console App access. See
[TECH_DEBT.md](../TECH_DEBT.md) TD-001 — clear whitelist after DLT is live.

## CORS

`backend/internal/api/cors.go` restricts cross-origin requests to an
explicit allowlist (`CORS_ALLOWED_ORIGINS`, comma-separated). This isn't a
local-dev-only concern — frontend and backend are on different origins in
production too (`app.<domain>` vs `api.<domain>`, see plan.md's domain
section). `cmd/server` defaults to `http://localhost:3000` if unset;
`cmd/lambda` requires it explicitly.

## Running locally

```bash
cp ../.env.example .env      # then fill in real values
set -a; source .env; set +a  # Go doesn't auto-load .env files
go run ./cmd/server
```

Leave `MSG91_AUTH_KEY` blank to use the mock provider — OTP codes print to
this terminal instead of being sent anywhere. See `../.env.example` for
every variable this reads.

## Related docs

- [../architecture.md](../architecture.md) — system-wide request flow, the
  entitlement model, why subscription tier lives in the token
- [../plan.md](../plan.md) — identity provider decision record (MSG91 vs
  Cognito vs Firebase)
- [../build-plan.md](../build-plan.md) — where this fits in the build
  timeline (Phase 2, Week 4)
- [../TECH_DEBT.md](../TECH_DEBT.md) — TD-047/048/049/050: the refresh/
  WebAuthn work above, and what's still open on top of it
- [../TESTING.md](../TESTING.md) — post-deploy smoke test checklist for
  this flow and the thin insights CMS
