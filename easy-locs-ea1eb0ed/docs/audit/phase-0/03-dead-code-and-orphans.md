# 03 — Dead Code & Orphans

Every count below is derived from a script in
`scripts/audit/phase-0/` and an evidence file in `99-evidence/`.
Every "candidate dead" symbol is listed by name so a reviewer can
search-and-confirm. No deletion is performed.

## 1. Edge functions never invoked from frontend AND never called by
   another edge function

Source files:
- `99-evidence/edge-functions.csv` (per-function metrics)
- `99-evidence/edge-function-call-graph-edges.csv` (49 internal edges
  found across 239 directories)
- `99-evidence/edge-function-frontend-invokers.txt` and the multi-line
  variant.

Counts (deterministically derived by
`scripts/audit/phase-0/derive-edge-orphans.sh`, which reads
`edge-functions.csv` and writes four authoritative lists into
`99-evidence/edge-orphans-*.txt`; every name is verified to resolve to
a `supabase/functions/<name>/` directory on disk):

| Class                                                                  | Count |
|------------------------------------------------------------------------|------:|
| Total edge-function directories                                        |  239  |
| Of which: real entrypoints (`entry_point_exists == true`)              |  238  |
| With ≥1 `functions.invoke("<name>")` callsite in `src/`                |  102  |
| With 0 frontend invokers                                               |  137  |
| With 0 frontend invokers AND 0 internal callers (entrypoints only)     |  121  |

After classifying the 121 zero-caller functions by name pattern:

| Sub-class (zero-caller, by suffix/prefix)                             | Count | Source list                                  |
|-----------------------------------------------------------------------|------:|----------------------------------------------|
| `*-router` (dispatched as `<name>` after rewrite by clients)          |   18  | `99-evidence/edge-orphans-routers.txt`       |
| Webhooks / cron / cleanup / dispatcher (external triggers)            |   28  | `99-evidence/edge-orphans-webhook-cron.txt` (regex `(-webhook$\|-cron$\|^cleanup-\|^expire-\|^csp-report$\|dispatcher$\|email-intake$\|email-queue\|^watchdog\|^dlq-\|^backup-\|^collect-\|^auto-source\|^auto-onboarding)`) |
| Remainder — true orphan candidates                                    |   75  | `99-evidence/edge-orphans-true-candidates.txt` |

**True orphan candidates (75).** This list is regenerated end-to-end by
`derive-edge-orphans.sh`; do not edit by hand. The script verifies each
entry resolves to `supabase/functions/<name>/` on disk and exits
non-zero otherwise. Current contents of
`99-evidence/edge-orphans-true-candidates.txt`:

```
ai-content-enrichment            ai-entity-enrichment
ai-eval-runner                   ai-proxy
ai-rag                           ai-recommendations
ai-web-search                    audit-export
auth-callback                    booking-lifecycle
browser-user-repair-engine       chief-agent
classify-business                dev-builder
dev-planner                      email-enqueue
execution-loop                   execution-runner-callback
export-ical                      extract-article
food-audit                       food-menu-builder
food-normalizer                  food-publish
food-rescrape-monitor            food-visibility-gate
food-visual-clean                gateway-webhook-ingest
gdpr-delete-account              gdpr-deletion-processor
gdpr-export                      generate-embeddings
generate-seo                     goal-create
guest-session                    inngest-handler
integration-health-monitor       job-queue-worker
job-runner                       lambda-invoke-proxy
lc3-replan-trigger               media-processor
mux-upload                       omega-server-loop
ops-ai-chat                      order-manage
payment-notification             pipeline-worker
prayer-times                     public-api
public-health                    purchase-locs
qr-payment-session               receive-email
redis-enqueue                    rent-create-payment
rent-reminders                   repair-worker
rss-proxy                        search-meilisearch
seller-kpi-snapshot              send-call-push
send-push                        sentinel-server-guards
social-preview                   sqs-enqueue-proxy
sync-meilisearch                 trigger-github
tts-engine                       uae-data-cleanup
vector-embed                     video-processor
voice-processing                 voice-stt-token
voice-tts
```

**Confidence:** Medium-High. The remaining undetectable invocation
paths are: (a) router-fanout where the dispatch table maps a public op
to a function name not equal to the function's directory name, (b)
direct HTTP calls from third-party services, (c) `Deno.serve` chained
across function boundaries via a different fetch pattern than the
script captures (the script captures both `fetch(` to
`/functions/v1/...` and `supabase.functions.invoke`).

**Recommended action (Phase 6):** for each of the 75 names, run
`grep -RIn "<name>" supabase/functions/ supabase/migrations/ src/`
before any deletion.

## 2. Routes ↔ pages reachability

Source: `99-evidence/routes-declared.txt` (547 declarations),
`99-evidence/page-files.txt` (500 page files), and
`99-evidence/page-imports-deduped.txt` (page-module specifiers
referenced by either dynamic `import("…/pages/…")` or static `from
"…/pages/…"`).

