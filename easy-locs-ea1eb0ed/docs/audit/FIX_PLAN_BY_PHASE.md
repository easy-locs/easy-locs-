# FIX PLAN BY PHASE
*Easy-Locs Super-App v3 — Phased Reconnection Work*
*Date: 2026-04-13*
*Scope excludes: Task #36 (Engine Control Room), Task #39 (Discipline Infrastructure), Task #41 (UI Visual Fixes)*
*All items in this plan reference specific violations from MISSING_CONNECTIONS_REPORT.md and CANONICAL_WIRING_MODEL.md*

---

## PHASE ORDERING RATIONALE

1. **Dependency ordering**: Later phases depend on earlier fixes being in place
2. **Impact**: Fix broken revenue/payment flows before cosmetic/analytics gaps
3. **Risk**: Low-risk emitter migrations before architectural changes to service layer

---

## PHASE A — BUS SPLIT FIX (Radar + Explore)
**Violations fixed**: V1-01, V1-02, V1-03, V1-04, V1-05, V1-06, V1-07 (CANONICAL_WIRING_MODEL.md Class 1)  
**MCs fixed**: MC-A01, MC-A02, MC-A03, MC-A04 (MISSING_CONNECTIONS_REPORT.md)  
**Risk**: LOW — changes are import + call-site replacements only; no logic changes  
**Dependencies**: None

### A1. Migrate RadarView to platformBus
**File**: `src/components/radar/RadarView.tsx`  
**Change**: Remove line 20 import of `eventBus`. Add `import { platformBus } from "@/lib/shared/platform-bus"`. Change line 204 `eventBus.emit("RADAR_SCAN_COMPLETED", ...)` to `platformBus.emit("radar:scan_completed", ...)`. Change line 217 `eventBus.emit("ENTITY_OPENED", ...)` to `platformBus.emit("radar:entity_selected", ...)` — use canonical event name matching the listener at `super-app-bridge.ts` line 411.

### A2. Migrate RadarFilterMenu to platformBus
**File**: `src/components/radar/RadarFilterMenu.tsx`  
**Change**: Lines 5, 23, 30 — replace `eventBus` import and `.emit("RADAR_FILTER_CHANGED", ...)` with `platformBus.emit("radar:filter_changed", ...)`. Register `"radar:filter_changed"` in `PlatformEventType` if absent.

### A3. Migrate MapPlaceCard to platformBus
**File**: `src/components/map/MapPlaceCard.tsx`  
**Change**: Lines 15, 70, 78, 85, 258 — replace `eventBus` import; migrate `map.route.focus`, `map.center.request`, `place.order.requested`, `ENTITY_OPENED` emissions. Use canonical colon-notation: `map:route_focused`, `map:center_requested`, `place:order_requested`, `radar:entity_selected`.

### A4. Migrate Explore domain to platformBus
**Files**:
- `src/domains/explore/ExploreScreen.tsx` (line 4 import, line 17 emit)
- `src/domains/explore/ExploreAISuggestions.tsx` (line 5 import, lines 25, 32)
- `src/domains/explore/ExploreContinue.tsx` (line 5 import, lines 31, 38)
- `src/domains/explore/ExploreEntitySection.tsx` (line 6 import, line 54)
- `src/domains/explore/ExploreQuickActions.tsx` (line 4 import, lines 15, 23)
- `src/domains/explore/explore.view-model.ts` (line 5 import, line 165)

**Change**: Replace `eventBus` import with `platformBus` in each file. Update event names to canonical colon-notation. Register new event types in `PlatformEventType` if absent.

### A5. Migrate dashboard.view-model and FloatingCTAButton
**Files**:
- `src/families/dashboard/dashboard.view-model.ts` (line 12 import, line 89 emit)
- `src/components/engine/FloatingCTAButton.tsx` (line 9 import, lines 55–56 subscriber)

