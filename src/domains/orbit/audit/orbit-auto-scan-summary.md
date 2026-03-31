# Orbit Auto Scan Summary

Generated: 2026-03-31T09:59:56.705Z

## Totals

- Total findings: 14499
- Writes: 7322
- High risk writes: 5246
- Events: 789
- Actions: 2604
- I18N findings: 3203
- SEO findings: 241
- Card findings: 8
- ID findings: 332
- Total conflicts: 5596
- HIGH conflicts: 5596
- MEDIUM conflicts: 0

## High Severity Conflicts

- **DUPLICATE_ENTRY** — `location.send` — Multiple files write for entry "location.send": src/components/communication-hub/HudChatPanel.tsx
- **DUPLICATE_ENTRY** — `call.startAudio` — Multiple files write for entry "call.startAudio": src/components/communication-hub/HudChatPanel.tsx
- **DUPLICATE_ENTRY** — `call.startVideo` — Multiple files write for entry "call.startVideo": src/components/communication-hub/HudChatPanel.tsx
- **DUPLICATE_ENTRY** — `receipt.markRead` — Multiple files write for entry "receipt.markRead": src/components/delivery/DeliveryNotificationCenter.tsx, src/lib/db/orbitDb.ts, src/lib/monitoring.ts, src/lib/runtime/smart-prefetch.ts, src/repositories/rental.repository.ts
- **DUPLICATE_ENTRY** — `message.sendText` — Multiple files write for entry "message.sendText": src/components/rental/RentalTenantDetailView.tsx
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/ErrorBoundary.tsx`:41 — Direct write (setState) in src/components/ErrorBoundary.tsx:41
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/SEOHead.tsx`:31 — Direct write (setState) in src/components/SEOHead.tsx:31
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/SEOHead.tsx`:34 — Direct write (setState) in src/components/SEOHead.tsx:34
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/SEOHead.tsx`:37 — Direct write (setState) in src/components/SEOHead.tsx:37
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/SEOHead.tsx`:38 — Direct write (setState) in src/components/SEOHead.tsx:38
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/SEOHead.tsx`:39 — Direct write (setState) in src/components/SEOHead.tsx:39
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/SEOHead.tsx`:40 — Direct write (setState) in src/components/SEOHead.tsx:40
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/SEOHead.tsx`:41 — Direct write (setState) in src/components/SEOHead.tsx:41
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/SEOHead.tsx`:42 — Direct write (setState) in src/components/SEOHead.tsx:42
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/SEOHead.tsx`:43 — Direct write (setState) in src/components/SEOHead.tsx:43
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/SEOHead.tsx`:44 — Direct write (setState) in src/components/SEOHead.tsx:44
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/SEOHead.tsx`:45 — Direct write (setState) in src/components/SEOHead.tsx:45
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/SEOHead.tsx`:46 — Direct write (setState) in src/components/SEOHead.tsx:46
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/SEOHead.tsx`:47 — Direct write (setState) in src/components/SEOHead.tsx:47
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/SEOHead.tsx`:48 — Direct write (setState) in src/components/SEOHead.tsx:48
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/SEOHead.tsx`:50 — Direct write (setState) in src/components/SEOHead.tsx:50
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/SEOHead.tsx`:60 — Direct write (setState) in src/components/SEOHead.tsx:60
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/SEOHead.tsx`:69 — Direct write (setState) in src/components/SEOHead.tsx:69
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/SEOHead.tsx`:71 — Direct write (setState) in src/components/SEOHead.tsx:71
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/ThemeSwitcher.tsx`:16 — Direct write (setState) in src/components/ThemeSwitcher.tsx:16
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/ThemeSwitcher.tsx`:20 — Direct write (setState) in src/components/ThemeSwitcher.tsx:20
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/ThemeSwitcher.tsx`:30 — Direct write (setState) in src/components/ThemeSwitcher.tsx:30
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/ThemeSwitcher.tsx`:31 — Direct write (setState) in src/components/ThemeSwitcher.tsx:31
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/ThemeSwitcher.tsx`:35 — Direct write (setState) in src/components/ThemeSwitcher.tsx:35
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/ThemeSwitcher.tsx`:36 — Direct write (setState) in src/components/ThemeSwitcher.tsx:36
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/ThemeSwitcher.tsx`:37 — Direct write (setState) in src/components/ThemeSwitcher.tsx:37
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/ThemeSwitcher.tsx`:59 — Direct write (setState) in src/components/ThemeSwitcher.tsx:59
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/ThemeSwitcher.tsx`:74 — Direct write (setState) in src/components/ThemeSwitcher.tsx:74
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/ThemeSwitcher.tsx`:75 — Direct write (setState) in src/components/ThemeSwitcher.tsx:75
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/ThemeSwitcher.tsx`:100 — Direct write (setState) in src/components/ThemeSwitcher.tsx:100
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/ThemeSwitcher.tsx`:101 — Direct write (setState) in src/components/ThemeSwitcher.tsx:101
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/UpdateNotification.tsx`:21 — Direct write (setState) in src/components/UpdateNotification.tsx:21
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/UpdateNotification.tsx`:46 — Direct write (setState) in src/components/UpdateNotification.tsx:46
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/actions/UniversalActionButtons.tsx`:90 — Direct write (setState) in src/components/actions/UniversalActionButtons.tsx:90
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/actions/UniversalActionButtons.tsx`:113 — Direct write (setState) in src/components/actions/UniversalActionButtons.tsx:113
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/address/AddressSelectorSheet.tsx`:30 — Direct write (setState) in src/components/address/AddressSelectorSheet.tsx:30
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/address/AddressSelectorSheet.tsx`:31 — Direct write (setState) in src/components/address/AddressSelectorSheet.tsx:31
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/address/AddressSelectorSheet.tsx`:44 — Direct write (setState) in src/components/address/AddressSelectorSheet.tsx:44
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/address/CanonicalAddressInput.tsx`:85 — Direct write (setState) in src/components/address/CanonicalAddressInput.tsx:85
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/address/CanonicalAddressInput.tsx`:95 — Direct write (setState) in src/components/address/CanonicalAddressInput.tsx:95
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/address/CanonicalAddressInput.tsx`:96 — Direct write (setState) in src/components/address/CanonicalAddressInput.tsx:96
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/address/CanonicalAddressInput.tsx`:126 — Direct write (setState) in src/components/address/CanonicalAddressInput.tsx:126
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/address/CanonicalAddressInput.tsx`:151 — Direct write (setState) in src/components/address/CanonicalAddressInput.tsx:151
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/address/CanonicalAddressInput.tsx`:153 — Direct write (setState) in src/components/address/CanonicalAddressInput.tsx:153
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/AdminModerationPanel.tsx`:55 — Direct write (setState) in src/components/admin/AdminModerationPanel.tsx:55
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/AdminModerationPanel.tsx`:72 — Direct write (setState) in src/components/admin/AdminModerationPanel.tsx:72
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/AdminModerationPanel.tsx`:73 — Direct write (setState) in src/components/admin/AdminModerationPanel.tsx:73
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/AdminModerationPanel.tsx`:74 — Direct write (setState) in src/components/admin/AdminModerationPanel.tsx:74
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/AdminModerationPanel.tsx`:102 — Direct write (setState) in src/components/admin/AdminModerationPanel.tsx:102
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/AdminModerationPanel.tsx`:103 — Direct write (setState) in src/components/admin/AdminModerationPanel.tsx:103
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/AdminModerationPanel.tsx`:120 — Direct write (setState) in src/components/admin/AdminModerationPanel.tsx:120
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/AdminModerationPanel.tsx`:121 — Direct write (setState) in src/components/admin/AdminModerationPanel.tsx:121
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/AdminModerationPanel.tsx`:152 — Direct write (setState) in src/components/admin/AdminModerationPanel.tsx:152
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/AdminModerationPanel.tsx`:179 — Direct write (setState) in src/components/admin/AdminModerationPanel.tsx:179
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/AdminModerationPanel.tsx`:201 — Direct write (setState) in src/components/admin/AdminModerationPanel.tsx:201
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/AdminModerationPanel.tsx`:239 — Direct write (setState) in src/components/admin/AdminModerationPanel.tsx:239
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/AdminModerationPanel.tsx`:267 — Direct write (setState) in src/components/admin/AdminModerationPanel.tsx:267
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/BrowserRepairLivePanel.tsx`:49 — Direct write (setState) in src/components/admin/BrowserRepairLivePanel.tsx:49
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/BrowserRepairLivePanel.tsx`:50 — Direct write (setState) in src/components/admin/BrowserRepairLivePanel.tsx:50
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/BrowserRepairLivePanel.tsx`:51 — Direct write (setState) in src/components/admin/BrowserRepairLivePanel.tsx:51
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/BrowserRepairLivePanel.tsx`:56 — Direct write (setState) in src/components/admin/BrowserRepairLivePanel.tsx:56
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/BrowserRepairLivePanel.tsx`:98 — Direct write (setState) in src/components/admin/BrowserRepairLivePanel.tsx:98
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/BrowserRepairRunButton.tsx`:14 — Direct write (setState) in src/components/admin/BrowserRepairRunButton.tsx:14
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/BrowserRepairRunButton.tsx`:22 — Direct write (setState) in src/components/admin/BrowserRepairRunButton.tsx:22
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/HealthDashboard.tsx`:35 — Direct write (setState) in src/components/admin/HealthDashboard.tsx:35
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/HealthDashboard.tsx`:36 — Direct write (setState) in src/components/admin/HealthDashboard.tsx:36
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/HealthDashboard.tsx`:40 — Direct write (setState) in src/components/admin/HealthDashboard.tsx:40
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/HealthDashboard.tsx`:42 — Direct write (setState) in src/components/admin/HealthDashboard.tsx:42
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/HealthDashboard.tsx`:43 — Direct write (setState) in src/components/admin/HealthDashboard.tsx:43
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/HealthDashboard.tsx`:154 — Direct write (setState) in src/components/admin/HealthDashboard.tsx:154
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/ModerationPanel.tsx`:44 — Direct write (setState) in src/components/admin/ModerationPanel.tsx:44
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/ModerationPanel.tsx`:48 — Direct write (setState) in src/components/admin/ModerationPanel.tsx:48
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/ModerationPanel.tsx`:49 — Direct write (setState) in src/components/admin/ModerationPanel.tsx:49
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/ModerationPanel.tsx`:53 — Direct write (setState) in src/components/admin/ModerationPanel.tsx:53
- **DIRECT_WRITE_OUTSIDE_PIPELINE** — `src/components/admin/ModerationPanel.tsx`:54 — Direct write (setState) in src/components/admin/ModerationPanel.tsx:54

