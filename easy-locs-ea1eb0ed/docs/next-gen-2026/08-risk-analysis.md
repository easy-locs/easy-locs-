# 08 — Risk Analysis

> Step-1 deliverable for Task #1075. Identifies the top risks to the 12-phase
> rollout, their likelihood/impact, and the mitigations baked into the plan.

## Scoring

- **Likelihood:** Low / Medium / High
- **Impact:** Low / Medium / High / Critical
- **Score:** Likelihood × Impact (qualitative)

## Risk register

### R1 — Identity merge corrupts user data
- **Likelihood:** Medium · **Impact:** Critical
- **Description:** Reconciling duplicate `user_profile` rows wrong could
  attach orders/wallets to the wrong person.
- **Mitigation:** All merges happen inside one transaction with a
  `merged_into_id` link (no destructive deletes). Reads always resolve via
  the identity service. A reversible "unmerge" path is required before any
  bulk run. Phase 1 ships with a contract test set that fails on any
  ambiguous merge.

### R2 — Wallet ledger inconsistency
- **Likelihood:** Medium · **Impact:** Critical
- **Description:** Concurrent writes or non-idempotent retries could double
  count.
- **Mitigation:** Append-only ledger with `(wallet_id, idempotency_key)`
  uniqueness. Wallet service is the **only** writer. Property-based test in
  Phase 1: replay any sequence of operations + retries → balance is stable.

### R3 — Realtime channel leaks / cross-user data leakage
- **Likelihood:** High (existing risk in the codebase) · **Impact:** Critical
- **Description:** Subscriptions outliving sessions could leak data to the
  next user on the same browser.
- **Mitigation:** Phase 8 routes all realtime through one wrapper that maps
  `.unsubscribe()` → `removeChannel`. Cache resets fire on signOut, token
  expiry, user switch, and cross-tab logout. Targeted leak tests are the
  exit gate.

### R4 — Auto-applied fix breaks production
- **Likelihood:** Medium · **Impact:** High
- **Description:** An overly eager loop applies a "minimal" fix that
  regresses a critical flow.
- **Mitigation:** Approval gate is non-bypassable for critical fixes. Every
  fix lands with a regression guard (Phase 12). Loop is resumable +
  idempotent so retests are mandatory.

### R5 — Load tests cause real money movement
- **Likelihood:** Low (with controls) · **Impact:** Critical
- **Description:** A misconfigured ramp authenticates as a real user and
  triggers real payments.
- **Mitigation:** Sandbox-only auth helpers. Server-side guard rejects
  load-test payment requests without the sandbox header. Pre-run check
  aborts if the resolved environment is production.

### R6 — Onboarding ingestion fabricates data
- **Likelihood:** Medium · **Impact:** Medium
- **Description:** Scraping ambiguous sites could attach wrong menus or
  hours to a merchant.
- **Mitigation:** `merchant_asset.is_real_data` flag plus `source_url`
  provenance. UI must distinguish placeholder vs real. Real data preferred,
  placeholders only when no real data exists. Operator review surface in
  the Super Admin dashboard.

### R7 — Two parallel systems sneak in
- **Likelihood:** Medium · **Impact:** High
- **Description:** A new feature introduces its own identity/wallet/comms
  table because the canonical contract feels too heavy.
- **Mitigation:** Hard architectural rules in `01-architecture-diagram.md`.
  ESLint rule already enforces per-pillar route ownership. Phase 1 contract
  tests fail if a domain bypasses the canonical services.

### R8 — Phase creep / huge diffs
- **Likelihood:** High · **Impact:** Medium
- **Description:** A "small" Phase-3 change quietly redesigns a vertical.
- **Mitigation:** Diff discipline is binding (see
  `02-phase-execution-plan.md`). Each phase is one task with one exit gate.
  PRs that touch multiple phase scopes require explicit owner waiver.

### R9 — Playwright runtime engine is flaky
- **Likelihood:** High · **Impact:** Medium
- **Description:** Imperfect-user behaviors generate unreliable signals.
- **Mitigation:** Capture artifacts must be reproducible. The matrix exit
  gate requires every cell be runnable, not necessarily passing. Flaky
  scenarios are quarantined and reviewed, not deleted.

### R10 — Performance regressions hidden by averaging
- **Likelihood:** Medium · **Impact:** High
- **Description:** SLAs measured on means hide tail latency.
- **Mitigation:** SLAs in `06-load-testing-design.md` are p95/p99-based.
  A run fails on sustained breach (≥ 60 s).

### R11 — Super Admin surface becomes an attack vector
- **Likelihood:** Medium · **Impact:** Critical
- **Description:** A privilege check is missed and a non-admin reaches
  `/admin/*`.
- **Mitigation:** Two-layer gating (route guard + service-level check).
  Every admin action writes an immutable audit row. Periodic access
  reviews via the dashboard itself.

### R12 — Digital twin drifts from production
- **Likelihood:** High · **Impact:** Medium
- **Description:** Twin loses fidelity over time, masking issues.
- **Mitigation:** Twin parity check is part of Phase 11 exit gate. Schema
  + config reconciliation runs on every twin spin-up. Catching at least one
  real issue in the twin before production is the gate.

### R13 — Approval fatigue
- **Likelihood:** High · **Impact:** Medium
- **Description:** Operators rubber-stamp fix approvals.
- **Mitigation:** Critical fixes require a second confirmation. Settings
  let an owner enforce a minimum review window. Audit log surfaces same-
  reviewer / one-click patterns.

## Summary heat-map

| ID  | Likelihood | Impact   |
|-----|------------|----------|
| R1  | Medium     | Critical |
| R2  | Medium     | Critical |
| R3  | High       | Critical |
| R4  | Medium     | High     |
| R5  | Low        | Critical |
| R6  | Medium     | Medium   |
| R7  | Medium     | High     |
| R8  | High       | Medium   |
| R9  | High       | Medium   |
| R10 | Medium     | High     |
| R11 | Medium     | Critical |
| R12 | High       | Medium   |
| R13 | High       | Medium   |

The highest combined risks (R3, R1, R2, R5, R11) are addressed by hard
architectural rules + non-bypassable gates rather than process alone.
