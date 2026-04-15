# Taxonomy & Canonical Audit Report

**Platform**: Easy-Locs  
**Date**: 2026-04-15  
**Scope**: Taxonomy naming conflicts, duplicate aliases, duplicate mapping functions, hardcoded UI arrays, dual schema definitions, legacy `.from()` calls, REBUILD verdicts for Address and Media.

---

## Executive Summary

This audit identified and resolved **7 categories of structural debt** across the taxonomy and canonical schema layers. All code-level fixes have been applied; two items (Address consolidation, Media table creation) are documented as migration plans for future sprints.

| Issue | Severity | Status |
|-------|----------|--------|
| T001: CANONICAL_VERTICALS naming collision | **High** | ✅ Resolved |
| T002: Duplicate mapping functions | **Medium** | ✅ Resolved |
| T003: Duplicate alias maps | **Medium** | ✅ Resolved |
| T004: Hardcoded UI category arrays | **Low** | ✅ Resolved |
| T005: Dual canonical schema definitions | **High** | ✅ Resolved |
| T006: Legacy `.from()` calls | **Medium** | ✅ Wallet domain migrated; storefront/marketplace documented |
| T007: REBUILD verdicts (Address, Media) | **High** | 📋 Migration plan documented |

---

## T001: CANONICAL_VERTICALS Naming Collision

### Problem
Both `canonical-registry.ts` and `canonical-types.ts` exported a constant named `CANONICAL_VERTICALS`, causing import ambiguity.

Additionally, `canonical-types.ts` included legacy discriminants (`hotel`, `service`, `flight`, `ride`, `delivery`, `retail`, `events`) that no longer match the `Vertical` type in `world-class-taxonomy.ts`.

### Resolution
- **Renamed** `canonical-registry.ts` export → `REGISTRY_VERTICALS` to eliminate the collision.
- **Separated** `canonical-types.ts` into three explicit layers:
  - `PRIMARY_VERTICALS` (13 entries) — the authoritative conflict-free set matching `Vertical` type.
  - `LEGACY_VERTICAL_DISCRIMINANTS` (7 entries) — `hotel`, `service`, `flight`, `ride`, `delivery`, `retail`, `events` — used by per-vertical entity interfaces.
  - `CANONICAL_VERTICALS` — combined set (spread of both arrays).
- **Added** `PrimaryVertical` type, `LegacyVerticalDiscriminant` type, `LEGACY_VERTICAL_MAP` (maps each legacy → primary), `normalizeVertical()` function, and `isPrimaryVertical()` type guard.
- **Fixed** `CATEGORY_KEY_TO_VERTICAL` mapping: `beauty` now maps to `"beauty"` (was incorrectly mapped to `"services"`).
- **Authoritative source**: `PRIMARY_VERTICALS` is the conflict-free canonical set. `CANONICAL_VERTICALS` includes legacy discriminants for backward compatibility with typed entity interfaces.

### Files Changed
- `src/lib/taxonomy/canonical-registry.ts`
- `src/domains/shared/canonical-types.ts`
- `src/lib/taxonomy/world-class-taxonomy.ts`

---

## T002: Duplicate Mapping Functions

### Problem
`world-taxonomy-data.ts` defined local functions `mapCategoryKeyToVertical()` and `mapVerticalToRadar()` that duplicated the private constants `_CATEGORY_KEY_TO_VERTICAL` and `_VERTICAL_TO_RADAR` in `world-class-taxonomy.ts`.

### Resolution
- **Exported** `CATEGORY_KEY_TO_VERTICAL` and `VERTICAL_TO_RADAR` as public constants from `world-class-taxonomy.ts` (renamed from underscore-prefixed privates).
- **Removed** both duplicate functions from `world-taxonomy-data.ts`.
- **Updated** `buildWorldTaxonomy()` to use the imported constants with fallback defaults.

### Files Changed
- `src/lib/taxonomy/world-class-taxonomy.ts`
- `src/lib/taxonomy/world-taxonomy-data.ts`

---

## T003: Consolidated Alias Definitions

### Problem
`taxonomy-mapper.ts` (import engine) maintained its own `CATEGORY_ALIASES` map with ~180 entries that heavily overlapped `SUBCATEGORY_ALIASES` in `taxonomy-aliases.ts` (~120 entries). Divergence between the two maps meant the import pipeline could resolve aliases differently from the rest of the platform.