## Duplicate Entries

- **location.send** → src/components/communication-hub/HudChatPanel.tsx
- **call.startAudio** → src/components/communication-hub/HudChatPanel.tsx
- **call.startVideo** → src/components/communication-hub/HudChatPanel.tsx
- **receipt.markRead** → src/components/delivery/DeliveryNotificationCenter.tsx, src/lib/db/orbitDb.ts, src/lib/monitoring.ts, src/lib/runtime/smart-prefetch.ts, src/repositories/rental.repository.ts
- **message.sendText** → src/components/rental/RentalTenantDetailView.tsx

## Realtime Conflicts

- `src/components/pos/KitchenQueue.tsx` — Realtime listener + direct write detected outside owner flow
- `src/components/storefront/AuctionManager.tsx` — Realtime listener + direct write detected outside owner flow
- `src/components/storefront/OrdersManager.tsx` — Realtime listener + direct write detected outside owner flow
- `src/hooks/useListingSync.ts` — Realtime listener + direct write detected outside owner flow
- `src/hooks/useRadarLiveContext.ts` — Realtime listener + direct write detected outside owner flow
- `src/hooks/useRealtimeDispatchBoard.ts` — Realtime listener + direct write detected outside owner flow
- `src/hooks/useServiceTracking.ts` — Realtime listener + direct write detected outside owner flow
- `src/lib/engines/notification-engine.ts` — Realtime listener + direct write detected outside owner flow
- `src/lib/orbit/signaling.ts` — Realtime listener + direct write detected outside owner flow
- `src/lib/rental/rental-repository.ts` — Realtime listener + direct write detected outside owner flow
- `src/lib/tracking/live-tracking.ts` — Realtime listener + direct write detected outside owner flow
- `src/domains/orbit/realtime/orbit-realtime-owner.ts` — Realtime listener + direct write detected outside owner flow
- `src/pages/MerchantPosPage.tsx` — Realtime listener + direct write detected outside owner flow

