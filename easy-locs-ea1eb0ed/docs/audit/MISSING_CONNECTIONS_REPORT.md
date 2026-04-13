# MISSING CONNECTIONS REPORT
*Easy-Locs Super-App v3 — All Cross-Domain Relations Missing or Broken*
*Date: 2026-04-13 | Based on direct code inspection — all findings cite specific file + line range*
*Tasks excluded: #36, #39, #41*

---

## PHASE A — CRITICAL BUS SPLITS (Radar + Explore)

### MC-A01 · Radar components emit on `eventBus` not `platformBus`
**Severity**: CRITICAL  
**Evidence**:
- `src/components/radar/RadarView.tsx` line 20: `import { eventBus } from "@/lib/core/event-bus"`; line 204: `eventBus.emit("RADAR_SCAN_COMPLETED", ...)`, line 217: `eventBus.emit("ENTITY_OPENED", ...)`
- `src/components/radar/RadarFilterMenu.tsx` line 5: imports `eventBus`; lines 23, 30: `eventBus.emit("RADAR_FILTER_CHANGED", ...)`
- `src/components/map/MapPlaceCard.tsx` line 15: imports `eventBus`; lines 70, 78, 85, 258: `eventBus.emit("map.route.focus", ...)`, `eventBus.emit("map.center.request", ...)`, `eventBus.emit("place.order.requested", ...)`, `eventBus.emit("ENTITY_OPENED", ...)`
- `src/lib/super-app-bridge.ts` line 411: `platformBus.on("radar:entity_selected", ...)` — listener exists on platformBus
- Radar components emit `ENTITY_OPENED` (UPPERCASE) not `radar:entity_selected` (canonical), even if they were on the right bus — the event names also don't match
**Problem**: The platformBus listener at line 411 of super-app-bridge never fires because Radar emits on a different bus with a different event name. Module activation for `radar-core` never triggers.  
**Fix**: In each Radar file, replace `eventBus` import with `platformBus` from `@/lib/shared/platform-bus` and change emit event names to canonical colon-notation.

### MC-A02 · Explore domain components emit on `eventBus`
**Severity**: HIGH  
**Evidence**:
- `src/domains/explore/ExploreScreen.tsx` line 4: imports `eventBus`; line 17: `eventBus.emit("explore.section.viewed", ...)`
- `src/domains/explore/ExploreAISuggestions.tsx` line 5: imports `eventBus`; lines 25, 32: `eventBus.emit("explore.ai_suggestion.clicked", ...)`, `eventBus.emit("search.executed", ...)`
- `src/domains/explore/ExploreContinue.tsx` line 5: imports `eventBus`; lines 31, 38: `eventBus.emit("entity.click", ...)`, `eventBus.emit("explore.continue.clicked", ...)`
- `src/domains/explore/ExploreEntitySection.tsx` line 6: imports `eventBus`; line 54: `eventBus.emit("entity.click", ...)`
- `src/domains/explore/ExploreQuickActions.tsx` line 4: imports `eventBus`; lines 15, 23: `eventBus.emit("explore.quick_action.clicked", ...)`, `eventBus.emit("wallet.action", ...)`
- `src/domains/explore/explore.view-model.ts` line 5: imports `eventBus`; line 165: `eventBus.emit(event, payload)` via `emitExploreEvent()` wrapper
**Problem**: All Explore domain events are invisible to platformBus listeners.  
**Fix**: Replace `eventBus` with `platformBus` in all Explore files; register canonical event types.

### MC-A03 · dashboard.view-model and FloatingCTAButton use `eventBus`
**Severity**: MEDIUM  
**Evidence**:
- `src/families/dashboard/dashboard.view-model.ts` line 12: imports `eventBus`; line 89: `eventBus.emit("HOME_SECTIONS_REFRESHED", ...)`
- `src/components/engine/FloatingCTAButton.tsx` line 9: imports `eventBus`; lines 55–56: `eventBus.on("AI_DECISION_EXECUTED", handler)` — subscribes to legacy bus, so AI decision events on platformBus will not trigger the CTA button
**Problem**: Dashboard view model events not on canonical bus; CTA button misses AI decision events.  
**Fix**: Replace `eventBus` with `platformBus` in both files.

