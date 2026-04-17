# P4 — Content + Contacts Migration: Drain Complete

> **Task #938.** Drained the P4 (content + contacts) entries from the
> dispatch allow-list. Adapter framework + callsite migration follow-up
> tracked separately so the dispatch-guard lint becomes the forcing
> function for that work.
>
> **Phase:** P4 — content + contacts (create, update, delete, sync, upsert)
> **Status:** **DRAINED 2026-04-17.** All 149 `owning_phase: "P4"`
> entries removed from `.eslintrc.dispatch-allowlist.json`.
> `policy.last_audit` now references task #938 with
> `per_file_count = 307` and `phase_distribution.P4` dropped.
> **Owner:** platform team
> **Predecessor audits:** task #908 (Sovereign Closeout), task #914 (drain
> to zero — structural promotion), task #927 (P3 phase plan + drain-gate)
> **Sibling phase:** P4 is independent of P3 and may proceed in parallel.

## 1. Drain summary and post-drain posture

The L7 sweep retires per-file allow-list exemptions to force the
underlying mutations onto `dispatchExecutionTask`. This drain inverts
the usual order — the JSON edit lands **before** the content + contacts
adapter framework so the L6 dispatch-guard rules
(`easylocs/require-dispatch-execution-task`,
`easylocs/no-direct-postgrest-mutation`,
`easylocs/no-direct-rpc-mutation` — all `error` per
`easy-locs-ea1eb0ed/eslint.config.js`) immediately surface every direct
mutation in the 149 ex-exempt files. That visibility is intentional: it
converts the §6 gate from a passive checklist into a CI-enforced
backlog and prevents new direct mutations from accreting in those
files.

The expected consequences are:
- `pnpm lint` will report errors on the 149 ex-exempt files until
  callsite migration completes. Each error is the forcing function
  for one migration.
- New code added to any P4 file must route through
  `dispatchExecutionTask({ domain, taskType, payload })` from day one
  — there is no longer an allow-list escape hatch.
- The §3 framework (content + contacts adapters, verifiers, rollback,
  feature flags) remains the prerequisite for the lint to go green
  again. That work is tracked as the follow-up to this task.

This document inventories the drained surface (§4, §5), records the
adapter / verifier / rollback contract each domain still owes (§3, §6),
and rehearses the §7 procedure that was executed.

## 2. Scope

P4 covers two adjacent operational domains. The exact 149 files are
listed in §4 (content / storefront-adjacent surface) and §5 (contacts /
onboarding surface). The split mirrors how `.eslintrc.dispatch-allowlist.json`
tags each entry — `"L7 P4: storefront/content"` (126) vs
`"L7 P4: contacts/content"` (23).

- **Content / storefront-adjacent — 126 files.** Per-row content writes
  across ~70 thin repositories (one `.insert` / `.update` / `.upsert`
  surface each), the storefront-adjacent ops (orders, cart, coupons,
  loyalty, gift cards, reviews, wishlist, inventory, ranking, search,
  POS), the food / restaurant content pipeline (`food-audit`,
  `food-menu-builder`, `food-normalizer`, `food-publish`,
  `food-rescrape-monitor`, `food-visibility-gate`, `food-visual-clean`,
  `deliveroo-dubai-food`, `media-processor`, `video-processor`,
  `extract-article`, `social-preview`, `submit-review`,
  `sync-meilisearch-cron`, `commerce-router`, `order-manage`,
  `award-loyalty-points`, `search-global`, `shop-import-processor`),
  and the cross-domain repository fan-out under `src/repositories/*`.
- **Contacts / onboarding — 23 files.** Tenant onboarding pipelines
  (`tenant-signup`, `auto-onboarding-cron`, `dld-sync-cron`,
  `uae-scrape-onboard`), prayer/push contact-list cron
  (`prayer-push-cron`, `prayer-times`), social graph + workspace
  contact sync (`social-graph.service.ts`, `lib/workspace`,
  `lib/social`), address/i18n contact metadata, and customer/settings
  pages that bulk-upsert contact records.

