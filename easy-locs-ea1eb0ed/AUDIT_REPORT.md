# Easy-Locs Full Project Audit
## Engine Effectiveness, SSOT, Orbit Duplicates, UI/UX, and 24/7 Monitoring

**Date**: April 12, 2026
**Method**: Runtime analysis, code trace, live screenshots, DB verification

---

## 1. ENGINE REALITY AUDIT

### Summary
There are **135 engine files** across 15 categories. Of these:
- **87 engines** return `actions: []` (empty) — they detect but never act
- **29 engines** push actions — but these are **string labels only** (e.g., "Flagged for admin review"), not actual mutations
- **0 engines** write to the database
- **0 engines** directly repair UI state
- **0 engines** remove/fix duplicate conversations

### Boot Timeline
Engines don't start until **8 seconds** after app mount:
| Timer | Delay | What Loads |
|-------|-------|------------|
| t0 | 50ms | Orchestration, cache invalidators |
| t1 | 1.5s | Platform reactions, connector hub |
| t2 | 3.0s | Domain cache listeners |
| t3 | 5.0s | Flow registry, stale cache scanner, auto-repair |
| t4 | **8.0s** | Engine system (Tier 1: 50 engines) |
| Tier 2 | **16.0s** | Architecture, business, AI engines (36 engines, **DEV only**) |
| Tier 3 | **20.0s** | Quality engines (22 engines) |
| t5 | 15.0s | Platform recovery |
| t6 | 18.0s | God core |
| t7 | 22.0s | Sentinel |
| t8 | 28.0s | Omega |

**Critical finding**: Tier 2 engines (including SSOTAuditor, LayoutConsistencyEngine, UXFrictionEngine, AccessibilityEngine) **only load in DEV mode** (`import.meta.env.DEV`). They never run in production.

### Per-Engine Reality Check

| Engine | Runs? | When? | Trigger | Reads | Writes/Emits | Visible Effect | 24/7? | Connected? |
|--------|-------|-------|---------|-------|-------------|----------------|-------|-----------|
| **ConversationConsistencyEngine** | Yes | Every 60s | Timer | DOM `[data-conversation-id]` | Nothing | **NONE** — detects duplicates but doesn't fix them | Timer-based | **DISCONNECTED** — no component renders `data-conversation-id` attribute, so DOM query always returns 0 |
| **MessageDeliveryEngine** | Yes | Every 15s | Timer + platformBus | In-memory sent/delivered map | Nothing | None | Timer-based | Partially — listens to events but takes no action on stale messages |
| **LedgerIntegrityEngine** | Yes | Every 60s | Timer + platformBus | In-memory event log | Nothing | None | Timer-based | Listens to `wallet:balance_updated` but only logs findings |
| **FraudWatchEngine** | Yes | Every 30s | Timer + platformBus | In-memory transfer log | Nothing | None | Timer-based | Listens to `wallet:transfer_sent` — observe-only |
| **AutoFixEngine** | Yes | Every 45s | Timer | navigator.onLine, performance.memory | Emits events | Minimal — online recovery flag | Timer-based | Partially — clears sessionStorage offline flag |
| **AutoRemediationEngine** | Yes | On governance sweep | Data quality system | Governance violations | Emits `ui-engine:report` | Only within data-quality sweep context | Event-driven | Connected to governance pipeline only |
| **ErrorClassifier** | Yes | Every 30s | Timer | window.onerror, console.error | In-memory log | None | Timer-based | Observe-only |
| **RollbackEngine** | Yes | Every 60s | Timer | Engine observer stats | Nothing | None | Timer-based | Observe-only |
| **SyncRepairEngine** | Yes | Every 30s | Timer | Realtime channel state | Emits `system:sync_repair` | None visible | Timer-based | Emits event but no consumer acts on it |
| **PresenceHealthEngine** | Yes | Every 20s | Timer | Supabase presence | Nothing | None | Timer-based | Observe-only |
| **PageOpenEngine** | Yes | Continuous | Route changes | Active page tracking | In-memory stats | None — stats only visible in admin dashboard | Event-driven | Connected to router events |
| **ActionWiringEngine** | Yes | Continuous | Click events | CTA click tracking | In-memory stats | None visible | Event-driven | Tracks dead clicks but doesn't fix them |
| **RuntimeHealthEngine** | Yes | Every 30s | Timer | Supabase channel health | Nothing | None | Timer-based | Observe-only |
| **SSOTAuditor** | DEV only | Every 120s | Timer | Module registry | Nothing | None | DEV-only | **Never runs in production** |
| **LayoutConsistencyEngine** | DEV only | Every 60s | Timer | DOM layout | Nothing | None | DEV-only | **Never runs in production** |
| **UXFrictionEngine** | DEV only | Every 45s | Timer | DOM interactions | Nothing | None | DEV-only | **Never runs in production** |
| **AccessibilityEngine** | DEV only | Every 60s | Timer | DOM a11y checks | Nothing | None | DEV-only | **Never runs in production** |
| All Quality engines (22) | Yes | Every 30-120s | Timer | DB reads (storefront_pages, profiles, wallet_transactions) | Nothing | None | Timer-based | Read-only monitoring, no remediation |