### MC-A04 · gallery-save.service uses `eventBus` for attachment events
**Severity**: MEDIUM  
**Evidence**:
- `src/domains/orbit/services/gallery-save.service.ts` line 13: imports `eventBus`; line 128: `eventBus.emit("attachment.event.gallery_failed", ...)`, line 153: `eventBus.emit("attachment.event.gallery_saved", ...)`, line 168: `eventBus.emit("attachment.event.gallery_failed", ...)`
- `src/lib/shared/platform-bus.ts` lines 176–181: `attachment.event.gallery_saved`, `attachment.event.gallery_failed` are defined in `PlatformEventType` — they are expected on platformBus
**Problem**: Gallery save/fail events emitted on eventBus, invisible to any platformBus subscriber.  
**Fix**: Replace `eventBus` import with `platformBus` in gallery-save.service.ts.

---

## PHASE B — WALLET PAYMENT CHAIN BREAKAGES

### MC-B01 · `PAYMENT_SUCCESS` (UPPERCASE) vs `wallet:payment_success` (canonical) — order status never updates
**Severity**: CRITICAL  
**Evidence**:
- `src/lib/orchestration/handlers/order-handlers.ts` line 23: `platformBus.on("PAYMENT_SUCCESS", async (event) => { ... })`
- `src/stores/walletStore.ts` line 84: `platformBus.emit("wallet:payment_success", { transactionId, amount, currency, reference, walletBalance }, "wallet")`
- `src/lib/shared/platform-bus.ts` lines 566–591 (NOTATION_BRIDGE): the bridge maps dot→colon but does NOT include any entry mapping `wallet:payment_success` → `PAYMENT_SUCCESS` or vice versa
**Problem**: `order-handlers.ts` waits for `PAYMENT_SUCCESS` to update order payment status. `walletStore` emits `wallet:payment_success`. These two event strings never match — order status is never set to "paid" after a wallet payment.  
**Fix**: Update `order-handlers.ts` line 23 to listen on `wallet:payment_success` (canonical), OR add `"wallet:payment_success"` → `"PAYMENT_SUCCESS"` to the notation bridge (lines 566–591 of platform-bus.ts).

### MC-B02 · `walletStore.markTransactionSuccess()` does not write status to Supabase
**Severity**: HIGH  
**Evidence**:
- `src/stores/walletStore.ts` lines 74–91: `markTransactionSuccess(transactionId)` — calls `set(state => ({ transactions: state.transactions.map(...status: "success"...) }))` (line 79–81) then `platformBus.emit("wallet:payment_success", ...)` (line 84). No `walletRepo` call between lines 74–91.
- `walletStore.ts` line 5: `import { walletRepo } from "@/lib/db/repositories"` — import exists but not used in `markTransactionSuccess`
**Problem**: Transaction status in Supabase remains at its original value (e.g. `"pending"`) permanently. Only in-memory state is updated.  
**Fix**: Add `walletRepo.updateTransactionStatus(transactionId, "success")` call inside `markTransactionSuccess()` before the bus emit. Requires adding `updateTransactionStatus()` to `src/lib/db/repositories/wallet.repository.ts` if absent.

