# Orbit Auto Scan Summary

Generated: 2026-03-31T10:11:36.966Z

## Totals

| Metric | Count |
|--------|-------|
| Total findings | 686 |
| Writes | 499 |
| HIGH writes | 0 |
| Events | 100 |
| Actions | 51 |
| ID findings | 36 |
| **Total conflicts** | **67** |
| **HIGH conflicts** | **0** |
| MEDIUM conflicts | 67 |

## ❌ High Severity Conflicts

✅ No high severity conflicts detected.

## ⚠️ Realtime Conflicts

✅ None

## 🔀 ID Mixing

- `src/components/communication-hub/ContextPanel.tsx`:356 — Potential ID mixing: conversationId vs threadId/chatId
- `src/components/communication-hub/HudChatPanel.tsx`:386 — Potential ID mixing: conversationId vs threadId/chatId
- `src/components/communication-hub/HudChatPanel.tsx`:396 — Potential ID mixing: conversationId vs threadId/chatId
- `src/components/communication-hub/HudChatPanel.tsx`:425 — Potential ID mixing: conversationId vs threadId/chatId
- `src/components/communication-hub/HudContextPanel.tsx`:358 — Potential ID mixing: conversationId vs threadId/chatId
- `src/components/communication-hub/chat/useMessageLoader.ts`:143 — Potential ID mixing: conversationId vs threadId/chatId
- `src/components/public/ListingContactButtons.tsx`:48 — Potential ID mixing: orbitId vs userId
- `src/components/public/ListingContactButtons.tsx`:49 — Potential ID mixing: orbitId vs userId
- `src/hooks/groups/useGroupData.ts`:99 — Potential ID mixing: orbitId vs userId
- `src/hooks/groups/useGroupData.ts`:141 — Potential ID mixing: orbitId vs userId
- `src/hooks/orbit/useHudCallSetup.ts`:27 — Potential ID mixing: orbitId vs userId
- `src/hooks/orbit/useHudCallSetup.ts`:54 — Potential ID mixing: orbitId vs userId
- `src/hooks/useMessageSender.ts`:240 — Potential ID mixing: conversationId vs threadId/chatId
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
- `src/stores/orbitStore.ts`:96 — Potential ID mixing: orbitId vs userId
- `src/stores/riderDispatchStore.ts`:81 — Potential ID mixing: profileId vs userId

## 📋 Duplicate Table Writers

- **profiles** → src/components/settings/WalletCurrencySettings.tsx, src/hooks/useUsername.ts, src/lib/action-engine.ts, src/lib/i18n.tsx, src/lib/orbit/orbit-account.repository.ts, src/repositories/auth-utils.repository.ts, src/repositories/concierge.repository.ts, src/repositories/dashboard.repository.ts, src/repositories/delivery.repository.ts, src/repositories/driver-onboarding.repository.ts, src/repositories/mobility.repository.ts, src/repositories/onboarding.repository.ts, src/repositories/orbit-security.repository.ts, src/repositories/orbit.repository.ts, src/repositories/profile-settings.repository.ts, src/repositories/profile.repository.ts, src/repositories/rental.repository.ts, src/repositories/settings.repository.ts, src/pages/client/ClientSettings.tsx
- **live_trackings** → src/hooks/useDeliveryTracking.ts, src/repositories/delivery.repository.ts
- **shop_follows** → src/lib/action-engine.ts
- **contacts** → src/lib/action-engine.ts
- **audit_logs** → src/lib/audit.ts, src/lib/monitoring.ts, src/domains/admin/adapters/supabase.adapter.ts, src/repositories/document-builder.repository.ts, src/repositories/moderation.repository.ts, src/repositories/settings.repository.ts
- **concierge_services** → src/lib/concierge/concierge-repository.ts, src/repositories/concierge.repository.ts
- **orders** → src/lib/core/orderEscrowEngine.ts, src/lib/orchestration/handlers/delivery-handlers.ts, src/lib/orchestration/orchestration-utils.ts, src/lib/orders/orderActions.ts, src/lib/payments/paymentLiveConnector.ts, src/lib/payments/paymentService.ts, src/lib/settlement/orderSettlement.ts
- **seed_merchant_promos** → src/lib/coupons/couponEngine.ts, src/lib/promo/promoEngine.ts
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
- **user_sessions** → src/lib/orbit-session-manager.ts
- **login_events** → src/lib/orbit-session-manager.ts
- **support_tickets** → src/lib/orchestration/handlers/support-handlers.ts
- **radar_opportunities** → src/lib/radar/opportunity-scorer.ts
- **radar_signals** → src/lib/radar/signal-ingestor.ts
- **stay_bookings** → src/lib/seasonal/seasonal-repository.ts
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
