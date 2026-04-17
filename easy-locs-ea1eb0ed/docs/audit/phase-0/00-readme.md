# Phase 0 — Master Audit & Map

Baseline cartography of `easy-locs-ea1eb0ed/` produced as part of the
"Easy-Locs Next Generation Big Tech Internal Stack" mission. **No application
code was modified by this audit** — only files under
`docs/audit/phase-0/` and `scripts/audit/phase-0/` were created.

## Headline numbers (as of run date)

| Asset                                  | Count |
|----------------------------------------|------:|
| Edge functions (dirs with `index.ts`)  |   239 |
| Shared edge files (`_contracts.ts`, `_manifest.ts`, `_shared/`) | 3 |
| Edge function dir entries (incl. shared) | 242 |
| SQL migration files                    |   702 |
| Tables observed in `CREATE TABLE`      |   791 |
| Distinct RPC / functions defined       |   283 |
| RLS policy statements                  |  2234 |
| Indexes declared                       |  1046 |
| Triggers declared                      |   241 |
| Page files under `src/pages/`          |   500 |
| `<Route path=...>` declarations        |   547 |
| Unique route paths                     |   538 |
| Hooks under `src/hooks/`               |   207 |
| Frontend `supabase.*` callsites total  |   194 |
| Frontend direct-DB violations          |    72 |
| Frontend mutation callsites            |    55 |
| Edge function mutation callsites       |   521 |
| Polling/refetch callsites              |   374 |
| Realtime/channel callsites             |    74 |
| Lazy import callsites                  |   182 |

## Deliverables

| File                                          | Topic                                                        |
|-----------------------------------------------|--------------------------------------------------------------|
| [01-inventory.md](./01-inventory.md)          | Apps, services, hooks, routes, edge functions, lambdas, jobs, tables, RLS, integrations |
| [02-frontend-direct-access-violations.md](./02-frontend-direct-access-violations.md) | All `supabase.from/rpc/storage/auth` calls bypassing the DDD adapter layer |
| [03-dead-code-and-orphans.md](./03-dead-code-and-orphans.md) | Stubs, orphan routes, edge functions never invoked, RPCs unused |
| [04-conflicts-duplications.md](./04-conflicts-duplications.md) | Profile/wallet/booking/messages duplications, writer collisions |
| [05-flows-without-state-machine.md](./05-flows-without-state-machine.md) | Critical flows lacking explicit state machine / idempotency |
| [06-domain-ownership-map.md](./06-domain-ownership-map.md) | Owner / writers / events per domain |
| [07-polling-vs-realtime-cache.md](./07-polling-vs-realtime-cache.md) | Polling/`refetchInterval`/`setInterval` vs realtime opportunities |
| [08-cost-leaks.md](./08-cost-leaks.md)        | Cost leaks: chained edge fns, polling, RLS scans, oversized indexes |
| [09-quick-wins.md](./09-quick-wins.md)        | ≤1-day-each remediations to reduce cost / stabilise |
| [10-migration-plan.md](./10-migration-plan.md) | Phased plan (Phase 1 Foundations → Phase 7 Hardening) |

Raw evidence (CSV/TXT outputs of inventory scripts) lives under
[`99-evidence/`](./99-evidence/).

## Reproducing the inventory

All inventory scripts live in `scripts/audit/phase-0/`. They are read-only
and idempotent. Re-run any time:

```bash
cd easy-locs-ea1eb0ed
bash scripts/audit/phase-0/inventory-edge-functions.sh
bash scripts/audit/phase-0/inventory-tables-policies.sh
bash scripts/audit/phase-0/inventory-frontend-direct-db.sh
bash scripts/audit/phase-0/inventory-routes.sh
bash scripts/audit/phase-0/inventory-polling.sh
bash scripts/audit/phase-0/inventory-events-and-writers.sh
bash scripts/audit/phase-0/inventory-rpc-orphans.sh
bash scripts/audit/phase-0/inventory-button-handlers.sh
bash scripts/audit/phase-0/derive-edge-orphans.sh
bash scripts/audit/phase-0/check-consistency.sh
```

Or run the full pipeline + gate from a TypeScript-only environment:

```bash
npx tsx scripts/audit/phase-0/run-all.ts
npx tsx scripts/audit/phase-0/run-all.ts --check   # consistency gate only
```

### Why `.sh` + `.mjs` instead of native `.ts`?

The audit work is overwhelmingly recursive I/O across the monorepo
(`find` / `grep` / `awk` / `sort` over ~10k migration rows, ~239 edge
function dirs, several thousand source files). POSIX shell + GNU
coreutils execute these passes 5–20× faster than equivalent JS / tsx
and produce identical text-stream outputs that diff cleanly. A thin
`run-all.ts` driver is provided as the canonical entrypoint so callers
can invoke the full pipeline from a TypeScript-only context. The two
non-trivial parsers (`extract-columns.mjs`, `extract-trigger-targets.mjs`)
are written in Node ESM because they need real tokenization across
multi-line SQL statements.

`derive-edge-orphans.sh` is the canonical generator for report 03's
orphan listings — it reads `99-evidence/edge-functions.csv` and
re-derives the four lists (`edge-orphans-zero-callers.txt`, `-routers`,
`-webhook-cron`, `-true-candidates`) from scratch each run, verifying
that every emitted name resolves to `supabase/functions/<name>/`.

`check-consistency.sh` is a publish-time gate. It asserts that:

1. every edge-function name appearing in any
   `99-evidence/edge-orphans-*.txt` resolves to a directory on disk;
2. every `public.<table>` reference in reports 03–06 either appears
   in `tables-create-provenance.txt` or is on a documented allow-list
   (`merchants`, `listings` are the canonically-missing tables called
   out in report 04; `wallet`, `system` are glob-pattern prose);
3. every `99-evidence/<file>` referenced from any markdown report
   actually exists on disk.

A non-zero exit blocks publication.

Each script writes its evidence into `docs/audit/phase-0/99-evidence/`
and is safe to commit.

## Audit ground rules respected

- No application code touched (`src/**`, `supabase/functions/**`,
  `supabase/migrations/**`, `lambda-handlers/**`, `infra/**` unchanged).
- No DB / RLS migration created.
- No deployment, no workflow change, no secret accessed.
- Any urgent fix discovered during the audit is reported in
  [`09-quick-wins.md`](./09-quick-wins.md) but **not implemented** here.

## Next step

Once this baseline is validated by the user, the corresponding Phase 1
(Foundations) task can begin per [`10-migration-plan.md`](./10-migration-plan.md).
