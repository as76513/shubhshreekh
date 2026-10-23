@AGENTS.md

# Project docs

ShubhShreekh is a SEBI-RA subscription app. Three docs are the source of truth
for direction and are kept mutually consistent — update them together, not in
isolation:

@architecture.md — how the system works: components, data flow, diagrams
@plan.md — requirements/decisions: stack choices, domains, costs, compliance
@build-plan.md — when things get built: phases, weeks, milestones
@TECH_DEBT.md — deferred items, OTP_TEST_PHONES, launch shortcuts to clear

**Current phase:** Play Store listing as a **free** app. Razorpay and Play
Billing are deferred to **January 2027**. Thin insights CMS is live. Full CMS
(MF/courses/videos) and live market stay deferred.

**Backend:** `backend/` (Go API on Lambda) — auth endpoints live; content
routes planned (thin insights in sprint). **Frontend:** Next.js in `src/` —
Insights still on `data.ts` until `GET /insights` is wired; ticker stays static.

**Decided:** MSG91 SendOTP for auth; **Razorpay** (web) and **Play Billing** (TWA) in January 2027. Until then the Play app is free: no checkout, no prices, no trial lock.
**Decided:** no live market-data vendor for MVP. **Play Store:** Organization
account. Play Billing is not required on the free listing.
**Decided:** thin insights CMS in Oct 18 scope (not full Pipe B).
**Decided (2026-10-06):** Free tier removed — Pro-only with a 7-day trial,
2-device anti-piracy login, admin-configurable discount pricing (see
plan.md's "Decided: Pro-only pricing & trial model" and TECH_DEBT.md
TD-052–059). Folded into the Oct 18 critical path since `/orders` depends
on this model existing first.
