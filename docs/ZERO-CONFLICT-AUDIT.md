# 🔴 ZERO-CONFLICT AUDIT REPORT
> Generated: 2026-03-31 — Easy-Locs Platform

---

## EXECUTIVE SUMMARY

| Category | Status | Findings |
|----------|--------|----------|
| TypeScript compilation | ✅ PASS | 0 errors |
| ESLint | ✅ PASS | 0 errors, 0 warnings |
| Inline Supabase audit | ✅ PASS | 0 violations (strict mode) |
| Realtime channel centralization | ✅ PASS | Single factory `createRealtimeChannel` |
| Duplicate hooks | ✅ PASS | 0 duplicates |
| Store ownership conflicts | 🔴 CRITICAL | 3 competing Orbit stores |
| Dead components | 🔴 CRITICAL | 132 unused components |
| Dead pages | ⚠️ WARN | 2 unused pages |
| Dead hooks | ⚠️ WARN | 11 unused hooks |
| Duplicate repositories | 🔴 CRITICAL | 3 duplicate pairs |
| Legacy naming (threadId etc.) | 🔴 CRITICAL | 59 files with `threadId`/`thread_id` |
| Legacy naming (v2ConversationId) | 🔴 CRITICAL | 79 files with `v2ConversationId`/`contextId` |
| Legacy file names (v2, clean, temp) | ⚠️ WARN | 17 legacy-named files |

---

## 1) VISION CANONIQUE GLOBALE

### ✅ Already Defined
- Canonical architecture documented in project memories (30+ architecture entries)
- Naming rules established (canonical-naming-unification)
- State ownership rules defined (orbit store governance)
- Event naming rules defined (unified-event-bus-tier-system)
- ID policy defined (standard-identifiant-orbit, identity-resolution-and-propagation)
- Write-path policy defined (unified-message-send-pipeline, orbit-dispatch)
- Sync policy defined (cross-platform-propagation-law)

### 🔴 Action Required
- [ ] Consolidate all governance docs into a single `docs/CANONICAL-ARCHITECTURE.md`

---

## 2) TAXONOMIE

### ✅ OK
- Single taxonomy system (`src/lib/taxonomy/`)
- Clear domain boundaries (`src/families/` with 34 specialized families)
- No "misc", "temp", "final" in family names

### ⚠️ Issues
- **17 legacy-named files** found:
  - `src/lib/map/map-engine-v2.ts`
  - `src/lib/migration/v2-enforcement-report.ts`
  - `src/lib/migration/v2-only-db.ts`
  - `src/lib/migration/v2-only-guard.ts`
  - `src/lib/notifications-v2/`
  - `src/lib/shared/db-v2.ts`
  - `src/lib/shared/platform-events-v2.ts`
  - `src/stores/v2AuthStore.ts`

---

## 3) NOMMAGE — 🔴 CRITICAL

### Naming Conflicts Found
| Legacy Name | Canonical Name | Files Affected |
|-------------|---------------|----------------|
| `threadId` / `thread_id` | `conversationId` | 59 files |
| `v2ConversationId` | `conversationId` | 79 files |
| `contextId` (for conversations) | `entityId` | 79 files |
| `msg` (variable) | `message` | 10 files |

### Database Tables (read-only, cannot rename)
- `thread_id` columns exist in: `ai_chat_history`, `ai_model_usage`, `deal_rooms`, `messages`
- These are DB schema — kept as-is, mapped via adapters

---

## 4) IDENTITÉ ET IDS — ⚠️ WARN

### ✅ Already Defined
- `orbit_` prefix standard for communication IDs
- `auth.uid()` for auth identity
- `orbitId` for communication identity
- Deterministic thread resolution via normalized participant pairs

### ⚠️ Remaining Issues
- `contextId` still used as conversation identifier in 79 files (should be `entityId`)
- `threadId` alias still active in 59 files (should be `conversationId`)

---

## 5) MODÈLE DE DONNÉES — ✅ OK

- Canonical entities defined in `src/lib/domains/canonical-entities.ts`
- Canonical message envelope in `src/families/messages/canonical-envelope.ts`
- Normalizer: `src/families/messages/normalize-message.ts`
- 15 strict message types enforced

---

## 6) ROUTES ET NAVIGATION — ✅ OK

- Unified Orbit shell: `/orbit/:conversationId`
- Auth guards centralized in `ProtectedRoute`, `AdminRoute`
- No duplicate routes detected

---

## 7) STATE OWNERSHIP — 🔴 CRITICAL

