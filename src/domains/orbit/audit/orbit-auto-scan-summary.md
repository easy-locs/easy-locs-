# Orbit Auto Scan Summary

Generated: 2026-03-31T10:01:24.062Z

## Totals

| Metric | Count |
|--------|-------|
| Total findings | 690 |
| Writes | 501 |
| HIGH writes | 4 |
| Events | 100 |
| Actions | 51 |
| ID findings | 38 |
| **Total conflicts** | **100** |
| **HIGH conflicts** | **15** |
| MEDIUM conflicts | 85 |

## ❌ High Severity Conflicts

- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/communication-hub/chat/useAttachments.ts`:148 — Direct write (insertMessage) in src/components/communication-hub/chat/useAttachments.ts:148
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/marketplace/BookingCommunicationThread.tsx`:44 — Direct write (insertMessage) in src/components/marketplace/BookingCommunicationThread.tsx:44
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/public/GuestBookingReply.tsx`:75 — Direct write (insertMessage) in src/components/public/GuestBookingReply.tsx:75
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/hooks/useOfflineMessages.ts`:102 — Direct write (insertMessage) in src/hooks/useOfflineMessages.ts:102
- **REALTIME_DIRECT_WRITE** — `src/components/pos/KitchenQueue.tsx` — Realtime listener + direct write in same file outside owner zone
- **REALTIME_DIRECT_WRITE** — `src/components/storefront/AuctionManager.tsx` — Realtime listener + direct write in same file outside owner zone
- **REALTIME_DIRECT_WRITE** — `src/components/storefront/OrdersManager.tsx` — Realtime listener + direct write in same file outside owner zone
- **REALTIME_DIRECT_WRITE** — `src/hooks/useListingSync.ts` — Realtime listener + direct write in same file outside owner zone
- **REALTIME_DIRECT_WRITE** — `src/hooks/useServiceTracking.ts` — Realtime listener + direct write in same file outside owner zone
- **REALTIME_DIRECT_WRITE** — `src/lib/engines/notification-engine.ts` — Realtime listener + direct write in same file outside owner zone
- **REALTIME_DIRECT_WRITE** — `src/lib/orbit/signaling.ts` — Realtime listener + direct write in same file outside owner zone
- **REALTIME_DIRECT_WRITE** — `src/lib/realtime-manager.ts` — Realtime listener + direct write in same file outside owner zone
- **REALTIME_DIRECT_WRITE** — `src/lib/rental/rental-repository.ts` — Realtime listener + direct write in same file outside owner zone
- **REALTIME_DIRECT_WRITE** — `src/lib/tracking/live-tracking.ts` — Realtime listener + direct write in same file outside owner zone
- **REALTIME_DIRECT_WRITE** — `src/pages/MerchantPosPage.tsx` — Realtime listener + direct write in same file outside owner zone

## ⚠️ Realtime Conflicts

- `src/components/pos/KitchenQueue.tsx` — Realtime listener + direct write in same file outside owner zone
- `src/components/storefront/AuctionManager.tsx` — Realtime listener + direct write in same file outside owner zone
- `src/components/storefront/OrdersManager.tsx` — Realtime listener + direct write in same file outside owner zone
- `src/hooks/useListingSync.ts` — Realtime listener + direct write in same file outside owner zone
- `src/hooks/useServiceTracking.ts` — Realtime listener + direct write in same file outside owner zone
- `src/lib/engines/notification-engine.ts` — Realtime listener + direct write in same file outside owner zone
- `src/lib/orbit/signaling.ts` — Realtime listener + direct write in same file outside owner zone
- `src/lib/realtime-manager.ts` — Realtime listener + direct write in same file outside owner zone
- `src/lib/rental/rental-repository.ts` — Realtime listener + direct write in same file outside owner zone
- `src/lib/tracking/live-tracking.ts` — Realtime listener + direct write in same file outside owner zone
- `src/pages/MerchantPosPage.tsx` — Realtime listener + direct write in same file outside owner zone

## 🔀 ID Mixing

