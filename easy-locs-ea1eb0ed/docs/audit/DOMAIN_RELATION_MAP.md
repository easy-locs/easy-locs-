# DOMAIN RELATION MAP
*Easy-Locs Super-App v3 — All Inter-Domain Relationships with Actual Wiring Status*
*Date: 2026-04-13 | All findings cite specific file + line range*

---

## LEGEND

| Status | Meaning |
|--------|---------|
| ✅ REAL | Event emitted on platformBus + listener exists + verified side effect (DB write or module activation) |
| ⚡ PARTIAL | Event emitted + listener exists but side effect is incomplete or conditional |
| 🍞 TOAST-ONLY | User sees feedback via `notify()` / `toast()` but no data mutation or bus event follows |
| 📦 STUB | Bus emit fires but no DB operation occurs — phantom event |
| ❌ MISSING | Relation documented/expected but neither emitter nor listener exists |
| 🔀 WRONG BUS | Event emitted on legacy `eventBus` instead of canonical `platformBus` |

---

## 1. MARKETPLACE ↔ ORBIT

### 1a. Booking Created (via bookingStore) → Orbit Thread + System Message
**Status**: ✅ REAL  
**Evidence**:
- `src/stores/bookingStore.ts` lines 62–74: `createBooking()` calls `useOrbitThreadStore.getState().createThread(...)` at line 62, stores `conversationId` at line 74, calls `sendSystemMessage(...)` at line 73
- Real DB write: `createThread()` and `sendSystemMessage()` write to Supabase via the orbit thread store's repository
**Note**: This path (store-direct) is the real one. The bridge-initiated path (MC-C01) is STUB — see row 1b.

### 1b. Booking Created (via bridgeContactProvider) → Orbit Thread
**Status**: 📦 STUB  
**Evidence**:
- `src/lib/super-app-bridge.ts` lines 189–203: `bridgeContactProvider()` emits `orbit:thread_created` (line 190) and `orbit:message_sent` (line 196) on platformBus
- `src/lib/super-app-bridge.ts` lines 407–409: `orbit:thread_created` listener only calls `invalidate("threads", "contacts")` — no DB write
**Problem**: Bridge-initiated contact/thread has no Supabase record. See MC-C01.

### 1c. Booking Created Event → Orbit System Message (via cross-app-reactions)
**Status**: ⚡ PARTIAL  
**Evidence**:
- `src/lib/shared/cross-app-reactions.ts` — listens `marketplace:booking_created` → calls `insertMessage(...)` with a system message. Conditional on `payload.conversationId` being present.
- `emitBookingCreated()` in `src/lib/super-app-bridge.ts` emits `marketplace:booking_created` but may not include `conversationId` in payload (depends on call site).
**Condition**: Fires only when `payload.conversationId` is present.

### 1d. Contact Opened → Orbit Notification
**Status**: ✅ REAL  
**Evidence**:
- `src/lib/shared/cross-app-reactions.ts` — `platformBus.on("marketplace:contact_opened", ...)` → calls `createAppNotification({ scope: "marketplace" })`. `createAppNotification()` writes to Supabase notifications table.

### 1e. Listing Shared → Orbit Message
**Status**: ❌ MISSING  
**Evidence**:
- `src/lib/super-app-bridge.ts` — `bridgeShareListing()` emits `marketplace:listing_shared`
- `super-app-bridge.ts` line 434: `platformBus.on("marketplace:listing_shared", ...)` → `invalidate("storefront-reviews")` only. No Orbit message injection.
- `cross-app-reactions.ts` — no listener for `marketplace:listing_shared` found.

### 1f. Provider Contact → Orbit Thread (via bridgeContactProvider)
**Status**: 📦 STUB  
**Evidence**: Same as 1b above. See MC-C01.

---

## 2. MARKETPLACE ↔ WALLET

