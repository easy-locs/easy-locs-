# CANONICAL WIRING MODEL
*Easy-Locs Super-App v3 — The Permitted Data Flow Pattern + Violation Catalogue*
*Date: 2026-04-13 | All violations cite specific file + line range*

---

## THE CANONICAL MODEL

```
UI ACTION
   │
   ▼
STORE ACTION / COMMAND DISPATCH
   │  (Zustand store method or command-bus.ts dispatch)
   ▼
SERVICE / REPOSITORY LAYER
   │  (walletRepo, supportRepo, bookingRepo, etc. — all via db() from @/services/db)
   ▼
SUPABASE DB WRITE
   │
   ▼
platformBus.emit(event, payload, source)
   │  (single canonical event emission — colon-notation)
   │  (source file: src/lib/shared/platform-bus.ts, singleton: platformBus)
   ▼
ORCHESTRATOR / REACTION HANDLERS
   │  (installOrchestrationEngine, installCrossAppReactions,
   │   installStorefrontReactions, installNotificationEventBridge,
   │   installDashboardCacheListener — all installed in useMasterAppBootstrap.ts)
   ▼
ENGINE / SIDE EFFECTS
   │  (React Query invalidation, moduleRegistry.activateModule(), createAppNotification(), insertMessage())
   ▼
UI RE-RENDER
   │  (useQuery refetch via QueryClient.invalidateQueries)
```

### Canonical Source Files
| Role | File |
|------|------|
| Event bus singleton | `src/lib/shared/platform-bus.ts` — `platformBus` |
| Event type registry | `src/lib/shared/platform-bus.ts` `PlatformEventType` union (lines 1–279) |
| Canonical event constants | `src/lib/platform/events.ts` `APP_EVENTS` |
| Notation standard | COLON-notation only (e.g. `wallet:payment_success`, `orbit:message_sent`) |
| Bridge emitters | `src/lib/super-app-bridge.ts` — `bridgePayNow()`, `bridgeBookNow()`, `emitPropertyEvent()`, etc. |
| Reaction installers | `src/hooks/useMasterAppBootstrap.ts` — 4 staged installation phases |
| Boot sequence | stage-0 (50ms), stage-1 (1500ms), stage-2 (3000ms), stage-4 (8000ms) |
| Data access | `src/services/db.ts` → `db(table)` — all Supabase access |
| Engine lifecycle | `src/engines/core/engine-orchestrator.ts` — `EngineOrchestrator` singleton |
| Legacy bus (migration target) | `src/lib/core/event-bus.ts` — `eventBus` (async, to be replaced) |

---

## VIOLATION CATALOGUE

All violations are based on direct code inspection with file + line citations.

---

### VIOLATION CLASS 1: WRONG BUS (eventBus used instead of platformBus)

All emitters in this class should use `import { platformBus } from "@/lib/shared/platform-bus"` instead of `import { eventBus } from "@/lib/core/event-bus"`.

**V1-01** · `RadarView.tsx` emits on legacy `eventBus`  
*File*: `src/components/radar/RadarView.tsx`  
*Lines*: 20 (import), 204 (`eventBus.emit("RADAR_SCAN_COMPLETED", ...)`), 217 (`eventBus.emit("ENTITY_OPENED", ...)`)  
*Impact*: `platformBus.on("radar:entity_selected", ...)` listener in `super-app-bridge.ts` line 411 never fires; `radar-core` module never activates

**V1-02** · `RadarFilterMenu.tsx` emits on legacy `eventBus`  
*File*: `src/components/radar/RadarFilterMenu.tsx`  
*Lines*: 5 (import), 23 (`eventBus.emit("RADAR_FILTER_CHANGED", ...)`), 30 (`eventBus.emit("RADAR_FILTER_CHANGED", ...)`)  
*Impact*: Radar filter state changes not visible to platformBus listeners

