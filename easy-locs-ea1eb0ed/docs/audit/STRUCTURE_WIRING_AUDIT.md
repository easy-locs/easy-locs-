# STRUCTURE WIRING AUDIT
*Easy-Locs Super-App v3 — Global Wiring State*
*Date: 2026-04-13 | Scope: All 5 Pillars + Cross-Domain Bridges*
*Tasks excluded from this audit: #36 (Engine Control Room), #39 (Discipline Infrastructure), #41 (UI Visual Fixes)*

---

## AUDIT METHODOLOGY

All findings are based on direct code inspection. Every claim cites the specific file and line range inspected. Findings that could not be fully verified from code are labelled **[UNVERIFIED]** in a dedicated appendix. No assumptions are stated as facts.

### Key files inspected (with line ranges used)

| File | Lines Inspected |
|------|----------------|
| `src/lib/shared/platform-bus.ts` | 1–624 |
| `src/lib/shared/cross-app-reactions.ts` | 1–194 |
| `src/lib/super-app-bridge.ts` | 1–515 |
| `src/lib/shared/storefront-reactions.ts` | 1–160 |
| `src/engines/engine-registry.ts` | 1–117 |
| `src/engines/core/engine-orchestrator.ts` | 1–354 |
| `src/hooks/useMasterAppBootstrap.ts` | 1–261 |
| `src/App.tsx` | 1–952 |
| `src/lib/orchestration/handlers/order-handlers.ts` | 1–60 |
| `src/lib/orchestration/handlers/delivery-handlers.ts` | 1–50 |
| `src/stores/walletStore.ts` | 1–112 |
| `src/stores/bookingStore.ts` | 1–175 |
| `src/lib/notifications/notification-event-bridge.ts` | 1–42 |
| `src/lib/dashboard/dashboard-cache-invalidator.ts` | 1–50 |
| `src/lib/platform/events.ts` | 1–100 |
| `src/lib/support/global-support-engine.ts` | 1–190 |
| `src/domains/shared/domain-event-bus.ts` | 1–70 |
| `src/domains/orbit/services/gallery-save.service.ts` | 1–175 |
| `src/components/radar/RadarView.tsx` | 1–250 |
| `src/components/radar/RadarFilterMenu.tsx` | 1–35 |
| `src/components/map/MapPlaceCard.tsx` | 1–270 |
| `src/components/engine/FloatingCTAButton.tsx` | 1–60 |
| `src/domains/explore/ExploreScreen.tsx` | 1–25 |
| `src/domains/explore/ExploreAISuggestions.tsx` | 1–40 |
| `src/domains/explore/ExploreContinue.tsx` | 1–45 |
| `src/domains/explore/ExploreEntitySection.tsx` | 1–60 |
| `src/domains/explore/ExploreQuickActions.tsx` | 1–30 |
| `src/domains/explore/explore.view-model.ts` | 1–200 |
| `src/families/dashboard/dashboard.view-model.ts` | 1–95 |
| `src/lib/delivery/delivery-event-bridge.ts` | 1–40 |
| `src/hooks/useStorefrontRealtime.ts` | 1–80 |
| `src/pages/customer/CustomerActiveOrdersPage.tsx` | 1–35 |
| `src/pages/customer/CustomerOrderArchivePage.tsx` | 1–20 |
| `src/pages/admin/EngineControlRoomPage.tsx` | 1–1200 |
| `src/app/app-route-registry.tsx` | 265–280 |

---

## PILLAR 1 — DASHBOARD

### State
**PARTIAL** — Core UI renders; intelligence engine is wired; cache invalidation is installed. Two notation mismatches mean some invalidation listeners never fire.