**Change**: Replace `eventBus` import with `platformBus`. For FloatingCTAButton, note it is a subscriber (`eventBus.on`) not an emitter — change to `platformBus.on(...)` and return the unsubscribe function from `platformBus.on()`.

### A6. Migrate gallery-save.service to platformBus
**File**: `src/domains/orbit/services/gallery-save.service.ts`  
**Change**: Line 13 — replace `eventBus` with `platformBus`. Lines 128, 153, 168 — `eventBus.emit(...)` → `platformBus.emit(...)`. Event names `attachment.event.gallery_saved`, `attachment.event.gallery_failed` are already defined in `platform-bus.ts` PlatformEventType (lines 176–181) — use them as-is.

**Expected outcome**: All Radar entity selections activate `radar-core` module. Explore interactions are visible to platformBus listeners. Gallery save events are on canonical bus.

---

## PHASE B — WALLET PAYMENT CHAIN REPAIR
**Violations fixed**: V4-01, V5-01 (CANONICAL_WIRING_MODEL.md)  
**MCs fixed**: MC-B01, MC-B02, MC-B03, MC-B04 (MISSING_CONNECTIONS_REPORT.md)  
**Risk**: MEDIUM — V5-01 adds a DB write to a hot-path store action  
**Dependencies**: None — safe to execute in parallel with Phase A

### B1. Fix notation mismatch: wallet → order-handlers
**File**: `src/lib/orchestration/handlers/order-handlers.ts`  
**Change**: Line 23 — replace `platformBus.on("PAYMENT_SUCCESS", async (event) => { ... })` with `platformBus.on("wallet:payment_success", async (event) => { ... })`. Verify the payload shape matches `wallet:payment_success` payload (`{ transactionId, amount, currency, reference, walletBalance }`).

### B2. Add Supabase DB write for transaction status in walletStore
**File**: `src/stores/walletStore.ts`  
**Change**: Inside `markTransactionSuccess()` (lines 74–91), after the `set()` call (line 79–81), add `await walletRepo.updateTransactionStatus(transactionId, "success")` before the `platformBus.emit()` at line 84.  
**Pre-condition**: Add `updateTransactionStatus(transactionId: string, status: "success" | "failed"): Promise<void>` to `src/lib/db/repositories/wallet.repository.ts` if not present.

### B3. Add `installQrPaymentReactions()` for QR payment events
**New file**: `src/lib/qr/qr-payment-reactions.ts`  
**Implementation**: Export `installQrPaymentReactions()` that installs listeners for `qr.payment.initiated`, `qr.payment.completed`, `qr.payment.failed` from platformBus. On completion: invalidate `["wallet-balance", "wallet-transactions", "my-orders"]`; create notification. On failure: create error notification.  
**Registration**: Add to `useMasterAppBootstrap.ts` stage-1 (1500ms), alongside existing `installPlatformReactions()`, `installStorefrontReactions()`, etc.

### B4. Fix `rental:rent_call_paid` dead listener
**File**: `src/lib/dashboard/dashboard-cache-invalidator.ts`  
**Change**: Line 34 — replace `platformBus.on(APP_EVENTS.RENTAL_RENT_CALL_PAID as any, ...)` with `platformBus.on("pm:payment_received" as any, () => invalidateDashboardCaches())`. Alternatively: emit `rental:rent_call_paid` from the property payment flow AND keep the existing listener.

**Expected outcome**: Wallet payment causes order status to update to "paid". Transaction status persists to Supabase. QR payment lifecycle drives wallet/order updates. Dashboard refreshes when rent is paid.

---

## PHASE C — ORBIT BRIDGE HARDENING
**Violations fixed**: V3-01 through V3-05 (CANONICAL_WIRING_MODEL.md)  
**MCs fixed**: MC-C01 through MC-C06 (MISSING_CONNECTIONS_REPORT.md)  
**Risk**: MEDIUM — adds async DB writes to bridge functions  
**Dependencies**: Phase A (correct bus), Phase B (payment events correct)