**V1-03** · `MapPlaceCard.tsx` emits on legacy `eventBus`  
*File*: `src/components/map/MapPlaceCard.tsx`  
*Lines*: 15 (import), 70 (`eventBus.emit("map.route.focus", ...)`), 78 (`eventBus.emit("map.center.request", ...)`), 85 (`eventBus.emit("place.order.requested", ...)`), 258 (`eventBus.emit("ENTITY_OPENED", ...)`)  
*Impact*: Place card interactions not on canonical bus; entity selection never reaches module activation

**V1-04** · Explore domain components emit on legacy `eventBus`  
*Files and lines*:  
- `src/domains/explore/ExploreScreen.tsx` line 4 (import), line 17 (`eventBus.emit("explore.section.viewed", ...)`)  
- `src/domains/explore/ExploreAISuggestions.tsx` line 5 (import), lines 25, 32 (`eventBus.emit("explore.ai_suggestion.clicked", ...)`, `eventBus.emit("search.executed", ...)`)  
- `src/domains/explore/ExploreContinue.tsx` line 5 (import), lines 31, 38 (`eventBus.emit("entity.click", ...)`, `eventBus.emit("explore.continue.clicked", ...)`)  
- `src/domains/explore/ExploreEntitySection.tsx` line 6 (import), line 54 (`eventBus.emit("entity.click", ...)`)  
- `src/domains/explore/ExploreQuickActions.tsx` line 4 (import), lines 15, 23 (`eventBus.emit("explore.quick_action.clicked", ...)`, `eventBus.emit("wallet.action", ...)`)  
- `src/domains/explore/explore.view-model.ts` line 5 (import), line 165 (`eventBus.emit(event, payload)` via `emitExploreEvent()`)  
*Impact*: All Explore user interactions are invisible to platformBus reaction handlers

**V1-05** · `dashboard.view-model.ts` emits on legacy `eventBus`  
*File*: `src/families/dashboard/dashboard.view-model.ts`  
*Lines*: 12 (import), 89 (`eventBus.emit("HOME_SECTIONS_REFRESHED", ...)`)  
*Impact*: Dashboard view model events not on canonical bus

**V1-06** · `FloatingCTAButton.tsx` subscribes on legacy `eventBus`  
*File*: `src/components/engine/FloatingCTAButton.tsx`  
*Lines*: 9 (import), 55 (`eventBus.on("AI_DECISION_EXECUTED", handler)`), 56 (`return () => eventBus.off("AI_DECISION_EXECUTED", handler)`)  
*Impact*: If `AI_DECISION_EXECUTED` is emitted on platformBus, the CTA button will not react

**V1-07** · `gallery-save.service.ts` emits on legacy `eventBus`  
*File*: `src/domains/orbit/services/gallery-save.service.ts`  
*Lines*: 13 (import), 128 (`eventBus.emit("attachment.event.gallery_failed", ...)`), 153 (`eventBus.emit("attachment.event.gallery_saved", ...)`), 168 (`eventBus.emit("attachment.event.gallery_failed", ...)`)  
*Impact*: Gallery save/fail events are defined in `platform-bus.ts` PlatformEventType (lines 176–181) as expected on platformBus, but emitted on eventBus — any platformBus subscriber for these events never fires

**V1-08** · `global-support-engine.ts` emits support events on legacy `eventBus`  
*File*: `src/lib/support/global-support-engine.ts`  
*Lines*: 7 (import), 121 (`await eventBus.emit("support.ticket_created", { ticketId, ... })`), 181 (`await eventBus.emit("support.ticket_escalated", { ticketId, reason })`)  
*Impact*: Support ticket events do not reach platformBus. Dashboard, notification bridge, and Orbit thread creation all miss these events.

---

### VIOLATION CLASS 2: DIRECT SUPABASE IMPORT IN NON-AUTH PAGES

Per architecture rule: all data queries MUST use `db(table)` from `src/services/db.ts`. Only authentication pages are exempted.

**V2-01** · `MerchantPosPage.tsx` imports Supabase client directly  
*File*: `src/pages/MerchantPosPage.tsx`  
*Lines*: 2 (`import { supabase } from "@/integrations/supabase/client"`), 61 (Supabase channel subscription)