All 149 files currently issue at least one direct mutation that bypasses
the registry, which is why they were tracked under `owning_phase: "P4"`
by the #908 / #914 audits.

## 3. Existing adapter framework — what is in place today

- **Content adapter (missing)** — there is no
  `supabase/functions/_shared/execution/adapters/content/` directory
  today. Per inventory §6, content writes register against the canonical
  `NON_CRITICAL_DATA_FIX` task type for per-row paths, and bulk paths
  (e.g. `food-normalizer`, `sync-meilisearch-cron`,
  `shop-import-processor`) must instead register as
  `NON_SENSITIVE_BULK_UPDATE` so the approval gate fires.
- **Contacts adapter (missing)** — there is no
  `supabase/functions/_shared/execution/adapters/contacts/` directory
  today. Per inventory §6, contacts is bulk-by-definition (sync /
  upsert) and must register as `NON_SENSITIVE_BULK_UPDATE`, which is
  approval-gated.
- **Verifier registry** — `src/core/execution/verification-service.ts`
  enforces `error_code = NO_VERIFIER` for any task type without a
  registered verifier; this is the non-negotiable gate per inventory §8
  criterion #1. Content + contacts task types must each ship with a
  verifier (or a documented `NO_VERIFIER_REQUIRED` justification with
  sign-off).
- **Adapter registry** — `AdapterRegistry.register` enforces a declared
  `rollback_strategy` per inventory §8 criterion #2. Content per-row
  writes will most likely declare `auto` (snapshot-restore from a
  pre-image row); bulk content + contacts upserts will most likely
  declare `manual` (operator dashboard rollback) given they touch
  thousands of rows per run.
- **Feature flags** — `agent.content.enabled` and
  `agent.contacts.enabled` are referenced in
  `docs/architecture/agent-migration-inventory.md` §7 but the flag
  wiring is the responsibility of the migration tasks, not this
  drain-gate. Per inventory §10, when a flag is off the dispatch path
  must fail loudly — no silent fallback.
- **Risk classification** — content + contacts are MEDIUM by design:
  per-row content fixes do not require approval, but every bulk content
  or contacts task does. The classifier in
  `src/core/execution/risk-classification.ts` already recognises
  `NON_CRITICAL_DATA_FIX` and `NON_SENSITIVE_BULK_UPDATE`, so P4 must
  not introduce new task types — it consumes the existing canonical
  set.

## 4. Files to retire — content / storefront-adjacent (126)

These are the patterns currently tagged `owning_phase: "P4"` with reason
`"L7 P4: storefront/content — pending L7 phase 4 sweep …"`. Grouped by
module for reviewability; the JSON entries themselves remain the single
source of truth.

| Pattern (grouped) | Count |
| --- | --- |
| `src/repositories/*.ts` (per-row content + per-domain repository fan-out) | 64 |
| `src/repositories/domain/**` | 2 |
| `src/lib/orders/**` | 6 |
| `src/lib/onboarding/**` (storefront-adjacent) | 5 |
| `src/lib/engines/**` | 3 |
| `src/lib/loyalty/**` | 3 |
| `src/lib/orbit/**` (storefront-adjacent) | 3 |
| `src/lib/qr/**` | 2 |
| `src/lib/support/**` | 2 |
| `src/lib/{call,cart,core,coupons,db,favorites,groups,import,inventory,ranking,rental,reviews,search,supabase}/**` | 14 |
| `src/components/pos/KitchenQueue.tsx`, `src/components/wishlist/WishlistButton.tsx` | 2 |
| `src/domains/hotel/service.ts`, `src/domains/restaurant/adapters/supabase.adapter.ts` | 2 |
| `src/families/groups/group-update.ts` | 1 |
| `src/hooks/useHotelBooking.ts` | 1 |
| `src/pages/{deep-link,pro,UnifiedOrderDetailPage.tsx,WishlistPage.tsx}` | 4 |
| `src/services/{order,pos,property}.service.ts` | 3 |
| `supabase/functions/award-loyalty-points` | 1 |
| `supabase/functions/commerce-router` | 1 |
| `supabase/functions/deliveroo-dubai-food` | 1 |
| `supabase/functions/extract-article` | 1 |
| `supabase/functions/food-audit` | 1 |
| `supabase/functions/food-menu-builder` | 1 |
| `supabase/functions/food-normalizer` | 1 |
| `supabase/functions/food-publish` | 1 |
| `supabase/functions/food-rescrape-monitor` | 1 |
| `supabase/functions/food-visibility-gate` | 1 |
| `supabase/functions/food-visual-clean` | 1 |
| `supabase/functions/media-processor` | 1 |
| `supabase/functions/order-manage` | 1 |
| `supabase/functions/search-global` | 1 |
| `supabase/functions/shop-import-processor` | 1 |
| `supabase/functions/social-preview` | 1 |
| `supabase/functions/submit-review` | 1 |
| `supabase/functions/sync-meilisearch-cron` | 1 |
| `supabase/functions/video-processor` | 1 |

