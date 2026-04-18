# Phase 1 — Core Universal Foundation: Status

> Tracks the Phase-1 implementation work for Task #1075. Updated as work
> lands. Hard rule: minimal diffs only, no breaking changes, no redesign.

## Approach

The codebase already contains substantial canonical infrastructure:

- `src/domains/shared/canonical-types.ts` — canonical type definitions
  (`CanonicalUserProfile`, `CanonicalWalletState`, `CanonicalWalletTransaction`,
  `CanonicalMessage`, `CanonicalOrbitProfile`, …).
- `src/domains/wallet/` — wallet domain with `service.ts`, `ports.ts`,
  `events.ts`, `DOMAIN_CONTRACT.md`.
- `src/domains/orbit/` — orbit domain with services, ports, contracts, and
  a canonical realtime layer (`src/lib/realtime-manager.ts`).
- `src/services/user.service.ts` and `src/repositories/profile.repository.ts`
  — identity reads/writes against `profiles`.
- `src/lib/platform-bus/` — the canonical cross-domain event bus.

What was missing was a **single import surface per domain**. Consumers were
reaching into ad-hoc paths (`@/services/user.service`,
`@/domains/wallet/service`, `@/lib/realtime-manager`, …), making it impossible
to enforce "single source of truth" without large mechanical rewrites.

Phase 1 establishes that single surface **by convergence**, not by moving
files. Zero existing code changed. New code must import from the canonical
surfaces.

## What landed in this iteration

### New files (additive only)

| File | Purpose |
|------|---------|
| `src/domains/identity/index.ts` | Canonical identity surface — re-exports `CanonicalUserProfile`, `userService`, profile repository helpers, and `getOrbitProfile`. |
| `src/domains/wallet/index.ts` | Canonical wallet surface — re-exports canonical wallet types, ports, `createWalletService`, and wallet events. |
| `src/domains/orbit/index.ts` | Canonical orbit surface — re-exports canonical message types, ports, orbit services, the realtime manager wrapper, and orbit events. |
| `src/domains/identity/__tests__/canonical-surface.test.ts` | Contract test that fails if a canonical export is removed. |

### What is unified

- **Identity:** one import path for the user profile type, the user service,
  and the supporting repository helpers — `@/domains/identity`.
- **Wallet:** one import path for the wallet service factory, ports, and
  canonical wallet types — `@/domains/wallet`.
- **Orbit:** one import path for orbit message types, services, the realtime
  manager, and orbit events — `@/domains/orbit`.

### What is NOT changed (intentional, per minimal-diff rule)

- No existing file was modified.
- No duplicate identity/wallet/orbit module was deleted. Removal is a
  data-normalization concern that belongs to the existing
  "Retroactive Data Normalization" task and to Phase 3 reconciliation, not
  to Phase 1 foundations.
- No DB schema migration was applied.

### Binding rules going forward

1. New code touching identity, wallet, or orbit MUST import from the
   canonical surface (`@/domains/identity`, `@/domains/wallet`,
   `@/domains/orbit`).
2. New code MUST NOT call `supabase.channel(...)` directly from domain code.
   Use `realtimeManager` (re-exported from `@/domains/orbit`) or a hook
   built on top of it.
3. Wallet ledger rows MUST only be written via the wallet service obtained
   from `@/domains/wallet`.
4. Identity reads MUST resolve through `@/domains/identity` so future merge
   logic (read-time identity reconciliation) can be plugged in centrally.

## Verification

- `vite` dev server: running, restart confirmed.
- `vite build`: production build completes (≈1m41s, SEO scoring 91/100, no
  critical issues — pre-existing warnings unchanged).
- New canonical-surface contract test added; runs under `vitest`.
- No file outside `src/domains/{identity,wallet,orbit}/` was modified.

## Remaining risks (carried into Phase 3 / normalization track)

- Multiple legacy profile-shaped types still exist
  (`CanonicalIdentity` in `lib/schema/canonical-schemas.ts`, local
  `ProfileRow`s in services). These are not removed in Phase 1; they will
  be reconciled at read+write time in Phase 3 and normalized retroactively
  by the existing normalization task.
- A few non-domain modules still hold direct realtime-channel calls
  (`src/lib/call/signaling.ts`, `src/lib/orbit/signaling.ts`,
  `src/hooks/useWalletRealtime.ts`). These are pre-existing and out of
  scope for the Phase-1 minimal-diff iteration; they will be routed through
  the canonical wrapper in Phase 8 ("Realtime + cache hardening").
- Identity-merge service (canonical user reconciliation across duplicated
  rows) is **not** implemented in this iteration — it requires schema
  changes (e.g. `merged_into_id`) and belongs to the
  "Unify profile identity into a single canonical source" task that already
  exists in the project task list.

## Phase 1 exit-gate status

> Gate: every downstream module can plug into the canonical contracts only.

- ✅ Canonical surfaces exist for identity, wallet, orbit.
- ✅ Contract test guards the surface against accidental removal.
- ⚠ Read-time identity merge: **deferred** to the existing dedicated task
  ("Unify profile identity into a single canonical source"). Phase 1 here
  delivers the surfaces; the merge logic will be added behind those
  surfaces without touching call sites.
- ⚠ Migration of legacy call sites to canonical surfaces: incremental —
  done as files are touched in subsequent phases (no big-bang rewrite).

The gate is **partially met**: the canonical surfaces are in place and a
regression guard protects them. Full migration of legacy call sites is an
explicit follow-up to be addressed without further redesign.