**V2-02** · `AdminLiveOpsPage.tsx` imports Supabase client directly  
*File*: `src/pages/AdminLiveOpsPage.tsx`  
*Lines*: 1 (`import { supabase } from "@/integrations/supabase/client"`), 18 (Supabase channel subscription)

**V2-03** · `AIOpsChatPage.tsx` imports Supabase client directly  
*File*: `src/pages/AIOpsChatPage.tsx`  
*Lines*: 5 (`import { supabase } from "@/integrations/supabase/client"`), 39 (Supabase subscription)

**V2-04** · `Receipts.tsx` imports Supabase types directly  
*File*: `src/pages/Receipts.tsx`  
*Lines*: 16 (`import type { Json } from "@/integrations/supabase/types"`)  
*Note*: Type-only import — lower risk, but still bypasses the service layer pattern.

*Legitimate exemptions (not violations)*: `Login.tsx`, `Signup.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`, `AuthCallbackPage.tsx`, `VerifyEmail.tsx` — authentication pages are exempted per architecture rule.

---

### VIOLATION CLASS 3: BUS EMIT WITHOUT DATA PERSISTENCE (Ghost Events)

**V3-01** · `bridgeContactProvider()` emits `orbit:thread_created` without DB write  
*File*: `src/lib/super-app-bridge.ts`  
*Lines*: 189–203 (`bridgeContactProvider()` function body)  
- Line 190: `platformBus.emit("orbit:thread_created", { ... }, "orbit")` — bus emit with no preceding DB write  
- Line 196: `platformBus.emit("orbit:message_sent", { ... }, "orbit")` — same  
*Listener*: Lines 407–409: `platformBus.on("orbit:thread_created", () => { invalidate("threads", "contacts"); })` — cache invalidation only  
*Impact*: UI refetches `threads` but finds no new thread in Supabase

**V3-02** · `bridgeOpenSupport()` emits `orbit:thread_created` with placeholder participant ID  
*File*: `src/lib/super-app-bridge.ts`  
*Lines*: 248–261 — line 249 emits `orbit:thread_created`, line 255 sets `participantId: "support-agent"` (string literal, not a valid DB identity)  
*Impact*: No real support thread created; support routing impossible

**V3-03** · `bridgeCreateConversation()` emits `orbit:thread_created` and `orbit:message_sent` without DB writes  
*File*: `src/lib/super-app-bridge.ts`  
*Lines*: 284–301 — line 285: `orbit:thread_created` emit; line 294: conditional `orbit:message_sent` emit  
*Impact*: Conversation appears created (cache invalidated) but no Supabase record exists

**V3-04** · `bridgeAttachPaymentContext()` emits `orbit:message_sent` without DB write  
*File*: `src/lib/super-app-bridge.ts`  
*Lines*: 303–315 — line 304: `platformBus.emit("orbit:message_sent", { ... }, "orbit")`  
*Impact*: Payment receipt context message never stored; disappears on page reload

**V3-05** · `bridgeAttachOrderContext()` emits `orbit:message_sent` without DB write  
*File*: `src/lib/super-app-bridge.ts`  
*Lines*: 317–330 — line 318: `platformBus.emit("orbit:message_sent", { ... }, "orbit")`  
*Impact*: Order context message never stored; disappears on page reload

---

### VIOLATION CLASS 4: NOTATION MISMATCH (Listener and emitter use different event name)

**V4-01** · `order-handlers.ts` listens on `"PAYMENT_SUCCESS"` but wallet emits `"wallet:payment_success"`  
*Listener file*: `src/lib/orchestration/handlers/order-handlers.ts` line 23: `platformBus.on("PAYMENT_SUCCESS", async (event) => { ... })`  
*Emitter file*: `src/stores/walletStore.ts` line 84: `platformBus.emit("wallet:payment_success", { ... }, "wallet")`  
*Bridge check*: `platform-bus.ts` lines 566–591 (NOTATION_BRIDGE) — does NOT map `wallet:payment_success` → `PAYMENT_SUCCESS`. Bridge only maps dot→colon, not colon→UPPERCASE.  
*Impact*: **CRITICAL** — order payment status never updated to "paid" after wallet payment