Total: 126 patterns. Authoritative list: the JSON entries.

The repository fan-out (~64 files of the form
`src/repositories/<noun>.repository.ts`) is the dominant shape and
should map to a small number of adapters that share a common
content-write contract (per-row `NON_CRITICAL_DATA_FIX`), parameterised
by table name + row schema, rather than one bespoke adapter per
repository. This is the design decision the phase owner takes before
adapter work begins.

## 5. Files to retire — contacts / onboarding (23)

These are the patterns currently tagged `owning_phase: "P4"` with reason
`"L7 P4: contacts/content — pending L7 phase 4 sweep …"`.

| Pattern (grouped) | Count |
| --- | --- |
| `src/lib/onboarding/**` (contacts-side) | 3 |
| `src/lib/{address,business-core,orbit,push,social,workspace}/**` | 6 |
| `src/lib/i18n.tsx` | 1 |
| `src/pages/customer/**`, `src/pages/settings/**` | 2 |
| `src/services/{onboarding,onboarding-providers,social-graph}.service.ts` | 3 |
| `supabase/functions/_shared/**` (contacts-side helpers) | 2 |
| `supabase/functions/auto-onboarding-cron` | 1 |
| `supabase/functions/dld-sync-cron` | 1 |
| `supabase/functions/prayer-push-cron` | 1 |
| `supabase/functions/prayer-times` | 1 |
| `supabase/functions/tenant-signup` | 1 |
| `supabase/functions/uae-scrape-onboard` | 1 |

Total: 23 patterns. Authoritative list: the JSON entries.

Contacts is bulk-by-definition: every entry on this list either syncs a
batch (cron jobs, scrapers, signup pipelines) or upserts a contact
record. Per inventory §6 the entire bucket registers against
`NON_SENSITIVE_BULK_UPDATE` (MEDIUM, approval-gated). No per-row
`NON_CRITICAL_DATA_FIX` shortcut should be taken for contacts, even on
single-row paths, because the contact graph is the primary attack
surface for spam / abuse and an approval gate is the policy choice.

## 6. Post-drain backlog — what still has to land

Per inventory §8, a phase is only "done" when every item below holds
true. The JSON drain in §7 has been executed; these are the items that
remain open and that the dispatch-guard lint will continue to report
against until they land:

- [ ] **Adapters:** every mutating `(domain, task_type)` pair across the
  files listed in §4 and §5 has a registered adapter under
  `supabase/functions/_shared/execution/adapters/{content,contacts}/`.
  Neither directory exists today. The content bundle should ship a
  generic per-row content-write adapter parameterised by table + row
  schema (covering the ~64 thin repositories) plus bespoke adapters for
  the bulk surfaces (food pipeline, search sync, shop import,
  media/video processors). The contacts bundle should ship sync +
  upsert adapters for each cron / signup / scraper entry point.
- [ ] **Verifiers:** every adapter has a registered verifier (or a
  documented `NO_VERIFIER_REQUIRED` justification with sign-off).
  `TaskVerificationService` blocks unverified tasks with `NO_VERIFIER`.
