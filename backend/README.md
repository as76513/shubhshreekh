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
        ┌─────────────────────────────────────────────────┐
        │ mux := http.NewServeMux()                          │
        │ mux.HandleFunc("GET /healthz", handleHealthz)       │
        │ mux.Handle("GET /me",                               │
        │    auth.Middleware(secret)(handleMe))  ◀── only this│
        │ mux.HandleFunc("POST /auth/send-otp", ...)          │    route is
        │ mux.HandleFunc("POST /auth/verify-otp", ...)        │    wrapped in
        │                                                     │    auth
        │ return CORS(allowedOrigins)(mux)                    │
        └─────────────────────────────────────────────────────┘
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

## Provider swap: Mock ↔ MSG91

Which `otp.Provider` gets used is decided once, at process startup, not
per-request:

| Entrypoint | If `MSG91_AUTH_KEY` unset | If set |
|---|---|---|
| `cmd/server` (local) | Falls back to `otp.Mock`, logs a warning | Uses real `otp.MSG91` |
| `cmd/lambda` (deployed) | **`log.Fatal`** — refuses to start | Uses real `otp.MSG91` |

The asymmetry is deliberate: silently shipping a non-functional mock to a
real deployment is a worse failure mode than the app not starting at all.
Going live with real MSG91 is a config change (`MSG91_AUTH_KEY` +
`MSG91_TEMPLATE_ID`), never a code change — see `backend/internal/otp/msg91.go`.

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
