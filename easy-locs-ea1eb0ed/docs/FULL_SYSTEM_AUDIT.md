# Full System State Audit — 2026-04-10

## Executive Summary
Comprehensive scan of the entire Easy-Locs super-app across 7 dimensions. 
**31 issues found**: 6 critical, 9 high, 16 medium.

---

## CATEGORY 1: DUPLICATED UI ELEMENTS

### 1.1 — Radar: Duplicate RadarSmartSearch rendering
- **Issue**: `RadarSmartSearch` is rendered TWICE in the same page (line 615 for list view, line 674 for map view). Both instances manage independent search state.
- **Root cause**: Each view mode branch renders its own copy instead of hoisting it above the conditional.
- **Affected files**: `src/pages/HyperRadarPage.tsx` (lines 615, 674)
- **Severity**: HIGH

### 1.2 — Radar vs Map: Two competing "smart search" bars
- **Issue**: `RadarSmartSearch` (for Radar) and `SmartSearchBar` (for SuperMap) are two distinct components with overlapping functionality for map-based search.
- **Root cause**: Parallel development of map search features without unification.
- **Affected files**: `src/components/radar/RadarSmartSearch.tsx`, `src/components/map/SmartSearchBar.tsx`
- **Severity**: MEDIUM

### 1.3 — HomeRouter / MarketplaceHomeRouter duplication
- **Issue**: `HomeRouter` (route `/`) and `MarketplaceHomeRouter` (route `/home`) are functionally identical — same auth check, same redirect logic, same component rendering.
- **Root cause**: Copy-paste during route setup.
- **Affected files**: `src/components/app/AppRouters.tsx` (lines 62-81)
- **Severity**: MEDIUM

---

## CATEGORY 2: STATE CONFLICTS & UNINITIALIZED VARIABLES

### 2.1 — MeCommandCenter: `activeShop!` non-null assertion crash
- **Issue**: `activeShop!.id` (line 198) uses a non-null assertion. If user has no shops (personal account), `activeShop` is undefined → runtime crash.
- **Root cause**: Missing null guard before merchant dashboard fetch.
- **Affected files**: `src/pages/MeCommandCenter.tsx` (line 198)
- **Severity**: CRITICAL

### 2.2 — MeCommandCenter: `user?.id` yields "EL-UNDEFINED" in UI
- **Issue**: `uid` defaults to `""` for logged-out users, but ID generation at line 489 uses `user?.id` directly without fallback, producing "EL-UNDEFINED" strings visible in the UI.
- **Root cause**: Inconsistent null handling between `uid` and `user?.id`.
- **Affected files**: `src/pages/MeCommandCenter.tsx` (lines 94, 489)
- **Severity**: HIGH

### 2.3 — HyperRadarPage: Triple filter initialization on mount
- **Issue**: `filterValues` is initialized from `activeVertical`, but `activeVertical` is a memo derived from `activeLayers` which gets set in a second useEffect from URL params, triggering a third useEffect to reset `filterValues`. Causes 3 redundant renders on mount.
- **Root cause**: Cascading state initialization across multiple useEffects.
- **Affected files**: `src/pages/HyperRadarPage.tsx`
- **Severity**: MEDIUM

### 2.4 — HyperRadarPage: Missing `viewMode` in tracking useEffect deps
- **Issue**: Session reset/tracking effect (lines 163-166) references `viewMode` but has `[]` deps — only fires on mount, never re-tracks on view mode change.
- **Root cause**: Incomplete dependency array.
- **Affected files**: `src/pages/HyperRadarPage.tsx` (lines 163-166)
- **Severity**: MEDIUM

### 2.5 — HyperRadarPage: Map center null risk
- **Issue**: `userLat={mapCenter?.lat ?? location?.lat}` — if both are null (before geo permission), UnifiedMap receives `undefined` for lat/lng, which may crash the map renderer.
- **Root cause**: No default/fallback coordinates.
- **Affected files**: `src/pages/HyperRadarPage.tsx` (line 504)
- **Severity**: HIGH

### 2.6 — CommunicationCenter: Store vs Ref state tearing
- **Issue**: Thread selection uses both `useThreadSelectionStore` (Zustand) and a local `selectedThreadIdRef`. During rapid navigation or socket updates, the Ref and Store can diverge.
- **Root cause**: Dual state management for the same concern.
- **Affected files**: `src/pages/CommunicationCenter.tsx`
- **Severity**: HIGH