**V4-02** · `dashboard-cache-invalidator.ts` listens on `"order:completed"` — no emitter exists  
*Listener file*: `src/lib/dashboard/dashboard-cache-invalidator.ts` line 32: `platformBus.on(APP_EVENTS.ORDER_COMPLETED as any, ...)` where `APP_EVENTS.ORDER_COMPLETED = "order:completed"` (`events.ts` line 36)  
*Emitter check*: Searched all of `src/` — no `platformBus.emit("order:completed", ...)` found. `useStorefrontRealtime.ts` line 64 emits `storefront:order_completed` (different event, already handled at line 31).  
*Impact*: Dead listener — line 32 never executes. Dashboard still refreshes via the `storefront:order_completed` listener at line 31. Risk is confusion and false assumption that `order:completed` is used.

**V4-03** · `dashboard-cache-invalidator.ts` listens on `"rental:rent_call_paid"` — no emitter exists  
*Listener file*: `src/lib/dashboard/dashboard-cache-invalidator.ts` line 34: `platformBus.on(APP_EVENTS.RENTAL_RENT_CALL_PAID as any, ...)` where `APP_EVENTS.RENTAL_RENT_CALL_PAID = "rental:rent_call_paid"` (`events.ts` line 58)  
*Emitter check*: Searched all of `src/` — no `platformBus.emit("rental:rent_call_paid", ...)` found. Property management emits `pm:payment_received` via `super-app-bridge.ts` line 77.  
*Impact*: **HIGH** — Dashboard cache never refreshes from rent payment events. `pm:payment_received` is not an equivalent replacement (different event name, no dashboard-kpis invalidation path).

**V4-04** · UPPERCASE legacy event names still used in orchestration layer  
*File*: `src/lib/orchestration/handlers/delivery-handlers.ts` lines 20, 33, 36  
*Lines*: `platformBus.on("MISSION_CREATED", ...)` line 20, `platformBus.on("MISSION_ACCEPTED", ...)` line 25, `platformBus.on("MISSION_COMPLETED", ...)` line 33, `platformBus.emit("ORDER_DELIVERED", ...)` line 36  
*Impact*: These work only because the orchestration layer also emits in UPPERCASE. It's internally consistent but violates the canonical colon-notation standard. Any external listener using `mission:created` (colon) would not receive these events.

---

### VIOLATION CLASS 5: BUSINESS LOGIC IN STORES (Cross-domain coupling)

**V5-01** · `walletStore.markTransactionSuccess()` skips DB persistence  
*File*: `src/stores/walletStore.ts` lines 74–91  
*Lines*: 74–81 update in-memory state only via `set()`. No `walletRepo` call between lines 74–91. `walletRepo` is imported at line 5 but not used in this function.  
*Impact*: Transaction status in Supabase stays at original value (e.g. `"pending"`) permanently after payment success.

**V5-02** · `bookingStore.createBooking()` directly calls cross-domain store  
*File*: `src/stores/bookingStore.ts` lines 62–73  
*Lines*: Line 62: `const conversation = await useOrbitThreadStore.getState().createThread(...)` — booking store directly calls Orbit store. Line 73: `await sendSystemMessage(...)` — booking store sends an Orbit message.  
*Note*: This produces a REAL side effect (correct behavior) but is architecturally a cross-domain store coupling. The canonical pattern would have the booking store only emit a bus event, and the Orbit bridge handle thread creation. The direct coupling makes testing and refactoring harder.

---

### VIOLATION CLASS 6: WINDOW EVENT BUS BYPASS

**V6-01** · `super-app-bridge.ts` emits `window.CustomEvent` for currency change alongside platformBus  
*File*: `src/lib/super-app-bridge.ts`  
*Lines*: 495: `platformBus.on("system:currency_changed", () => { ... })`, line 497: `window.dispatchEvent(new CustomEvent("currency:changed"))`  
*Impact*: Currency change emits on platformBus (canonical) AND fires a native browser CustomEvent. Any component listening to `window.addEventListener("currency:changed")` gets a duplicate notification from a different channel, bypassing the canonical bus. Dual execution risk if components listen to both.