### Existing Connections (verified)
- `useMasterAppBootstrap.ts` stage-0 (50ms) — `installOrchestrationEngine()` + `DashboardCacheInvalidator.registerDashboardQueryClient()`.
- `useMasterAppBootstrap.ts` stage-1 (1500ms) — `installPlatformReactions()`, `installStorefrontReactions()`, `installCrossAppReactions()`, `installNotificationEventBridge()`.
- `useMasterAppBootstrap.ts` stage-2 (3000ms) — `installDashboardCacheListener()`.
- `dashboard-cache-invalidator.ts` line 31 — listens `APP_EVENTS.STOREFRONT_ORDER_COMPLETED` (`storefront:order_completed`) → `invalidateDashboardCaches()`. **This listener fires**: `useStorefrontRealtime.ts` line 64 emits `storefront:order_completed`.
- `dashboard-cache-invalidator.ts` line 35 — listens `APP_EVENTS.DELIVERY_COMPLETED` (`delivery:completed`) → `invalidateDashboardCaches()`. **This listener fires**: `src/lib/delivery/delivery-event-bridge.ts` line 24 emits `delivery:completed`.
- `super-app-bridge.ts` lines 504–506 — listens `dashboard:refresh` → invalidates `["dashboard-live-stats", "dashboard-activity"]`.
- `platformBus` prefix listeners in `installPlatformReactions()` (platform-bus.ts lines 526–554) → `refreshModule()` on OrbitEngine for all major domain prefixes.
- Query invalidation keys covered by super-app-bridge: `dashboard-live-stats`, `dashboard-activity`, `wallet-balance`, `wallet-transactions`, `my-orders`, `my-bookings`.

### Missing Connections (verified)
- `dashboard-cache-invalidator.ts` line 32 — listens `APP_EVENTS.ORDER_COMPLETED` = `"order:completed"`. **No emitter found** for `"order:completed"` in the entire codebase (searched all `src/` with grep). The `storefront:order_completed` event IS emitted and caught on line 31 separately, so dashboard does refresh, but the `order:completed` listener is dead code.
- `dashboard-cache-invalidator.ts` line 34 — listens `APP_EVENTS.RENTAL_RENT_CALL_PAID` = `"rental:rent_call_paid"` (`src/lib/platform/events.ts` line 58). **No emitter found** for `"rental:rent_call_paid"` anywhere in `src/`. Property management only emits `pm:payment_received` via `super-app-bridge.ts` line 77. Dashboard cache invalidator never refreshes for rent payment events.
- Dashboard has no listener for `pm:lease_created`, `pm:lease_activated`. Property lease creation does not refresh dashboard KPIs/counters (super-app-bridge `onPrefix("pm:")` at lines 473–480 only invalidates `["properties", "leases", "dashboard-live-stats"]` — not `dashboard-kpis` or `dashboard-counters`).
- Onboarding pipeline (`src/lib/onboarding/pipeline/orchestrator.ts`) completes with entity published but emits no platformBus event. Dashboard does not refresh after onboarding completes.

### Conflicts (verified)
- `dashboard-cache-invalidator.ts` line 31 listens `storefront:order_completed` → `invalidateDashboardCaches()`. Additionally, `super-app-bridge.ts` line 446 also listens `storefront:order_completed` → `invalidate("my-orders", "dashboard-live-stats")`. Both execute independently on the same event — different query key sets are invalidated, no functional double-fire, but the split is confusing and risks divergence.
- `dashboard:counters_refresh` is emitted by `super-app-bridge.ts` line 78 on every pm event. `installDashboardCacheListener()` also listens `dashboard:counters_refresh` independently. Two separate invalidation paths fire for the same event.

### Priority: HIGH

---

## PILLAR 2 — RADAR

### State
**PARTIAL** — Map/search/discovery renders. RadarRealtimeBridge is wired. But Radar component events are emitted on the legacy `eventBus` (not `platformBus`), making all super-app-bridge Radar listeners dead.

