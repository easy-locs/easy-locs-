# Architecture Authority — Single Source of Truth

## CORE RULE
ONE DOMAIN = ONE SOURCE OF TRUTH = ONE WRITE PATH = ONE READ PATH

## Domain Authority Map

| Domain | Source of Truth | Write Path | Read Path | FORBIDDEN |
|--------|---------------|------------|-----------|-----------|
| **Identity** | `AuthContext` → `v2AuthStore` (synced) | `supabase.auth` → `AuthContext.onAuthStateChange` → `v2AuthStore.syncFromV1` | `useAuth()` for components, `v2AuthStore` for stores | `orbit_identity_profiles`, `orbit_device_keys`, duplicate session stores |
| **Orbit Profile** | `orbit_profiles_v2` table | `ensureOrbitProfile()` → `orbitStore.loadProfile()` | `useOrbitStore()` | `orbit_identity_profiles`, any legacy profile table |
| **Communication** | `conversations_v2` + `chat_messages_v2` | `conversationService.ts` / `messageService.ts` → DB | `chatRepoExtended` / `conversationService` → components | Legacy `messages` table for Orbit flows, `chatStore` local-only state |
| **Wallet/QR** | `wallet_balances_v2` + `wallet_accounts` + `qr_payment_sessions` | `wallet-hooks.ts` → `wallet_transfer` RPC | `useWalletBalance()` from `payments/wallet-hooks.ts` | Multiple QR generators, legacy wallet sync |
| **Discovery** | `storefront_pages` + `menu_items` | Pipeline → `storefront_pages` publication | Public UI → `storefront_pages` only | Direct `seed_merchants` reads on public surfaces |
| **Admin/Engines** | `engine_supervisor` + `engine_run_logs` + `module_health` | Edge Functions → `engine_supervisor` | `useBackendEngineStatus()` | Client-side fake engine runtime, local telemetry |
| **Pipeline** | `entity_pipeline_queue` | Pipeline worker → queue → publication | Admin → queue status | Duplicate pending jobs, ghost re-queuing |
| **Boot** | `useMasterAppBootstrap` + `AppInit` | Single boot chain in `App.tsx` | N/A | Duplicate bootstrap, destructive cache purge on boot |
| **Guest** | `lib/guest-session.ts` (unified) | `getGuestId()` / `createGuestSession()` | Same module | `lib/auth/guest-session.ts` (DELETED) |

## Deleted Dead Layers (This Pass)

| File | Reason |
|------|--------|
| `src/lib/auth/guest-session.ts` | Duplicate guest ID system — merged into `lib/guest-session.ts` |
| `src/lib/orbit/orbit-id.ts` | Legacy `orbit_identity_profiles` — conflicts with `orbit_profiles_v2` |
| `src/lib/orbit/device-crypto.ts` | Only used by deleted orbit-id system |
| `src/lib/orbit/orbit-key-trust.ts` | Orphaned — no imports |
| `src/stores/appHydrationStore.ts` | Dead hydration store — never mounted in App.tsx |
| `src/components/system/AppHydrationGate.tsx` | Dead component — never imported |

## Hardened Read Paths (This Pass)

| Surface | Before | After |
|---------|--------|-------|
| `RestaurantPage` | `storefront_pages` → fallback `seed_merchants` | `storefront_pages` only |
| `RestaurantPage` menu | `seed_products` | `menu_items` |
| `FavoritesPage` | `storefront_pages` + `seed_merchants` fallback | `storefront_pages` only |
| `HomeAutofillStatusCard` | `seed_merchants` | `storefront_pages` |

## Version/Cache Safety

- `enforceVersionConsistencyOnBoot` — REMOVED (dangerous auto-reload)
- `startVersionPolling` — KEPT (non-destructive update notification)
- `ChunkRecoveryBoundary` — KEPT (handles lazy load failures safely)