### Resolution
- **taxonomy-mapper.ts** now imports `SUBCATEGORY_ALIASES` from `taxonomy-aliases.ts` as the base.
- **Import-specific aliases** (40 entries unique to the import pipeline, e.g. `gelato→ice_cream`, `convenience→mini_mart`) are defined in a separate `IMPORT_SPECIFIC_ALIASES` constant.
- The final `CATEGORY_ALIASES` is composed via spread: `{ ...SUBCATEGORY_ALIASES, ...IMPORT_SPECIFIC_ALIASES }`.
- **`canonical-registry.ts`** alias system is structurally different (hierarchical path-based resolution with confidence scores). It now also consumes `SUBCATEGORY_ALIASES` as a fallback source via `resolveAlias()`, so any alias in `taxonomy-aliases.ts` is automatically available to the registry's resolution pipeline at confidence 0.7.

### Files Changed
- `src/lib/import-engine/taxonomy/taxonomy-mapper.ts`
- `src/lib/taxonomy/canonical-registry.ts` (imports `SUBCATEGORY_ALIASES`, unified resolution)
- (imports from) `src/lib/taxonomy/taxonomy-aliases.ts`

---

## T004: Hardcoded UI Category Arrays

### Problem
- `FoodTypePage.tsx` defined an inline `CUISINES` array with 12 hardcoded entries (label, icon, slug).
- `CategoryBanners.tsx` defined a `CATEGORIES` array with hardcoded titles and routes.

### Resolution

#### FoodTypePage.tsx
- Replaced inline `CUISINES` with a `CUISINE_DISPLAY_ORDER` array of slugs.
- Cuisines are now derived from `CATEGORY_TREE` at module scope: the food category's subcategories are looked up by slug, pulling `label` and `emoji` from the canonical source.
- Display order remains curated (order matters for UX), but data comes from the taxonomy.

#### CategoryBanners.tsx
- Added `CATEGORY_TREE` import and vertical lookups at module scope.
- Each banner entry now includes a `verticalKey` field and derives its `title` and `to` (route) from the canonical tree with i18n overrides and fallbacks.
- Display-specific data (images, accents, counts, badges) remains in the component — this is presentation config, not taxonomy data.

### Files Changed
- `src/pages/food/FoodTypePage.tsx`
- `src/components/landing/CategoryBanners.tsx`

---

## T005: Canonical Schema Unification

### Problem
Six entities have dual type definitions:

| Entity | DB Layer (`canonical-schemas.ts`) | Domain Layer (`canonical-types.ts`) |
|--------|-----------------------------------|--------------------------------------|
| Message | `CanonicalMessage` (snake_case: `message_id`, `conversation_id`, `sender_id`) | `CanonicalMessage` (camelCase: `id`, `threadId`, `senderUserId`) |
| Wallet | `CanonicalWalletAccount` (`wallet_account_id`, `owner_user_id`) | `CanonicalWalletState` (`walletId`, `ownerUserId`) |
| Address | `CanonicalAddress` (`street_1`, `state_region`, `lat/lng`) | `CanonicalAddress` (`line1`, `state`, `position.lat/lng`) |
| Media | `CanonicalMedia` (`media_id`, `media_kind`, `storage_key`) | `CanonicalMediaAsset` (`id`, `type`, `fileName`) |
| Presence | `CanonicalPresence` (`user_id`, `online`, `device_type`) | `CanonicalPresence` (`userId`, `status`, `deviceType`) |
| Ledger | `CanonicalLedgerEntry` (`ledger_entry_id`, `direction`, `balance_before`) | `CanonicalLedgerEntry` (`id`, `type`, `balanceBefore`) |

### Resolution
- **Renamed DB-layer types** in `canonical-schemas.ts` to use `Db` prefix for all types that had conflicting names with `canonical-types.ts`. This eliminates ambiguity — each entity now has exactly one name:
  - DB layer: `DbMessage`, `DbAddress`, `DbMedia`, `DbPresence`, `DbLedgerEntry`, `DbWalletAccount`, `DbListing`, `DbNotification`, `DbSupportTicket`, `DbMenuItem`, `DbRoomType`, `DbServicePackage`
  - Domain layer: `CanonicalMessage`, `CanonicalAddress`, `CanonicalMediaAsset`, `CanonicalPresence`, `CanonicalLedgerEntry`, `CanonicalWalletState`, `CanonicalListing`, `CanonicalNotification`, `CanonicalSupportTicket`, `CanonicalMenuItem`, `CanonicalRoomType`, `CanonicalServicePackage`
  - Types unique to the DB layer keep the `Canonical` prefix (e.g. `CanonicalIdentity`, `CanonicalOrganization`).