| Class                                                              | Count |
|--------------------------------------------------------------------|------:|
| `<Route path="…">` declarations                                    |  547  |
| Page files under `src/pages/`                                      |  500  |
| Page modules referenced by ≥1 importer (after path-token dedupe)   |  457  |
| Page files with **NO** detected importer                           |   43  |

The 43 candidate orphan page files are listed in full in
`99-evidence/page-files-orphans.txt`. They are most concentrated under
`src/pages/orbit/`, `src/pages/admin/`, and `src/pages/me/` —
sub-pages whose lazy-import was never wired into
`src/app/app-route-registry.tsx` or any pillar route file.

**Confidence:** High. The diff is deterministic and uses both static
import statements and dynamic `import("…")` callsites (which catches
the `safeLazy(() => import(...))` wrapper used in the registry).

## 3. RPC functions defined but never called

Source: `99-evidence/rpc-orphan-matrix.csv` (283 names × callsite count
× caller paths), `99-evidence/trigger-targets.txt` (RPCs invoked by
`CREATE TRIGGER … EXECUTE FUNCTION` — multi-line aware via
`scripts/audit/phase-0/extract-trigger-targets.mjs`).

| Class                                                              | Count |
|--------------------------------------------------------------------|------:|
| Distinct RPC names defined in `supabase/migrations/`               |  283  |
| With ≥1 `supabase.rpc("<name>")` callsite in `src/` or `supabase/functions/` | 27 |
| With **zero** callsite                                              |  256  |
| Of which: invoked by a `CREATE TRIGGER` (cross-checked)             |  109  |
| **True orphans** (no callsite AND no trigger)                       |  147  |

The 147 true-orphan RPC names are written to
`99-evidence/rpc-true-orphans.txt`. Sample:

```
_all_columns_exist                accept_collaboration_invitation
accept_ride_offer                 accept_tenant_invitation
add_workspace_member              admin_check_prayer_cron_health
aggregate_storefront_analytics_daily   ai_quota_increment
append_sent_prayer                atomic_wallet_transfer
atomic_wallet_transfer_fx         auto_generate_receipt
backfill_referral_clicks_channel  can_view_sensitive_pii
check_cron_dispatch_health        ...
```

**Confidence:** Medium. Two known false-positive sources remain: (a)
RPCs invoked by other RPCs via `PERFORM <fn>(…)` inside a function
body — the script does not parse PL/pgSQL; (b) RPCs called by
Postgres CRON (`pg_cron`) jobs declared inside migrations. Both are
expected to shrink the 147 list when manually verified during Phase 6.

## 4. Buttons without an interaction handler

Source: `scripts/audit/phase-0/inventory-button-handlers.sh`,
output files `99-evidence/buttons-without-handler-singleline.txt` (76
findings) and `99-evidence/buttons-multiline-candidates.txt` (149
findings flagged for manual review because the opening tag spans
multiple lines and the handler may live on a subsequent line).

| Class                                                                                  | Count |
|----------------------------------------------------------------------------------------|------:|
| `<Button …>` opened and closed on a single line, no `onClick`/`onPress`/`asChild`/`type="submit"`/`formAction`/`disabled` | 76 |
| `<Button …>` opening tag continues onto next line(s) — handler on subsequent line possible | 149 |

The 76 single-line findings are deterministic. They include both
production pages (e.g. several admin and orbit sub-pages) and demo or
showcase pages. The 149 multi-line candidates require the JSX walker
proposed in Phase 6 to confirm whether a handler exists later in the
opening tag.

**Confidence:** High for the 76 single-line set, Low for the 149
multi-line set (intentionally split into two files for that reason).

## 5. Migration files with no apparent runtime touch

Source: `99-evidence/tables-create-provenance.txt`. We detect 702
migration files containing 791 `CREATE TABLE` statements (some
migrations create multiple tables, several apply only DDL alterations
or RLS policies).

The Phase 0 inventory does not classify migrations as "no-op against
runtime" because confirming this requires diffing the live schema
(`pg_dump`) against the migration set. That action is recorded as a
Phase 6 task. No deletion is recommended in this audit.

## Summary

| Class                                               | Count | Confidence |
|-----------------------------------------------------|------:|-----------:|
| Edge functions with 0 frontend + 0 internal callers (entrypoints only) |  121  | High |
| Of which router/webhook/cron (alive)                |   46  | High       |
| **True orphan edge candidates**                     |   75  | Medium-High |
| Page files with no importer                         |   43  | High       |
| RPCs with zero callsite                             |  256  | High       |
| **True orphan RPCs (no callsite, no trigger)**      |  147  | Medium     |
| `<Button>` (single-line) with no handler            |   76  | High       |
| `<Button>` (multi-line opening) — manual review     |  149  | Low        |

No deletion is performed in Phase 0. Each row above resolves to a
named-symbol list in `99-evidence/`.
