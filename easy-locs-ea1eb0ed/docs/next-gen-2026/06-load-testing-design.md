# 06 — Load + Scale Testing Design (k6)

> Step-1 deliverable for Task #1075. k6 ramps mixed-profile load against a
> sandboxed environment. **No destructive real actions. Sandbox-only
> payments.**

## Goals

1. Verify the platform sustains 100 → 300 → 1000 concurrent users with the
   real production code paths (read + sandboxed writes).
2. Surface bottlenecks (DB query plans, Edge Functions, realtime fan-out,
   cache hit ratio) before they reach real users.
3. Feed the analysis engine (Phase 6) with timing + error data.

## Tooling

- **k6** as the primary engine (HTTP-level load generator, scriptable in JS).
- **k6 browser module** (optional) for a small subset of scenarios that need
  real DOM behavior. The bulk of load runs at the API/Edge-Function level.
- Output: k6 JSON summary + Prometheus remote-write to the existing
  observability sink.

## Layout

```
infra/load/
  k6/
    config/
      env.staging.json
      env.twin.json
    profiles/
      browsing.js
      ordering.js
      wallet_reads.js
      communication.js
      admin_reads.js
    scenarios/
      ramp-100.js
      ramp-300.js
      ramp-1000.js
      mixed-realistic.js
    lib/
      auth.js          # sandbox login helpers
      sandbox.js       # ensures is_sandbox=true on every payment
      assertions.js    # shared SLA checks
    reports/           # generated, gitignored
```

## Profile mix per scenario

The mixed-realistic scenario follows a real-world distribution:

| Profile activity | Share | Notes |
|------------------|------:|-------|
| Browsing | 55% | catalog, search, filter, merchant detail |
| Ordering (sandbox) | 15% | place + track + cancel; payments are sandbox |
| Wallet reads | 12% | balance, history |
| Communication | 13% | open Orbit channel, send message, poll |
| Admin reads | 5% | super admin dashboard reads |

## Ramp shapes

| Scenario | Stages |
|----------|--------|
| `ramp-100` | 0→100 over 2m, hold 5m, ramp down 1m |
| `ramp-300` | 0→300 over 5m, hold 10m, ramp down 2m |
| `ramp-1000` | 0→1000 over 10m, hold 15m, ramp down 5m |

## SLAs (initial; tunable in Phase 5)

| Metric | Target |
|--------|--------|
| p95 catalog read | < 400 ms |
| p95 merchant detail | < 600 ms |
| p95 wallet balance | < 250 ms |
| p95 send Orbit message | < 500 ms |
| p99 any read | < 1.5 s |
| Error rate (5xx) | < 0.5% under 1000 VU |
| Realtime delivery latency p95 | < 1.0 s |

A run fails if any SLA is breached for more than 60 consecutive seconds.

## Sandbox-only payments — non-negotiable rules

- The k6 auth helper logs in only as accounts seeded with `is_sandbox=true`.
- Payment requests inject `X-Easy-Locs-Sandbox: 1`. Server rejects load-test
  payment requests without this header.
- The wallet service has a server-side guard: load-test users may not
  generate `wallet_transaction` rows with `is_sandbox=false`.
- A safety check at the start of every scenario aborts the run if the
  environment resolves to production.

## Bottleneck detection outputs

Each ramp produces:
1. A k6 summary (HTTP timings, checks, thresholds).
2. A bottleneck report cross-referencing slow endpoints with:
   - DB slow-query log
   - Edge Function cold-start counts
   - Realtime channel fan-out timings
   - Cache hit/miss ratio
3. A handoff payload to the analysis engine (Phase 6) for any breach.

## Execution modes

- **Scheduled** nightly against staging.
- **On-demand** from the Super Admin control plane (Phase 10).
- **Twin** runs against the digital twin (Phase 11) before production rollouts.

## Phase-5 exit gate

A full `ramp-1000` run completes against the sandbox and produces a
performance + bottleneck report that the operator can act on. No SLA
threshold may silently regress without an explicit acknowledgement.