### C1. Wire `bridgeContactProvider()` to create real DB thread
**File**: `src/lib/super-app-bridge.ts` lines 189–203  
**Change**: After existing bus emits, add `useOrbitThreadStore.getState().createThread({ participantId: payload.providerId, type: "contact", ... })`. Store returned thread ID. Pass `threadId` in bus event payload so listeners and cross-app-reactions have `conversationId`.

### C2. Wire `bridgeCreateConversation()` to create real DB thread + message
**File**: `src/lib/super-app-bridge.ts` lines 284–301  
**Change**: Before bus emits, call `useOrbitThreadStore.getState().createThread(...)`. If `payload.initialMessage` provided, call `insertMessage({ threadId, content: payload.initialMessage, type: "text" })` from `@/repositories/communication.repository`.

### C3. Wire `bridgeAttachPaymentContext()` to persist payment receipt message
**File**: `src/lib/super-app-bridge.ts` lines 303–315  
**Change**: After bus emit at line 304, call `insertMessage({ threadId: payload.conversationId, type: "payment_receipt", metadata: { transactionId, amount, currency } })`. Requires `payload.conversationId` to be present.

### C4. Wire `bridgeAttachOrderContext()` to persist booking card message
**File**: `src/lib/super-app-bridge.ts` lines 317–330  
**Change**: After bus emit at line 318, call `insertMessage({ threadId: payload.conversationId, type: "booking_card", metadata: { orderId, providerId } })`.

### C5. Fix `bridgeOpenSupport()` placeholder participant ID
**File**: `src/lib/super-app-bridge.ts` lines 248–261  
**Change**: Replace `participantId: "support-agent"` (line 255) with real support agent identity. Options: (a) look up from app config/environment, (b) create a designated support bot orbit profile and reference its ID, (c) route support to a dedicated support table instead of Orbit threads.

### C6. Add notification for incoming Orbit messages
**File**: `src/lib/notifications/notification-event-bridge.ts`  
**Change**: Lines 28–30 — add `notify("New message", "You have a new message", "orbit", "info")` inside the `APP_EVENTS.ORBIT_MESSAGE_RECEIVED` listener, alongside the existing `reportHealth("notifications", "ok")`.

**Expected outcome**: All bridge-initiated conversations create real Supabase threads. Payment receipts and booking cards persist in Orbit. Users receive notifications for incoming messages.

---

## PHASE D — NOTIFICATION BRIDGE EXPANSION
**Violations fixed**: Extends MC-C06 coverage  
**MCs fixed**: Notification gaps across all domains (STRUCTURE_WIRING_AUDIT.md Me section)  
**Risk**: LOW — additive only; no existing behavior changed  
**Dependencies**: Phase C

### D1. Expand notification-event-bridge.ts
**File**: `src/lib/notifications/notification-event-bridge.ts`  
**Current coverage** (lines 19–38): `wallet:payment_success`, `wallet:payment_failed`, `orbit:message_received` (health only), `delivery:completed`, `storefront:order_placed`  
**Add handlers for**:
- `marketplace:booking_created` → `notify("Booking created", ..., "booking", "success")`
- `marketplace:booking_confirmed` → `notify("Booking confirmed", ..., "booking", "success")`
- `marketplace:booking_cancelled` → `notify("Booking cancelled", ..., "booking", "warning")`
- `pm:lease_created` → `notify("New lease created", ..., "property", "info")`
- `pm:payment_received` → `notify("Rent payment received", ..., "property", "success")`
- `storefront:order_completed` → `notify("Order completed", ..., "orders", "success")`
- `support:ticket_created` → `notify("Support ticket opened", ..., "support", "info")` (depends on Phase H — support engine migrated to platformBus)

**Expected outcome**: Comprehensive notification coverage for all user-facing domain events.

---

