# 09 — P0 / P1 / P2 Breakdown

> Step-1 deliverable for Task #1075. Prioritizes the work across the 12
> phases. **P0 = must ship for the platform to be safe + correct. P1 =
> required for the next-gen value proposition. P2 = important quality /
> intelligence work that follows once P0 + P1 are stable.**
>
> Priority is **independent of phase order** — a P0 item may sit inside a
> later phase, but the phase still cannot start until its predecessor's gate
> passes.

---

## P0 — Safety, correctness, single source of truth

These items protect users, money, and data. Ship gates around them or do not
ship the phase.

| Item | Phase | Why P0 |
|------|------:|--------|
| Pre-implementation deliverables accepted (this folder) | 0 | Gate for everything |
| Canonical `user_profile` + identity merge service | 1 | Prevents duplicate identities corrupting data |
| Single global wallet service (only writer of ledger) | 1 | Prevents money-movement bugs |
| Append-only `wallet_transaction` with idempotency keys | 1 | Replay-safe ledger |
| Canonical realtime wrapper + `removeChannel` mapping | 8 | Prevents cross-user data leakage |
| Cache reset on signOut / token expiry / user switch / cross-tab | 8 | Prevents cross-user leakage |
| Sandbox-only payments enforcement (server-side guard) | 5 | Prevents real money during load |
| Two-layer Super Admin gating (route + service) | 10 | Prevents privilege escalation |
| Approval gate for every fix; non-bypassable for critical | 7 | Prevents bad auto-fixes |
| Regression guard with every fix (invariant / wrapper / guard / test) | 12 | Prevents bug-class recurrence |
| Hard architectural rules enforced (no DB-from-UI, no v1/v2) | 1 | Prevents architectural drift |

## P1 — Next-gen value proposition

These items deliver the platform's promise: auto-onboarded businesses, a
unified UX, and a runtime that exercises real flows.

| Item | Phase | Why P1 |
|------|------:|--------|
| Auto-onboarding entry (email / phone / website / name) | 2 | Core value: 2-minute onboarding |
| Ingestion pipeline (scrape, parse, real data preferred) | 2 | Real data over placeholders |
| Transactional provisioner (merchant + wallet + Orbit + workspace) | 2 | One-shot setup |
| Unified UX shell + same-action / same-state guarantees | 3 | Core value: one platform feel |
| Eight Playwright runtime profiles | 4 | Required by spec |
| Imperfect-user behaviors (fast clicks, refresh-during-load, etc.) | 4 | Required by spec |
| Profile × flow coverage matrix (≥ 48 scenarios) | 4 | Phase-4 exit gate |
| k6 ramps 100 / 300 / 1000 mixed-realistic | 5 | Phase-5 exit gate |
| Analysis engine with full per-issue record | 6 | Phase-6 exit gate |
| Self-improvement loop end-to-end with approval | 7 | Phase-7 exit gate |
| Super Admin control plane (Overview / Runtime / Improvements / Health) | 10 | Operator surface |

## P2 — Quality, intelligence, twin

These items raise the platform's intelligence and prevent future problems.
They follow once P0 + P1 are stable.

| Item | Phase | Why P2 |
|------|------:|--------|
| UX intelligence — intent detection + targeted micro-improvements | 9 | Quality, not safety |
| UX signals capture (rage clicks, dead clicks, abandonment) | 6 | Feeds intelligence |
| Bottleneck reports (slow query / Edge fn / realtime fan-out) | 5–6 | Optimization input |
| Digital twin environment (parity + spike scenarios) | 11 | Catches issues pre-prod |
| Health views per vertical | 10 | Operator quality of life |
| Audit log + access reviews on Super Admin | 10 | Defense-in-depth |
| Approval-fatigue mitigations (review window, second confirm) | 10 | Process quality |

---

## Sequencing implications

- **No P0 item may slip past its phase exit gate** — the next phase does not
  start.
- A P1 item may be deferred only if it does not regress a P0 item and the
  owner explicitly accepts the deferral in writing.
- P2 items may be reordered within their phase based on operator demand.

## Definition of done (overall task #1075)

The 12-phase build is complete when:
1. Every phase's exit gate has been recorded as accepted.
2. Every P0 item is in production and covered by a regression guard.
3. Every P1 item is in production or explicitly deferred with owner sign-off.
4. The Super Admin can drive onboarding, simulation, improvement, and health
   monitoring end-to-end from the dashboard alone.
5. The digital twin has caught at least one issue before it reached real
   users.

For this task (#1075) specifically, "done" means the nine artifacts in
`docs/next-gen-2026/` are produced and ready for owner acceptance — no
implementation phase begins inside this task.