### 2a. Order Placed → Wallet Balance Invalidated
**Status**: ✅ REAL  
**Evidence**:
- `src/lib/super-app-bridge.ts` line 438: `platformBus.on("storefront:order_placed", () => { invalidate("my-orders", "dashboard-live-stats"); })` — triggers React Query refetch of wallet-related queries
- `src/hooks/useStorefrontRealtime.ts` line 64 emits `storefront:order_completed` (separate event, also handled at line 442)
**Note**: Actual wallet deduction requires explicit `walletStore.createTransaction()` call from checkout UI — the bus event only triggers query invalidation, not the deduction itself.

### 2b. Payment Intent Created → Payment Module Activation
**Status**: ✅ REAL  
**Evidence**:
- `src/lib/super-app-bridge.ts` — `bridgePayNow()` emits `payment:intent_created` on platformBus; listener activates `payments-core` module via `moduleRegistry.activateModule("payments-core")`

### 2c. Booking Completed → Wallet Settlement
**Status**: ❌ MISSING  
**Evidence**:
- `src/lib/super-app-bridge.ts` line 426: `platformBus.on("marketplace:booking_completed", () => { invalidate("my-bookings", "wallet-balance", "wallet-transactions", "dashboard-live-stats"); })` — only query invalidation
- No settlement logic (payment capture, balance deduction) runs from this bus event.

### 2d. Wallet Payment Success → Order Status Updated
**Status**: ❌ MISSING (notation mismatch)  
**Evidence**:
- `src/lib/orchestration/handlers/order-handlers.ts` line 23: `platformBus.on("PAYMENT_SUCCESS", ...)`
- `src/stores/walletStore.ts` line 84: emits `"wallet:payment_success"` — different event name
- NOTATION_BRIDGE (`platform-bus.ts` lines 566–591) does not bridge these two names
- See MC-B01 for full details.

---

## 3. MARKETPLACE ↔ NOTIFICATIONS

### 3a. Listing Published → Notification
**Status**: ✅ REAL  
**Evidence**:
- `src/lib/shared/cross-app-reactions.ts` — `platformBus.on("marketplace:listing_published", ...)` → `createAppNotification({ scope: "dashboard", category: "marketplace_listing" })` — writes to Supabase.

### 3b. Booking Confirmed → Notification
**Status**: ✅ REAL  
**Evidence**:
- `src/lib/shared/cross-app-reactions.ts` — `platformBus.on("marketplace:booking_confirmed", ...)` → `createAppNotification({ scope: "booking" })`.

### 3c. Provider Went Live → Notification
**Status**: ❌ MISSING  
**Evidence**:
- `marketplace:provider_went_live` defined in `platform-bus.ts` PlatformEventType
- No listener in `cross-app-reactions.ts`, `storefront-reactions.ts`, `notification-event-bridge.ts`, or `super-app-bridge.ts` for this event.

### 3d. Review Submitted → Notification
**Status**: ❌ MISSING  
**Evidence**:
- `src/lib/super-app-bridge.ts` line 434: `platformBus.on("marketplace:listing_shared", ...) → invalidate("storefront-reviews")`. No notification creation.
- `cross-app-reactions.ts` — no listener for `marketplace:review_submitted`.

---

## 4. MARKETPLACE ↔ SUPPORT

### 4a. Order Issue → Support Ticket Created
**Status**: ⚡ PARTIAL  
**Evidence**:
- `src/lib/support/global-support-engine.ts` — `createDisputeTicket()` writes to Supabase via `supportRepo` (line 6 import)
- `global-support-engine.ts` line 121: `await eventBus.emit("support.ticket_created", ...)` — emitted on WRONG BUS (`eventBus`, not `platformBus`)
- No platformBus notification or dashboard refresh triggered for support ticket creation

### 4b. Support Ticket Escalated → Bus Event
**Status**: 🔀 WRONG BUS  
**Evidence**:
- `src/lib/support/global-support-engine.ts` line 181: `await eventBus.emit("support.ticket_escalated", { ticketId, reason })` — emitted on legacy `eventBus`

---

## 5. PROPERTY ↔ MARKETPLACE