### 2.7 — CommunicationCenter: Route conversation ID race
- **Issue**: useEffect handling `routeConversationId` depends on `loading` and `threads`. If threads update via websocket while a specific route is active, thread selection may jump unexpectedly.
- **Root cause**: Missing stabilization logic for route-driven selection.
- **Affected files**: `src/pages/CommunicationCenter.tsx` (lines 121-131)
- **Severity**: MEDIUM

---

## CATEGORY 3: SUPABASE SERVICE-LAYER VIOLATIONS

### 3.1 — Direct data queries in pages (3 pages)
- **Issue**: Pages bypassing the `db()` service layer for data queries.
- **Root cause**: Feature development without service-layer discipline.
- **Affected files**:
  - `src/pages/AIOpsChatPage.tsx` — `.from()` data query
  - `src/pages/AdminLiveOpsPage.tsx` — `.from()` data query
  - `src/pages/MerchantPosPage.tsx` — `.from()` data query
- **Severity**: HIGH

### 3.2 — Direct data queries in components (8 components)
- **Issue**: Components bypassing the `db()` service layer.
- **Root cause**: Same as above.
- **Affected files**:
  - `src/components/pos/KitchenQueue.tsx` — data query + realtime
  - `src/components/storefront/OrdersManager.tsx` — data query
  - `src/components/storefront/AuctionManager.tsx` — data query
  - `src/components/storefront/BuyerOrderTracker.tsx` — data query
  - `src/components/delivery/BuyerDeliveryDashboard.tsx` — data query
  - `src/components/delivery/FleetManagementDashboard.tsx` — data query
  - `src/components/delivery/LiveDeliveryChat.tsx` — data query + realtime
  - `src/components/merchant/MerchantPaymentHistory.tsx` — data query
  - `src/components/merchant/MerchantKitchenQueue.tsx` — data query
  - `src/components/concierge/ServiceBookingCalendar.tsx` — data query
- **Severity**: HIGH

### 3.3 — Direct data queries in hooks (9 hooks)
- **Issue**: Hooks bypassing the `db()` service layer.
- **Affected files**:
  - `src/hooks/useServiceTracking.ts` — data query + realtime
  - `src/hooks/useFinancialRecon.ts` — data query
  - `src/hooks/useRadarLiveContext.ts` — data query
  - `src/hooks/useAutoEngineCron.ts` — data query
  - `src/hooks/useAppHealthCheck.ts` — data query
  - `src/hooks/deals/useDealRoomData.ts` — data query
  - `src/hooks/useGeoDrivers.ts` — data query
  - `src/hooks/order/useOrderFetcher.ts` — data query
  - `src/hooks/useDriverMissions.ts` — data query
  - `src/hooks/useCanonicalAddress.ts` — data query
  - `src/hooks/call/useOutgoingCall.ts` — data query
- **Severity**: HIGH

### 3.4 — Realtime-only usage in hooks (exempt but noted)
- **Issue**: These hooks use `supabase.channel()` only — realtime subscriptions, not data queries. Architecturally exempt but noted for awareness.
- **Affected files**: `useStorefrontRealtime.ts`, `useListingSync.ts`, `useMeRealtimeSync.ts`, `useWalletRealtime.ts`, `useDeliveryNotifications.ts`, `RealtimeMessageToast.tsx`
- **Severity**: INFO (exempt)

---

## CATEGORY 4: ROUTING INCONSISTENCIES

### 4.1 — Dunning route mismatch
- **Issue**: `App.tsx` defines `/dashboard/dunning-letters` but notification routing (`TARGET_ROUTES`) points to `/dashboard/dunning`. Notifications will 404.
- **Root cause**: Route path mismatch between definition and notification system.
- **Affected files**: `src/App.tsx` (line 358), `src/lib/shared/routes.ts` (line 16)
- **Severity**: CRITICAL

### 4.2 — `/wallet/accounts` → `/settings/wallet` cross-pillar redirect
- **Issue**: Wallet tab stays highlighted while user lands in Me/Settings section. Bottom nav shows wrong active tab.
- **Root cause**: Redirect crosses pillar boundaries without updating nav context.
- **Affected files**: `src/App.tsx` (line 529), `src/config/navigation.ts`
- **Severity**: MEDIUM