---

### VIOLATION CLASS 7: DOMAIN EVENT BUS DUAL-FAN-OUT

**V7-01** · `domain-event-bus.ts` fans out to both `platformBus` AND `eventBus`  
*File*: `src/domains/shared/domain-event-bus.ts`  
*Lines*: 2 (header: "Bridges DDD domain events → platformBus + eventBus"), 6 (import `platformBus`), 7 (import `eventBus`), 55 (`platformBus.emit(event.type, event.payload, event.source)`), 61 (`eventBus.emit(event.type, event.payload)`)  
*Impact*: Any domain event published via `DomainEventBus.publishDomainEvent()` executes handlers on BOTH buses. If a handler exists on both buses for the same event, it runs twice. Per the header comment, this is intentional for migration — but the dual execution risk is real.

---

### VIOLATION CLASS 8: CONCURRENT STORE WRITES WITHOUT DEBOUNCE

**V8-01** · `refreshModule()` called from multiple concurrent prefix listeners  
*File*: `src/lib/shared/platform-bus.ts` `installPlatformReactions()` lines 526–554  
*Lines*: `onPrefix("wallet:", ...)` → `refreshModule()`, `onPrefix("orbit:", ...)` → `refreshModule()`, `onPrefix("marketplace:", ...)` → `refreshModule()`, `onPrefix("pm:", ...)` → `refreshModule()`, `onPrefix("deal:", ...)` → `refreshModule()`, `onPrefix("booking:", ...)` → `refreshModule()`  
*Impact*: During sequences of related events (e.g. booking flow: `marketplace:booking_created` + `wallet:payment_success` + `orbit:thread_created`), `refreshModule()` is called 3 times in rapid succession on the same engine, each triggering a store update and potential rerender. No debounce between calls.

---

### VIOLATION CLASS 9: ASYNC BUSINESS LOGIC IN BUS LISTENERS

**V9-01** · `cross-app-reactions.ts` performs async DB write inside bus listener  
*File*: `src/lib/shared/cross-app-reactions.ts`  
*Lines*: ~63–83 (booking created listener body) — `insertMessage(...)` async call inside listener. No retry logic. Errors caught with empty catch or console.error only.  
*Impact*: DB write failures inside bus listeners are silently swallowed — message not inserted, no retry, no error surfaced to user.

**V9-02** · `storefront-reactions.ts` calls `toast.info/success` from bus listener  
*File*: `src/lib/shared/storefront-reactions.ts`  
*Lines*: 44, 71, 78, 104, 129 — various `toast.info(...)` and `toast.success(...)` calls inside `installStorefrontReactions()` bus listener callbacks  
*Note*: Functional but architecturally undesirable — the bus layer produces UI side effects (toast notifications), creating coupling between the event system and the rendering layer.

---

## VIOLATION SUMMARY

| Class | Description | Count | Highest Severity |
|-------|-------------|-------|-----------------|
| V1 — Wrong Bus | `eventBus` instead of `platformBus` | 8 | CRITICAL |
| V2 — Direct Supabase | Pages import supabase client directly | 4 | HIGH |
| V3 — Ghost Events | Bus emit without DB write | 5 | HIGH |
| V4 — Notation Mismatch | Listener and emitter use different event name | 4 | CRITICAL |
| V5 — Business Logic in Stores | Cross-domain store coupling or missing DB write | 2 | HIGH |
| V6 — Window Event Bypass | `window.dispatchEvent` alongside platformBus | 1 | MEDIUM |
| V7 — Domain Bus Dual Fan-out | Both buses receive same event | 1 | MEDIUM |
| V8 — Concurrent Store Writes | No debounce on rapid multi-event store updates | 1 | LOW |
| V9 — Async Logic in Listeners | DB writes / toasts inside bus listeners | 2 | MEDIUM |
| **TOTAL** | | **28** | |