### Key Verdict
**The engines are a comprehensive monitoring/observation layer with very limited user-facing effect.** Most engines detect issues and log them to in-memory arrays. A repair pipeline exists (`repair-bridge.ts` + `repair-actions.ts`) that can perform DOM/localStorage mutations when triggered, but the connection between engine findings and actual repair actions is narrow and indirect. The `AutoFixEngine` does perform real side effects (online recovery via sessionStorage, memory pressure events), and some engines emit events that the repair bridge can consume — but for the vast majority of engines, findings are only visible in the admin engine dashboard, which end users never see. No engine currently removes duplicate conversations, fixes alignment, or translates text.

---

## 2. SINGLE SOURCE OF TRUTH (SSOT) AUDIT

### Per-Pillar SSOT Analysis

| Pillar | SSOT Table | Conflict Sources | Verdict |
|--------|-----------|-----------------|---------|
| **Dashboard** | `dashboard_counters` (query cache) | Counter values computed from multiple tables (bookings, orders, tenants, etc.) — no canonical aggregation table | **WEAK** — counters re-derived on each load, cache invalidation is event-driven but can drift |
| **Radar** | `storefront_pages` + `marketplace_services` | Provider data in `profiles`, `orbit_profiles_v2`, and `storefront_pages` — same provider can have inconsistent names across tables | **CONFLICT** — provider identity split across 3 tables |
| **Orbit** | `conversations_v2` (V2) + 6 legacy tables | Business threads derived from `marketplace_bookings`, `concierge_orders`, `booking_requests`, `real_estate_leads`, `guest_sessions`, `tenants` PLUS `conversations_v2` PLUS `deal_rooms` — all merged in client code | **CRITICAL CONFLICT** — 8 data sources merged in JavaScript with fragile key matching |
| **Wallet** | `wallet_balances_v2` | Balance also derivable from `wallet_transactions` + `unified_wallet_transactions` — no DB-level consistency check between balance and sum-of-transactions | **WEAK** — balance truth depends on Edge Function atomicity, no periodic reconciliation |
| **Me** | `profiles` + `orbit_profiles_v2` | User identity split: `profiles` (auth), `orbit_profiles_v2` (display name, avatar), `wallet_accounts` (owner) — name/avatar can differ between them | **CONFLICT** — user identity not unified |
| **QR Identity** | `qr-engine.ts` generates from `profiles` | Legacy `el-contact` format and canonical `?userId=` format both accepted — backward-compatible but two representations exist | **OK** — converges to single user ID |
| **Conversations** | `conversations_v2` with unique index | DB unique index prevents duplicate direct conversations, BUT the client still loads and merges legacy entities that can create visual duplicates in the thread list | **PARTIAL** — DB is clean, client rendering is not |
| **Wallet Balance** | `wallet_balances_v2` | Balance fetcher checks Zustand store first (`useWalletStore`), then falls back to DB — store can be stale | **WEAK** — dual-path read (store vs DB) with no guaranteed freshness |