### 4.3 — Duplicate Stay routes
- **Issue**: `/stay`, `/stays` (redirect), and `/travel/stays` all render `TravelStays`. Fragmented navigation state.
- **Root cause**: Incremental route additions without consolidation.
- **Affected files**: `src/App.tsx` (lines 443, 483, 484)
- **Severity**: MEDIUM

### 4.4 — Duplicate communication redirects
- **Issue**: Both `/dashboard/communication` and `/dashboard/messages` redirect to `/orbit`. Redundant route entries.
- **Root cause**: Legacy route cleanup missed.
- **Affected files**: `src/App.tsx` (lines 255, 349)
- **Severity**: LOW (cosmetic)

### 4.5 — Property route confusion
- **Issue**: `/property` renders `PropertyHubPage`, `/property-hub` renders `PropertyManagementHub`. `EXPLORE_CATEGORIES` uses `/property-hub` for the general category.
- **Root cause**: Two similar routes serving different purposes without clear naming.
- **Affected files**: `src/App.tsx` (lines 433, 440)
- **Severity**: MEDIUM

---

## CATEGORY 5: I18N ISSUES

### 5.1 — UnifiedMap hardcoded English strings
- **Issue**: "Explore nearby" and "Use the list below to discover places around you" are hardcoded in `UnifiedMap.tsx` (lines 656-657), visible on the Radar page.
- **Root cause**: Strings added without i18n wrapping.
- **Affected files**: `src/components/map/UnifiedMap.tsx` (lines 656-657)
- **Severity**: CRITICAL

### 5.2 — Engine files with hardcoded English
- **Issue**: `smart-home-engine.ts`, `hyper-radar-engine.ts`, `behavior-pattern-engine.ts` all contain hardcoded English strings like "Explore nearby" that surface in the UI.
- **Root cause**: Engine output strings not routed through i18n.
- **Affected files**: `src/lib/smart-home-engine.ts` (line 134), `src/lib/engines/hyper-radar-engine.ts` (line 175), `src/lib/engines/behavior-pattern-engine.ts` (line 237)
- **Severity**: HIGH

### 5.3 — Delivery module: fully hardcoded French
- **Issue**: Entire delivery component directory uses hardcoded French strings — "Calculateur de prime", "Valeur déclarée", "Gestion de Flotte", "API & Webhooks", etc. No `t()` usage.
- **Root cause**: Module developed without i18n integration.
- **Affected files**: `src/components/delivery/DeliveryInsuranceClaims.tsx`, `FleetManagementSystem.tsx`, `DeliveryAPIWebhooks.tsx`, `DeliverySchedulingCalendar.tsx`, `CreateJobForm.tsx`, `BatchDispatchPanel.tsx`
- **Severity**: MEDIUM (admin-facing)

### 5.4 — Admin module: hardcoded strings
- **Issue**: Admin panels (`ModerationPanel.tsx`, `HealthDashboard.tsx`, `OrgMemberManager.tsx`) use hardcoded English/French without i18n.
- **Root cause**: Admin features treated as internal-only.
- **Affected files**: `src/components/admin/*`
- **Severity**: MEDIUM (admin-facing)

### 5.5 — MePropertyHub: imports useI18n but uses hardcoded French
- **Issue**: Component imports the i18n hook but still uses hardcoded French headers like "Gestion Immo" and "locataires".
- **Root cause**: Incomplete migration to i18n.
- **Affected files**: `src/pages/me/MePropertyHub.tsx` (lines 87-88)
- **Severity**: MEDIUM

---

## CATEGORY 6: CARD RENDERING & LAYOUT ISSUES

### 6.1 — Radar: Weather widget overlaps first category chip
- **Issue**: The weather widget (`absolute left-3 top-[130px]`) overlaps the first category chip in the horizontal scroll. Visible in screenshot.
- **Root cause**: Both positioned absolutely in the map overlay without collision avoidance.
- **Affected files**: `src/pages/HyperRadarPage.tsx` (WeatherWidget, line 983)
- **Severity**: CRITICAL

