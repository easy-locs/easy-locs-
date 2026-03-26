# Cross-Platform Propagation Audit — V1

**Date**: 2026-03-26
**Status**: Audit Complete

---

## 1. LOCATION PROPAGATION

### Source of Truth
- **GPS**: `geoStore` (lib/geo/geo-store.ts) → fed by `geoService`
- **Selected Place**: `locationStore.selectedLocation` 
- **Zone Key**: computed by `getGeoBrainState()` from Geo Brain
- **Active Address Context**: `user_active_address_context` (DB)
- **Canonical Place**: `canonical_places` (DB)

### Canonical Events
| Event | Emitter | Purpose |
|-------|---------|---------|
| `address.context.updated` | geo-brain.ts | Address changed (manual/GPS) |
| `radar.context.refresh` | geo-brain.ts | Triggers radar + ETA refresh |
| `eta.context.refresh` | geo-brain.ts | Triggers ETA recalculation |
| `merchant.visibility.refresh` | geo-brain.ts | Triggers merchant visibility recompute |
| `geo.permission.changed` | platformBus | GPS permission state change |
| `geo.position.updated` | platformBus | GPS position update |

### Listeners
| Listener | Module | Event |
|----------|--------|-------|
| `geo-sync-engine` | dispatch context | `address.context.updated` → emits `dispatch.context.refresh` |
| `useGeoLiveStation` | geo live station | `radar.context.refresh` → refetches zone overlay |

### Consumers (Pages/Components)
- `AddressSelectorSheet` → `useLocationStore`, `setAddressFromPlace` (Geo Brain)
- `CanonicalAddressInput` → `useSearchBrain`, `useCanonicalAddress`
- `RadarPlaceSearch` → `searchBrain`, `useRadarPlaceStore`
- `CustomerLiveLocationPage` → `useLocationStore`
- `LocationSearchInput` → `useSearchBrain`, `useLocationStore`
- All radar/discovery pages → `useLocationStore` for coordinates

### ✅ Propagation Chain (VERIFIED)
```
GPS/Manual selection
  → Geo Brain (setAddressFromPlace)
    → locationStore.setSelectedLocation
    → locationStore.addRecentPlace
    → radarPlaceStore.setSelectedPlace
    → eventBus.emit("address.context.updated")
      → geo-sync-engine → dispatch.context.refresh
    → eventBus.emit("radar.context.refresh")
      → useGeoLiveStation → zone overlay refresh
    → eventBus.emit("eta.context.refresh")
    → eventBus.emit("merchant.visibility.refresh")
```

### ⚠️ Missing Listeners
1. **`eta.context.refresh`** — emitted but NO listener found. ETA engine does not react to location changes.
2. **`merchant.visibility.refresh`** — emitted but NO listener found. Merchant visibility does not auto-refresh.

### ⚠️ Partial Propagation
- Wallet context does NOT refresh on location change
- Orbit context does NOT refresh on location change
- Search Brain context updates implicitly (reads geoStore on each query) — OK

### Legacy Paths
- `useCurrentLocation` hook still exists as bridge but correctly delegates to `geoStore`/`locationStore` — **SAFE**
- `useLiveGeolocation` is a thin wrapper over `geoStore` — **SAFE**

### Score: **75/100**
- Missing: ETA listener, merchant visibility listener
- Missing: wallet/orbit context propagation on location change

---

## 2. ORBIT / COMMUNICATION PROPAGATION

### Source of Truth
- **Threads**: `conversations_v2` (DB) + Supabase Realtime
- **Messages**: `chat_messages_v2` (DB) + Supabase Realtime
- **Unread state**: derived from `chat_messages_v2`

### Canonical Events
| Event | Emitter | Purpose |
|-------|---------|---------|
| `message.sent` | platformBus (chatStore) | Message sent |
| `conversation.created` | platformBus (chatStore) | Thread created |
| `orbit:message_sent` | platformBus | Message sent (colon notation) |
| `orbit:thread_created` | platformBus | Thread created |
| `orbit:notification_created` | platformBus | Notification |
| `contact.opened` | platformBus | Contact viewed |

### Listeners
| Listener | Module | Event |
|----------|--------|-------|
| `installPlatformReactions` | orbit-engine refresh | `orbit:*` prefix → refreshModule("communication") |
| `event-init bridge` | eventBus | `message.sent` → `message.sent` on eventBus |
| `event-init bridge` | eventBus | `conversation.created` → `conversation.created` on eventBus |
| `useConversationsRealtime` | Supabase RT | `conversations_v2` + `chat_messages_v2` changes |

### Consumers
- Orbit thread pages → chatStore + Supabase Realtime
- Notification badge → notificationV2Store
- CommNearbySection → nearby users

### ✅ Verified Chain
```
User sends message
  → chatStore write → DB
  → Supabase Realtime → useConversationsRealtime → UI refresh
  → platformBus.emit("message.sent")
    → event-init bridge → eventBus.emit("message.sent")
      → notification handler
    → installPlatformReactions → refreshModule("communication")
```