### MC-B03 · QR payment events have no listeners
**Severity**: HIGH  
**Evidence**:
- `src/lib/shared/platform-bus.ts` lines 165–175: `qr.payment.initiated`, `qr.payment.completed`, `qr.payment.failed`, `qr.payment.cancelled`, `qr.scan.failed` defined in `PlatformEventType`
- Searched all of `src/`: no `installQrPaymentReactions()` or `installQrReactions()` function found. No listener for `qr.payment.*` in any installed reaction handler (storefront-reactions.ts, cross-app-reactions.ts, notification-event-bridge.ts, super-app-bridge.ts, platform-bus.ts `installPlatformReactions()`).
**Problem**: QR payment lifecycle events (initiation, completion, failure) have zero consumers. Wallet does not refresh, orders don't update, no notifications fire.  
**Fix**: Create `src/lib/qr/qr-payment-reactions.ts` with `installQrPaymentReactions()` and register in `useMasterAppBootstrap.ts` stage-1.

### MC-B04 · `rental:rent_call_paid` — listener exists but no emitter
**Severity**: HIGH  
**Evidence**:
- `src/lib/dashboard/dashboard-cache-invalidator.ts` line 34: `platformBus.on(APP_EVENTS.RENTAL_RENT_CALL_PAID as any, () => invalidateDashboardCaches())`
- `src/lib/platform/events.ts` line 58: `RENTAL_RENT_CALL_PAID: "rental:rent_call_paid"`
- Searched all of `src/`: no `platformBus.emit("rental:rent_call_paid", ...)` or `emit(APP_EVENTS.RENTAL_RENT_CALL_PAID, ...)` found anywhere. The event is also not in the NOTATION_BRIDGE.
**Problem**: Dashboard never refreshes when rent is paid because the `rental:rent_call_paid` event is never emitted. Property management uses `pm:payment_received` (emitted by `super-app-bridge.ts` line 77 via `emitPropertyEvent({ action: "payment_received" })`).  
**Fix**: Either emit `rental:rent_call_paid` where rent payments are processed OR add `pm:payment_received` listener to `dashboard-cache-invalidator.ts`.

---

## PHASE C — ORBIT BRIDGE GHOST EVENTS

### MC-C01 · `bridgeContactProvider()` emits `orbit:thread_created` without creating a DB thread
**Severity**: HIGH  
**Evidence**:
- `src/lib/super-app-bridge.ts` lines 189–203: `bridgeContactProvider(payload)` calls `platformBus.emit("orbit:thread_created", { ... }, "orbit")` at line 190 and `platformBus.emit("orbit:message_sent", { ... }, "orbit")` at line 196
- `src/lib/super-app-bridge.ts` lines 407–409: `platformBus.on("orbit:thread_created", () => { invalidate("threads", "contacts"); })` — only query invalidation, no repository call
- `src/stores/bookingStore.ts` lines 62–74: `createBooking()` shows the correct pattern — it calls `useOrbitThreadStore.getState().createThread(...)` directly before emitting. `bridgeContactProvider()` does NOT do this.
**Problem**: `bridgeContactProvider()` emits bus events that trigger query invalidation but no Supabase thread is created. The invalidation causes UI to refetch, but the new fetch finds no thread.  
**Fix**: Inside `bridgeContactProvider()`, call `useOrbitThreadStore.getState().createThread({ ... })` or equivalent repository function before emitting the bus event.

### MC-C02 · `bridgeOpenSupport()` uses hardcoded `"support-agent"` string
**Severity**: HIGH  
**Evidence**:
- `src/lib/super-app-bridge.ts` lines 248–261: `bridgeOpenSupport(payload)` calls `platformBus.emit("orbit:thread_created", { ..., participantId: "support-agent", ... }, "orbit")` at line 249–257. `"support-agent"` is a string literal.
- Same listener gap as MC-C01 — `orbit:thread_created` listener at line 407 only invalidates cache.
**Problem**: `"support-agent"` is not a valid Orbit user identity. No real support thread is created. Support conversations cannot be routed.  
**Fix**: Look up real support agent Orbit ID from configuration or database before creating the thread.