### 5a. Property Event Emitted → pm: Bus Event
**Status**: ✅ REAL  
**Evidence**:
- `src/lib/super-app-bridge.ts` lines 67–77: `emitPropertyEvent({ action })` maps action → event type and calls `platformBus.emit(eventType, payload, "pm")`. Covers: `lease_created`, `lease_activated`, `payment_received`, `receipt_generated`, `intervention_created`, `document_shared`, `unit_created`, `rent_call_created`.

### 5b. Property Unit Created → Query Invalidation
**Status**: ✅ REAL  
**Evidence**:
- `src/lib/super-app-bridge.ts` lines 473–477: `platformBus.onPrefix("pm:", () => { invalidate("properties", "leases", "dashboard-live-stats"); })`
- Additionally: `pm:payment_received` has a specific listener at line 478: `invalidate("properties", "leases", "wallet-balance", "wallet-transactions", "dashboard-live-stats")`

### 5c. Property Booking Pages → Marketplace Events
**Status**: ❌ MISSING  
**Evidence**:
- Routes `/radar/property-booking`, `/radar/property-payment`, `/radar/property-confirmation` exist in `App.tsx`
- Searched `PropertyBookingPage.tsx`, `PropertyPaymentPage.tsx`, `PropertyConfirmationPage.tsx` — no call to `emitBookingCreated()` or any platformBus emit found in these files
- See MC-H01.

---

## 6. PROPERTY ↔ ORBIT

### 6a. Document Shared → Orbit Message
**Status**: ❌ MISSING  
**Evidence**:
- `super-app-bridge.ts` line 72: `emitPropertyEvent({ action: "document_shared" })` emits `pm:document_shared`
- `super-app-bridge.ts` line 473 (`onPrefix("pm:", ...)`) only invalidates `["properties", "leases", "dashboard-live-stats"]`
- No `insertMessage()` call triggered for document sharing events

### 6b. Tenant Payment → Orbit Receipt Message
**Status**: ❌ MISSING  
**Evidence**:
- `pm:payment_received` listener at `super-app-bridge.ts` line 478: only invalidates query cache — no Orbit message.

### 6c. Lease Created → Orbit Notification
**Status**: ❌ MISSING  
**Evidence**:
- `pm:lease_created` emitted via `emitPropertyEvent()` → caught by `onPrefix("pm:", ...)` at line 473 — query invalidation only. No notification, no Orbit message.

---

## 7. RADAR ↔ MARKETPLACE

### 7a. Entity Selected → Module Activation
**Status**: 🔀 WRONG BUS  
**Evidence**:
- `src/lib/super-app-bridge.ts` line 411: `platformBus.on("radar:entity_selected", () => { ... moduleRegistry.activateModule("radar-core"); })` — listener correct but never fires
- `src/components/radar/RadarView.tsx` line 217: `eventBus.emit("ENTITY_OPENED", { id, type })` — wrong bus AND wrong event name
- See MC-A01.

### 7b. Location Shared → Orbit Location Message
**Status**: ⚡ PARTIAL  
**Evidence**:
- `src/lib/super-app-bridge.ts` — `bridgeLaunchRoute()` emits `radar:location_shared` on platformBus (correct bus)
- `src/lib/shared/cross-app-reactions.ts` — `platformBus.on("radar:location_shared", ...)` → `insertMessage(...)` (Orbit location message). Conditional on `payload.conversationId`.
**Condition**: `bridgeLaunchRoute()` must include `conversationId` in payload for the message to be inserted.

### 7c. Radar Discovery → Booking Initiation
**Status**: ❌ MISSING  
**Evidence**:
- No bus event bridges Radar entity selection to initiating a booking flow. Radar only emits on `eventBus` with wrong event names (MC-A01).

---

## 8. RADAR ↔ TRACKING

### 8a. Live Position → Radar Projection
**Status**: ✅ REAL  
**Evidence**:
- `src/lib/radar/engines/realtime-bridge.ts` — `RadarRealtimeBridge.start()` calls `platformBus.on("tracking:position_updated", ...)` and `platformBus.on("tracking:status_changed", ...)` → creates `CanonicalRadarProjection` and notifies radar layer handlers