### ⚠️ Missing Listeners
- No listener bridges Orbit threads to business context (order/job threads not auto-refreshed on Orbit events)

### Duplicate Truth Risk
- **LOW**: `conversations_v2` is the single DB truth. chatStore is the single write gate.

### Score: **85/100**
- Good Realtime coverage
- Missing: business context thread refresh

---

## 3. WALLET PROPAGATION

### Source of Truth
- **Balances**: `wallet_balances_v2` (DB)
- **Transactions**: `wallet_transactions` (DB)
- **Escrow**: `wallet_balances_v2.escrow` field
- **Payment status**: `storefront_orders.payment_status`

### Canonical Events
| Event | Emitter | Purpose |
|-------|---------|---------|
| `wallet.payment.success` | platformBus (walletStore) | Payment completed |
| `wallet.payment.failed` | platformBus (walletStore) | Payment failed |
| `wallet.transaction.created` | platformBus (walletStore) | New transaction |
| `wallet:balance_updated` | platformBus | Balance changed |
| `wallet:transfer_sent` | platformBus | Transfer sent |
| `wallet:transfer_received` | platformBus | Transfer received |
| `commerce:payment_authorized` | platformBus (wallet-engine) | Payment authorized |
| `commerce:payment_captured` | platformBus (wallet-engine) | Payment captured |
| `commerce:payment_settled` | platformBus (wallet-engine) | Payment settled |
| `commerce:payment_reversed` | platformBus (wallet-engine) | Payment reversed |
| `PAYMENT_SUCCESS` | platformBus | Legacy payment success |

### Listeners
| Listener | Module | Event |
|----------|--------|-------|
| `installPlatformReactions` | orbit-engine | `wallet:*` prefix → refreshModule("wallet") |
| `event-init bridge` | eventBus | `wallet.*` → `wallet.updated` on eventBus |
| `event-init bridge` | eventBus | `PAYMENT_SUCCESS` → `wallet.updated` |
| `event-init bridge` | eventBus | `qr.payment.completed` → `wallet.updated` |

### ⚠️ Missing Listeners
1. **`commerce:payment_*` events** — emitted by wallet-engine but NO listener processes them for UI refresh or Orbit notification
2. **Escrow status changes** — no dedicated event or listener
3. **Merchant payout** — no event for payout completion

### ⚠️ Partial Propagation
- `commerce:payment_authorized/captured/settled` events are emitted but NOT bridged to eventBus
- These events don't trigger wallet balance UI refresh or notifications
- Order payment status updates in DB but no Orbit thread notification

### Duplicate Truth Risk
- **MEDIUM**: `wallet:balance_updated` and `wallet.payment.success` both represent balance changes. Both get bridged to `wallet.updated`. Functionally OK but naming collision risk.

### Legacy Paths
- `PAYMENT_SUCCESS` (UPPERCASE) still active alongside `wallet.payment.success` — **DUPLICATED**

### Score: **65/100**
- Commerce payment lifecycle events are orphaned
- Escrow lifecycle not evented
- Legacy UPPERCASE events still active

---

## 4. RADAR PROPAGATION

### Source of Truth
- **Radar results**: `radarPlaceStore` (selected place, search query)
- **Geo context**: `locationStore` → Geo Brain
- **Live zone overlay**: `geo_live_zone_overlays` (DB) via `useGeoLiveStation`
- **Merchant data**: `storefront_pages` (DB)
- **Rider presence**: `rider_presence` (DB)

### Canonical Events
| Event | Emitter | Purpose |
|-------|---------|---------|
| `radar.context.refresh` | geo-brain.ts | Zone/location changed |
| `radar.decision.*` | radar-brain-orchestrator | Individual radar decisions |
| `radar.decisions.batch` | radar-brain-orchestrator | Batch decisions |

### Listeners
| Listener | Module | Event |
|----------|--------|-------|
| `useGeoLiveStation` | zone overlay | `radar.context.refresh` → refetch overlay |

### ⚠️ Missing Listeners
1. **`radar.decision.*`** — emitted but NO listener processes radar decisions for UI
2. **`radar.decisions.batch`** — emitted but NO listener
3. **Rider supply changes** — no event when rider availability changes
4. **Merchant availability changes** — no event when merchant goes online/offline
5. **Weather/traffic changes** — part of zone overlay but no event triggers refresh on change

