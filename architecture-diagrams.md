# Architecture Diagrams

Two views of ShubShreekh: the **end-to-end user scenario** (what a user experiences) and the **system architecture** (the components and how requests flow). The key design decision is the **two-path split** — standard request/response over Lambda, and a separate low-latency WebSocket path for the live price feed.

---

## 1. End-to-end user scenario

What the user actually experiences, from opening the app to seeing live prices.

```
              ┌─────────────────────┐
              │   User opens app    │
              │  Flutter on Android │
              └──────────┬──────────┘
                         ▼
              ┌─────────────────────┐
              │      Logs in        │
              │ Cognito hosted UI   │  + MFA
              └──────────┬──────────┘
                         ▼
              ┌─────────────────────┐
              │    Receives JWT     │
              │ stored securely     │
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
         └──────┬──────┘   └──────┬──────┘
                └───────┬─────────┘
                        ▼
              ┌─────────────────────┐
              │  Live price feed    │
              │ WebSocket, filtered │
              └─────────────────────┘
```

**The flow:** open → log in → receive token → backend checks identity and subscription tier → user sees exactly the data their tier allows → live prices stream in over a persistent connection (fast, independent of Lambda).

---

## 2. System architecture

The components, and the **two distinct paths**.

```
   ┌──────────────┐                    ┌──────────────┐
   │  Flutter app │───── authn ───────▶│ AWS Cognito  │
   │   (Android)  │                    │ authn + tiers│
   └──┬────────┬──┘                    └──────────────┘
      │        │
 STANDARD     FAST PATH
 PATH         (low latency)
 200–400ms    live feed
      │        │
      ▼        ▼
 ┌─────────┐  ┌─────────────────┐
 │   API   │  │  WebSocket feed │
 │ Gateway │  │  persistent conn│
 │(HTTP API)│ └────────┬────────┘
 └────┬────┘           ▼
      ▼          ┌─────────────────┐
 ┌─────────┐     │ Market data API │
 │ Lambda  │     │ external provider│
 │  (Go)   │◀────┴─────────────────┘
 │ JWT+authz│
 └────┬────┘
      ▼
 ┌─────────┐
 │DynamoDB │
 │users/subs│
 └─────────┘

 Cross-cutting:
 Secrets Manager / SSM · CloudWatch · WAF · Route 53
 Domain: api.shubshreekh.com / auth.shubshreekh.com
```

### Why two paths

- **Standard path** (API Gateway → Lambda → DynamoDB): login, profile, watchlist, subscription checks. Request-in/response-out. 200–400ms is imperceptible for these — no need for always-on compute.
- **Fast path** (WebSocket → market data provider): the live price ticker. A persistent connection streams updates continuously, so there's **no per-tick request/response and no Lambda cold-start penalty**. This is how the app meets a low-latency requirement without running always-on Fargate for everything.

Cognito governs identity for both paths. Entitlement (tier) is enforced server-side in the Lambda authz layer and re-used by the WebSocket filter, so a Basic user's feed can't carry Premium symbols.

### Scaling note
Early on, the WebSocket path can be API Gateway's WebSocket API. A small always-on connection manager is only needed if you outgrow that — see `docs/costs.md` Stage 3.