### 6.2 — OrbitSmartHub: Hardcoded 340px width
- **Issue**: `SIZE = 340` hardcoded. Will be clipped on screens narrower than 340px (iPhone SE = 320px).
- **Root cause**: Fixed pixel sizing without responsive fallback.
- **Affected files**: `src/components/dashboard/OrbitSmartHub.tsx` (line 44)
- **Severity**: HIGH

### 6.3 — MeQuickActions: 6-column grid too dense for mobile
- **Issue**: `grid-cols-6` with `gap-1.5` leaves ~50px per cell on a 360px screen. Labels truncate to unreadable.
- **Root cause**: Too many columns for mobile viewport.
- **Affected files**: `src/components/me/MeQuickActions.tsx` (line 35)
- **Severity**: MEDIUM

### 6.4 — RadarFoodCard: Missing overflow-hidden
- **Issue**: Main container lacks `overflow-hidden`. Long titles or mismatched images can break rounded corners or bleed outside the card boundary.
- **Root cause**: Missing CSS containment.
- **Affected files**: `src/components/radar/cards/RadarFoodCard.tsx` (line 26)
- **Severity**: MEDIUM

### 6.5 — EssentialServicesStrip: No line-clamp on labels
- **Issue**: Labels use `break-words hyphens-auto` but no `line-clamp`. Long words in German/Arabic can push card height inconsistently, breaking horizontal alignment.
- **Root cause**: Missing text containment for i18n-variable text length.
- **Affected files**: `src/components/dashboard/EssentialServicesStrip.tsx` (line 62)
- **Severity**: MEDIUM

### 6.6 — SuperServicesGrid: 4-column grid too tight on small screens
- **Issue**: `grid-cols-4 gap-2` on 320px screens = ~70px per cell. Icons + 2-line text collide at larger system font sizes.
- **Root cause**: No responsive column adjustment.
- **Affected files**: `src/components/dashboard/SuperServicesGrid.tsx` (line 77)
- **Severity**: MEDIUM

### 6.7 — MerchantCard: No min-height on text container
- **Issue**: Vertical variant uses `aspect-[16/10]` for image but text container has no `min-height`. Cards in grid have inconsistent heights when merchant names differ in length.
- **Root cause**: Missing height normalization in grid context.
- **Affected files**: `src/components/marketplace/MerchantCard.tsx` (line 81)
- **Severity**: MEDIUM

---

## CATEGORY 7: CONDITIONAL RENDERING & BINDING ISSUES

### 7.1 — CommunicationCenter: `orgId` blocks HudContextPanel
- **Issue**: If `orgId` is undefined during initial load, the context panel never shows even when a thread is selected.
- **Root cause**: Conditional check on `orgId` that should be optional or deferred.
- **Affected files**: `src/pages/CommunicationCenter.tsx` (line 396)
- **Severity**: CRITICAL

### 7.2 — HyperRadarPage: `search_completed` event fires excessively
- **Issue**: useEffect tracking `search_completed` depends on `radarItems.length`, which changes frequently during filtering. Fires analytics events on every list update.
- **Root cause**: Analytics event bound to rapidly-changing derived state.
- **Affected files**: `src/pages/HyperRadarPage.tsx` (lines 305-312)
- **Severity**: MEDIUM

---

## SEVERITY SUMMARY

| Severity | Count | Issues |
|----------|-------|--------|
| CRITICAL | 6     | 2.1, 4.1, 5.1, 6.1, 7.1, 2.5 |
| HIGH     | 9     | 1.1, 2.2, 2.6, 3.1, 3.2, 3.3, 5.2, 6.2, 2.5 |
| MEDIUM   | 16    | 1.2, 1.3, 2.3, 2.4, 2.7, 3.4, 4.2, 4.3, 4.5, 5.3, 5.4, 5.5, 6.3, 6.4, 6.5, 6.6, 6.7, 7.2 |

## RECOMMENDED FIX ORDER
1. **CRITICAL first**: 2.1 (Me crash), 7.1 (Orbit panel), 6.1 (Radar overlap), 5.1 (i18n leak), 4.1 (dunning 404), 2.5 (map null crash)
2. **HIGH next**: State conflicts (2.2, 2.6), service-layer violations (3.1-3.3), search duplication (1.1), engine i18n (5.2), OrbitSmartHub sizing (6.2)
3. **MEDIUM last**: Layout polish, route cleanup, admin/delivery i18n, redundant routers