### Consumers
- `RadarView` → useMemo over raw results, sorts locally (for radar entities, NOT search results — this is OK, it's entity sorting not address search)
- `RadarPlaceSearch` → Search Brain (correctly wired)
- `useGeoLiveStation` → zone overlay data

### ⚠️ Partial Propagation
- Location change triggers `radar.context.refresh` → only geo live station listens
- Radar entity list does NOT auto-refresh when zone changes
- ETA does not refresh (no listener on `eta.context.refresh`)

### Score: **60/100**
- Radar decisions are emitted but never consumed
- ETA refresh event is orphaned
- Merchant online/offline not evented to radar

---

## 5. DUPLICATE TRUTH CANDIDATES

| Domain | Competing Truths | Location | Risk |
|--------|-----------------|----------|------|
| Location | `locationStore.selectedLocation` vs `radarPlaceStore.selectedPlace` | Two stores | **LOW** — Geo Brain writes both atomically |
| Location | `geoStore.point` vs `locationStore.currentLocation` | Two stores | **LOW** — geoService syncs to both |
| Wallet | `PAYMENT_SUCCESS` vs `wallet.payment.success` | platformBus | **MEDIUM** — duplicate event names for same action |
| Wallet | `wallet:balance_updated` vs `wallet.transaction.created` | platformBus | **LOW** — different granularity, both bridge to same handler |

## 6. PARTIAL PROPAGATION FAILURES

| Trigger | What Updates | What Fails | Impact |
|---------|-------------|------------|--------|
| Location change | locationStore, radarPlaceStore, geo-sync | ETA cache, merchant visibility | Stale ETA/visibility until manual refresh |
| Wallet payment | wallet balance DB | Orbit thread context | No payment receipt in chat thread |
| Commerce payment lifecycle | DB order status | UI wallet balance, notifications | User doesn't see real-time payment status |
| Radar zone change | geo live station | Radar entity list | Entities not filtered by new zone |

## 7. LEGACY PROPAGATION PATHS

| Path | Domain | Effect | Action |
|------|--------|--------|--------|
| `PAYMENT_SUCCESS` (UPPERCASE) | Wallet | Bridges to `wallet.updated` | **KEEP** — still used by orchestrator |
| `ORDER_CREATED/DELIVERED` (UPPERCASE) | Commerce | Bridges to `order.created/completed` | **KEEP** — still used by orchestrator |
| `useAddressSearch` hook | Search | Unused (no imports) | **DELETE** |
| `address-search-ranking.ts` | Search | Standalone ranking module, not imported | **DEPRECATE** — Search Brain replaces it |

## 8. EVENT LAW AUDIT

### Location Events — ✅ CLEAN
- `address.context.updated` ✅
- `radar.context.refresh` ✅  
- `eta.context.refresh` ⚠️ orphaned
- `merchant.visibility.refresh` ⚠️ orphaned

### Wallet Events — ⚠️ DUPLICATE NAMING
- `wallet.payment.success` + `PAYMENT_SUCCESS` → same semantic, different format
- `commerce:payment_*` → 4 events, none consumed

### Orbit Events — ✅ CLEAN
- `message.sent`, `conversation.created` ✅
- `orbit:*` prefix reactions ✅

### Radar Events — ⚠️ ORPHANED
- `radar.decision.*` → emitted, never consumed
- `radar.decisions.batch` → emitted, never consumed

---

## 9. DOMAIN SCORES

| Domain | Score | Key Issues |
|--------|-------|------------|
| **Location** | 75/100 | 2 orphaned events, no wallet/orbit propagation |
| **Orbit** | 85/100 | Good RT coverage, minor business context gap |
| **Wallet** | 65/100 | Commerce lifecycle orphaned, legacy duplicates |
| **Radar** | 60/100 | Decision events orphaned, ETA orphaned |

### **GLOBAL PROPAGATION SCORE: 71/100**

| Metric | Count |
|--------|-------|
| Missing listeners | 7 |
| Duplicate events | 2 |
| Partial propagation failures | 4 |
| Legacy paths (safe) | 4 |
| Critical conflict risks | 0 |

---

## 10. PRIORITY FIX PLAN

### P0 — Critical (next sprint)
1. Add listener for `eta.context.refresh` → connect to ETA engine
2. Add listener for `merchant.visibility.refresh` → refresh merchant discovery
3. Bridge `commerce:payment_*` events to UI refresh + notifications

### P1 — Important
4. Add listener for `radar.decision.*` → apply to radar UI
5. Delete unused `useAddressSearch` hook
6. Deprecate `address-search-ranking.ts` (replaced by Search Brain)
7. Consolidate `PAYMENT_SUCCESS` into `commerce:payment_captured`

### P2 — Improvement
8. Add Orbit thread notification on payment status change
9. Add radar entity refresh on zone change
10. Add rider supply change event
11. Add merchant online/offline event to radar

---

## 11. ARCHITECTURE COMPLIANCE PROOF

```
GPS / Manual / Search
  → Geo Brain (SINGLE write gate)
    → locationStore + radarPlaceStore (atomic)
    → eventBus canonical events
      → geo-sync-engine (dispatch refresh)
      → useGeoLiveStation (zone overlay)
      → [MISSING: ETA listener]
      → [MISSING: merchant visibility listener]

Search Query
  → Search Brain (SINGLE ranking truth)
    → useSearchBrain hook
      → CanonicalAddressInput (display only)
      → RadarPlaceSearch (display only)
      → LocationSearchInput (display only)
    → NO local reranking in UI ✅

Payment
  → walletStore / wallet-engine
    → platformBus events
      → event-init bridge → eventBus
        → notification handler
      → installPlatformReactions → orbit-engine refresh
    → [MISSING: commerce lifecycle consumers]

Communication
  → chatStore → DB
    → Supabase Realtime → UI refresh
    → platformBus → event-init bridge → handlers
    ✅ Full chain verified
```