- `src/components/communication-hub/ContextPanel.tsx`:356 — Potential ID mixing: conversationId vs threadId/chatId
- `src/components/communication-hub/HudChatPanel.tsx`:386 — Potential ID mixing: conversationId vs threadId/chatId
- `src/components/communication-hub/HudChatPanel.tsx`:396 — Potential ID mixing: conversationId vs threadId/chatId
- `src/components/communication-hub/HudChatPanel.tsx`:425 — Potential ID mixing: conversationId vs threadId/chatId
- `src/components/communication-hub/HudContextPanel.tsx`:358 — Potential ID mixing: conversationId vs threadId/chatId
- `src/components/communication-hub/chat/useAttachments.ts`:160 — Potential ID mixing: conversationId vs threadId/chatId
- `src/components/communication-hub/chat/useMessageLoader.ts`:143 — Potential ID mixing: conversationId vs threadId/chatId
- `src/components/public/ListingContactButtons.tsx`:48 — Potential ID mixing: orbitId vs userId
- `src/components/public/ListingContactButtons.tsx`:49 — Potential ID mixing: orbitId vs userId
- `src/hooks/groups/useGroupData.ts`:99 — Potential ID mixing: orbitId vs userId
- `src/hooks/groups/useGroupData.ts`:141 — Potential ID mixing: orbitId vs userId
- `src/hooks/orbit/useHudCallSetup.ts`:27 — Potential ID mixing: orbitId vs userId
- `src/hooks/orbit/useHudCallSetup.ts`:54 — Potential ID mixing: orbitId vs userId
- `src/hooks/useMessageSender.ts`:240 — Potential ID mixing: conversationId vs threadId/chatId
- `src/hooks/useOfflineMessages.ts`:105 — Potential ID mixing: orbitId vs userId
- `src/lib/cache/identity-cache.ts`:19 — Potential ID mixing: orbitId vs userId
- `src/lib/governance/canonical-architecture.ts`:42 — Potential ID mixing: conversationId vs threadId/chatId
- `src/lib/orbit/canonical-helpers.ts`:141 — Potential ID mixing: orbitId vs userId
- `src/lib/orbit/canonical-helpers.ts`:176 — Potential ID mixing: orbitId vs userId
- `src/lib/orbit/createOrGetDirectConversation.ts`:44 — Potential ID mixing: orbitId vs userId
- `src/lib/orbit/ensureOrbitProfile.ts`:35 — Potential ID mixing: orbitId vs userId
- `src/lib/orbit/ensureOrbitProfile.ts`:40 — Potential ID mixing: orbitId vs userId
- `src/lib/orbit/messaging/conversation-resolver.ts`:41 — Potential ID mixing: conversationId vs threadId/chatId
- `src/lib/orbit/threads/thread-mapper.ts`:169 — Potential ID mixing: orbitId vs userId
- `src/lib/orbit/threads/thread-mapper.ts`:188 — Potential ID mixing: orbitId vs userId
- `src/lib/supabase/chat-repo-extended.ts`:36 — Potential ID mixing: orbitId vs userId
- `src/lib/supabase/repositories.ts`:210 — Potential ID mixing: orbitId vs userId
- `src/lib/sync/background-sync.ts`:70 — Potential ID mixing: conversationId vs threadId/chatId
- `src/stores/orbit/event.adapter.ts`:28 — Potential ID mixing: orbitId vs userId
- `src/stores/orbit/event.adapter.ts`:29 — Potential ID mixing: orbitId vs userId

## 📋 Duplicate Table Writers