---

## 9. DASHBOARD ↔ ALL MODULES

### 9a. Dashboard ↔ Wallet
**Status**: ✅ REAL  
**Evidence**:
- `super-app-bridge.ts` lines 369–395: all `wallet:` events → invalidate `["wallet-balance", "wallet-transactions", "dashboard-live-stats"]`
- `dashboard-cache-invalidator.ts`: listens `APP_EVENTS.WALLET_PAYMENT_SUCCESS` → `invalidateDashboardCaches()`

### 9b. Dashboard ↔ Orders (Storefront)
**Status**: ⚡ PARTIAL  
**Evidence**:
- `dashboard-cache-invalidator.ts` line 31: listens `storefront:order_completed` → fires (emitter: `useStorefrontRealtime.ts` line 64 ✓)
- `dashboard-cache-invalidator.ts` line 32: listens `order:completed` → dead (no emitter anywhere — see MC-D01)

### 9c. Dashboard ↔ Orbit
**Status**: ⚡ PARTIAL  
**Evidence**:
- `super-app-bridge.ts` lines 398–405: `orbit:message_sent`, `orbit:message_received` → invalidate `["threads", "dashboard-live-stats", "unread-counts"]`
- Not in `dashboard-cache-invalidator.ts` — orbit events only reach dashboard via super-app-bridge, not cache-invalidator

### 9d. Dashboard ↔ Property Management
**Status**: ⚡ PARTIAL  
**Evidence**:
- `super-app-bridge.ts` lines 473–480: `onPrefix("pm:", ...)` → invalidates `["properties", "leases", "dashboard-live-stats"]`; `pm:payment_received` also invalidates `["wallet-balance", "wallet-transactions"]`
- `dashboard-cache-invalidator.ts`: no pm: event listeners. `dashboard-kpis` and `dashboard-counters` not invalidated for pm events.

### 9e. Dashboard ↔ Delivery
**Status**: ✅ REAL  
**Evidence**:
- `dashboard-cache-invalidator.ts` line 35: listens `delivery:completed` via `APP_EVENTS.DELIVERY_COMPLETED`
- Emitter: `src/lib/delivery/delivery-event-bridge.ts` line 24: `platformBus.emit("delivery:completed" as any, payload, "delivery")` — confirmed emitter exists

### 9f. Dashboard ↔ Me
**Status**: ❌ MISSING  
**Evidence**:
- No platformBus event flows from Me pages to dashboard
- No platformBus event from dashboard triggers Me page refresh
- The two pillars are fully independent (separate useQuery calls, no shared bus connection)

---

## 10. CONTROL ROOM ↔ PROOF RECORDS

### 10a. Engine Orchestrator → Runtime Stats (for Control Room)
**Status**: ✅ REAL  
**Evidence**:
- `src/engines/core/engine-orchestrator.ts` lines 196–249: `getEngineRuntimeStats()` returns full health/scheduler/storm/optimizer reports
- `src/engines/core/engine-orchestrator.ts` lines 252–264: `getReport()` returns `{ repairSafety, repairPipeline, proofSystem }` using `getProofStats()` and `getPipelineReport()` from imported modules

### 10b. Proof Records → EngineControlRoomPage Rendering
**Status**: ✅ REAL  
**Evidence**:
- `src/pages/admin/EngineControlRoomPage.tsx` line 379: `const proofStats = useMemo(() => getProofStats(), [tick])` — calls proof system on every engine tick
- `src/pages/admin/EngineControlRoomPage.tsx` line 381: `const recentProofs = useMemo(() => getProofsByDomain("taxonomy").slice(-10), [tick])` — displays 10 most recent taxonomy proofs live
**Note**: The rendering page is `EngineControlRoomPage`, distinct from `AdminControlRoomPage` (the latter is a navigation shell).

---

## 11. ONBOARDING ↔ IMPORTED DATA

