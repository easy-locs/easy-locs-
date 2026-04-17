# 08 — Cost Leaks

Concrete waste sources caused by the current architecture, with file
references. Severity uses the same legend as report 07
(C1 = direct $$ leak, C2 = inflationary, C3 = potential).

## 1. Polling that should be realtime/cache (C1)

Already enumerated in [07](./07-polling-vs-realtime-cache.md). Estimated
~75 000 unnecessary Supabase invocations / hour just from the three
worst pollers (`ChatPaymentCards`, `AgentCommandConsole`,
`ExecutionTaskPanel`).

## 2. Edge-function chain calls (C1)

239 edge functions with 9 router-style fan-out functions
(`admin-router`, `ai-router`, `booking-router`, `commerce-router`,
`stripe-router`, `system-router`, `voice-router`, `wallet-router`,
`webauthn-router`). Each invoke is a cold-start + JWT verify + RLS
round-trip. The router pattern multiplies that cost by the number of
hops.

Detected hops to investigate (sample, from naming):
- `wallet-router` → `wallet-ops`, `wallet-pin`, `wallet-transfer`.
- `commerce-router` → `commission-split`, `submit-review`,
  `create-booking-payment`, `create-concierge-payment`.
- `system-router` → `command-center-api`, `dispatch-*`.

**Action:** Phase 4 service architecture should compress each router
+ child into a single in-process module call; the router becomes an HTTP
boundary, not an inter-function call.

## 3. RLS that likely forces full scans (C2)

`99-evidence/rls-policies.txt` lists **2 234** `CREATE POLICY` statements
across 791 tables (≈ 2.8 policies per table). Common cost-generating
patterns to audit (manual review queued for Phase 6):
- Policies referencing `auth.jwt() ->> 'role'` with no covering index.
- Policies using `EXISTS (SELECT … FROM other_table WHERE …)` without
  index on the join column.
- Per-row policies on high-write tables (`audit_logs`, `notifications`,
  `engine_run_logs`).

## 4. Unindexed write hotspots (C2)

Top write-rate tables (from `writer-aggregation.txt`):
- `seed_merchants` (86 UPDATE callsites) — verify there is a covering
  index on the WHERE clause.
- `notifications` (33 INSERT, 5 UPSERT, 3 DELETE) — verify partition or
  rolling cleanup; otherwise unbounded growth.
- `audit_logs` (33 INSERT) — same.
- `engine_run_logs` (15 INSERT) — same.
- `chat_messages_v2` (11 INSERT) — verify per-conversation index.

Indexes declared: 1 046 (`indexes.txt`). Coverage matrix not produced in
Phase 0 — queued for Phase 6 after consolidating duplicates (report 04).

## 5. Frontend → DB direct writes that should be debounced server-side (C2)

From report 02, three telemetry tables are written **directly from the
client** with no batching:
- `map_error_analytics` (`src/lib/analytics/map-error-analytics.ts:216`).
- `map_error_alert_log` (`src/lib/analytics/map-error-alerting.ts:99`).
- `observability_alert_log` (`src/lib/observability/alert-dispatcher.ts:121`).

A burst of map errors (e.g. token expiry) generates one INSERT per error
per client. Recommended: client buffers + posts to a single
`analytics-ingest` edge function every 30 s.

## 6. Media not transformed before serving (C2)

`src/lib/storage/uploadFile.ts:65,122` and `src/lib/storage/assets.ts:100,106`
upload via `supabase.storage.from(...).upload(...)` and serve via
`getPublicUrl(...)`. There is a `media-processing` lambda
(`lambda-handlers/media-processing/`) and a `video-processor` edge fn,
but the public URL workflow does not appear to enforce a transform step.

Cost impact: large originals served directly; CDN-edge transformation
optional.

## 7. Duplicated writes across denormalised tables (C2)

Direct consequence of report 04. Examples:
- A wallet credit currently risks being written into `wallet_ledger`
  AND `wallet_ledger_entries` AND `wallet_transactions` AND
  `unified_wallet_transactions` from different writers (6 ledger-shaped
  tables).
- A booking can land in `bookings`, `bookings_v2`, or one of the
  vertical-specific booking tables — readers join all of them, paying
  N× the read cost.

## 8. Cron storms (C2)

19 cron-style edge functions (see report 03). No central cron schedule
file in the repo — verify the Supabase dashboard schedules. If two crons
overlap (`sync-meilisearch` + `sync-meilisearch-cron`), every overlap is
a wasted run.

## 9. Polling React Query without `staleTime` (C2)

40 `refetchInterval` callsites. React Query default `staleTime: 0` means
every render also revalidates. Setting a global default to 30–60 s would
cut redundant fetches without removing intervals.

## 10. Realtime subscriptions without unsubscribe (C3)

`useServerEvents.ts:156-165` correctly removes channels in cleanup. Need
to audit the other 73 realtime callsites for the same pattern. A leaked
channel keeps a Supabase realtime slot open until the page closes.

## 11. ESM lazy-loading misses (C3)

182 `lazy(() => import(...))` callsites. Bundle size baseline exists
(`bundle-size-baseline.json`, `scripts/check-bundle-size.ts`). Confirm
all top-level routes are split — page count 500 vs lazy count 182
suggests many pages are imported eagerly through their pillar route
file.

## 12. Storage costs from "v2" duplicate tables (C3)

Every `_v2` table that did not retire its v1 counterpart pays double for
storage + double for backups + double for replication. Consolidating
duplicates from report 04 is therefore both a correctness AND a cost
improvement.

## Headline savings opportunity

Without changing any product behaviour, removing the three worst
pollers + adding a global React Query `staleTime` + batching the three
client-side analytics writers would conservatively reduce Supabase
request volume by **15–30 %** and Postgres write IOPS by **5–10 %**.