### Specific Conflict Points
1. **Provider name**: `profiles.full_name` vs `orbit_profiles_v2.display_name` vs `storefront_pages.business_name` — same provider can show 3 different names in Dashboard, Radar, and Orbit
2. **Conversation list**: 8 source tables merged via JS Map with key prefixes (`booking-`, `tenant-`, `lead-`, `guest-`, `v2-direct-`, `business-`, `deal-`) — merge relies on `context_id` matching which can be null
3. **Wallet balance**: Zustand store (in-memory) vs `wallet_balances_v2` (DB) — no invalidation guarantee

---

## 3. ORBIT DUPLICATE AUDIT

### Why Duplicates Still Appear

**Root Cause 1: No client-side dedup by peer user ID**
The thread mapper uses Map keys like `v2-direct-{conversationId}`. If a user has two separate conversation records in `conversations_v2` (e.g., one created before the unique index, or one via legacy path), they get two different Map keys and render as two list items.

**Root Cause 2: Legacy + V2 merge failure**
The `findExistingLegacyThread()` function only matches on `context_id`, `bookingId`, `tenantId`, or `leadId`. If a V2 business conversation has `context_id: null` (which is allowed by the schema), it creates a NEW thread entry instead of merging with the existing legacy booking thread. Result: same conversation appears twice — once as `booking-{id}` and once as `business-{v2id}`.

**Root Cause 3: Direct conversations with missing participants**
For direct conversations, the mapper has TWO code paths:
- Path A (lines 197-220): Handles conversations where `participants` is empty but `participant_ids` exists
- Path B (lines 221-254): Handles conversations with populated `participants` JSONB
Both paths generate `v2-direct-{conv.id}` keys, but if the same logical conversation has data in both formats (e.g., after a migration), it could be processed differently or filtered out of one path but included in another.

**Root Cause 4: The ConversationConsistencyEngine is blind**
The engine queries the DOM for `[data-conversation-id]` attributes, but **no component in the app renders this attribute**. A grep for `data-conversation-id` in .tsx files returns zero matches. The engine always sees 0 conversations and never detects duplicates.

**Root Cause 5: No post-merge dedup**
After the Map is populated, `normalizeAndSort()` simply converts to array and sorts. There is no final dedup pass that would collapse threads with the same `peerUserId` into a single entry.

### DB Constraint Status
The unique index `uq_conversations_v2_direct_pair` on `conversations_v2` IS working — it prevents NEW duplicate direct conversations from being created. But it does NOT:
- Remove pre-existing duplicates in the DB
- Prevent the client from rendering the same person via different thread sources (legacy booking + V2 conversation)
- Deduplicate the visual list when multiple source tables reference the same business relationship

### What Would Fix It
1. Add a final dedup pass in `normalizeAndSort()` that collapses threads with the same `peerUserId`
2. Add `data-conversation-id` attributes to `HudConversationCard` so the ConsistencyEngine can actually see conversations
3. Make the ConsistencyEngine actively remove duplicate DOM elements or trigger a re-render with deduped data
4. Run a one-time DB cleanup to merge any pre-existing duplicate conversations

---

## 4. UI / UX / i18n / LAYOUT AUDIT

### Hardcoded English Strings (i18n failures)

