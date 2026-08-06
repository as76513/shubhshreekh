# 💰 Cost Breakdown — ShubShreekh (AWS Mumbai / ap-south-1)

> Region: **ap-south-1 (Mumbai)** · Currency: **INR** · Rate used: **~₹88/USD**
> **GST (18%)** applies on top unless reclaimed as input tax credit.
> Figures are converted from AWS USD list prices and are **tentative** — verify with the [AWS Pricing Calculator](https://calculator.aws) set to Mumbai.

## Design principle: scale to zero

At every early stage, each service is **serverless and scales to zero when idle** — you pay per request, not for idle servers. Heavy always-on infrastructure (Multi-AZ RDS, Fargate clusters, ALB, WAF) is deferred until real usage and downtime cost justify it.

**Core stack:** Flutter → API Gateway (HTTP API) → Lambda (Go) → **DynamoDB**, with **Cognito** for auth.

### Why DynamoDB (not RDS) early
This app's access patterns are key-based — look up a user, their subscription, their watchlist. DynamoDB fits perfectly, is serverless (≈₹0 at low volume), and its 25 GB free tier never expires. RDS only earns its place later, *if* complex relational queries appear — and even then, single-AZ first. Multi-AZ is only for when downtime costs real money.

---

## 🟢 Stage 1 — Launch (first ~2 months, ~50 users)

Fully serverless. Everything scales to zero.

| Service | Config | Monthly (INR) |
|---|---|---|
| Cognito | 50 MAU (under 10k free) | ₹0 |
| DynamoDB | On-demand, tiny volume | ₹0–₹50 |
| Lambda | Go API, few thousand calls | ₹0–₹50 |
| API Gateway | HTTP API, low volume | ₹0–₹90 |
| SSM Parameter Store | secrets (instead of Secrets Manager) | ₹0 |
| Route 53 | 1 hosted zone | ~₹45 |
| ACM (SSL) | certs | ₹0 |
| CloudWatch | minimal logs | ₹0–₹100 |
| Market data API | free / delayed tier | ₹0 |
| **Total** | | **≈ ₹100–₹350 / month** |

---

## 🟡 Stage 2 — Traction (~1,000 users)

Still fully serverless. Costs rise only with actual usage; the market-data API becomes the biggest line item, not AWS.

| Service | Monthly (INR) |
|---|---|
| Cognito (1k MAU) | ₹0 |
| DynamoDB (on-demand) | ₹200–₹800 |
| Lambda | ₹300–₹1,000 |
| API Gateway | ₹300–₹900 |
| CloudWatch + Route 53 + SSM | ~₹300 |
| Market data API (paid, real-time) | ~₹2,600 (~$30) |
| **Total** | **≈ ₹3,500–₹6,000 / month** |

> On delayed/free market data, this stays under ~₹2,000/month.

---

## 🔴 Stage 3 — Scaling up (~10,000+ users, when it's real)

Introduce heavier pieces **only when metrics justify them**:
- **CloudFront (CDN)** — when traffic and data egress grow
- **WAF** — fintech security posture (~₹900/mo) — recommended once you have real users
- **Always-on compute** (small ECS/EC2) — only if Lambda cold-starts hurt UX on hot paths
- **RDS single-AZ** — only if you need relational queries DynamoDB can't serve well (Multi-AZ only when downtime costs real money)

| Service | Monthly (INR) |
|---|---|
| Cognito (~10k MAU, free-tier edge) | ₹0–₹1,300 |
| DynamoDB (higher throughput) | ₹2,000–₹5,000 |
| Lambda + API Gateway | ₹2,000–₹5,000 |
| CloudFront + data transfer | ₹2,000–₹4,000 |
| WAF + CloudWatch + SSM | ₹2,000 |
| Market data API (higher tier) | ₹5,000–₹8,000 |
| **Total** | **≈ ₹15,000–₹25,000 / month** |

Driven mostly by **market-data tier and DynamoDB throughput**, not fixed infrastructure.

---

## ⚡ Optional: AI Layer (Phase 4, adds on top of any stage)

The AI insights layer can **exceed the entire infra cost** — almost all of it is LLM API calls.

| Component | Monthly (INR) |
|---|---|
| Vector DB (pgvector cheap / Pinecone free tier early) | ₹0–₹25,000 |
| LLM inference (usage-dependent) | ₹5,000–₹80,000+ |
| Embeddings + indexing | ~₹2,000 |

**Control it with:** caching, rate limits, a smaller/cheaper model for routine queries. For a demo, keep it under ~₹500/month with light usage + a free vector-DB tier.

---

## Cost-control guardrails (do these on day one)

1. **AWS Budget alert at ₹500/month** — serverless is cheap, not zero; a runaway Lambda can surprise you.
2. **Use SSM Parameter Store** over Secrets Manager early (free vs ~₹35/secret).
3. **Avoid NAT Gateway** (~₹2,000/mo silent charge) — keep Lambda out of a VPC or use VPC endpoints.
4. **HTTP API** over REST API Gateway (71% cheaper).
5. **Reserved Instances / Savings Plans** — only once you have a *fixed* always-on component (Stage 3+); up to ~69% off with commitment.
6. **Delayed/free market data** for the demo — the real-time feed is the biggest early variable cost.

---

## Bottom line

| Stage | Users | Monthly (INR) |
|---|---|---|
| 🟢 Launch | ~50 | **₹100–₹350** |
| 🟡 Traction | ~1,000 | **₹3,500–₹6,000** |
| 🔴 Scaling | ~10,000+ | **₹15,000–₹25,000** |
| ⚡ + AI layer | any | **+₹500 (demo) → ₹35,000+ (heavy)** |

*Prices tentative, converted at ~₹88/USD from AWS list rates; add 18% GST if not reclaimable. Verify exact figures in the AWS Pricing Calculator (region: Mumbai).*