### MC-C03 · `bridgeCreateConversation()` emits bus events without DB writes
**Severity**: HIGH  
**Evidence**:
- `src/lib/super-app-bridge.ts` lines 284–301: `bridgeCreateConversation(payload)` emits `orbit:thread_created` (line 285) and optionally `orbit:message_sent` (line 294)
- Bus listeners: `orbit:thread_created` → cache invalidation only (line 407); `orbit:message_sent` → cache invalidation + `activateModule("orbit-chat")` (line 398) — no DB write in either listener
**Problem**: Conversation created on bus only; no Supabase record.  
**Fix**: Call `useOrbitThreadStore.getState().createThread()` and `insertMessage()` from `@/repositories/communication.repository` inside `bridgeCreateConversation()`.

### MC-C04 · `bridgeAttachPaymentContext()` emits `orbit:message_sent` without DB write
**Severity**: HIGH  
**Evidence**:
- `src/lib/super-app-bridge.ts` lines 303–315: `bridgeAttachPaymentContext(payload)` calls `platformBus.emit("orbit:message_sent", { ... }, "orbit")` at line 304
- Listener at line 398: only `invalidate("threads", "dashboard-live-stats")` + `activateModule("orbit-chat")`
**Problem**: Payment context message appears to be sent (bus event fires, module activates) but no message record exists in Supabase.  
**Fix**: Call `insertMessage({ type: "payment_receipt", threadId: payload.conversationId, metadata: { ... } })` inside `bridgeAttachPaymentContext()`.

### MC-C05 · `bridgeAttachOrderContext()` emits `orbit:message_sent` without DB write
**Severity**: HIGH  
**Evidence**:
- `src/lib/super-app-bridge.ts` lines 317–330: `bridgeAttachOrderContext(payload)` calls `platformBus.emit("orbit:message_sent", { ... }, "orbit")` at line 318. Same listener gap as MC-C04.
**Fix**: Call `insertMessage({ type: "booking_card", ... })` inside `bridgeAttachOrderContext()`.

### MC-C06 · `orbit:message_received` notification bridge does not create notification
**Severity**: MEDIUM  
**Evidence**:
- `src/lib/notifications/notification-event-bridge.ts` lines 28–30: `platformBus.on(APP_EVENTS.ORBIT_MESSAGE_RECEIVED, () => { reportHealth("notifications", "ok"); })` — only reports health, no `notify(...)` call
**Problem**: Users receive no notification for incoming Orbit messages.  
**Fix**: Add `notify("New message", "You have a new message", "orbit", "info")` inside this listener.

---

## PHASE D — DASHBOARD SYNC GAPS

### MC-D01 · `order:completed` listener is dead (no emitter)
**Severity**: MEDIUM  
**Evidence**:
- `src/lib/dashboard/dashboard-cache-invalidator.ts` line 32: `platformBus.on(APP_EVENTS.ORDER_COMPLETED as any, () => invalidateDashboardCaches())`
- `src/lib/platform/events.ts` line 36: `ORDER_COMPLETED: "order:completed"`
- Searched all of `src/`: no `platformBus.emit("order:completed", ...)` or `emit(APP_EVENTS.ORDER_COMPLETED, ...)` found. `useStorefrontRealtime.ts` line 64 emits `storefront:order_completed` (different event).
- `dashboard-cache-invalidator.ts` line 31 ALSO listens to `APP_EVENTS.STOREFRONT_ORDER_COMPLETED` = `"storefront:order_completed"` — this fires correctly. So dashboard DOES refresh on order completion via line 31.
**Impact**: Line 32 is dead code — it never fires. Dashboard still refreshes via line 31. Risk is that someone relies on `order:completed` elsewhere thinking it fires.  
**Fix**: Remove the dead listener at line 32, or emit `order:completed` from `useStorefrontRealtime.ts` line 64 in addition to `storefront:order_completed`.