| File | Line | String | Should Be |
|------|------|--------|-----------|
| PinEntryDialog.tsx | 15 | `"Enter Wallet PIN"` | `t("wallet.pin_title")` |
| PinEntryDialog.tsx | 46 | `"Wrong PIN"` | `t("wallet.pin_wrong")` |
| PinEntryDialog.tsx | 51 | `"Server error. Try again."` | `t("wallet.pin_error")` |
| PinEntryDialog.tsx | 124 | `"Verifying..."` | `t("wallet.pin_verifying")` |
| ReceiveQrPanel.tsx | 24 | `"Me"` | `t("common.me")` |
| ReceiveQrPanel.tsx | 71 | `"Sign in to generate your QR code."` | `t("wallet.qr_sign_in")` |
| ReceiveQrPanel.tsx | 96 | `"My Payment QR"` | `t("wallet.my_payment_qr")` |
| ReceiveQrPanel.tsx | 105 | `"Easy-Locs Wallet · "` | `t("wallet.brand_prefix")` |
| ReceiveQrPanel.tsx | 123 | `"Request amount (optional)"` | `t("wallet.request_amount")` |
| ReceiveQrPanel.tsx | 151 | `"Custom amount"` | `t("wallet.custom_amount")` |
| thread-mapper.ts | 56/69/82/96/109 | `"Client"`, `"Guest"`, `"Visitor"`, `"Contact"` | `t("orbit.default_*")` |
| WalletSecurityPanel.tsx | 64 | `"AED"` hardcoded fallback | Should use user's locale currency |

### Layout / Alignment Issues

1. **Wallet quick actions grid**: 4-column grid (`grid-cols-4`) on narrow devices causes label truncation for actions like "International Transfer" — no responsive breakpoint to switch to 2 columns
2. **Wallet stats chips**: 3-column grid inconsistent with 4-column quick actions — visual rhythm broken
3. **Input font size hardcoding**: `ReceiveQrPanel` forces `fontSize: "16px"` to prevent iOS zoom, but this overrides the app's typography scale
4. **Z-index conflicts**: `PinEntryDialog` uses `z-[60]` while other overlays may use higher values — no z-index system
5. **Touch targets**: Header action buttons (`app-page-header-btn`) rely on default padding — may be smaller than 44x44px minimum
6. **Bottom nav overlap**: Fixed 72px height but content doesn't always account for safe-area-inset-bottom on notched devices

### Text Hierarchy Issues
1. Conversation names in Orbit fall back to `"Contact"` when no name is available — no visual distinction between unnamed contacts
2. Wallet balance display doesn't indicate loading vs zero balance vs error state clearly
3. Transaction rows use the same visual weight for pending vs completed transactions

### RTL Readiness
- No `dir="rtl"` support detected in layout components
- Flex layouts use `flex-row` without `rtl:flex-row-reverse` variants
- Arabic is listed as a supported language but layout doesn't flip

### Responsive Behavior
- Landing page works well on desktop (Navy/Gold dark theme)
- Auth pages are properly centered
- Wallet page skeleton shows correct proportions but loaded state needs testing with real data

---

## 5. ENGINE WIRING GAPS

### Engines That Exist But Are Not Connected

| Engine | platformBus | Domain Store | Real UI Effect | Repair Pipeline | Telemetry |
|--------|------------|-------------|---------------|----------------|-----------|
| ConversationConsistencyEngine | No sub | No | **NONE** (blind DOM query) | No | In-memory only |
| UnreadIntegrityEngine | No sub | No | None | No | In-memory only |
| SyncRepairEngine | Emits event | No consumer | None | No | In-memory only |
| OptimisticUIEngine | No sub | No | None | No | In-memory only |
| GroupIntegrityEngine | No sub | No | None | No | In-memory only |
| MediaFlowEngine | No sub | No | None | No | In-memory only |
| LocationIntegrityEngine | No sub | No | None | No | In-memory only |
| GeocodeRepairEngine | No sub | No | None | No | In-memory only |
| RoutingQualityEngine | No sub | No | None | No | In-memory only |
| ETAAccuracyEngine | Events only | No | None | No | In-memory only |
| CallHealthEngine | Events only | No | None | No | In-memory only |
| NetworkAdaptationEngine | No sub | No | None | No | In-memory only |
| ReconnectEngine | No sub | No | Minimal (emits event) | No | In-memory only |
| All Security engines (5) | No sub | No | None | No | In-memory only |
| All Data normalizers (6) | No sub | No | None | No | In-memory only |
| All Quality engines (22) | DB reads | No writes | None | No | In-memory only |

