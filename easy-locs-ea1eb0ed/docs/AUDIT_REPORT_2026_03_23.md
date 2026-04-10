# Platform Stabilization Audit Report
## Date: 2026-03-23

---

## 1. ENTITIES SYSTEM

| Aspect | Status | Detail |
|--------|--------|--------|
| Master entities table | ✅ CLEAN | UUID entity_id, 4 canonical layers, parent_entity_id for multi-location |
| Entity adapter | ✅ CLEAN | Identity/Geo/Taxonomy/Capability separation, toRankable() bridge |
| Slug resolution | ✅ CLEAN | fetchEntityBySlug() works, entityUrl() helper created |
| ID stability | ✅ CLEAN | entity_id is UUID, never derived from taxonomy/geo |
| Source linking | ✅ CLEAN | storefront_page_id + seed_merchant_id for backward compat |
| **Risk** | ⚠️ LOW | entities table not yet consumed by main discovery flow (still uses fetchUnifiedPoints → storefront_pages + seed_merchants). Migration is planned but not yet active. |

## 2. TAXONOMY SYSTEM

| Aspect | Status | Detail |
|--------|--------|--------|
| Canonical taxonomy | ✅ CLEAN | 8 verticals, 100+ subcategories in world-class-taxonomy.ts |
| Normalization | ✅ CLEAN | normalizeVertical/normalizeSubcategory in canonical.ts |
| Hierarchy scoring | ✅ CLEAN | hierarchyMatchScore() returns 0-3 (exact_sub/cluster/vertical) |
| Coverage | ✅ CLEAN | Food(32), Grocery(17), Shops(16), Services(32), Property(8), Healthcare, Mobility, Experiences |
| Fallback logic | ✅ CLEAN | Unknown subcategories default to vertical match only |

## 3. QR SYSTEM

| Aspect | Status | Detail |
|--------|--------|--------|
| Single engine | ✅ CLEAN | All 15 files import from @/lib/qr-engine exclusively |
| Legacy processScannedValue | ✅ CLEAN | Zero imports — fully dead |
| Deprecated qr-pay.tsx | ✅ CLEANED | **Deleted this audit** — had zero imports |
| Payload format | ✅ CLEAN | UniversalQrPayload v1 standardized |
| Action routing | ✅ CLEAN | resolveRoute() handles all QR types |
| Payment QR | ✅ CLEAN | encodeQr/decodeQr with expiration support |

## 4. WALLET / PAYMENT SYSTEM

| Aspect | Status | Detail |
|--------|--------|--------|
| Source of truth | ✅ CLEAN | wallet_balances_v2 for balance, wallet_accounts for identity |
| Target resolution | ✅ CLEAN | resolvePayTarget with wallet status check |
| Self-pay prevention | ✅ CLEAN | Blocked in resolvePayTarget |
| Locked wallet prevention | ✅ CLEAN | wallet_status check (active/locked/missing) |
| Transfer flow | ✅ CLEAN | wallet_transfer RPC, single path |
| wallet-engine.ts | ✅ CLEAN | Settlement-only (authorize/capture/split), no overlap with hooks |

## 5. ORBIT COMMUNICATION

| Aspect | Status | Detail |
|--------|--------|--------|
| Data tables | ✅ CLEAN | conversations_v2, chat_messages_v2, orbit_profiles_v2 |
| Contact resolution | ✅ CLEAN | profiles table with open RLS for peer discovery |
| Call routing | ✅ CLEAN | resolveReceiverUserId with org fallback chain |
| Call signaling | ✅ CLEAN | call_logs realtime with REPLICA IDENTITY FULL |
| **No duplicates** | ✅ | No v1 tables in active use |

## 6. MAP / RADAR / GEO

| Aspect | Status | Detail |
|--------|--------|--------|
| Unified pipeline | ✅ CLEAN | fetchUnifiedPoints → storefront_pages + seed_merchants |
| Radar store | ✅ CLEAN | Single sortRadarPoints in radarStore.refreshFiltered |
| Map navigation | ✅ FIXED | /s/{slug} everywhere (was /shop/{id} — fixed this audit) |
| Geolocation | ✅ CLEAN | geo-store.ts → locationStore via GeoBoot |
| **DUPLICATE: haversine** | ⚠️ RISK | **7+ copies** across geo.ts, mapEngine.ts, DiscoverPage.tsx, CommNearbySection.tsx, RouteOptimizationEngine.tsx, GeofencingPanel.tsx, OrderBundlingEngine.tsx, useLiveTracking.ts. Should consolidate. |
| **LEGACY: mapEngine.ts** | ⚠️ RISK | Still queries `marketplace_listings` directly. Used by AdminMapEnginePage only. |
| **LEGACY: marketplace_listings** | ⚠️ RISK | Still queried by 8 files: RestaurantPage, FavoritesPage, OrbitHome, CheckoutPage, searchEngine, homeEngine, homeLiveDataConnector, smartRecommendations. Should progressively migrate to storefront_pages or entities. |
| Story/heatmap layers | ✅ SAFE | Created as optional modules with feature flags, no runtime coupling |

## 7. RANKING / DISCOVERY

| Aspect | Status | Detail |
|--------|--------|--------|
| Active ranking: sortRadarPoints | ✅ CLEAN | Single consumer (radarStore) |
| Unified ranking-engine.ts | ✅ CLEAN | Ready, backward-compat wrappers, used by SponsoredBanner |
| Dead score-engine.ts | ✅ CLEANED | Deleted previous audit |
| Hierarchy-aware ranking | ✅ CLEAN | smartScore includes hierarchy, profile, time signals |
| **No conflicting logic** | ✅ | Only 1 active ranking path for discovery |