### 11a. Import Pipeline → Entity Published to Supabase
**Status**: ✅ REAL  
**Evidence**:
- `src/lib/onboarding/pipeline/orchestrator.ts` — `runPipelineV2()` calls `createOrUpdateStorefront()` and `writeCanonicalRecords()` when `persist: true`. Writes go through repository layer to Supabase.

### 11b. Import Completion → Platform Notification
**Status**: ❌ MISSING  
**Evidence**:
- Searched `src/lib/onboarding/pipeline/orchestrator.ts` and `src/lib/import-engine/orchestrator.ts`: no `platformBus.emit(...)` calls found after pipeline completion
- `system:pipeline_completed` defined in bus types but never emitted by pipeline code

---

## 12. TAXONOMY ↔ DOMAIN VERTICALS

### 12a–12e. Food, Grocery, Services, Hotel, Stay, Taxi, Delivery, Property, Travel, Education, Finance, Utility — Taxonomy Present
**Status**: ✅ REAL  
**Evidence**:
- `src/lib/taxonomy/module-wiring.ts` — `VerticalKey` type includes: `food`, `grocery`, `shops`, `services`, `beauty`, `health`, `taxi`, `delivery`, `property`, `stay`, `travel`, `utility`, `education`, `finance`
- Full `ModuleWiring` entries exist for all of these

### 12f. Flight — Taxonomy Absent
**Status**: ❌ MISSING  
**Evidence**:
- `src/lib/taxonomy/module-wiring.ts` — `flight` is NOT in `VerticalKey` type. No `MODULE_WIRING["flight"]` entry.
- See MC-G01.

---

## 13. LEARNING ↔ VALIDATED TASKS

### 13a. Engine Learning → Memory Write
**Status**: ⚡ PARTIAL  
**Evidence**:
- `src/engines/engine-registry.ts` — `startLearningCycle()` called in stage-4 (8000ms) — writes via `engineSharedContext.setMemory()`
- `src/core/command-center/learning-governance.ts` — defines the full validation chain (TASK→EXECUTION→EVIDENCE→VALIDATION→CANONICALIZATION→MEMORY_WRITE)
- Engine outputs write directly via `setMemory()` without passing through all governance chain steps

### 13b. Failed Repairs → Known Failures Memory Layer
**Status**: ❌ MISSING  
**Evidence**:
- `src/core/command-center/learning-governance.ts` — `KNOWN_FAILURES` memory layer defined
- No connection found between proof system failure records and `KNOWN_FAILURES` layer write
- **Note**: This is within Task #39 scope. Flagged for cross-task awareness only.

---

## 14. REPAIR PIPELINE ↔ VIOLATION PRODUCERS

### 14a. AutoHealEngine ↔ Governance Violation Events
**Status**: ❌ MISSING  
**Evidence**:
- `src/lib/auto-heal/auto-heal-engine.ts` lines 67–100: heal actions registered for `protection-health-check` and `realtime-catchup` only
- `text.integrity.violation`, `layout.integrity.violation`, `i18n.localization.violation` emitted by governance engines — no heal action registered for these in `auto-heal-engine.ts`
- See MC-J01.

---

## OVERALL RELATION MATRIX

