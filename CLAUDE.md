@AGENTS.md

# Project docs

ShubhShreekh is a SEBI-RA subscription app, currently at Phase 1 of
build-plan.md (bare `create-next-app` scaffold in `src/`; no `backend/`
directory exists yet). Three docs are the source of truth for direction and
are kept mutually consistent — update them together, not in isolation:

@architecture.md — how the system works: components, data flow, diagrams
@plan.md — requirements/decisions: stack choices, domains, costs, compliance
@build-plan.md — when things get built: phases, weeks, milestones

Open decisions still flagged in these docs (check before assuming either
answer): identity provider (Cognito vs MSG91/Firebase phone-OTP) — see
plan.md's "Open decision" section.
