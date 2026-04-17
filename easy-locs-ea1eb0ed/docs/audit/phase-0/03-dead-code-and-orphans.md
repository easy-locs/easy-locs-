# 03 — Dead Code & Orphans

This report enumerates assets that exist in the codebase but have no
detectable consumer. "No consumer" means: not referenced via static grep
from the surface that should call it (e.g. `functions.invoke("name")` for
edge functions). Some entries are legitimately invoked through dynamic
routers — those are flagged as **router-fanout candidates**.

## 1. Edge functions never invoked by `functions.invoke(...)` from `src/`

**137 of 239 edge functions** have zero `functions.invoke("<name>")`
callsites in `src/`. Source: `99-evidence/edge-functions.csv` (column
`frontend_invoker_callsites == 0`) and
`99-evidence/edge-function-invoker-counts.txt`.

This does **not** automatically mean dead — many are reachable via:
- A router edge function (`*-router`) that re-dispatches by `op`.
- A cron schedule defined in Supabase (not greppable from `src/`).
- A webhook URL configured in a third-party dashboard (Stripe, Plaid,
  GitHub, eSign, crypto provider).

### Router-fanout / webhook / cron (not dead — investigate downstream)

| Function | Reason it appears unused |
|----------|--------------------------|
| `admin-router`, `ai-router`, `booking-router`, `commerce-router`, `stripe-router`, `system-router`, `voice-router`, `wallet-router`, `webauthn-router` | Invoked under aggregator names. |
| `stripe-webhook`, `crypto-webhook`, `esign-webhook`, `dispatch-webhook`, `command-github-webhook`, `command-approval-webhook`, `command-email-intake`, `csp-report` | Webhook endpoints called by external systems. |
| `auto-onboarding-cron`, `autonomous-cron-dispatcher`, `command-monitoring-cron`, `dispatch-cron`, `dld-sync-cron`, `sync-meilisearch-cron`, `cleanup-expired-media`, `cleanup-expired-messages`, `cleanup-integration-health-logs`, `cleanup-orphan-media`, `collect-sepa-rents`, `expire-listings`, `expire-pending-referrals`, `auto-source-scrape`, `uae-data-cleanup`, `uae-scrape-onboard`, `email-queue-process`, `dlq-processor`, `watchdog-ping` | Cron schedules. |

### Likely truly dead / orphaned (require manual confirmation)

These names are not router targets, not webhooks, and not cron — yet they
are not invoked from `src/`. They are top candidates for deletion in a
future cleanup phase:

```
ai-content-enrichment      ai-entity-enrichment    ai-eval-runner
ai-proxy                   ai-rag                  ai-recommendations
ai-web-search              alert-dispatcher        audit-export
backup-storage             booking-lifecycle       browser-user-repair-engine
chief-agent                classify-business       command-center-api
deliveroo-dubai-food       dev-builder             dev-planner
email-enqueue              execution-loop          execution-runner-callback
export-ical                ...
```

Full list: `99-evidence/edge-functions.csv` (`frontend_invoker_callsites == 0`).

**Recommended action (Phase 6 candidate):** before any deletion, run
`grep -r "<name>" supabase/functions/` to confirm no edge-to-edge call
chain references the candidate.

## 2. Shared modules with no importer

The Phase 0 inventory does not yet recursively trace ESM imports; this is
a known follow-up. Suspicious candidates flagged by directory listing:

- `src/components/dev/MissingIntegrationsBanner.tsx` — only loaded under
  `import.meta.env.DEV` (App.tsx:55). Verify it is excluded from prod
  bundle.
- `src/components/admin/agents/AgentTriggerDialog.tsx` — directly calls
  `supabase.auth.getUser()` (see report 02 row 19); confirm it is wired
  to a route.

## 3. Routes declared but no page file

`99-evidence/routes-declared.txt` shows **547** `<Route path=…>` against
**500** page files. The 47-line gap is partially explained by:

- Multiple `<Route>` per page (nested routes, redirect routes).
- Inline element routes (e.g. `<Route element={<Navigate ... />} />`).

A definitive orphan-route check requires walking the JSX `element` prop
to extract the imported component and diffing against `page-files.txt`.
This walker is queued as a follow-up; today's evidence file is sufficient
to spot suspect routes manually.

## 4. RPCs / SQL functions

`99-evidence/rpc-functions.txt` enumerates **434** `CREATE FUNCTION`
statements (288 unique names). Static cross-reference from `src/` and
`supabase/functions/` for `supabase.rpc("<name>")` is recorded in
`99-evidence/frontend-supabase-callsites.txt` and `edge-mutations.txt`.

A high-signal sample of RPCs that have no `supabase.rpc("…")` callsite
visible in the inventory will be produced in the Phase 1 cleanup task —
the matrix is too noisy to publish definitively here without the import
walker (RPCs may be called by triggers, not by client code).

## 5. Migration files with no apparent runtime touch

The 702 migrations include `_legacy_*`, `_revert_*`, and many idempotent
"if not exists" touches. Without `pg_dump` from the live DB we cannot
prove orphaned migrations. Action recorded under Phase 6 (Hardening).

## 6. Buttons / handlers without onClick

Static heuristic: `grep -RIn "<Button" src/ | grep -vE "onClick|onPress|asChild|type=\\\"submit\\\""` would surface candidates. Not run in this
pass to keep evidence files reproducible across environments — flagged
as a Phase 0.1 follow-up if requested.

## Summary

| Class                                    | Count | Confidence |
|------------------------------------------|------:|------------|
| Edge functions with 0 frontend invokers  |   137 | High (script-derived) |
| Of which: webhooks/cron/router (alive)   |    ~37 | High |
| Of which: candidate-dead                 |    ~100 | Medium — requires edge-to-edge grep before deletion |
| Routes/page-file gap                     |    47 | Medium |
| Orphan RPCs / migrations / buttons       |     ? | Low (needs richer walker) |

No deletion is performed in Phase 0.