- **marketplace_providers** → src/components/marketplace/LiveCommerceToggle.tsx, src/repositories/marketplace.repository.ts
- **marketplace_services** → src/components/marketplace/MyListingsPanel.tsx, src/hooks/useListingSync.ts, src/repositories/marketplace.repository.ts, src/repositories/rental.repository.ts
- **marketplace_reviews** → src/components/marketplace/ReviewReplyDialog.tsx, src/repositories/admin.repository.ts
- **profiles** → src/components/settings/WalletCurrencySettings.tsx, src/hooks/useUsername.ts, src/lib/action-engine.ts, src/lib/i18n.tsx, src/lib/orbit/orbit-account.repository.ts, src/repositories/auth-utils.repository.ts, src/repositories/concierge.repository.ts, src/repositories/dashboard.repository.ts, src/repositories/delivery.repository.ts, src/repositories/driver-onboarding.repository.ts, src/repositories/mobility.repository.ts, src/repositories/onboarding.repository.ts, src/repositories/orbit-security.repository.ts, src/repositories/orbit.repository.ts, src/repositories/profile-settings.repository.ts, src/repositories/profile.repository.ts, src/repositories/rental.repository.ts, src/repositories/settings.repository.ts, src/pages/client/ClientSettings.tsx
- **live_trackings** → src/hooks/useDeliveryTracking.ts, src/repositories/delivery.repository.ts
- **tracking_sessions** → src/hooks/useServiceTracking.ts
- **tracking_positions** → src/hooks/useServiceTracking.ts
- **shop_follows** → src/lib/action-engine.ts
- **contacts** → src/lib/action-engine.ts
- **audit_logs** → src/lib/audit.ts, src/lib/monitoring.ts, src/domains/admin/adapters/supabase.adapter.ts, src/repositories/document-builder.repository.ts, src/repositories/moderation.repository.ts, src/repositories/settings.repository.ts
- **concierge_services** → src/lib/concierge/concierge-repository.ts, src/repositories/concierge.repository.ts
- **orders** → src/lib/core/orderEscrowEngine.ts, src/lib/orchestration/handlers/delivery-handlers.ts, src/lib/orchestration/orchestration-utils.ts, src/lib/orders/orderActions.ts, src/lib/payments/paymentLiveConnector.ts, src/lib/payments/paymentService.ts, src/lib/settlement/orderSettlement.ts
- **seed_merchant_promos** → src/lib/coupons/couponEngine.ts, src/lib/promo/promoEngine.ts
- **auto_discovered_merchants** → src/lib/engines/auto-acquisition-engine.ts
- **user_radar_profiles** → src/lib/engines/personal-radar/personal-profile-engine.ts
- **user_radar_events** → src/lib/engines/personal-radar/personal-profile-engine.ts
- **conversations_v2** → src/lib/events/handlers/ride-bridge.handler.ts
- **mobility_jobs** → src/lib/events/handlers/ride-dispatch.handler.ts, src/lib/mobility/dispatch-reassign-engine.ts, src/lib/mobility/offer-accept-guard.ts, src/lib/mobility/ride-ai-orchestrator.ts, src/lib/mobility/unified-mobility-orchestrator.ts, src/repositories/mobility.repository.ts
- **mobility_job_offers** → src/lib/events/handlers/ride-dispatch.handler.ts, src/lib/mobility/dispatch-expiry-cron.ts, src/lib/mobility/dispatch-wave-engine.ts, src/lib/mobility/offer-accept-guard.ts, src/lib/mobility/unified-mobility-orchestrator.ts
- **approval_queues** → src/lib/finance/treasury.ts
- **seed_merchants** → src/lib/merchant/availabilityEngine.ts, src/lib/merchant/onboarding.ts
- **seed_products** → src/lib/merchant/onboarding.ts, src/repositories/merchant.repository.ts
- **mobility_dispatch_runs** → src/lib/mobility/dispatch-reassign-engine.ts, src/lib/mobility/dispatch-wave-engine.ts
- **mobility_driver_scores** → src/lib/mobility/driver-ai-scorer.ts, src/lib/mobility/unified-driver-scorer.ts
- **trip_live_state** → src/lib/mobility/driver-gps-pusher.ts, src/lib/mobility/gps-scheduler.ts
- **trip_location_points** → src/lib/mobility/driver-gps-pusher.ts, src/lib/mobility/gps-scheduler.ts
- **mobility_ai_logs** → src/lib/mobility/mobility-ai-logger.ts
- **mobility_pricing_snapshots** → src/lib/mobility/ride-ai-orchestrator.ts, src/lib/mobility/unified-mobility-orchestrator.ts
- **app_notifications** → src/lib/notifications/notification-reader.ts, src/lib/notifications/notification-writer.ts, src/lib/system/engineConnectorHub.ts
- **orbit_profiles_v2** → src/lib/orbit/ensureOrbitProfile.ts
- **conversation_preferences** → src/lib/orbit/orbit-account.repository.ts, src/repositories/communication.repository.ts
- **user_sessions** → src/lib/orbit-session-manager.ts
- **login_events** → src/lib/orbit-session-manager.ts
- **support_tickets** → src/lib/orchestration/handlers/support-handlers.ts
- **radar_opportunities** → src/lib/radar/opportunity-scorer.ts
- **radar_signals** → src/lib/radar/signal-ingestor.ts
- **user_presence** → src/lib/realtime-manager.ts, src/repositories/communication.repository.ts
- **properties** → src/lib/rental/rental-repository.ts, src/repositories/rental-data.repository.ts
- **tenants** → src/lib/rental/rental-repository.ts, src/repositories/rental-data.repository.ts
- **rent_calls** → src/lib/rental/rental-repository.ts, src/repositories/payment-notices.repository.ts, src/repositories/rent-payment.repository.ts, src/repositories/rental-data.repository.ts, src/repositories/rental.repository.ts, src/repositories/tenant.repository.ts
- **documents** → src/lib/rental/rental-repository.ts, src/repositories/document-builder.repository.ts, src/repositories/documents.repository.ts, src/repositories/rental-data.repository.ts, src/repositories/rental.repository.ts
- **stay_bookings** → src/lib/seasonal/seasonal-repository.ts
- **wallet_accounts** → src/lib/wallet/ensureWalletAccount.ts, src/lib/wallet/ledger.ts, src/lib/wallet/wallet-account.ts
- **wallet_ledger_entries** → src/lib/wallet/ledger.ts, src/domains/wallet/adapters/supabase.adapter.ts
- **admin_alerts** → src/domains/admin/adapters/supabase.adapter.ts
- **property_listings_v2** → src/domains/marketplace/adapters/supabase.adapter.ts
- **bookings_v2** → src/domains/marketplace/adapters/supabase.adapter.ts

## 🔧 Fix Priority Order

### P1 — Immediate
1. Direct writes in UI/hooks → redirect to orbitDispatch
2. Realtime direct merge → route through owner

### P2 — Soon
3. Duplicate table writers → consolidate to single repository
4. ID mixing → normalize identifiers

### P3 — Later
5. Legacy wrappers → deprecate