## ID Mixing Conflicts

- `src/components/call/CallButton.tsx`:18 — ID mixing detected: orbitId: props.orbitId,
- `src/components/call/CallButton.tsx`:20 — ID mixing detected: conversationId: props.conversationId,
- `src/components/call/CallButton.tsx`:26 — ID mixing detected: conversationId: props.conversationId,
- `src/components/call/CallProvider.tsx`:84 — ID mixing detected: conversationId: info.conversationId || undefined,
- `src/components/call/CallProvider.tsx`:126 — ID mixing detected: conversationId: meta.conversationId,
- `src/components/chat/AddContactByEmail.tsx`:57 — ID mixing detected: if (myOrbit?.orbitId && foundUser.orbit_id === myOrbit.orbitId) {
- `src/components/chat/ChatPaymentCards.tsx`:356 — ID mixing detected: threadId: threadId || "",
- `src/components/chat/ChatPaymentCards.tsx`:573 — ID mixing detected: threadId={threadId}
- `src/components/communication/ForwardMessageDialog.tsx`:67 — ID mixing detected: const peerName = participants.find((p: any) => p.userId !== userId)?.displayName
- `src/components/communication/ForwardMessageDialog.tsx`:96 — ID mixing detected: conversationId: selectedThread.conversationId,
- `src/components/communication/ForwardMessageDialog.tsx`:108 — ID mixing detected: conversationId: selectedThread.conversationId,
- `src/components/communication/ForwardMessageDialog.tsx`:160 — ID mixing detected: const isSelected = selectedThread?.conversationId === thread.conversationId;
- `src/components/communication-hub/ContextPanel.tsx`:356 — ID mixing detected: threadId={thread.conversationId || thread.id}
- `src/components/communication-hub/HudChatPanel.tsx`:149 — ID mixing detected: conversationId: thread?.conversationId ?? null,
- `src/components/communication-hub/HudChatPanel.tsx`:386 — ID mixing detected: threadId={thread.conversationId || thread.id}
- `src/components/communication-hub/HudChatPanel.tsx`:396 — ID mixing detected: threadId: thread.conversationId || thread.id,
- `src/components/communication-hub/HudChatPanel.tsx`:425 — ID mixing detected: threadId: thread.conversationId || thread.id,
- `src/components/communication-hub/HudContextPanel.tsx`:358 — ID mixing detected: threadId={thread.conversationId || thread.id}
- `src/components/communication-hub/chat/MessageList.tsx`:63 — ID mixing detected: if (userId && ((msg as any).deleted_for_user_ids as string[] | null)?.includes(u
- `src/components/communication-hub/chat/bridges/useHudComposerBridge.ts`:58 — ID mixing detected: conversationId: deps.conversationId,
- `src/components/communication-hub/chat/useAttachments.ts`:160 — ID mixing detected: trace("attachment.preview.update", "output", { conversationId, preview: content,
- `src/components/communication-hub/chat/useCallActions.ts`:32 — ID mixing detected: conversationId: conversationId ?? null,
- `src/components/communication-hub/chat/useCallActions.ts`:44 — ID mixing detected: conversationId: conversationId ?? null,
- `src/components/communication-hub/chat/useCallActions.ts`:67 — ID mixing detected: conversationId: conversationId ?? null,
- `src/components/communication-hub/chat/useLocationMessage.ts`:32 — ID mixing detected: const conversationId = params.thread?.conversationId;
- `src/components/communication-hub/chat/useMessageLoader.ts`:143 — ID mixing detected: trace("messages.load.request", "error", { reason: "missing_conversationId", thre
- `src/components/communication-hub/chat/useMessageLoader.ts`:274 — ID mixing detected: realtimeTrace("message.realtime.echo", "input", { conversationId, channel: `rt:v
- `src/components/mobility/RideDriverCard.tsx`:71 — ID mixing detected: if (conversationId) navigate(`/orbit/${conversationId}`);
- `src/components/orbit/OrbitContactsDirectory.tsx`:165 — ID mixing detected: const conversationId = result?.conversationId;
- `src/components/orbit/OrbitContactsDirectory.tsx`:166 — ID mixing detected: if (conversationId) navigate(`/orbit/${conversationId}`);

## Fix Priority Order

### P1 — Immediate
1. Direct writes in UI/hooks → redirect to orbitDispatch
2. Duplicate entry points → consolidate to single pipeline
3. Realtime direct merge → route through owner
4. ID mixing → normalize identifiers

### P2 — Soon
5. Duplicate pipeline logic → merge
6. Duplicate card builders → centralize
7. SEO/i18n duplication → single owner

### P3 — Later
8. Legacy wrappers → deprecate
9. Dead passive layers → remove
