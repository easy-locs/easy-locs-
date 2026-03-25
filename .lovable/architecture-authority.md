# Architecture Authority — Single Source of Truth

## CORE RULE
ONE DOMAIN = ONE SOURCE OF TRUTH = ONE WRITE PATH = ONE READ PATH

## Domain Authority Map

| Domain | Source of Truth | Write Path | Read Path | FORBIDDEN |
|--------|---------------|------------|-----------|-----------|
| **Identity** | `AuthContext` → `v2AuthStore` (synced) | `supabase.auth` → `AuthContext.onAuthStateChange` → `v2AuthStore.syncFromV1` | `useAuth()` for components, `v2AuthStore` for stores | `orbit_identity_profiles`, `orbit_device_keys`, duplicate session stores, extra `onAuthStateChange` listeners |
| **Orbit Profile** | `orbit_profiles_v2` table | `ensureOrbitProfile()` → `orbitStore.loadProfile()` | `useOrbitStore()` | `orbit_identity_profiles`, any legacy profile table |
| **Communication (V2 Orbit)** | `conversations_v2` + `chat_messages_v2` | `conversationService.ts` / `messageService.ts` → `chatRepo` → DB | `chatRepoExtended` / `conversationService` → components via `useChatStore()` | Legacy `messages` table for NEW Orbit flows, `chatStore` local-only state |
| **Communication (Legacy)** | `messages` table | Direct supabase inserts in pages (ClientMessages, TenantMessages, RentalManagement) | Direct supabase reads in same pages | ⚠️ TO BE MIGRATED to conversations_v2 |
| **Wallet/QR** | `wallet_balances_v2` + `wallet_accounts` + `qr_payment_sessions` | `wallet-hooks.ts` → `wallet_transfer` RPC | `useWalletBalance()` from `payments/wallet-hooks.ts` | Multiple QR generators, legacy wallet sync |
| **QR Personal** | `qr-engine` (canonical format) | `encodeQr()` + `qr.payUser()` | `QRCodeSVG` / `BrandedQR` rendering | Duplicate QR format libraries |
| **QR Merchant** | `merchant-qr-engine` | `createStaticMerchantQr()` / `createDynamicMerchantQr()` | `decodeMerchantQr()` → `executeMerchantPayment()` | Mixing personal and merchant QR flows |
| **Discovery (PUBLIC)** | `storefront_pages` + `menu_items` | Pipeline → `storefront_pages` publication | `fetchCanonicalDiscovery()` / `governStorefrontQuery()` | ❌ Direct `seed_merchants` reads on ANY public surface |
| **Discovery (INTERNAL)** | `seed_merchants` | Pipeline engines, admin pages, merchant settings | Admin dashboards, merchant management pages | Public UI reading seed_merchants |
| **Admin/Engines** | `engine_supervisor` + `engine_run_logs` + `module_health` | Edge Functions → `engine_supervisor` | `useBackendEngineStatus()` | Client-side fake engine runtime, local telemetry |
| **Pipeline** | `entity_pipeline_queue` | Pipeline worker → queue → publication | Admin → queue status | Duplicate pending jobs, ghost re-queuing |
| **Boot** | `useMasterAppBootstrap` + `AppInit` | Single boot chain in `App.tsx` | N/A | Duplicate bootstrap, destructive cache purge on boot |
| **Guest** | `lib/guest-session.ts` (unified) | `getGuestId()` / `createGuestSession()` | Same module | `lib/auth/guest-session.ts` (DELETED) |

## Structural Reset History

### Pass 4 — Final Architecture Lockdown (2026-03-25)

**Public surfaces fully decoupled from seed layer:**

| Module | Change |
|--------|--------|
| `ShopPage.tsx` | Removed `seed_merchants` fallback + `seed_products` catalog fallback |
| `CheckoutPage.tsx` | Removed `seed_merchants` seller resolution fallback |
| `RestaurantPage.tsx` | Comment updated — already clean since Pass 3 |
| `chatStore.ts` | Replaced fake `conv_`/`msg_` IDs with `crypto.randomUUID()` |
| `e2ee/device-identity.ts` | **DELETED** — dead duplicate ECDH identity (never imported) |

### Pass 3 — Public Surface Hardening

ALL public discovery surfaces now read exclusively from `storefront_pages`:

| Module | Before | After |
|--------|--------|-------|
| `OrbitHome` | `seed_merchants` | `storefront_pages` |
| `canonical-discovery-pipeline` | merge storefront+seed | `storefront_pages` ONLY |
| `homeEngine.ts` | `seed_merchants` | `storefront_pages` |
| `mapEngine.ts` | merge | `storefront_pages` ONLY |
| `searchEngine.ts` | merge + `seed_products` | `storefront_pages` + `menu_items` |
| `search-resolver.ts` | merge | `storefront_pages` ONLY |
| `smartRecommendations.ts` | `seed_merchants` | `storefront_pages` |
| `RestaurantPage` | fallback to seed | `storefront_pages` only |
| `RestaurantPage` menu | `seed_products` | `menu_items` |
| `FavoritesPage` | fallback to seed | `storefront_pages` only |
| `ShopPage` (Pass 4) | seed fallback | `storefront_pages` + `catalog_items` only |
| `CheckoutPage` (Pass 4) | seed fallback | `storefront_pages` only |

### All Deleted Dead Layers (Passes 1-5)

| File | Reason |
|------|--------|
| `src/lib/e2ee/device-identity.ts` | Dead ECDH duplicate — never imported |
| `src/lib/auth/guest-session.ts` | Duplicate guest ID |
| `src/lib/orbit/orbit-id.ts` | Legacy identity conflict |
| `src/lib/orbit/device-crypto.ts` | Orphaned |
| `src/lib/orbit/orbit-key-trust.ts` | Orphaned |
| `src/lib/orbit/insert-ride-system-message.ts` | Dead — never imported (Pass 5) |
| `src/stores/appHydrationStore.ts` | Dead store |
| `src/components/system/AppHydrationGate.tsx` | Dead component |
| `src/components/system/V2AuthBridge.tsx` | Redundant with AppInit (Pass 5) |
| `src/lib/platform/platform-continuous-engine.ts` | Client shadow runtime |
| `src/lib/platform/self-healing-engine.ts` | Client shadow runtime |
| `src/app/V1BootBridge.tsx` | Duplicate bootstrap |
| `src/core/*` | Duplicate reactions |
| `src/app/providers/AppBootstrap.tsx` | Duplicate provider |
| `src/components/shell/V2AppShell.tsx` | Dead shell |
| `src/components/layout/UnifiedAppShell.tsx` | Dead shell |
| `src/stores/uiShellStore.ts` | Dead store |
| `src/lib/guards/*` | Dead guard system |
| `src/lib/engines/visual-consistency-engine.ts` | Client audit conflict |
| `src/lib/engines/ui-ux-consistency-engine.ts` | Client audit conflict |
| `src/app/events/booking-events.ts` | Duplicate event installer |

### Known Remaining Dual Tables (TRACKED)

| Domain | Current State | Status |
|--------|--------------|--------|
| `messages` table (org-scoped) | Used by communication-hub for B2B/support messaging | KEEP — different domain from Orbit P2P |
| `seed_merchants` in admin/merchant pages | Owner manages raw entity before publication | KEEP — internal only |

### FORBIDDEN PATTERNS

1. ❌ Public page reading `seed_merchants` or `seed_products`
2. ❌ Duplicate `onAuthStateChange` listener
3. ❌ Client-side fake engine runtime
4. ❌ Duplicate bootstrap chain
5. ❌ Multiple QR generators for same flow
6. ❌ Destructive cache purge on boot
7. ❌ Shadow communication engines
8. ❌ Client-generated fake IDs for DB records
9. ❌ Merge/fallback seed→storefront in public UI
10. ❌ `_isSeed` flag logic in public rendering

### Version/Cache Safety

- `enforceVersionConsistencyOnBoot` — REMOVED (dangerous auto-reload)
- `startVersionPolling` — KEPT (non-destructive update notification)
- `ChunkRecoveryBoundary` — KEPT (handles lazy load failures safely)

## Write/Read Path Contracts

### Orbit Communication
```
WRITE: UI → conversationService/chatStore → chatRepo → conversations_v2/chat_messages_v2
READ:  UI → chatRepoExtended → useChatStore → render
REALTIME: supabase.channel → postgres_changes on conversations_v2/chat_messages_v2
```

### QR / Wallet
```
WRITE: scan → decode → resolvePayTarget → wallet_transfer RPC → wallet_accounts/wallet_ledger_entries
READ:  useWalletBalance → wallet_accounts → UI
SESSION: qr_payment_sessions (single source)
```

### Discovery / Public
```
WRITE: pipeline engines → seed_merchants → publish_gate → storefront_pages/menu_items
READ:  fetchCanonicalDiscovery → storefront_pages ONLY → UI
GOVERNANCE: governStorefrontQuery() applies visibility_mode + route_status filters
```

### Admin / Engines
```
WRITE: Edge Functions (pg_cron) → engine_supervisor + engine_run_logs
READ:  useBackendEngineStatus() → engine_supervisor → admin dashboards
MONITORING: module_health table
```