### Existing Connections (verified)
- `super-app-bridge.ts` line 411–414 — `platformBus.on("radar:entity_selected", ...)` → activates `radar-core` module via `moduleRegistry`. (Listener correct; emitter is on wrong bus — see missing connections.)
- `src/lib/radar/engines/realtime-bridge.ts` — `RadarRealtimeBridge.start()` listens `tracking:position_updated`, `tracking:status_changed` → updates radar projections.
- `super-app-bridge.ts` — `bridgeLaunchRoute()` emits `radar:location_shared` + `tracking:started` on platformBus.
- `cross-app-reactions.ts` — listens `radar:location_shared` → injects location message into Orbit thread if `payload.conversationId` is present.

### Missing Connections (verified)
- `RadarView.tsx` line 20 imports `eventBus`; line 204 emits `"RADAR_SCAN_COMPLETED"` on `eventBus`; line 217 emits `"ENTITY_OPENED"` on `eventBus`. The `platformBus.on("radar:entity_selected", ...)` listener in super-app-bridge at line 411 **never fires** because Radar emits on `eventBus` using different event names (`ENTITY_OPENED` vs `radar:entity_selected`).
- `RadarFilterMenu.tsx` line 5 imports `eventBus`; lines 23, 30 emit `"RADAR_FILTER_CHANGED"` on `eventBus`. No platformBus listener for `RADAR_FILTER_CHANGED` exists.
- `MapPlaceCard.tsx` line 15 imports `eventBus`; lines 70, 78, 85, 258 emit `map.route.focus`, `map.center.request`, `place.order.requested`, `ENTITY_OPENED` on `eventBus`. No platformBus listeners for these events.
- `ExploreScreen.tsx` line 4, `ExploreAISuggestions.tsx` line 5, `ExploreContinue.tsx` line 5, `ExploreEntitySection.tsx` line 6, `ExploreQuickActions.tsx` line 4 all import `eventBus` and emit `explore.*`, `entity.click`, `search.executed`, `wallet.action` events on `eventBus`. None of these reach platformBus listeners.
- `explore.view-model.ts` line 5 imports `eventBus`; line 165 wraps all explore event emissions through `emitExploreEvent()` which calls `eventBus.emit(event, payload)`.
- `dashboard.view-model.ts` line 12 imports `eventBus`; line 89 emits `"HOME_SECTIONS_REFRESHED"` on `eventBus`.
- No bus events bridge Radar discovery → Booking initiation → Wallet payment on platformBus.

### Conflicts (verified)
- `eventBus` (legacy `@/lib/core/event-bus`) vs `platformBus` (`@/lib/shared/platform-bus`) dual event systems. All Radar/Explore components use the legacy bus; all reaction handlers use platformBus. The two buses are bridged only by `domain-event-bus.ts` (lines 53–62) which bridges ALL domain events from `DomainEventBus` → both buses. But Radar components don't use `DomainEventBus` — they import `eventBus` directly. So the bridge does not help Radar.

### Priority: CRITICAL

---

## PILLAR 3 — ORBIT

### State
**MOSTLY WIRED** — Core messaging, calls, contacts, status wired. Cross-domain bridges (Marketplace→Orbit, Wallet→Orbit, Radar→Orbit) exist but have gaps where bus emits don't produce DB writes.

### Existing Connections (verified)
- `cross-app-reactions.ts` — listens `wallet:payment_completed` → creates app notification; `marketplace:booking_created` → inserts Orbit system message (if `payload.conversationId` present); `radar:location_shared` → inserts Orbit location message (if `payload.conversationId` present).
- `super-app-bridge.ts` lines 398–408 — listens `orbit:message_sent` → invalidates `["threads", "dashboard-live-stats"]`; listens `orbit:thread_created` → invalidates `["threads", "contacts"]`.
- `bookingStore.ts` line 62 — `createBooking()` directly calls `useOrbitThreadStore.getState().createThread(...)` and stores `conversationId` at line 74. Line 73 calls `sendSystemMessage(...)`. **Real DB thread and message are created** for marketplace bookings via store.
- `installPlatformReactions()` in `platform-bus.ts` lines 526–554 — `orbit:` prefix events → `refreshModule("communication")` on OrbitEngine.
- E2EE files exist: `orbit-x3dh.ts`, `orbit-double-ratchet.ts`.