## 8. ROUTING / NAVIGATION

| Aspect | Status | Detail |
|--------|--------|--------|
| Public entity routes | ✅ FIXED | All main flows now use /s/{slug} (11 files fixed across 2 audits) |
| SEO canonical URLs | ✅ FIXED | seo-engine.ts updated to /s/{slug} |
| Context resolver | ✅ FIXED | QR shop → /s/{id} |
| Deep links | ✅ CLEAN | Direct routing policy enforced |
| **REMAINING /shop/ routes** | ⚠️ LOW | ShopCategoryPage.tsx, ServiceCitySEOPage.tsx, MarketplaceCityPage.tsx, ProviderStorefront.tsx still use /shop/ for **SEO category pages** (e.g., /shop/pizza-dubai). These are category browse routes, NOT entity routes — acceptable pattern for now. |

---

## FILES MODIFIED THIS AUDIT

| Action | File |
|--------|------|
| Fixed /shop/ → /s/ | `src/pages/radar/RadarPage.tsx` |
| Fixed /shop/ → /s/ | `src/lib/context/contextResolver.ts` |
| Fixed /shop/ → /s/ | `src/components/seller/SellerDashboard.tsx` |
| Fixed /shop/ → /s/ | `src/lib/seo/seo-engine.ts` (canonical URLs) |
| Deleted dead code | `src/payments/qr-pay.tsx` (0 imports, deprecated) |

---

## ITEMS STILL NEEDING CLEANUP (prioritized)

### HIGH — Should fix next
1. **Consolidate haversine** — 7+ duplicate implementations. Create `src/lib/geo/haversine.ts` single export.
2. **marketplace_listings migration** — 8 files still query this legacy table. Should progressively point to storefront_pages or entities.

### MEDIUM — Plan for upcoming sprints
3. **mapEngine.ts** — Still uses marketplace_listings. Low traffic (admin-only), but should align.
4. **DiscoverPage local haversine** — Has own inline copy. Should import from geo lib.

### LOW — Acceptable for now
5. **/shop/ in SEO category pages** — These are category browse routes, not entity routes. Different semantic.
6. **GeoEntity type** — Used by 4 files (RadarView, GlobalRadarPage, UnifiedMap, useRadarResults). Eventually should align with PlatformEntity.

---

## FINAL STABILITY ASSESSMENT

| Metric | Result |
|--------|--------|
| Build errors | **0** |
| Duplicate ranking engines active | **0** (1 active: sortRadarPoints, 1 staged: ranking-engine.ts) |
| Legacy paths driving runtime | **marketplace_listings in 8 files** (not critical but should migrate) |
| Broken navigation paths | **0** |
| Weak entity resolution | **0** (all use slug-first) |
| QR/payment inconsistency | **0** |
| Map/radar inconsistency | **0** |
| Orbit routing inconsistency | **0** |

**Overall: STABLE with 2 known debt items (haversine consolidation + marketplace_listings migration)**

---

## WORLD-READINESS GAP ANALYSIS

### Already Covered ✅
| Layer | Field | Status |
|-------|-------|--------|
| Identity | entity_id, slug, entity_type, owner_user_id, status | ✅ |
| Identity | parent_entity_id (multi-location) | ✅ |
| Geography | country_code, city_code, district_code, area, lat/lng, coverage_type | ✅ |
| Taxonomy | vertical, cluster, subcategory, tags, service_modes | ✅ |
| Contact | phone, whatsapp, email, website | ✅ |
| Commerce | boost_tier, boost_until, partner_network_id | ✅ |
| Capabilities | wallet, qr, chat, booking, delivery, subscription | ✅ |

### Missing — Need to Add ⚠️
| Layer | Field | Priority | Notes |
|-------|-------|----------|-------|
| Geography | country_name | MEDIUM | Can derive from country_code via lookup |
| Geography | region_code / region_name | LOW | Useful for analytics, not blocking |
| Geography | city_name (display) | MEDIUM | Currently city is used for both code and display |
| Geography | district_name (display) | LOW | Currently area fills this role |
| Localization | default_language | HIGH | Needed for global rollout |
| Localization | supported_languages | MEDIUM | For multi-language storefronts |
| Localization | locale | HIGH | Currency/date formatting |
| Localization | rtl_support | MEDIUM | For Arabic/Hebrew markets |
| Contact | social_links (JSON) | LOW | Instagram, TikTok, etc. |
| Contact | opening_hours (JSON) | HIGH | Business hours, used by time relevance |
| Contact | timezone | HIGH | Required for opening hours logic |
| Commerce | currency | HIGH | Entity default currency |
| Commerce | payment_methods | MEDIUM | Accepted payment types |
| Commerce | commercial_scope | LOW | Already on offer types |
| Capabilities | cap_call | LOW | Missing from current 6 booleans |
| Taxonomy | time_relevance | LOW | Already computed dynamically |

### Recommended Next Migration (safe, additive)
Add to entities table:
- `default_language text DEFAULT 'en'`
- `timezone text DEFAULT 'Asia/Dubai'`
- `currency text DEFAULT 'AED'`
- `opening_hours jsonb`
- `social_links jsonb`
- `cap_call boolean DEFAULT false`

These are all nullable/defaulted columns — zero risk to existing data.