## PHASE E — ME PILLAR BUS WIRING
**Violations fixed**: MC-E01, MC-E02 (MISSING_CONNECTIONS_REPORT.md)  
**Risk**: LOW — additive; creates new cache invalidation layer  
**Dependencies**: Phase B, Phase D

### E1. Create `me-cache-invalidator.ts`
**New file**: `src/lib/me/me-cache-invalidator.ts`  
**Export**: `installMeCacheListeners(queryClient: QueryClient): () => void`  
**Listeners to install**:
- `wallet:payment_success` → `queryClient.invalidateQueries({ queryKey: ["spending-insights"] })`
- `storefront:order_completed` → `queryClient.invalidateQueries({ queryKey: ["order-receipts"] })`
- `marketplace:booking_confirmed` → `queryClient.invalidateQueries({ queryKey: ["my-bookings"] })`
- `pm:payment_received` → `queryClient.invalidateQueries({ queryKey: ["tenant-payments"] })`
- `MISSION_COMPLETED` → `queryClient.invalidateQueries({ queryKey: ["driver-missions"] })`
**Note**: Use actual query keys matching Me page `useQuery` calls — verify keys from Me page files before implementing.

### E2. Register in useMasterAppBootstrap stage-2
**File**: `src/hooks/useMasterAppBootstrap.ts`  
**Change**: Add `import { installMeCacheListeners } from "@/lib/me/me-cache-invalidator"` and call `installMeCacheListeners(queryClient)` in stage-2 (alongside `installDashboardCacheListener()`).

**Expected outcome**: Me pillar data updates in real-time after wallet payments, order completions, property events, and driver mission completions.

---

## PHASE F — SUPPORT ENGINE BUS MIGRATION
**Violations fixed**: V1-08 (CANONICAL_WIRING_MODEL.md), MC-F01 (MISSING_CONNECTIONS_REPORT.md)  
**Risk**: LOW — replace import + event names; DB writes already happen via supportRepo  
**Dependencies**: Phase D (notifications expanded to include support events)

### F1. Replace `eventBus` with `platformBus` in global-support-engine.ts
**File**: `src/lib/support/global-support-engine.ts`  
**Changes**:
- Line 7: Replace `import { eventBus } from "@/lib/core/event-bus"` with `import { platformBus } from "@/lib/shared/platform-bus"`
- Line 121: Replace `await eventBus.emit("support.ticket_created", { ticketId, ... })` with `platformBus.emit("support:ticket_created", { ticketId, ... }, "system")`
- Line 181: Replace `await eventBus.emit("support.ticket_escalated", { ticketId, reason })` with `platformBus.emit("support:ticket_escalated", { ticketId, reason }, "system")`
- Register `"support:ticket_created"` and `"support:ticket_escalated"` in `PlatformEventType` if absent.

**Expected outcome**: Support ticket creation and escalation events reach platformBus. Dashboard refreshes. Notification bridge fires for support events.

---

## PHASE G — FLIGHT VERTICAL WIRING
**Violations fixed**: MC-G01 (MISSING_CONNECTIONS_REPORT.md)  
**Risk**: MEDIUM — adds bus emissions to flight payment and booking lifecycle  
**Dependencies**: Phase B (wallet events correct), Phase C (Orbit bridges wired)

### G1. Wire flight payment to wallet bus events
**File**: `src/lib/flight/flightPaymentOrchestrator.ts`  
**Change**: On successful payment, call `walletStore.getState().markTransactionSuccess(transactionId)` (which will now also write to DB and emit `wallet:payment_success` after Phase B). On failure, call `walletStore.getState().markTransactionFailed(transactionId, reason)`.

### G2. Wire flight booking to marketplace bus events
**File**: `src/lib/flight/flightBookingService.ts`  
**Change**: After booking creation, call `emitBookingCreated({ bookingId, providerId, type: "flight", ... })` from `super-app-bridge.ts`. On booking confirmation, call `emitBookingConfirmed({ bookingId })`.