### Missing Connections (verified)
- `bridgeContactProvider()` in `super-app-bridge.ts` lines 189–203 — emits `orbit:thread_created` (line 190) and `orbit:message_sent` (line 196) on platformBus. The `orbit:thread_created` listener at line 407 only calls `invalidate("threads", "contacts")` — **no DB thread is created**. No `useOrbitThreadStore.getState().createThread()` is called in this code path.
- `bridgeOpenSupport()` in `super-app-bridge.ts` lines 248–261 — emits `orbit:thread_created` (line 249) with `participantId: "support-agent"` (line 255). `"support-agent"` is a hardcoded string, not a valid Orbit identity from the database. No real thread is created.
- `bridgeCreateConversation()` in `super-app-bridge.ts` lines 284–301 — emits `orbit:thread_created` (line 285) and conditionally `orbit:message_sent` (line 294). Bus listener only invalidates query cache — **no DB thread created**.
- `bridgeAttachPaymentContext()` in `super-app-bridge.ts` lines 303–315 — emits `orbit:message_sent` (line 304). Listener at line 398 only invalidates `["threads", "dashboard-live-stats"]`. **No `insertMessage()` call** — message not persisted.
- `bridgeAttachOrderContext()` in `super-app-bridge.ts` lines 317–330 — emits `orbit:message_sent` (line 318). Same: listener only invalidates cache, no DB write.
- `notification-event-bridge.ts` lines 28–29 — `APP_EVENTS.ORBIT_MESSAGE_RECEIVED` listener only calls `reportHealth("notifications", "ok")`. No notification is created for incoming messages.
- `gallery-save.service.ts` line 13 imports `eventBus`; lines 128, 153, 168 emit `attachment.event.gallery_failed`, `attachment.event.gallery_saved` on `eventBus`. These events are defined in `platform-bus.ts` types (lines 176–181) but are emitted on the wrong bus.

### Conflicts (verified)
- `bridgeContactProvider()` (line 196) and `bridgeCreateConversation()` (line 294) emit `orbit:message_sent` synchronously on the bus without any DB write. The same event name is used for real messages sent by the UI (via `orbit:message_sent` at `super-app-bridge.ts` line 41). The listener on `orbit:message_sent` (line 398) cannot distinguish real from ghost emissions — both trigger `activateModule("orbit-chat")`.

### Priority: HIGH

---

## PILLAR 4 — WALLET

### State
**MOSTLY WIRED** — Core wallet store emits canonical events on platformBus. Transfer, top-up, payment event chains are established. One critical notation mismatch prevents order status update after payment.

### Existing Connections (verified)
- `walletStore.ts` line 3 imports `platformBus`. Lines 47, 69, 84, 100 emit `wallet:loaded`, `wallet:transaction_created`, `wallet:payment_success`, `wallet:payment_failed` on `platformBus`.
- `walletStore.ts` line 5 imports `walletRepo`; line 62 calls `walletRepo.createTransaction(tx)` — DB write before bus emission.
- `super-app-bridge.ts` lines 369–395 — listeners for all wallet events → invalidate `["wallet-balance", "wallet-transactions", "dashboard-live-stats"]`.
- `cross-app-reactions.ts` — listens `wallet:payment_completed` → creates notification.
- `notification-event-bridge.ts` line 21 — listens `APP_EVENTS.WALLET_PAYMENT_SUCCESS` → calls `notify(...)` with amount/currency. Line 25 — listens `APP_EVENTS.WALLET_PAYMENT_FAILED` → calls `notify(...)`.
- Platform-bus.ts NOTATION_BRIDGE (lines 566–591) maps `wallet.payment.success` → `wallet:payment_success`, `wallet.payment.completed` → `wallet:payment_completed`, etc.