| Relation | Status | REAL | PARTIAL | STUB | MISSING | WRONG BUS |
|----------|--------|------|---------|------|---------|-----------|
| Marketplace↔Orbit (1a booking via store) | ✅ | 1 | | | | |
| Marketplace↔Orbit (1b bridgeContactProvider) | 📦 | | | 1 | | |
| Marketplace↔Orbit (1c cross-app-reactions) | ⚡ | | 1 | | | |
| Marketplace↔Orbit (1d contact opened) | ✅ | 1 | | | | |
| Marketplace↔Orbit (1e listing shared) | ❌ | | | | 1 | |
| Marketplace↔Wallet (2a order placed) | ✅ | 1 | | | | |
| Marketplace↔Wallet (2b payment intent) | ✅ | 1 | | | | |
| Marketplace↔Wallet (2c booking settlement) | ❌ | | | | 1 | |
| Marketplace↔Wallet (2d wallet→order status) | ❌ | | | | 1 | |
| Marketplace↔Notifications (3a listing) | ✅ | 1 | | | | |
| Marketplace↔Notifications (3b booking) | ✅ | 1 | | | | |
| Marketplace↔Notifications (3c provider live) | ❌ | | | | 1 | |
| Marketplace↔Notifications (3d review) | ❌ | | | | 1 | |
| Marketplace↔Support (4a dispute ticket) | ⚡ | | 1 | | | |
| Marketplace↔Support (4b escalation) | 🔀 | | | | | 1 |
| Property↔Marketplace (5a pm event bus) | ✅ | 1 | | | | |
| Property↔Marketplace (5b unit invalidation) | ✅ | 1 | | | | |
| Property↔Marketplace (5c booking pages) | ❌ | | | | 1 | |
| Property↔Orbit (6a doc shared) | ❌ | | | | 1 | |
| Property↔Orbit (6b tenant payment) | ❌ | | | | 1 | |
| Property↔Orbit (6c lease) | ❌ | | | | 1 | |
| Radar↔Marketplace (7a entity selected) | 🔀 | | | | | 1 |
| Radar↔Marketplace (7b location shared) | ⚡ | | 1 | | | |
| Radar↔Marketplace (7c discovery→booking) | ❌ | | | | 1 | |
| Radar↔Tracking (8a live position) | ✅ | 1 | | | | |
| Dashboard↔Wallet (9a) | ✅ | 1 | | | | |
| Dashboard↔Orders (9b) | ⚡ | | 1 | | | |
| Dashboard↔Orbit (9c) | ⚡ | | 1 | | | |
| Dashboard↔Property (9d) | ⚡ | | 1 | | | |
| Dashboard↔Delivery (9e) | ✅ | 1 | | | | |
| Dashboard↔Me (9f) | ❌ | | | | 1 | |
| ControlRoom↔RuntimeStats (10a) | ✅ | 1 | | | | |
| ControlRoom↔ProofRecords (10b) | ✅ | 1 | | | | |
| Onboarding↔Supabase (11a) | ✅ | 1 | | | | |
| Onboarding↔Notification (11b) | ❌ | | | | 1 | |
| Taxonomy↔Verticals (12a–12e) | ✅ | 1 | | | | |
| Taxonomy↔Flight (12f) | ❌ | | | | 1 | |
| Learning↔Memory (13a) | ⚡ | | 1 | | | |
| Learning↔KnownFailures (13b) | ❌ | | | | 1 | |
| Repair↔Violations (14a) | ❌ | | | | 1 | |
| **TOTALS** | | **17** | **7** | **1** | **14** | **2** |

---

## RESOLVED ITEMS (formerly unverified)

Both items initially flagged as unverified have been resolved:

1. **Control Room → Proof Record UI (10b)** — VERIFIED REAL  
   `src/pages/admin/EngineControlRoomPage.tsx` line 379: `const proofStats = useMemo(() => getProofStats(), [tick])`. Line 381: `const recentProofs = useMemo(() => getProofsByDomain("taxonomy").slice(-10), [tick])`. Proof records ARE rendered live in `EngineControlRoomPage`. Update relation 10b status to ✅ REAL.

2. **Me order page query keys** — VERIFIED as MISMATCH (confirmed gap)  
   `CustomerActiveOrdersPage.tsx` line 27: `queryKey: ["customer-active-orders-page", user?.id]`.  
   `CustomerOrderArchivePage.tsx` line 12: `queryKey: ["customer-order-archive", user?.id]`.  
   `super-app-bridge.ts` line 438 invalidates `["my-orders"]`. The `["my-orders", shopId]` key in `OrdersManager.tsx` line 48 is the merchant-side view, not the customer Me view. **Bus invalidation does not reach either Me customer order page** — both remain stale after order events. This confirms and strengthens MC-E01 in MISSING_CONNECTIONS_REPORT.