### G3. Add flight to taxonomy module-wiring
**File**: `src/lib/taxonomy/module-wiring.ts`  
**Change**: Add `"flight"` to `VerticalKey` union. Add `MODULE_WIRING["flight"]` entry with: dashboard shortcut (`/radar/flight`), radar discovery config, wallet payment flow, orbit thread type (`"flight_booking"`), me preferences key.

**Expected outcome**: Flight bookings trigger wallet balance refresh, marketplace events, Orbit booking cards, and dashboard KPI updates.

---

## PHASE H — PROPERTY BOOKING WIRING
**Violations fixed**: MC-H01 (MISSING_CONNECTIONS_REPORT.md)  
**Risk**: LOW — additive bridge call in existing booking pages  
**Dependencies**: Phase C (Orbit bridge wired)

### H1. Wire property booking pages to emitBookingCreated
**Files**: `src/pages/radar/PropertyBookingPage.tsx`, `src/pages/radar/PropertyConfirmationPage.tsx`  
**Change**: On successful booking submission/confirmation, call `emitBookingCreated({ bookingId, providerId, type: "property", ... })` from `src/lib/super-app-bridge.ts`. This triggers `marketplace:booking_created` on platformBus → super-app-bridge invalidates `my-bookings`, activates `marketplace-core`, fires `cross-app-reactions.ts` Orbit thread message (if `conversationId` provided).

**Expected outcome**: Property bookings drive the same Orbit/Dashboard/Notification chain as marketplace bookings.

---

## PHASE I — NOTATION MIGRATION CLEANUP
**Violations fixed**: MC-I01, MC-I02, V4-02, V4-04 (CANONICAL_WIRING_MODEL.md)  
**Risk**: LOW — type additions only; no runtime behavior changed  
**Dependencies**: Phases A–H (all bus migrations complete)

### I1. Add missing colon-notation types to PlatformEventType
**File**: `src/lib/shared/platform-bus.ts`  
**Change**: Add to PlatformEventType union:
- `"listing:created"`, `"listing:updated"`, `"listing:published"` (targets of NOTATION_BRIDGE lines 584–586, not currently in type union)
- `"rent:payment_created"`, `"rent:payment_required"`, `"rent:payment_paid"`, `"rent:paid"`, `"rent:partial_payment"` (targets of NOTATION_BRIDGE lines 587–591, not in type union)
- `"radar:filter_changed"`, `"map:route_focused"`, `"map:center_requested"`, `"place:order_requested"`, `"radar:scan_completed"` (new events from Phase A)
- `"support:ticket_created"`, `"support:ticket_escalated"` (from Phase F)

### I2. Remove dead `order:completed` listener
**File**: `src/lib/dashboard/dashboard-cache-invalidator.ts`  
**Change**: Remove line 32 (`platformBus.on(APP_EVENTS.ORDER_COMPLETED as any, ...)`) — confirmed no emitter exists anywhere. Dashboard already refreshes via line 31 (`storefront:order_completed` listener).

### I3. Migrate UPPERCASE orchestration events to colon-notation
**Files**: `src/lib/orchestration/handlers/delivery-handlers.ts`, `src/lib/orchestration/handlers/order-handlers.ts`  
**Change** (optional / lower priority):  
- Replace `"MISSION_CREATED"`, `"MISSION_ACCEPTED"`, `"MISSION_COMPLETED"`, `"ORDER_DELIVERED"`, `"ORDER_READY"` with colon-notation equivalents (`"mission:created"`, etc.)
- Update all listeners for these events in the same operation to avoid split state
- This is a coordinated rename — must be done atomically across all files using these event names

### I4. Add debounce to `refreshModule()` in installPlatformReactions
**File**: `src/lib/shared/platform-bus.ts` `installPlatformReactions()` lines 526–554  
**Change**: Wrap each `refreshModule(engineId)` call in a per-engine 100ms debounce using `setTimeout`/`clearTimeout`. Prevents rapid-fire store updates during multi-event sequences.