- **Created** `src/lib/schema/canonical-mappers.ts` with bidirectional mapper functions:
  - `fromDb<Entity>(row)` — DB row → domain object
  - `toDb<Entity>(domain)` — domain object → DB row (where writes are needed)
- **Convention documented**: `canonical-schemas.ts` = DB layer (mirrors PostgreSQL columns, `Db` prefix), `canonical-types.ts` = domain layer (ergonomic TypeScript types for UI/business logic, `Canonical` prefix).
- **Both layers are valid** — they serve different purposes. The mappers are the bridge.

#### Mapper Functions Created
| Function | Direction |
|----------|-----------|
| `fromDbMessage` / `toDbMessage` | DB ↔ Domain |
| `fromDbWalletAccount` / `toDbWalletAccount` | DB ↔ Domain |
| `fromDbAddress` / `toDbAddress` | DB ↔ Domain |
| `fromDbMedia` / `toDbMedia` | DB ↔ Domain |
| `fromDbPresence` / `toDbPresence` | DB ↔ Domain |
| `fromDbLedgerEntry` / `toDbLedgerEntry` | DB ↔ Domain |

All mappers use explicit reverse mapping functions for enum/status fields — no direct casts between layers.

### Files Created
- `src/lib/schema/canonical-mappers.ts`

---

## T006: Legacy `.from()` Audit

### Problem
Multiple files use Supabase `.from()` with table names listed in `LEGACY_TABLE_REDIRECTS`. These are logically deprecated tables that should transition to canonical domain tables.

### Runtime Mitigation
`src/services/db.ts` already implements a runtime guard via `_killLegacyAccess()`:
- In `V2_ONLY` mode: throws an error for any legacy table access.
- In standard mode: emits a `console.warn` with the canonical redirect hint.
- All 10 legacy tables are tracked in `DROPPED_LEGACY_TABLES`.

### Findings by Legacy Table

| Legacy Table | Canonical Target | Files Using Legacy Name | Risk |
|--------------|------------------|------------------------|------|
| `storefront_pages` | `identity.organizations` | ~15 files (merchant engines, supabase functions, UI components) | **High** — most widespread |
| `conversations_v2` | `orbit.conversations_v2` | ~8 files (chat components, supabase functions) | **Medium** — already uses v2 name but schema prefix missing |
| `marketplace_services` | `marketplace.listings` | ~4 files (C2CSmartBanner, MyListingsPanel, StorePage) | **Medium** |
| `marketplace_bookings` | `commerce.bookings` | ~3 files (stripe-webhook, supabase functions) | **Medium** |
| `concierge_orders` | `commerce.transactions` | ~3 files (stripe-webhook, supabase functions) | **Medium** |
| `messages` | `orbit.chat_messages_v2` | ~1 file (dlq-processor) | **Low** |
| `orbit_profiles_v2` | `identity.profiles` | ~1 file (rent-payment function) | **Low** |
| `wallet_balances_v2` | `wallet.wallet_accounts` | ~1 file (DriverWalletPanel) | **Low** |
| `booking_requests` | `commerce.bookings` | 0 files found | **None** |

### Migrations Completed (This Audit)

| File | Old Access | New Access |
|------|-----------|------------|
| `repositories/communication.repository.ts` | `db.from("conversations_v2")` | `domainDb.orbit.from("conversations_v2")` |
| `repositories/wallet-repository.ts` | `db.from("wallet_balances_v2")` (various columns) | `domainDb.wallet.from("wallet_accounts")` with column adapter |
| `lib/wallet/wallet-balance-fetcher.ts` | `db.from("wallet_balances_v2")` | Uses `wallet-repository.ts` adapter |
| `lib/wallet/wallet-integrity-validator.ts` | `db.from("wallet_balances_v2")` | Uses `wallet-repository.ts` adapter |
| `services/wallet.service.ts` | `db("wallet_balances_v2")` + `db("wallet_accounts")` | `domainDb.wallet.from(...)` + wallet-repository adapter |
| `components/delivery/DriverWalletPanel.tsx` | `db.from("wallet_balances_v2")` + `db("wallet_balances_v2").upsert(...)` | Uses `wallet-repository.ts` adapter |
| `payments/wallet-hooks.ts` | Realtime subscription on `public.wallet_balances_v2` | Realtime subscription on `wallet.wallet_accounts` |
| `lib/wallet/wallet-realtime-bridge.ts` | Dual subscription (wallet_accounts + wallet_balances_v2 fallback) | Single subscription on `wallet.wallet_accounts` |