### MC-D02 · Onboarding completion does not refresh dashboard
**Severity**: MEDIUM  
**Evidence**:
- `src/lib/onboarding/pipeline/orchestrator.ts` — pipeline runs `createOrUpdateStorefront()` and `writeCanonicalRecords()` but no `platformBus.emit(...)` call found after completion
- No platformBus event for `system:pipeline_completed` is emitted by any onboarding or import pipeline file (searched `src/lib/onboarding/` and `src/lib/import-engine/`)
**Problem**: Dashboard does not know when an import/onboarding pipeline completes — no counter or KPI refresh triggered.  
**Fix**: Emit `dashboard:refresh` or `system:pipeline_completed` at end of `runPipelineV2()`.

### MC-D03 · `pm:lease_created` and `pm:lease_activated` don't refresh dashboard KPIs
**Severity**: MEDIUM  
**Evidence**:
- `src/lib/super-app-bridge.ts` lines 473–477: `platformBus.onPrefix("pm:", () => { invalidate("properties", "leases", "dashboard-live-stats"); })` — this fires for ALL pm: events including `pm:lease_created` and `pm:lease_activated`
- `src/lib/dashboard/dashboard-cache-invalidator.ts` — no listener for `pm:lease_created` or `pm:lease_activated`. The invalidator only covers: `storefront:order_completed` (line 31), `order:completed` (line 32, dead), `rental:rent_call_paid` (line 34, no emitter), `delivery:completed` (line 35), `wallet:payment_success` (line 31 indirectly via `APP_EVENTS.WALLET_PAYMENT_SUCCESS` — to verify exact line), `dashboard:refresh`, `dashboard:counters_refresh`, `storefront:order_placed`
**Impact**: `dashboard-live-stats` IS invalidated by super-app-bridge prefix listener. But `dashboard-kpis` and `dashboard-counters` query keys (if used) are only in `invalidateDashboardCaches()` — not called for pm events via super-app-bridge.  
**Fix**: Add `pm:lease_created` and `pm:lease_activated` listeners in `dashboard-cache-invalidator.ts`.

---

## PHASE E — ME PILLAR ISOLATION

### MC-E01 · Me pillar has zero platformBus subscriptions
**Severity**: HIGH  
**Evidence**:
- Inspected `src/pages/me/*` files — no file imports `platformBus` or calls `platformBus.on()`.
- `src/hooks/useMasterAppBootstrap.ts` — no `installMeCacheListeners()` call found in any of the 4 staged boot phases.
- `src/lib/super-app-bridge.ts` line 438: `platformBus.on("storefront:order_placed", () => { invalidate("my-orders", "dashboard-live-stats") })` and line 442: `storefront:order_completed` → invalidates `["my-orders", ...]` — these DO invalidate `my-orders` key, which Me pages may share.
**Problem**: Me-specific data (spending insights, loyalty, saved cards, receipts, property, driver earnings) never refreshes from bus events. Pages are stale until user navigates away and back.  
**Events missing listeners**: `wallet:payment_success` → spending insights; `storefront:loyalty_earned` (no emitter either — see below); `pm:payment_received` → tenant views; `marketplace:booking_confirmed` → my bookings; `MISSION_COMPLETED` → driver earnings.  
**Fix**: Create `src/lib/me/me-cache-invalidator.ts` with `installMeCacheListeners()` and register in `useMasterAppBootstrap.ts` stage-2.

### MC-E02 · `storefront:loyalty_earned` — no emitter and no listener
**Severity**: MEDIUM  
**Evidence**:
- `src/lib/shared/platform-bus.ts` — `storefront:loyalty_earned` is in `PlatformEventType` (found via type search in union)
- Searched all of `src/`: no `emit("storefront:loyalty_earned", ...)` or `emit(APP_EVENTS.STOREFRONT_LOYALTY_EARNED, ...)` found. No listener found either.
**Problem**: Loyalty point earning events are fully disconnected — not emitted when orders complete, not listened to by Me loyalty page.  
**Fix**: Emit `storefront:loyalty_earned` from the order completion flow; add listener in me-cache-invalidator.