---

## PHASE J — PROPERTY↔ORBIT BRIDGES
**Violations fixed**: Domain Relation Map rows 6a–6c (DOMAIN_RELATION_MAP.md)  
**Risk**: MEDIUM — new message insertions in property event flow  
**Dependencies**: Phase C (Orbit bridge hardened)

### J1. Wire pm:document_shared → Orbit message
**File**: `src/lib/super-app-bridge.ts` OR new `src/lib/pm/pm-orbit-bridge.ts`  
**Change**: Add listener for `pm:document_shared` → `insertMessage({ type: "document_share", threadId: payload.conversationId, metadata: { documentUrl, documentName } })`. Requires `conversationId` in payload — update `emitPropertyEvent({ action: "document_shared" })` call sites to include `conversationId`.

### J2. Wire pm:payment_received → Orbit receipt message
**Change**: Add listener for `pm:payment_received` → `insertMessage({ type: "rent_receipt", threadId: payload.conversationId, metadata: { amount, dueDate } })`.

### J3. Wire pm:lease_created → Orbit notification
**Change**: Add listener for `pm:lease_created` → create app notification (`createAppNotification({ scope: "property", category: "lease", ... })`).

---

## PHASE SUMMARY TABLE

| Phase | Description | Items | Priority | Dependencies | Risk |
|-------|-------------|-------|----------|--------------|------|
| A | Bus Split Fix (Radar/Explore) | 6 sub-items | CRITICAL | None | LOW |
| B | Wallet Payment Chain | 4 sub-items | CRITICAL | None | MEDIUM |
| C | Orbit Bridge Hardening | 6 sub-items | HIGH | A, B | MEDIUM |
| D | Notification Bridge Expansion | 1 file | HIGH | C | LOW |
| E | Me Pillar Bus Wiring | 2 sub-items | HIGH | B, D | LOW |
| F | Support Engine Bus Migration | 1 file | HIGH | D | LOW |
| G | Flight Vertical Wiring | 3 sub-items | HIGH | B, C | MEDIUM |
| H | Property Booking Wiring | 1 file | HIGH | C | LOW |
| I | Notation Migration Cleanup | 4 sub-items | MEDIUM | A–H | LOW |
| J | Property↔Orbit Bridges | 3 sub-items | MEDIUM | C | MEDIUM |

---

## DEPENDENCY GRAPH

```
Phase A (Bus Split Fix)
    │
    └──────────────────────────────────────────────────►──────────┐
                                                                    │
Phase B (Wallet Chain)                                             │
    │                                                              │
    └──────────────────────────────────────────────────►──────┐   │
                                                                │   │
Phase C (Orbit Bridge) ◄───────────────────────────────────────┘   │
    │                                                               │
    ▼                                                               ▼
Phase D (Notifications) ◄───────────────────────────────────────────┘
    │
    ├──► Phase E (Me Pillar) ◄── Phase B
    ├──► Phase F (Support Engine)
    ├──► Phase G (Flight) ◄── Phase B + C
    └──► Phase H (Property Booking) ◄── Phase C

Phase I (Notation Cleanup) ◄── Phases A–H complete
Phase J (Property↔Orbit) ◄── Phase C
```

---

## EXCLUSION NOTES

The following are explicitly out of scope for this fix plan:
- **Task #36**: Engine Control Room UI features, engine discipline rule enforcement, engine scheduling configuration
- **Task #39**: Repair pipeline pillar implementations, full learning governance enforcement, proof record storage layer, Known Failures memory layer
- **Task #41**: Visual UI defects, typography, spacing, card overflow, icon sizing

Items that touch repair pipeline or learning governance infrastructure are flagged above with "**Note**: within Task #39 scope" and must be coordinated with the Task #39 implementation before proceeding.
