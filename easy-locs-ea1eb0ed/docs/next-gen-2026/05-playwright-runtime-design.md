# 05 — Playwright Runtime Engine Design

> Step-1 deliverable for Task #1075. Playwright is repurposed as a **runtime
> execution engine**, not just a CI tester. It runs against live (sandboxed)
> environments, with imperfect-user behaviors, across the eight required user
> profiles.

## Position in the codebase

- Existing CI configs: `playwright.config.ts`,
  `playwright.production.config.ts`. **Do not modify** their behavior in
  Phase 4.
- New runtime engine lives under `e2e/runtime/`:
  ```
  e2e/runtime/
    config/runtime.config.ts        # separate Playwright config
    profiles/                       # one file per of the 8 profiles
    flows/                          # reusable flow primitives
    scenarios/                      # profile × flow scenarios
    behaviors/                      # imperfect-user behavior helpers
    capture/                        # console + network capture sinks
    runner/                         # scheduler + on-demand entry
    fixtures/                       # sandbox accounts + seed helpers
  ```
- The runtime engine reuses the existing seed helpers in `e2e/seed/` where
  safe; it never touches production write paths.

## Eight required user profiles

Each profile has its own factory that produces a fully prepared session.

| # | Profile | Identity | State preconditions |
|---|---------|----------|---------------------|
| 1 | `guest` | not authenticated | empty cart, no wallet |
| 2 | `email_user` | email + password | active wallet, has prior order |
| 3 | `phone_otp_user` | phone + OTP | active wallet, no prior order |
| 4 | `merchant` | merchant role | onboarded merchant + workspace |
| 5 | `empty_data_user` | authenticated | no orders, no messages, no balance |
| 6 | `heavy_data_user` | authenticated | many orders, many messages, big history |
| 7 | `expired_session_user` | token expired | client thinks it's logged in |
| 8 | `super_admin` | super_admin role | full admin access |

Each profile MUST be reproducible from a single helper call, e.g.
`profiles.merchant({ vertical: 'food' })`.

## Imperfect-user behaviors

Implemented as composable wrappers around any Playwright `page` action.

- `fastClicker(page, locator, { intervalMs: 30, count: 5 })` — bursts of
  clicks faster than UI debounces.
- `refreshDuringLoad(page)` — issues `page.reload()` while a fetch is in
  flight (network is paused mid-flight).
- `backForwardSpam(page, { count: 6 })` — alternating `goBack` / `goForward`.
- `multiTab(context, urls)` — opens N tabs simultaneously and races.
- `slowNetwork(page, '3g' | 'offline')` — emulates degraded network.
- `randomScroll(page)` — long, jittery scroll.

A scenario opts into behaviors by composition; behaviors must be pure
helpers (no global state).

## Coverage matrix

Every profile × flow combination must have a runnable scenario file in
`e2e/runtime/scenarios/<profile>/<flow>.spec.ts`.

Flows (one file per flow under `e2e/runtime/flows/`):

| Flow | Description |
|------|-------------|
| `onboarding` | enter (email / phone / website / name), provisioning, dashboard ready |
| `browsing` | search, filter, open merchant, open detail |
| `ordering` | place order, track, cancel, refund (sandbox) |
| `messaging` | open Orbit channel, send/receive, attachment, reconnect |
| `wallet` | view balance, view history, top-up (sandbox), payout (sandbox) |
| `admin` | open admin views, trigger campaigns, approve a fix |

Coverage gate: `profiles × flows = 8 × 6 = 48` scenarios minimum.

## Capture pipeline

Each scenario writes a structured artifact for the analysis engine
(Phase 6):

```jsonc
{
  "runId": "<uuid>",
  "profile": "merchant",
  "flow": "ordering",
  "route": "/food/m/abc/order",
  "behaviors": ["fastClicker", "refreshDuringLoad"],
  "console": [ /* level, msg, ts */ ],
  "network": [ /* method, url, status, durationMs */ ],
  "uxSignals": {
    "rageClicks": 0,
    "deadClicks": 1,
    "backForth": 2,
    "abandoned": false
  },
  "result": "pass" | "fail" | "flaky",
  "errors": [ /* normalized error records */ ],
  "timings": { "ttfb": 0, "lcp": 0, "tti": 0 }
}
```

Sinks:
- File: `e2e/runtime/.artifacts/<runId>/`
- DB: `runtime_issue` rows (only for failed / classified issues).

## Execution modes

- **Scheduled** — cron-driven runs (separate from the CI pipeline) via the
  Super Admin control plane (Phase 10).
- **On-demand** — operator triggers via `/admin/runtime/run` with a chosen
  profile + flow subset.
- **Loop-driven** — Phase 7 self-improvement loop calls the runtime engine
  for retests after applying a fix.

## Safety rails

- **No production write actions.** The runtime engine refuses to start
  unless `RUNTIME_ENV !== 'production'` or the operator passes an explicit
  `--production-readonly` flag (read-only flows only).
- **Sandbox-only payments.** The wallet service exposes a `is_sandbox` flag;
  the runtime engine must set it `true`.
- **Isolated accounts.** Every run uses freshly provisioned sandbox accounts
  and tears them down on completion.

## Phase-4 exit gate

A single command (e.g. `npm run runtime:matrix`) executes all 48 scenarios
against the live sandbox and produces:

1. A pass/fail matrix per profile × flow.
2. The structured artifact above for each scenario.
3. A handoff to the analysis engine (Phase 6) for failed scenarios.

The gate passes when every cell in the matrix is reproducible (no
"could not start") and the artifacts validate against the schema.