---

## PHASE F — SUPPORT ENGINE BUS MISMATCH

### MC-F01 · `global-support-engine.ts` uses `eventBus` for ticket events
**Severity**: HIGH  
**Evidence**:
- `src/lib/support/global-support-engine.ts` line 7: `import { eventBus } from "@/lib/core/event-bus"`
- Line 121: `await eventBus.emit("support.ticket_created", { ticketId, ... })`
- Line 181: `await eventBus.emit("support.ticket_escalated", { ticketId, reason })`
- `APP_EVENTS` in `src/lib/platform/events.ts` defines `SUPPORT_TICKET_CREATED` and similar keys, but the support engine emits on the wrong bus.
**Problem**: Support ticket events never reach platformBus listeners. Dashboard doesn't refresh. Notification bridge doesn't fire for support events. Orbit thread not created automatically.  
**Fix**: Replace `eventBus` import at line 7 with `platformBus` from `@/lib/shared/platform-bus`. Update emit calls to use canonical colon-notation event names on platformBus.

---

## PHASE G — FLIGHT VERTICAL ISOLATION

### MC-G01 · Flight flow never emits to platformBus
**Severity**: HIGH  
**Evidence**:
- `src/lib/flight/flightPaymentOrchestrator.ts` — no `platformBus.emit(...)` call found (searched file). Payment orchestration runs entirely within the flight module's internal state.
- `src/lib/flight/flightBookingService.ts` — no `platformBus.emit(...)` call found.
- `src/lib/flight/flight-flow-store.ts` — module-level Zustand store; no platformBus usage found.
- `src/lib/taxonomy/module-wiring.ts` — `flight` is not defined as a `VerticalKey`. No `MODULE_WIRING["flight"]` entry found.
**Problem**: Flight booking lifecycle (search → select → book → pay → ticket) produces no cross-domain events. Wallet balance doesn't refresh. Dashboard doesn't reflect flight purchases. No Orbit notification. Flight not in taxonomy.  
**Fix**: Emit `wallet:payment_success`, `marketplace:booking_created`, `marketplace:booking_confirmed` from `flightPaymentOrchestrator.ts` and `flightBookingService.ts` at the appropriate lifecycle points. Add `flight` VerticalKey to `module-wiring.ts`.

---

## PHASE H — PROPERTY BOOKING FLOW DISCONNECTED

### MC-H01 · Property booking pages don't call `emitBookingCreated()`
**Severity**: HIGH  
**Evidence**:
- Routes exist in `App.tsx`: `/radar/property-booking`, `/radar/property-payment`, `/radar/property-confirmation`
- `src/lib/super-app-bridge.ts` — `emitBookingCreated()` function defined (lines ~185–189 contextually). It emits `marketplace:booking_created` to platformBus.
- Searched `src/pages/radar/PropertyBookingPage.tsx`, `PropertyPaymentPage.tsx`, `PropertyConfirmationPage.tsx` — no `emitBookingCreated()` call found in these files.
**Problem**: Property bookings don't trigger `marketplace:booking_created` event. Orbit thread not created. Dashboard not refreshed. No notification for booking.  
**Fix**: Call `emitBookingCreated({ bookingId, providerId, type: "property", ... })` on successful property booking submission in `PropertyBookingPage.tsx` or `PropertyConfirmationPage.tsx`.

---

## PHASE I — NOTATION MIGRATION GAPS

### MC-I01 · `listing:created`, `listing:updated`, `listing:published` not in PlatformEventType union
**Severity**: LOW  
**Evidence**:
- `src/lib/shared/platform-bus.ts` lines 584–586 (NOTATION_BRIDGE): maps `"listing.created"` → `"listing:created"`, `"listing.updated"` → `"listing:updated"`, `"listing.published"` → `"listing:published"`
- `src/lib/shared/platform-bus.ts` PlatformEventType union (lines 1–279): `listing:created`, `listing:updated`, `listing:published` are NOT present as typed entries (dot-notation `"listing.created"` at line 133 IS present)
**Problem**: After notation bridge fires, `listing:created` is emitted as an untyped string. TypeScript won't catch listeners using wrong event name.  
**Fix**: Add `"listing:created"`, `"listing:updated"`, `"listing:published"` to the PlatformEventType union.