### Engine → UI Connection Score: 2/135
Only 2 engines have any visible UI effect:
1. **PageOpenEngine** — tracks page load metrics (visible only in admin dashboard)
2. **ActionWiringEngine** — tracks dead clicks (visible only in admin dashboard)

All other engines are completely invisible to end users.

---

## 6. 24/7 MONITORING MODEL

### Always-On (Timer-Based, Running Continuously After Boot)
- Tier 1 engines (50): Start at 8s, tick every 15-120s
- Tier 3 quality engines (22): Start at 20s, tick every 30-120s
- Stale cache scanner: Every 60s (starts at 5s)
- Auto-repair engine: Every 45s (starts at 5s)
- Realtime health check: Every 30s (starts at 5s)

**But**: All are observe-only. None repair. None write to DB. None modify UI.

### Event-Driven (React to Platform Events)
- MessageDeliveryEngine: Listens to `orbit:message_sent/delivered`
- LedgerIntegrityEngine: Listens to `wallet:balance_updated`
- FraudWatchEngine: Listens to `wallet:transfer_sent`
- Notification handler: Listens to notification events
- Cache invalidators (12+): React to domain events and invalidate React Query cache

**But**: Event-driven engines only record events in memory. No actions taken.

### DEV-Only (Never in Production)
- **SSOTAuditor** — the SSOT enforcement engine only runs in dev
- **LayoutConsistencyEngine** — layout checking only in dev
- **UXFrictionEngine** — UX friction detection only in dev
- **AccessibilityEngine** — a11y checks only in dev
- **DesignRegressionEngine** — design regression only in dev
- **InteractionOptimizer** — interaction optimization only in dev
- All Tier 2 engines (36 total) — architecture, business, AI, support, observability, release, code-quality

**This is the most critical gap**: The engines that would catch SSOT violations, layout issues, UX friction, and accessibility problems **never run in production**.

### Dead/Unconsumed
- **ConversationConsistencyEngine**: Queries DOM for attribute no component renders — always blind
- **SyncRepairEngine**: Emits `system:sync_repair` event — no consumer listens for it
- **OptimisticUIEngine**: Tracks optimistic updates but has no connection to actual Orbit state
- **MediaFlowEngine**: Monitors media uploads but takes no action on failures

---

## 7. CONCRETE IMPROVEMENT PLAN

### Phase A: Orbit Duplicate Elimination (Highest Impact, ~2 days)

**A1. Client-side dedup pass** (thread-sorter.ts)
Add a final dedup step after sorting that collapses threads with the same `peerUserId`:
- Group threads by `peerUserId`
- Keep the one with the most recent `lastMessageTime`
- Merge unread counts
- Priority: V2 conversation > legacy booking > legacy tenant

**A2. Wire ConversationConsistencyEngine**
- Add `data-conversation-id={thread.threadId || thread.id}` to `HudConversationCard`
- Make the engine emit `orbit:duplicate_detected` on platformBus when it finds duplicates
- Add a consumer that triggers thread list reload with forced dedup

**A3. DB cleanup migration (SAFETY-CRITICAL)**
- Query for duplicate direct conversations with same `metadata.direct_user_ids`
- Keep newest, archive/soft-delete older ones — must check for FK references from `chat_messages_v2` to avoid message orphaning
- Verify unique index catches all new duplicates
- NOTE: The existing unique index `uq_conversations_v2_direct_pair` was created successfully, which confirms no pre-existing duplicates existed at migration time. However, any conversations created via legacy paths AFTER the index was added but BEFORE client code was updated could still create visual duplicates in the thread list (different conversation records for the same user pair with different `context_id` values)