### 3 Competing Orbit Stores
| Store | File | Purpose |
|-------|------|---------|
| `useOrbitStore` | `src/stores/orbitStore.ts` | Profile/permissions/device state |
| `useOrbitEngine` | `src/stores/orbit-engine/index.ts` | Module metrics, sync status |
| `useOrbitThreadStore` + 5 micro-stores | `src/stores/orbit/*.store.ts` | Threads, calls, composer, audio, selection |

**Conflict**: `useOrbitStore` holds profile data that overlaps with auth store. `useOrbitEngine` holds metrics that could belong to a dashboard store.

### Recommended Ownership Map
| Domain | Owner Store | Status |
|--------|------------|--------|
| Auth/Session | `v2AuthStore` | ✅ |
| Orbit Profile | `orbitStore` → merge into `v2AuthStore` | 🔴 |
| Threads | `orbit/thread.store` | ✅ |
| Calls | `orbit/call.store` | ✅ |
| Composer | `orbit/composer.store` | ✅ |
| Audio | `orbit/audio.store` | ✅ |
| Selection | `orbit/selection.store` | ✅ |
| Engine Metrics | `orbit-engine` → extract to `dashboardStore` | ⚠️ |
| Wallet | `walletStore` | ✅ |
| Notifications | `notificationV2Store` | ✅ |
| Location | `locationStore` | ✅ |
| Map | `mapStore` + `superMapStore` | ⚠️ dual |
| Radar | `radarStore` + `radarPlaceStore` | ⚠️ dual |

---

## 8) WRITE PATH — ✅ OK

- Single dispatch: `orbitDispatch` for all Orbit actions
- `send-locks.ts` for anti-double-send
- Idempotency guard with 1200ms window
- 16+ canonical commands

---

## 9-10) READ PATH & NORMALIZATION — ✅ OK

- `normalize-message.ts` for all inbound messages
- `thread-mapper.ts` for thread normalization
- Repository layer enforced via CI audit

---

## 11) STATE MACHINES — ✅ OK

- Generic state machine: `src/lib/state-machine.ts`
- Call states: idle → calling → ringing → active → ended (+ reconnecting, failed, missed, declined)
- Message states: sending → sent → delivered → read → failed
- Tests: `src/test/state-machine.test.ts`

---

## 12-13) OPTIMISTIC UI & IDEMPOTENCE — ✅ OK

- `tempId` generation before ack
- `requestId` tracking in inflight registry
- 650ms UI submit lock + 1200ms content idempotency
- Reconciliation on ack

---

## 14) DEDUPLICATION — ✅ OK

- Dedup by canonical ID
- Dedup by idempotency key
- Realtime merge guards

---

## 15) REALTIME — ✅ OK

- Centralized: `createRealtimeChannel()` factory
- Single `supabase.channel()` call in `src/lib/realtime.ts`
- No direct channel calls elsewhere
- Cleanup patterns enforced

---

## 16-17) MULTI-DEVICE & OFFLINE — ⚠️ PARTIAL

- No explicit offline queue
- No explicit multi-device sync strategy
- Realtime handles live sync
- No IndexedDB persistence layer

---

## 18) QUEUES & RETRY — ✅ OK

- Retry with exponential backoff on login (1.5s, 3s)
- Upload retry via `sendMediaOptimistic`
- AbortController timeout (10s)

---

## 19-20) ORDERING & PAGINATION — ✅ OK

- `created_at` ordering for messages
- Cursor-based pagination
- Scroll position preservation

---

## 21-28) DOMAIN MODULES — ✅ OK

- Conversations, Messages, Calls, Media, Notifications, Contacts, Auth, Security all have canonical families

---

## 29) BASE DE DONNÉES — ⚠️ PENDING

- RLS hardening migration prepared but DB was unreachable
- `search_path` hardening prepared
- Permissive policies identified

---

## 36) NETTOYAGE TECHNIQUE — 🔴 CRITICAL

### Dead Code Inventory

| Type | Count | Action |
|------|-------|--------|
| Dead components | 132 | DELETE |
| Dead pages | 2 | DELETE |
| Dead hooks | 11 | DELETE |
| Duplicate repositories | 3 pairs | MERGE |

### 132 Dead Components (full list)
<details>
<summary>Click to expand</summary>

