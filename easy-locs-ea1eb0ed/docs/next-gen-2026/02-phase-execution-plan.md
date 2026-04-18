# 02 — Phase-by-Phase Execution Plan

> Step-1 deliverable for Task #1075. Each phase is a separate, gated body of
> work tracked as its own task. **No phase begins until the previous phase's
> exit gate passes and the artifacts in this folder are accepted.**

## Conventions

- **Inputs:** prerequisites that must be true before the phase starts.
- **Workstreams:** the bounded set of changes the phase delivers.
- **Exit gate:** the single, testable condition that proves the phase is done.
- **Owner:** Super Admin / project owner approves each gate.
- **Diff discipline:** every phase MUST produce minimal diffs and avoid v1/v2
  parallel systems.

---

## Phase 0 — Pre-implementation deliverables (this task)

- **Inputs:** none.
- **Workstreams:** the nine artifacts in `docs/next-gen-2026/`.
- **Exit gate:** owner explicitly accepts all nine documents in writing.
- **Out of scope:** any code change to `src/`, `api/`, `supabase/`, or `e2e/`.

---

## Phase 1 — Core universal foundation

- **Inputs:** Phase 0 accepted.
- **Workstreams:**
  - Define + freeze canonical contracts: `UserProfile`, `Wallet`,
    `OrbitChannel`, `Notification`, `RouteRegistryEntry`, `MerchantWorkspace`.
  - Land identity-merge service so legacy duplicates resolve to one canonical
    user at read + write time.
  - Land global wallet service as the **only** writer of ledger rows.
  - Land Orbit communication service as the **only** producer of channel
    subscriptions (uses the canonical realtime wrapper).
  - Unified navigation: collapse to one route registry per pillar (already
    enforced by ESLint per `ARCHITECTURE_GUARDRAILS.md`).
  - Schema audit: one schema per entity, no shadow tables.
- **Exit gate:** every downstream module can plug into the canonical contracts
  only — verified by a contract test suite that fails if a domain bypasses
  identity / wallet / Orbit.

---

## Phase 2 — Auto-onboarding engine

- **Inputs:** Phase 1 accepted.
- **Workstreams:**
  - Single onboarding entry accepting email / phone / website / business name.
  - Ingestion: scrape public site, parse menus/services, photos, categories,
    pricing, hours, location.
  - Provisioner: transactional create of merchant + wallet + Orbit channel +
    dashboard workspace.
  - Real data preferred; placeholders only where no real data exists.
- **Exit gate:** end-to-end onboarding completes for every input shape in
  under 2 minutes, verified by an automated scenario per shape.

---

## Phase 3 — Unified UX model

- **Inputs:** Phase 2 accepted.
- **Workstreams:**
  - Consolidate account, wallet, communication, notifications, navigation,
    and support entry points across all verticals.
  - Read-time + write-time reconciliation for any remaining duplicates.
  - Standardize CTAs, modals, toasts, and empty/error states.
- **Exit gate:** identical action via URL / button / redirect produces
  identical state and routing across every vertical, verified by a parity
  test matrix.

---

## Phase 4 — Playwright runtime engine

- **Inputs:** Phase 3 accepted.
- **Workstreams:** see `05-playwright-runtime-design.md`.
  - Eight required profiles: guest, email user, phone OTP user, merchant,
    empty-data user, heavy-data user, expired-session user, super admin.
  - Imperfect-user behaviors: fast clicks, refresh during load, back/forward
    spam, multi-tab.
  - Coverage: onboarding, browsing, ordering, messaging, wallet, admin.
- **Exit gate:** every profile × flow combination has a runnable, reproducible
  scenario. Runs both scheduled and on-demand against a live environment.

---

## Phase 5 — Load + scale simulation

- **Inputs:** Phase 4 accepted.
- **Workstreams:** see `06-load-testing-design.md`.
  - k6 scenarios ramp 100 → 300 → 1000 mixed-profile users.
  - Mix: browsing, ordering, wallet reads, communication, admin reads.
  - **Sandbox-only payments. No destructive real actions.**
- **Exit gate:** a full ramp produces a performance + bottleneck report.

---

## Phase 6 — Analysis engine

- **Inputs:** Phase 5 accepted.
- **Workstreams:**
  - Capture timings, navigation paths, errors, console + network logs.
  - UX signals: rage clicks, dead clicks, back-and-forth, abandonment.
  - Per-issue record: severity, route/module, profile, repro steps,
    console + network logs, root cause, minimal fix, recurrence risk,
    classification (UX / navigation / state / realtime / auth / performance /
    data integrity).
- **Exit gate:** a representative run yields a structured, classified,
  actionable report with all required fields populated.

---

## Phase 7 — Self-improvement loop orchestrator

- **Inputs:** Phase 6 accepted.
- **Workstreams:**
  - Wire the loop end-to-end: onboard → simulate → detect → classify →
    propose → **approval gate** → apply minimal fix → retest → report.
  - Loop is resumable, idempotent, never auto-applies a critical fix.
- **Exit gate:** one full loop completes against a sample business with a
  human approval step in the middle and a passing retest.

---

## Phase 8 — Realtime + cache hardening

- **Inputs:** Phase 7 accepted.
- **Workstreams:**
  - Route all realtime channels through the canonical wrapper.
  - Internally map `.unsubscribe()` → `removeChannel`.
  - Eliminate channel leaks and duplicate subscriptions.
  - Full cache reset on signOut, token expiry, user switch, cross-tab logout.
- **Exit gate:** targeted tests prove zero cross-user data leakage and zero
  stale cache after session change.

---

## Phase 9 — UX intelligence

- **Inputs:** Phase 8 accepted.
- **Workstreams:**
  - Detect user intent (food / ride / pay / communicate) from real signals.
  - Adapt menus, shortcuts, CTAs with **targeted micro-improvements only**.
  - **No redesigns.**
- **Exit gate:** measurable improvement on at least one weak flow without
  altering its layout.

---

## Phase 10 — Super Admin control plane

- **Inputs:** Phase 9 accepted.
- **Workstreams:** see `07-dashboard-structure.md`.
- **Exit gate:** an operator can drive onboarding, verification,
  improvement, and runtime health entirely from this view.

---

## Phase 11 — Digital twin

- **Inputs:** Phase 10 accepted.
- **Workstreams:**
  - Stand up a production-mirror environment.
  - Run thousands of simulated users + load spikes + realistic behavior.
- **Exit gate:** at least one issue is caught in the twin before reaching
  production.

---

## Phase 12 — Regression prevention

- **Inputs:** Phase 11 accepted (or running in parallel for past fixes).
- **Workstreams:**
  - Every fix from the loop lands with at least one of:
    invariant, wrapper, guard, or test.
- **Exit gate:** each previously fixed bug class has a regression check that
  fails on regression.

---

## Cross-phase non-negotiables

- No parallel v1/v2 systems. Replace in place or unify behind contracts.
- Every PR touches a single phase scope unless the owner explicitly waives.
- Critical fixes never auto-apply.
- Phase exit gates are explicit, written acceptances — not implicit.
