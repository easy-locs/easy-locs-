# 07 — Super Admin Control Plane (Dashboard) Structure

> Step-1 deliverable for Task #1075. The Super Admin dashboard is the
> operator's single surface for running and supervising the entire next-gen
> system. **Super Admin only — never public.**

## Top-level layout

Mounted under `/admin/*` (per `04-routing-structure.md`). Single shell with
left-rail navigation:

```
/admin
├─ Overview                     /admin
├─ Businesses                   /admin/businesses
│   ├─ All                      /admin/businesses
│   ├─ Onboarding               /admin/businesses/onboarding
│   └─ Detail                   /admin/businesses/:merchantId
├─ Users                        /admin/users
│   ├─ All                      /admin/users
│   ├─ Activity                 /admin/users/activity
│   └─ Detail                   /admin/users/:userId
├─ Runtime                      /admin/runtime
│   ├─ Issues                   /admin/runtime/issues
│   ├─ Profiles × Flows matrix  /admin/runtime/matrix
│   ├─ Run                      /admin/runtime/run
│   └─ Run detail               /admin/runtime/runs/:runId
├─ Performance                  /admin/performance
│   ├─ Latencies + SLAs         /admin/performance/slas
│   ├─ Load runs                /admin/performance/load
│   └─ Load run detail          /admin/performance/load/:runId
├─ Improvements                 /admin/improvements
│   ├─ Suggested fixes          /admin/improvements/suggested
│   ├─ Awaiting approval        /admin/improvements/approval
│   ├─ Applied                  /admin/improvements/applied
│   └─ Retest status            /admin/improvements/retests
├─ Health                       /admin/health
│   ├─ By vertical              /admin/health/verticals
│   ├─ Realtime channels        /admin/health/realtime
│   └─ Cache + sessions         /admin/health/cache
├─ Twin                         /admin/twin
└─ Settings                     /admin/settings
```

## Per-section requirements

### Overview
- Onboarded business count (24h / 7d / 30d).
- Open runtime issues by severity.
- Latest Playwright run summary (pass/fail per profile × flow).
- Latest k6 ramp summary.
- Suggested fixes awaiting approval (count + CTA).
- System health traffic light per vertical.

### Businesses
- Table of merchants with: name, vertical, ingestion status, provisioning
  status, last activity.
- Detail view per merchant: ingestion artifacts, real-vs-placeholder asset
  mix, wallet snapshot, Orbit channels, recent orders.

### Users
- Activity heatmap (DAU/WAU/MAU).
- Per-user detail: identity (with merge history), wallet snapshot, recent
  orders, recent sessions.

### Runtime
- **Issues:** list of `runtime_issue` rows with all required fields
  (severity, route, module, profile, repro, logs, RCA, minimal fix,
  recurrence risk, classification).
- **Matrix:** profile × flow grid (8 × 6) showing pass/fail/flaky.
- **Run:** operator picks profiles + flows + behaviors, triggers a runtime
  campaign.
- **Run detail:** captured artifacts (console, network, UX signals).

### Performance
- SLA dashboards (one widget per SLA from `06-load-testing-design.md`).
- Load runs list + detail (k6 summary + bottleneck report).
- Trigger a ramp (100 / 300 / 1000 / mixed-realistic).

### Improvements (the self-improvement loop UI — Phase 7)
- Suggested fixes ordered by severity then recurrence risk.
- **Approval flow:** every fix shows the proposed minimal patch, the
  classification, and a non-bypassable approve / reject control.
- **Critical fixes** require an explicit second confirmation.
- Applied fixes link to retest status; failed retests reopen the issue.

### Health
- Per-vertical: order success rate, comms latency, error rate.
- Realtime: active channels, leaks (channels with no `removeChannel`),
  duplicate subscriptions.
- Cache + sessions: cache hit rate, signOut reset checks, cross-tab logout
  events.

### Twin (Phase 11)
- Status of the digital twin environment.
- Trigger spike scenarios.
- Compare twin metrics against production.

### Settings
- API tokens (sandbox + load-test).
- Integration toggles.
- Improvement-loop policy (e.g., never auto-apply critical, default reviewer).

## Permissions + auditing

- All `/admin/*` routes gated by `roles.includes('super_admin')` at the
  router level **and** validated again in every backing service.
- Every operator action (trigger run, approve fix, change setting) writes
  an immutable audit row including operator user id, action, payload,
  timestamp.

## Phase-10 exit gate

An operator can, from the dashboard alone:
1. Onboard a new business and verify provisioning end-to-end.
2. Trigger a runtime + load campaign.
3. Review classified issues, approve a non-critical fix, observe retest
   pass, and confirm a regression guard was attached (Phase 12).
4. Inspect a per-vertical health snapshot.