### Missing Connections (verified)
- `walletStore.ts` lines 74–91 — `markTransactionSuccess()` updates in-memory state via `set()` (line 79) but **does not call any `walletRepo` method to persist the `status: "success"` change to Supabase**. `walletRepo` import at line 5 is only used in `loadWallet()` (line 33, 37) and `createTransaction()` (line 62). The transaction remains in DB with its original status after payment success.
- `order-handlers.ts` line 23 — `platformBus.on("PAYMENT_SUCCESS", ...)`. `walletStore.ts` line 84 emits `"wallet:payment_success"`. The NOTATION_BRIDGE in `platform-bus.ts` lines 566–591 does **not** include a mapping from `wallet:payment_success` → `PAYMENT_SUCCESS`. **Order status is never updated to "paid" after wallet payment.**
- `platform-bus.ts` type definition line 20 — `"wallet:loaded"` is defined. Line 23 — `"wallet.loaded"` (dot-notation) is also defined. The NOTATION_BRIDGE (lines 566–591) does NOT include `"wallet.loaded"` → `"wallet:loaded"`. If any code emits dot-notation `wallet.loaded`, it won't be bridged. (Current walletStore emits colon notation — correct.)
- QR payment events defined at `platform-bus.ts` lines 165–175 (`qr.payment.initiated`, `qr.payment.completed`, `qr.payment.failed`, `qr.payment.cancelled`, `qr.scan.failed`). No `installQrPaymentReactions()` exists. No listener in any installed reaction handler.

### Conflicts (verified)
- `order-handlers.ts` line 23 uses UPPERCASE `"PAYMENT_SUCCESS"` (legacy notation). `wallet:payment_success` (canonical) is emitted by walletStore. The notation bridge is one-way dot→colon (lines 566–591) and does not bridge colon→UPPERCASE. These two notations are incompatible. **Critical behavioral gap: wallet payment never triggers order status update.**

### Priority: CRITICAL

---

## PILLAR 5 — ME

### State
**PARTIAL** — MeCommandCenter renders, settings and sub-pages exist, role-conditional sections show. All data is fetched via independent `useQuery` calls. No Me page or hook subscribes to any platformBus event.

### Existing Connections (verified)
- Routes for Me pages exist in `App.tsx`: `/me`, `/me/gestion-immo`, `/me/gestion-immo/:propertyId`, `/orders/archive`, `/receipts`, `/loyalty`, `/spending`, `/saved-cards`, `/me/preferences`, `/me/settings/*`.
- All Me pages use `useQuery` hooks to fetch data from Supabase via repositories.
- `super-app-bridge.ts` line 438 — listens `storefront:order_placed` → invalidates `["my-orders", "dashboard-live-stats"]`. Line 442 — `storefront:order_completed` → invalidates `["my-orders", ...]`. These DO invalidate `my-orders` query key, which Me order pages use IF they use the key `["my-orders"]`.

### Missing Connections (verified)
- No Me page, hook, or installed listener subscribes to `platformBus` for: `wallet:payment_success`, `storefront:loyalty_earned`, `pm:payment_received`, `marketplace:booking_confirmed`, `MISSION_COMPLETED`. All Me pages that display this data are purely poll-based or stale until manual navigation.
- `storefront:loyalty_earned` is defined in `platform-bus.ts` types but no emitter or listener exists anywhere in `src/` (verified by search).
- `delivery-handlers.ts` lines 33–36 listen `MISSION_COMPLETED` and emit `ORDER_DELIVERED`. No Me pillar listener for driver earnings/missions.
- `notification-event-bridge.ts` only handles 5 event types (lines 21–35): `wallet:payment_success`, `wallet:payment_failed`, `orbit:message_received` (health-report only), `delivery:completed`, `storefront:order_placed`. Booking confirmations, property payments, loyalty, refunds — none generate notifications.