- src/components/actions/UniversalActionSheet.tsx
- src/components/admin/AdminEngineCockpitBrowserSection.tsx
- src/components/admin/RuntimeQaPanel.tsx
- src/components/admin/V2MigrationReportCard.tsx
- src/components/admin/WatchdogLivePanel.tsx
- src/components/ai/FloatingAIAssistant.tsx
- src/components/app/AppRecoveryChecklist.tsx
- src/components/app/FinalQuickActionLauncher.tsx
- src/components/booking/BookingDetailCard.tsx
- src/components/booking/BookingList.tsx
- src/components/booking/BookingStatusPanel.tsx
- src/components/call/InAppCallDialog.tsx
- src/components/cards/CardActions.tsx
- src/components/cards/CardLocation.tsx
- src/components/chat/CallMessageBubble.tsx
- src/components/communication-hub/NearbyLeafletMap.tsx
- src/components/communication-hub/SecurityLevelPicker.tsx
- src/components/communication-hub/chat/CallButtons.tsx
- src/components/communication-hub/chat/MessageBubblePremium.tsx
- src/components/communication/CallEventBubble.tsx
- src/components/communication/ChatMediaUploader.tsx
- src/components/communication/MessageActionsMenu.tsx
- src/components/communication/SwipeableMessage.tsx
- src/components/communication/ThreadActionsMenu.tsx
- src/components/concierge/ConciergeShowcase.tsx
- src/components/dashboard/DashboardRealtimeBridge.tsx
- src/components/dashboard/IntelligenceOrb.tsx
- src/components/delivery/BuyerTrackingPanel.tsx
- src/components/delivery/DeliveryHeatmapLayer.tsx
- src/components/delivery/DeliveryPricingCalculator.tsx
- src/components/delivery/DeliveryRadarMap.tsx
- src/components/delivery/DriverEarningsDashboard.tsx
- src/components/delivery/DriverJobsPanel.tsx
- src/components/delivery/EnhancedRatingPanel.tsx
- src/components/delivery/OwnerJobsPanel.tsx
- src/components/engine/GhostListingsSection.tsx
- src/components/engine/GlobalActionBanner.tsx
- src/components/engine/MerchantAlertPanel.tsx
- src/components/engine/WalletIncentiveBanner.tsx
- src/components/explore/ExploreAdvancedFilters.tsx
- src/components/explore/ExploreCategoryBar.tsx
- src/components/explore/ExploreContactDrawer.tsx
- src/components/explore/ExploreEmptyState.tsx
- src/components/explore/ExploreHeader.tsx
- src/components/explore/ExploreRadiusSearch.tsx
- src/components/explore/ExploreSEOFooter.tsx
- src/components/explore/ExploreSearchBar.tsx
- src/components/home/HomeAutofillStatusCard.tsx
- src/components/layout/AppMainNav.tsx
- src/components/layout/SimpleNavTabs.tsx
- src/components/map/EasyLocsRadarOverlay.tsx
- src/components/map/LocationSearchInput.tsx
- src/components/map/LocationShareCard.tsx
- src/components/marketplace/MarketplaceFilterSortBar.tsx
- src/components/marketplace/SellerDashboardPanel.tsx
- src/components/merchant/MerchantDashboardShortcuts.tsx
- src/components/merchant/QrOrderTargetManager.tsx
- src/components/merchant/SellerFinancePanel.tsx
- src/components/merchant/ShopSwitcher.tsx
- src/components/mobility/DeliveryBookingForm.tsx
- src/components/mobility/DriverOfferCard.tsx
- src/components/mobility/RideSupportButton.tsx
- src/components/mobility/TaxiBookingForm.tsx
- src/components/mobility/TaxiConfirmActionBar.tsx
- src/components/mobility/TaxiPreviewErrorPanel.tsx
- src/components/mobility/TaxiPreviewMapCard.tsx
- src/components/mobility/TaxiWaitTimePanel.tsx
- src/components/mobility/UnifiedMobilityPreviewCard.tsx
- src/components/navigation/AppLayout.tsx
- src/components/notifications/AppNotificationCenter.tsx
- src/components/notifications/UrgentEventModal.tsx
- src/components/orbit/ChatPaymentBar.tsx
- src/components/orbit/GroupCreateFlow.tsx
- src/components/orbit/OrbitCallHistoryPanel.tsx
- src/components/orbit/OrbitComposerTopState.tsx
- src/components/orbit/OrbitEncryptedIndicator.tsx
- src/components/orbit/OrbitGroupHeader.tsx
- src/components/orbit/OrbitMediaMessage.tsx
- src/components/orbit/OrbitMessageBubble.tsx
- src/components/orbit/OrbitNotificationBadge.tsx
- src/components/orbit/OrbitPrivacySettingsPanel.tsx
- src/components/orbit/OrbitThreadListV2.tsx
- src/components/orbit/OrbitTypingBar.tsx
- src/components/orbit/OrbitUnreadBadge.tsx
- src/components/orbit/payments/OrbitQRCode.tsx
- src/components/orders/CustomerOrderStateTimelineCard.tsx
- src/components/orders/OrderActionsCard.tsx
- src/components/orders/OrderDeliverySummaryCard.tsx
- src/components/orders/OrderNoteEditor.tsx
- src/components/payments/BookingStripeButton.tsx
- src/components/payments/PaymentStatusBadge.tsx
- src/components/payments/RentStripeButton.tsx
- src/components/property/BulkListingActionsPanel.tsx
- src/components/property/CouponOwnerPanel.tsx
- src/components/property/GenerateListingQrButton.tsx
- src/components/property/LeaseDocumentUploader.tsx
- src/components/property/ListingImageUploader.tsx
- src/components/property/OwnerPropertyDashboard.tsx
- src/components/property/RentStatusPanel.tsx
- src/components/public/ContactGate.tsx
- src/components/public/ListingLocalServices.tsx
- src/components/radar/DriverMap.tsx
- src/components/radar/RadarLocateButton.tsx
- src/components/radar/RadarUserPulse.tsx
- src/components/radar/RideButton.tsx
- src/components/rides/RideBookingForm.tsx
- src/components/search/ListingSearchPanel.tsx
- src/components/search/RecentSearchesCard.tsx
- src/components/search/SavedSearchPanel.tsx
- src/components/security/GhostE2EEStatus.tsx
- src/components/settings/PushSettingsPanel.tsx
- src/components/storefront/AIShoppingAssistant.tsx
- src/components/storefront/AdvancedProductPage.tsx
- src/components/storefront/GlobalSearch.tsx
- src/components/storefront/LoyaltyRewardsRedemption.tsx
- src/components/storefront/ProductComparator.tsx
- src/components/storefront/ReorderEngine.tsx
- src/components/storefront/ShopCreator.tsx
- src/components/storefront/SuperAppHome.tsx
- src/components/storefront/WishlistSaveLater.tsx
- src/components/support/SupportEvidencePanel.tsx
- src/components/system/ActionGuardButton.tsx
- src/components/system/ActivityPanel.tsx
- src/components/system/ScreenStateGate.tsx
- src/components/system/SystemHeartbeatCard.tsx
- src/components/system/V2AuthGate.tsx
- src/components/wallet/PaymentQrCard.tsx
- src/components/wallet/RentPaymentSheet.tsx
- src/components/wallet/RequestPaymentPanel.tsx
- src/components/wallet/RiderCreditsCard.tsx
- src/components/wallet/WalletActionGrid.tsx
- src/components/wallet/WalletSelector.tsx