- [ ] **Rollback:** every adapter declares a `rollback_strategy`
  (`auto`, `manual`, or `none` with reason). Per-row content writes
  default to `auto` (snapshot-restore from pre-image); bulk content +
  all contacts paths default to `manual` (operator dashboard rollback)
  given the row-count blast radius. `AdapterRegistry.register` enforces
  this at registration time.
- [ ] **Feature flags:** `agent.content.enabled` and
  `agent.contacts.enabled` are wired and default `off` outside canary
  tenants. When the flag is off, the dispatch path fails loudly — no
  silent fallback (inventory §10).
- [ ] **Caller migration:** every direct
  `.insert / .update / .delete / .upsert / .rpc` site in the 149 files
  is replaced by a `dispatchExecutionTask({ domain, taskType, payload })`
  call. The L6 lint rule is the forcing function — once the allow-list
  entry is removed, any remaining direct mutation in that file fails
  CI.
- [ ] **Approval gate live:** every task type registered as
  `NON_SENSITIVE_BULK_UPDATE` (every contacts adapter, plus the bulk
  content adapters) reaches `pending_review` in canary and is acted on
  by the cockpit before the production cohort flips on.
- [ ] **Governance audit:** the four SQL queries in inventory §9 return
  zero ungoverned tasks for the content + contacts domains over a
  fresh 24-hour window.
- [ ] **Cockpit visibility:** the content and contacts agents are
  registered in `system.agents` and `system.agent_capabilities`, with a
  green heartbeat in `/admin/agents` (L4 cockpit, task #813).

Each unchecked item maps to lint errors that the §7 drain made visible.
The phase converts from "drained" to "fully closed" when every box is
ticked and `pnpm lint` is green again.

## 7. Mechanical drain procedure (executed 2026-04-17)

The drain was a single deterministic edit:

1. Open `.eslintrc.dispatch-allowlist.json`. ✅
2. Remove every entry where `owning_phase === "P4"` (149 entries
   removed; before: 456 per-file; after: 307 per-file). ✅
3. Update `policy.last_audit`: ✅
   - `by`: `"task #938 (Drain the P4 (content + contacts) entries from the dispatch allow-list)"`
   - `on`: `2026-04-17`
   - `notes`: drain summary referencing this audit doc.
   - `per_file_count`: `307` (was 456).
   - `phase_distribution`: `P4` key dropped; `{P1: 79, P2: 38, P3: 157, P5: 33}` remains.
   - `previous_audit`: prior `last_audit` (task #914) preserved here.
4. Update `docs/architecture/agent-migration-inventory.md` §1 totals
   row and §3 P4 row to count `0` with a pointer to this document. ✅
5. Replace §1 of this document with a "drain complete" header. ✅
6. Run `pnpm lint`. **Currently expected to fail** on the 149 ex-exempt
   files until the §6 backlog completes; the failures are the forcing
   function for that backlog. The phase reaches "fully closed" when
   `pnpm lint` is green again.

## 8. Canary + rollout log

Append one row per canary cohort once the flags begin to flip on.

| Date | Tenant cohort | `agent.content.enabled` | `agent.contacts.enabled` | Result |
| --- | --- | --- | --- | --- |
| 2026-04-17 | n/a | off | off | JSON drain executed (this document). Allow-list now holds 307 per-file entries (149 P4 entries removed); `policy.last_audit` references task #938. Adapter framework + callsite migration tracked separately; dispatch-guard lint will report errors on the 149 ex-exempt files until that work lands. |

## 9. Sign-off

- **Engineering:** L7 sweep owner (per task #938).
- **Audit reference:** `policy.last_audit` block in
  `.eslintrc.dispatch-allowlist.json` references task #938 with
  `per_file_count = 307` and `phase_distribution.P4` dropped.
  `previous_audit` preserves the task #914 block for traceability.
- **Next phase preview:** P5 (notifications + OTP) — 33 entries,
  drained when the notifications + OTP adapters land with strict
  quotas + idempotency. P5 is independent of P4 and may proceed in
  parallel.
