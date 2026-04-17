# 02 — Frontend → DB Direct-Access Violations

The DDD rule is: only `src/integrations/supabase/`, `src/domains/*/adapters/`,
and `src/services/db*` may touch the Supabase client directly. Anything
else must go through a domain adapter.

## Headline numbers

| Metric                                                | Count |
|-------------------------------------------------------|------:|
| All `supabase.(from|rpc|storage|auth)` callsites in `src/` | 194 |
| Violations (callsites outside the allowed surface)    |    72 |
| Critical violations (excluding tests + auth-read-only)|    22 |

Top-level folders ranked by violation count
(`99-evidence/frontend-direct-db-violations-by-area.txt`):

```
26  src/lib
 7  src/services
 7  src/repositories
 7  src/hooks
 5  src/test
 4  src/__tests__
 4  src/stores
 4  src/families
 4  src/contexts
 2  src/pages
 2  src/components
```

Note: `src/test/`, `src/__tests__/`, and `src/lib/eslint-plugin-easylocs/`
violations are intentional fixtures — they are kept in the list for
completeness but are excluded from the prioritized table below.

## Top 20 frontend → DB violations (priority order)

Severity legend:
- **S1 — Security**: bypasses RLS guarantee, leaks session, or runs admin RPC from browser.
- **S2 — Integrity**: client-side write that should be server-only.
- **S3 — Cost**: client-side read with no caching/budget control.
- **S4 — Maintainability**: ad-hoc supabase access that should be wrapped in an adapter.

| # | File:line | Match | Domain | Severity |
|--:|-----------|-------|--------|----------|
| 1 | `src/lib/wallet/wallet-identity-binding.ts:76` | `supabase.from("wallet_device_bindings").upsert(...)` | wallet | **S1** — wallet write from client; must move into wallet-ops edge fn or wallet adapter. |
| 2 | `src/lib/push/registerPush.ts:272` | `supabase.from("push_tokens").upsert(...)` | notifications | **S2** — push-token registration should be brokered server-side to deduplicate per device. |
| 3 | `src/lib/auth-redirect.ts:12` | `supabase.rpc("has_role", {...})` | identity | **S1** — role-check RPC invoked from client; wrap in identity adapter and add cache. |
| 4 | `src/lib/db/typed-queries.ts:54` | dynamic `(supabase as any).from(table)` | shared | **S4** — escape hatch around the type system, used by multiple call sites — replace with typed adapter. |
| 5 | `src/lib/engines/backend-connectivity-engine.ts:59` | `supabase.from("seed_merchants").select(...)` | marketplace | **S3** — health probe pings prod table; should call a dedicated `health-router` edge fn. |
| 6 | `src/lib/engines/backend-connectivity-engine.ts:101` | `supabase.storage.listBuckets()` | media | **S1** — bucket listing exposed to browser; should be admin-only. |
| 7 | `src/lib/analytics/map-error-analytics.ts:216` | `supabase.from("map_error_analytics").insert(...)` | analytics | **S2** — analytics writes must go through analytics adapter / edge fn (and budget). |
| 8 | `src/lib/analytics/map-error-alerting.ts:99` | `supabase.from("map_error_alert_log").insert(...)` | analytics | **S2** — same as above. |
| 9 | `src/lib/observability/alert-dispatcher.ts:121` | `supabase.from("observability_alert_log").insert(...)` | observability | **S2** — same. |
| 10 | `src/lib/storage/uploadFile.ts:65,122` | `supabase.storage.from(...).upload/getPublicUrl` | media | **S2** — upload path lacks signed-URL workflow + AV scan. Wrap in `media.adapter`. |
| 11 | `src/lib/storage/assets.ts:100,106` | same pattern | media | **S2** — duplicate of #10; consolidate. |
| 12 | `src/repositories/mfa.repository.ts:7,12,16,20,24` | `supabase.auth.mfa.*` | identity | **S4** — repository layer is fine, but should be moved into `domains/identity/adapters/`. |
| 13 | `src/contexts/AuthContext.tsx:139,549,590,604` | `supabase.auth.getSession / onAuthStateChange / signOut` | identity | **S4** — auth ctx is the canonical reader, but should use a thin identity port to enable mock. |
| 14 | `src/hooks/useMasterAppBootstrap.ts:145,158,277,413` | `supabase.auth.getSession / onAuthStateChange` | identity | **S4** — duplicates AuthContext logic; should consume a shared identity port. |
| 15 | `src/hooks/useAppHealthCheck.ts:37` | `supabase.auth.getSession()` | identity | **S4** — same. |
| 16 | `src/hooks/useCacheMetrics.ts:63` | `supabase.auth.getSession()` | identity | **S4** — same. |
| 17 | `src/hooks/call/useOutgoingCall.ts:52` | `supabase.auth.getUser()` | calls | **S4** — should consume identity port. |
| 18 | `src/components/auth/SocialLoginButtons.tsx:50` | `supabase.auth.signInWithOAuth(...)` | identity | **S4** — UI directly invokes provider; route through identity adapter for telemetry. |
| 19 | `src/components/admin/agents/AgentTriggerDialog.tsx:64` | `supabase.auth.getUser()` | admin | **S4** — same. |
| 20 | `src/families/identity/index.ts:67,73` & `src/families/orbit-dispatch/orbit-dispatch.ts:82,92` | `supabase.auth.getUser/getSession/onAuthStateChange` | identity / orbit | **S4** — families layer should not call supabase directly. |

Full list: `99-evidence/frontend-direct-db-violations.txt`.

## Pattern observations

1. **`src/lib/` is the single largest violator (26/72 = 36 %).** The
   `lib/storage`, `lib/analytics`, `lib/observability`, and `lib/wallet`
   sub-trees each bypass the adapter layer. They were treated as "infra"
   and never migrated when the domain adapters were added.
2. **Auth reads are everywhere.** 11 of 22 critical violations are
   `supabase.auth.getSession()` / `getUser()` / `onAuthStateChange()`.
   The pattern is correct (auth state is shared) but the surface should
   be one identity port consumed via React Query / context, not 11 ad-hoc
   callers.
3. **No production code performs a frontend `INSERT/UPDATE/DELETE` on a
   business-critical table** (no direct write to `wallets`, `bookings`,
   `orders`, `payments`, `messages`). The few writes that exist target
   telemetry / device tables only.
4. **Tests purposely include `supabase.from()` literals** — keep them
   excluded from any future ESLint guardrail.

## Recommended remediation surface (Phase 2 candidate)

- Create `src/domains/media/adapters/storage.adapter.ts` and migrate all
  `lib/storage/*` callers behind it.
- Create `src/domains/identity/ports/auth-port.ts` + a single
  `useIdentitySession()` hook; deprecate direct `supabase.auth.*` reads.
- Move `lib/analytics/map-error-*` and `lib/observability/alert-*` writes
  to a single `analytics-ingest` edge function, behind a domain port.
- Move `lib/wallet/wallet-identity-binding.ts:76` write into
  `wallet-ops` edge function.
- Replace `lib/db/typed-queries.ts:54` `(supabase as any).from(table)`
  with a generated typed query helper or remove it.

(Concrete implementation is out of scope for Phase 0.)