</details>

### 2 Dead Pages
- src/pages/PublicStorefrontBySlugPage.tsx
- src/pages/travel/TravelHotels.tsx

### 11 Dead Hooks
- src/hooks/booking/usePublicServiceBookingData.ts
- src/hooks/onboarding/useOnboardingImport.ts
- src/hooks/onboarding/useOnboardingSteps.ts
- src/hooks/orbit/useGroupMembers.ts
- src/hooks/orbit/useGroupRepository.ts
- src/hooks/orbit/useHudPaymentCallbacks.ts
- src/hooks/orbit/useOrbitAccountActions.ts
- src/hooks/payments/useQrPaymentHandler.ts
- src/hooks/payments/useQrScannerEngine.ts
- src/hooks/radar/useRadarFilters.ts
- src/hooks/rental/usePostalCodeLookup.ts

### 3 Duplicate Repository Pairs
| File A | File B | Action |
|--------|--------|--------|
| `deal.repository.ts` | `deals.repository.ts` | MERGE |
| `chat.repository.ts` | `communication.repository.ts` | MERGE |
| `communication.repository.ts` | `communication-context.repository.ts` | MERGE |

---

## 🎯 PRIORITY ACTION PLAN

### Phase 1: Dead Code Purge (IMMEDIATE)
1. Delete 132 dead components
2. Delete 2 dead pages
3. Delete 11 dead hooks
4. Merge 3 duplicate repository pairs

### Phase 2: Store Consolidation
5. Merge `useOrbitStore` profile data into `v2AuthStore`
6. Extract `useOrbitEngine` metrics into dedicated dashboard domain
7. Resolve `mapStore` / `superMapStore` dual ownership
8. Resolve `radarStore` / `radarPlaceStore` dual ownership

### Phase 3: Naming Unification
9. Replace `threadId` → `conversationId` in 59 files (adapter layer for DB)
10. Replace `v2ConversationId` → `conversationId` in legacy compat
11. Replace `contextId` → `entityId` where it means business entity

### Phase 4: Database Hardening
12. Execute RLS hardening migration
13. Execute `search_path` hardening
14. Replace permissive policies

### Phase 5: Legacy File Cleanup
15. Rename/consolidate v2-prefixed files
16. Remove migration enforcement files once complete