### Phase B: Engine Action Wiring (~3 days)

**B1. Make engines write repair actions**
- ConversationConsistencyEngine: When duplicates detected, call `setThreads()` with deduped list
- UnreadIntegrityEngine: When counts drift, reset unread badge via store
- SyncRepairEngine: When sync gap detected, trigger actual Supabase channel reconnect

**B2. Enable Tier 2 in production**
- Remove `import.meta.env.DEV` gate from Tier 2 loading (line 421 of engine-registry.ts)
- Or: selectively enable SSOTAuditor, LayoutConsistencyEngine, UXFrictionEngine in production

**B3. Add engine telemetry output**
- Create `engine_findings` table in Supabase
- Have engines write significant findings (not just memory)
- Enable historical trend analysis

### Phase C: SSOT Enforcement (~2 days)

**C1. Unify identity source**
- Single canonical profile resolver that merges `profiles` + `orbit_profiles_v2` + `storefront_pages`
- All UI components read from this resolver, never directly from individual tables
- Cache with platformBus invalidation

**C2. Wallet balance consistency**
- Remove Zustand store as first-read source in `wallet-balance-fetcher.ts`
- Always read from `wallet_balances_v2` (DB is the truth)
- Use store only for optimistic UI with guaranteed revalidation

**C3. Dashboard counter canonical source**
- Create materialized view or RPC that provides canonical counts
- Replace client-side multi-table aggregation

### Phase D: i18n / UI Polish (~2 days)

**D1. Extract all hardcoded strings**
- Replace 12+ hardcoded English strings in Wallet components with `t()` calls
- Replace all fallback names ("Client", "Guest", "Contact") with translated defaults
- Add missing translation keys to all 31 language files

**D2. Layout fixes**
- Wallet quick actions: `grid-cols-4 md:grid-cols-4` → `grid-cols-2 sm:grid-cols-4`
- Add `min-h-[44px] min-w-[44px]` to all interactive elements
- Implement z-index scale system (modals: 50, sheets: 40, toasts: 60, PIN: 70)
- Add `safe-area-inset-bottom` padding to content areas

**D3. RTL foundation**
- Add `dir` attribute support to layout containers
- Add `rtl:` variants to critical flex layouts
- Test with Arabic locale

### Phase E: 24/7 Monitoring Reality (~1 day)

**E1. Engine health dashboard for users**
- Surface 3-5 key engine metrics in the app's Status/Me section
- Show: message delivery health, conversation integrity, wallet balance freshness, sync status

**E2. Alerting**
- When ConversationConsistencyEngine detects duplicates: show user-facing banner "Optimizing your conversations..."
- When SyncRepairEngine detects gap: show subtle reconnection indicator
- When wallet balance drifts: trigger forced refresh

### Execution Priority
1. **Phase A** — fixes the most visible user pain (duplicate conversations)
2. **Phase D** — fixes visible quality issues (hardcoded text, layout)
3. **Phase C** — prevents future data conflicts
4. **Phase B** — makes engines actually useful
5. **Phase E** — makes monitoring visible

---

## BOTTOM LINE

The engine system is **architecturally impressive but operationally narrow**. 135 engines run, tick, detect findings — but the bridge between detection and correction is thin. A repair pipeline exists and can perform real mutations, but most engines don't feed into it. The `actions` arrays are mostly diagnostic labels. No engine writes corrections to the database. The SSOT enforcement engine (SSOTAuditor) and all Tier 2 engines (36 total, including UX, layout, accessibility, and design regression) only run in development mode and never in production. The ConversationConsistencyEngine that should catch Orbit duplicates queries a DOM attribute that no component renders.

The engines need to **act on what they detect** — especially for Orbit dedup, identity consistency, and i18n coverage. The repair pipeline infrastructure is there; it just needs to be connected to the engines that find real issues.