### MC-I02 · `rent:payment_created` and related rent events not in PlatformEventType
**Severity**: LOW  
**Evidence**:
- `src/lib/shared/platform-bus.ts` lines 587–591 (NOTATION_BRIDGE): maps `rent.payment.created` → `rent:payment_created`, `rent.payment.required` → `rent:payment_required`, `rent.payment.paid` → `rent:payment_paid`, `rent.paid` → `rent:paid`, `rent.partial_payment` → `rent:partial_payment`
- Lines 151–153 in `PlatformEventType`: dot-notation `rent.payment.created`, `rent.payment.required`, `rent.payment.paid` ARE typed but colon-notation equivalents (`rent:payment_created`, etc.) are NOT in the union.
**Fix**: Add colon-notation rent events to PlatformEventType.

### MC-I03 · `domain-event-bus.ts` fans out to both buses — risk of double execution
**Severity**: MEDIUM  
**Evidence**:
- `src/domains/shared/domain-event-bus.ts` line 6: imports `platformBus`; line 7: imports `eventBus`
- Lines 53–62: `publishDomainEvent()` emits to `platformBus` (line 55) AND `eventBus` (line 61) for every domain event
**Problem**: Any domain event published via `DomainEventBus` executes handlers on BOTH buses. If a handler exists on both buses for the same logical event, it runs twice.  
**Note**: This is by design per the comment at line 2 ("Bridges DDD domain events → platformBus + eventBus"). The risk is real but architectural intent. Document for awareness.

---

## PHASE J — REPAIR PIPELINE DISCONNECTS

### MC-J01 · `AutoHealEngine` doesn't listen to governance violation events
**Severity**: MEDIUM  
**Evidence**:
- `src/lib/auto-heal/auto-heal-engine.ts` lines 67–100: registered heal actions cover `protection-health-check` and `realtime-catchup`
- `text.integrity.violation`, `layout.integrity.violation`, `i18n.localization.violation` are defined in platformBus types and emitted by governance engines
- No heal action registered for these violation event types in `auto-heal-engine.ts`
**Problem**: Governance violations are emitted on platformBus but AutoHealEngine doesn't respond to them.  
**Note**: This area is partially within Task #39 scope (Discipline Infrastructure). Flagged for cross-task coordination.  
**Fix**: Add heal actions in `auto-heal-engine.ts` that respond to violation event types.

---

## SUMMARY BY COUNT

| Phase | Connections Missing/Broken | Highest Severity |
|-------|---------------------------|-----------------|
| A — Bus Split (Radar/Explore) | 4 items (MC-A01–A04) | CRITICAL |
| B — Wallet Payment Chain | 4 items (MC-B01–B04) | CRITICAL |
| C — Orbit Bridge Ghost Events | 6 items (MC-C01–C06) | HIGH |
| D — Dashboard Sync Gaps | 3 items (MC-D01–D03) | MEDIUM |
| E — Me Pillar Isolation | 2 items (MC-E01–E02) | HIGH |
| F — Support Engine Mismatch | 1 item (MC-F01) | HIGH |
| G — Flight Vertical Isolation | 1 item (MC-G01) | HIGH |
| H — Property Booking Disconnected | 1 item (MC-H01) | HIGH |
| I — Notation Migration | 3 items (MC-I01–I03) | LOW–MEDIUM |
| J — Repair Pipeline | 1 item (MC-J01) | MEDIUM |
| **TOTAL** | **26 items** | |