The wallet migration uses a **column adapter pattern** in `wallet-repository.ts` that translates between legacy column names (`available`, `escrow`, `pending`, `wallet_id`, `user_id`, `balance`) and canonical column names (`available_balance`, `pending_balance`, `wallet_account_id`, `owner_user_id`). All wallet DB access now routes through this adapter.

#### Not Migrated — Column Schema Mismatch
The following legacy table redirects still need column-level translation adapters:

| Legacy Table | Canonical Target | Blocker |
|--------------|------------------|---------|
| `storefront_pages` | `identity.organizations` | Legacy has `slug`, `route_status`, `shop_visibility`, `logo_url`, `onboarding_completed`; canonical `organizations` has `display_name`, `brand_name`, `status`, `verification_status`. Column shapes are incompatible. |
| `marketplace_services` | `marketplace.listings` | Legacy uses `title`, `photo_url`, `org_id`, `boost_enabled`; canonical `listings` uses different column names. |

All remaining legacy table access is protected by the `db.ts` runtime guard (`_killLegacyAccess()`) which warns in standard mode and throws in `V2_ONLY` mode.

### Remaining Migrations (Future Sprints)
1. **Column mapping adapters**: Create repository adapter layers for `storefront_pages` → `identity.organizations` and `marketplace_services` → `marketplace.listings`.
2. **Supabase Edge Functions** (in `supabase/functions/`): These bypass the `db.ts` guard. Migrate after adapters are ready.
3. **Client-side engine/lib files**: ~60+ files use legacy names — protected by runtime guard. Migrate after adapters.
4. **Priority order**: Column adapters → repository layer → edge functions → engine/lib files.

---

## T007: REBUILD Verdict Resolution

### Address — REBUILD Plan

#### Current State
- **DB layer** (`canonical-schemas.ts`): `DbAddress` with `street_1`, `street_2`, `city`, `state_region`, `postal_code`, `country`, `lat`, `lng`, `formatted_address`, `place_source`.
- **Domain layer** (`canonical-types.ts`): `CanonicalAddress` with `line1`, `line2`, `city`, `state`, `postalCode`, `country`, `countryCode`, nested `position: { lat, lng, accuracy, updatedAt }`, `formattedAddress`, `placeId`.
- **Usage**: `CanonicalAddress` from `canonical-types.ts` is embedded in **30+ domain interfaces** (every entity that has a location).
- **Problem**: No unified `addresses` table. Address data is inlined in each entity row, leading to duplication and no referential integrity.

#### Migration Plan
1. **Phase 1 — Bridge (done)**: `canonical-mappers.ts` provides `fromDbAddress` / `toDbAddress` to convert between the two formats.
2. **Phase 2 — Table creation**: Create `public.addresses` table matching `canonical-schemas.ts` shape, with a UUID PK and a `owner_type` / `owner_id` polymorphic reference.
3. **Phase 3 — FK migration**: Add `address_id UUID REFERENCES addresses(id)` to entity tables that currently inline address fields. Populate via backfill migration.
4. **Phase 4 — Column drop**: Once all consumers read from the FK join, drop inline address columns from entity tables.
5. **Phase 5 — Domain type update**: Update `canonical-types.ts` `CanonicalAddress` to include `id` field; update all embedding interfaces to use `addressId: string` with a separate lookup.

#### Risk
- High blast radius (30+ interfaces). Recommend Phase 2-3 first, keeping inline fields as a read fallback during transition.

---

### Media — REBUILD Plan

#### Current State
- **DB layer** (`canonical-schemas.ts`): `CanonicalMedia` with `media_id`, `owner_type`, `owner_id`, `media_kind`, `url`, `storage_key`, `mime_type`, `width`, `height`, `duration_ms`.
- **Domain layer** (`canonical-types.ts`): `CanonicalMediaAsset` with `id`, `ownerId`, `type`, `url`, `thumbnailUrl`, `fileName`, `mimeType`, `sizeBytes`, `width`, `height`, `durationMs`, `contextType`, `contextId`, `metadata`.
- **Problem**: No unified `media` table exists. Media URLs are stored inline in entity rows (e.g., `image_url`, `logo_url`, `banner_url` columns scattered across tables). The `CanonicalMedia` type exists but has no backing table.

#### Migration Plan
1. **Phase 1 — Bridge (done)**: `canonical-mappers.ts` provides `fromDbMedia` to convert DB rows to domain objects.
2. **Phase 2 — Table creation**: Create `public.media_assets` table matching `canonical-schemas.ts` shape. Add Supabase Storage integration for `storage_key`.
3. **Phase 3 — Ingest migration**: Write a backfill script that reads inline `image_url` / `logo_url` / `banner_url` columns, uploads to Supabase Storage, and inserts rows into `media_assets`.
4. **Phase 4 — FK migration**: Replace inline URL columns with `media_id UUID REFERENCES media_assets(id)`. Update entity types.
5. **Phase 5 — CDN**: Configure Supabase Storage transformations for thumbnails, replacing the current `thumbnailUrl: null` placeholder.

