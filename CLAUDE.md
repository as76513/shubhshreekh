@AGENTS.md

# Project docs

ShubhShreekh is a SEBI-RA subscription app. Three docs are the source of truth
for direction and are kept mutually consistent — update them together, not in
isolation:

@architecture.md — how the system works: components, data flow, diagrams
@plan.md — requirements/decisions: stack choices, domains, costs, compliance
@build-plan.md — when things get built: phases, weeks, milestones
@TECH_DEBT.md — deferred items, OTP_TEST_PHONES, launch shortcuts to clear

**Current phase:** **October 18 sprint** — production Play Store (AAB) deadline
2026-10-18 (moved from 2026-10-08). Auth → PayU (web) + Play Billing (TWA) →
**thin insights CMS** (`/admin` so RA publishes daily calls) → AAB. Full CMS
(MF/courses/videos) and live market deferred. See build-plan.md § October 18
sprint.

**Backend:** `backend/` (Go API on Lambda) — auth endpoints live; content
routes planned (thin insights in sprint). **Frontend:** Next.js in `src/` —
Insights still on `data.ts` until `GET /insights` is wired; ticker stays static.

**Decided:** MSG91 SendOTP for auth; **PayU** for web payments (see plan.md).
**Decided:** no live market-data vendor for MVP. **Play Store:** Organization
account + Play Billing (or billing choice) required for public listing.
**Decided:** thin insights CMS in Oct 18 scope (not full Pipe B).