### Conflicts (verified)
- `super-app-bridge.ts` line 438 invalidates `["my-orders"]` on `storefront:order_placed`. `CustomerActiveOrdersPage.tsx` line 27 uses `queryKey: ["customer-active-orders-page", user?.id]`. `CustomerOrderArchivePage.tsx` line 12 uses `queryKey: ["customer-order-archive", user?.id]`. **These keys do not match `["my-orders"]`** — the super-app-bridge invalidation has no effect on either Me order page. Both pages are fully stale after events.
- `OrdersManager.tsx` line 48 uses `queryKey: ["my-orders", shopId]` — this is the storefront merchant orders view, not the Me customer orders view. The two `["my-orders"]` key usages are for different audiences.

### Priority: HIGH

---

## ADMIN DOMAIN

### State
**OBSERVATION-ONLY** — Admin dashboards read live data via `engineOrchestrator.getEngineRuntimeStats()` and `platformBus.getLogs()`. Admin control actions do not emit bus events.

### Existing Connections (verified)
- `engine-orchestrator.ts` lines 196–249 — `getEngineRuntimeStats()` returns `{ booted, bootedAt, totalEngines, runningEngines, health, scheduler, storm, optimizer, sharedContext, engines, recentIncidents }`. Available to AdminEnginesDashboardPage.
- `engine-orchestrator.ts` lines 252–264 — `getReport()` returns `{ orchestrator, repairSafety, repairPipeline, proofSystem }`. Uses `getProofStats()` from proof-system.
- `useMasterAppBootstrap.ts` stage-4 (8000ms) — `bootCommandCenter()` called.

### Missing Connections (verified)
- Admin approve/refund/ban actions: not found in inspected files. No bus events emitted for admin actions.

### Priority: MEDIUM

---

## SUMMARY TABLE

| Pillar | State | Critical Gaps | Priority |
|--------|-------|--------------|----------|
| Dashboard | PARTIAL | Dead `order:completed` listener; `rental:rent_call_paid` has no emitter | HIGH |
| Radar | PARTIAL | All Radar/Explore components emit on `eventBus` — platformBus listeners never fire | CRITICAL |
| Orbit | MOSTLY WIRED | Bridge emits don't write to DB; gallery-save on wrong bus | HIGH |
| Wallet | MOSTLY WIRED | `PAYMENT_SUCCESS` uppercase gap; no DB write for tx status; QR unlistened | CRITICAL |
| Me | PARTIAL | Zero platformBus subscriptions; all poll-based | HIGH |
| Admin | OBSERVATION ONLY | Admin actions don't drive bus | MEDIUM |

---

## RESOLVED ITEMS (formerly unverified)

The following items were initially flagged as needing additional inspection. All are now resolved:

1. **EngineControlRoomPage proof record rendering** — VERIFIED REAL  
   `src/pages/admin/EngineControlRoomPage.tsx` line 379: `const proofStats = useMemo(() => getProofStats(), [tick])`. Line 381: `const recentProofs = useMemo(() => getProofsByDomain("taxonomy").slice(-10), [tick])`. Proof records are actively rendered in `EngineControlRoomPage` (distinct from `AdminControlRoomPage` which is a separate shell page).

2. **CustomerActiveOrdersPage and CustomerOrderArchivePage query keys** — VERIFIED as MISMATCH  
   `src/pages/customer/CustomerActiveOrdersPage.tsx` line 27: `queryKey: ["customer-active-orders-page", user?.id]`.  
   `src/pages/customer/CustomerOrderArchivePage.tsx` line 12: `queryKey: ["customer-order-archive", user?.id]`.  
   `super-app-bridge.ts` line 438 invalidates `["my-orders"]` — a different key. `["my-orders", shopId]` in `OrdersManager.tsx` line 48 is the merchant view. **The bus invalidation does not reach either Me customer order page** — confirmed gap, now also documented in Me pillar Conflicts section above.

3. **`src/lib/system/repair-consumers.ts` full implementation** — EXCLUDED FROM SCOPE  
   This file touches Task #39 (Discipline Infrastructure) scope. Not inspected. Flagged for Task #39 resolution.