#### Risk
- Medium blast radius. Most entities only have 1-2 media fields. The main complexity is the storage migration (downloading existing URLs, re-uploading to Storage).

---

## File Inventory

### Files Modified
| File | Changes |
|------|---------|
| `src/lib/taxonomy/canonical-registry.ts` | Renamed `CANONICAL_VERTICALS` → `REGISTRY_VERTICALS`; imports `SUBCATEGORY_ALIASES` for unified alias resolution |
| `src/domains/shared/canonical-types.ts` | Split into `PRIMARY_VERTICALS` + `LEGACY_VERTICAL_DISCRIMINANTS` + `CANONICAL_VERTICALS`; added `normalizeVertical()`, `isPrimaryVertical()`, `LEGACY_VERTICAL_MAP` |
| `src/lib/taxonomy/world-class-taxonomy.ts` | Exported `CATEGORY_KEY_TO_VERTICAL` and `VERTICAL_TO_RADAR` as public; fixed `beauty` mapping |
| `src/lib/taxonomy/world-taxonomy-data.ts` | Removed duplicate mapping functions, imports canonical constants |
| `src/lib/import-engine/taxonomy/taxonomy-mapper.ts` | Replaced inline CATEGORY_ALIASES with canonical import + overrides |
| `src/pages/food/FoodTypePage.tsx` | Derives CUISINES from CATEGORY_TREE |
| `src/components/landing/CategoryBanners.tsx` | References CATEGORY_TREE for vertical data |
| `src/lib/schema/canonical-schemas.ts` | Renamed 12 conflicting DB-layer types to `Db` prefix (DbMessage, DbAddress, DbMedia, DbPresence, DbLedgerEntry, DbWalletAccount, DbListing, DbNotification, DbSupportTicket, DbMenuItem, DbRoomType, DbServicePackage) |
| `src/repositories/communication.repository.ts` | Migrated `conversations_v2` → `domainDb.orbit.from("conversations_v2")` |
| `src/repositories/wallet-repository.ts` | Created column adapter layer for `wallet_balances_v2` → `wallet.wallet_accounts` |
| `src/lib/wallet/wallet-balance-fetcher.ts` | Migrated to use wallet-repository adapter |
| `src/lib/wallet/wallet-integrity-validator.ts` | Migrated to use wallet-repository adapter + `domainDb.wallet` |
| `src/lib/wallet/wallet-realtime-bridge.ts` | Removed legacy `wallet_balances_v2` fallback subscription |
| `src/services/wallet.service.ts` | Migrated to `domainDb.wallet` + wallet-repository adapter |
| `src/components/delivery/DriverWalletPanel.tsx` | Migrated to wallet-repository adapter functions |
| `src/payments/wallet-hooks.ts` | Realtime subscription migrated to `wallet.wallet_accounts` |

### Files Created
| File | Purpose |
|------|---------|
| `src/lib/schema/canonical-mappers.ts` | DB↔domain mapper functions for dual-defined entities |

### Files Not Changed (By Design)
| File | Reason |
|------|--------|
| `src/lib/taxonomy/taxonomy-aliases.ts` | Already canonical — other files now import from it |
| `src/lib/taxonomy/category-tree.ts` | Source of truth — no changes needed |
| `src/lib/schema/domain-schemas.ts` | LEGACY_TABLE_REDIRECTS — correct as-is |
| `src/services/db.ts` | Runtime guard — correct as-is |

---

## Remaining Work (Future Sprints)

| Item | Priority | Effort | Dependency |
|------|----------|--------|------------|
| Create column adapter for `storefront_pages` → `identity.organizations` | **P1** | 2-3 days | None |
| Create column adapter for `marketplace_services` → `marketplace.listings` | **P1** | 2-3 days | None |
| Migrate `conversations_v2` schema prefix in edge functions | **P1** | 1-2 days | None |
| Migrate remaining legacy `.from()` calls in client code | **P2** | 3-4 days | Column adapters |
| Create `public.addresses` table + FK migration | **P2** | 1 week | Schema design review |
| Create `public.media_assets` table + storage migration | **P3** | 1-2 weeks | Storage bucket setup |
| Remove legacy discriminants from `CANONICAL_VERTICALS` | **P3** | 1 day | Verify no consumers use them |
