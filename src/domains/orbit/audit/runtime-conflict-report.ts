/**
 * ORBIT RUNTIME CONFLICT REPORT — Post-Canonical Audit
 * Generated: 2026-03-31
 * 
 * This file documents ALL identified conflicts, their status, and resolution.
 * It serves as the living audit record for the "0 Conflit" governance.
 */

// ══════════════════════════════════════════════
// 1. BLOCKS STILL TOO LARGE
// ══════════════════════════════════════════════

export const LARGE_BLOCKS = [
  {
    file: "src/components/communication-hub/HudChatPanel.tsx",
    lines: 640,
    issue: "Orchestrates messages, calls, attachments, payments, media, contacts, security, selection — too many responsibilities",
    severity: "medium",
    status: "accepted_transitional",
    reason: "Each responsibility is delegated to a family hook. The file is a THIN ASSEMBLER, not a monolith. Splitting further would create prop-drilling chaos.",
  },
  {
    file: "src/components/communication-hub/chat/useMessageLoader.ts",
    lines: 435,
    issue: "Owns realtime subscription + message loading + markRead + typing + cache",
    severity: "high",
    status: "partially_resolved",
    reason: "markRead extracted to receipt.controller. Realtime is per-conversation (correct). Typing is co-located with presence channel.",
  },
  {
    file: "src/components/communication-hub/useConversationThreads.ts",
    lines: 166,
    issue: "Owns local thread state + realtime inbox listener",
    severity: "medium",
    status: "accepted_transitional",
    reason: "Inbox realtime uses debounced reload pattern, not raw injection. Thread state is view-local. Will migrate to orbitStore when full local-first is implemented.",
  },
  {
    file: "src/hooks/useMessageSender.ts",
    lines: 306,
    issue: "Competing write path alongside orbitDispatch",
    severity: "high",
    status: "deprecated",
    reason: "Marked @deprecated. Runtime still uses it via HudChatPanel but will be migrated to orbitDispatch exclusively.",
  },
] as const;

// ══════════════════════════════════════════════
// 2. COMPETING WRITE PATHS (PORTES CONCURRENTES)
// ══════════════════════════════════════════════

export const COMPETING_WRITE_PATHS = [
  {
    name: "useMessageSender.handleSend",
    file: "src/hooks/useMessageSender.ts",
    flow: "text_message_send",
    mutates: "rawMessages local state via setRawMessages",
    bypasses: "orbitStore (does not inject into canonical store)",
    danger: "P2",
    status: "deprecated_in_progress",
    resolution: "Will be replaced by orbitDispatch.send_text which goes through families/send/sendText",
  },
  {
    name: "createOrGetDirectConversation",
    file: "src/lib/orbit/createOrGetDirectConversation.ts",
    flow: "direct_conversation_create",
    mutates: "conversations_v2 directly",
    bypasses: "domains/orbit/services/createDirectConversation",
    danger: "P3",
    status: "flow_gated",
    resolution: "Now flow-gate protected: prevents duplicate concurrent creation for same user pair. enterFlow/exitFlow wrapping added.",
  },
  {
    name: "VoiceRecorder direct insertMessage",
    file: "src/components/communication/VoiceRecorder.tsx",
    flow: "voice_message_send",
    mutates: "chat_messages_v2 via insertMessage",
    bypasses: "orbitDispatch",
    danger: "P1",
    status: "resolved",
    resolution: "Redirected through orbitDispatch({ type: 'send_voice' }). No more direct insertMessage.",
  },
  {
    name: "sendPaymentReceiptToThread / sendPaymentRequestMessageToThread",
    file: "src/components/chat/ChatPaymentCards.tsx",
    flow: "payment_message_send",
    mutates: "chat_messages_v2 via insertMessage",
    bypasses: "orbitDispatch (no send_payment command exists yet)",
    danger: "P3",
    status: "accepted_specialized",
    resolution: "Payment messages are a specialized domain. Will add send_payment command to orbitDispatch later.",
  },
  {
    name: "useMessageLoader inline markRead",
    file: "src/components/communication-hub/chat/useMessageLoader.ts",
    flow: "read_receipts",
    mutates: "chat_messages_v2.read_at directly",
    bypasses: "receipt.controller (newly created)",
    danger: "P1",
    status: "resolved",
    resolution: "Extracted to receipt.controller.ts. useMessageLoader now delegates.",
  },
  {
    name: "LiveDeliveryChat.sendMessage",
    file: "src/components/delivery/LiveDeliveryChat.tsx",
    flow: "delivery_chat_send",
    mutates: "chat_messages_v2 via insertMessage",
    bypasses: "Not Orbit domain — delivery-specific chat",
    danger: "P3",
    status: "accepted_external",
    resolution: "Delivery chat is a separate domain. Not part of Orbit scope.",
  },
  {
    name: "useRentalMessaging.sendMessage",
    file: "src/hooks/rental/useRentalMessaging.ts",
    flow: "rental_chat_send",
    mutates: "chat_messages_v2",
    bypasses: "Not Orbit domain — rental-specific chat",
    danger: "P3",
    status: "accepted_external",
    resolution: "Rental messaging is a separate domain.",
  },
] as const;

// ══════════════════════════════════════════════
// 3. COMPETING REALTIME LISTENERS
// ══════════════════════════════════════════════

export const COMPETING_LISTENERS = [
  {
    name: "useMessageLoader per-conversation listener",
    file: "src/components/communication-hub/chat/useMessageLoader.ts",
    table: "chat_messages_v2",
    filter: "conversation_id=eq.{id}",
    mutates: "rawMessages local state",
    status: "active_primary",
    note: "This IS the runtime message listener. orbit-realtime-owner.ts is the CANONICAL but not yet wired to runtime.",
  },
  {
    name: "orbit-realtime-owner subscribeConversationMessages",
    file: "src/domains/orbit/realtime/orbit-realtime-owner.ts",
    table: "chat_messages_v2",
    filter: "conversation_id=eq.{id}",
    mutates: "orbitStore",
    status: "canonical_not_active",
    note: "Created as canonical layer but not mounted in runtime. Will replace useMessageLoader listener when orbitStore becomes primary.",
  },
  {
    name: "useConversationThreads inbox listener",
    file: "src/components/communication-hub/useConversationThreads.ts",
    table: "conversations_v2, call_logs, conversation_preferences",
    filter: "various",
    mutates: "local threads state",
    status: "active_primary",
    note: "Legitimate inbox-level listener. Does debounced full reload. NOT conflicting with message-level listeners.",
  },
  {
    name: "rental-data realtime listener",
    file: "src/repositories/rental-data.repository.ts",
    table: "chat_messages_v2",
    filter: "tenant-specific",
    mutates: "rental UI state",
    status: "accepted_external",
    note: "Rental domain owns this. Not Orbit scope.",
  },
] as const;

// ══════════════════════════════════════════════
// 4. COMPETING STORES / FAMILIES
// ══════════════════════════════════════════════

export const COMPETING_STORES = [
  {
    name: "useMessageLoader rawMessages state",
    file: "src/components/communication-hub/chat/useMessageLoader.ts",
    owns: "messages for active conversation",
    competing_with: "orbitStore.messages",
    status: "active_primary",
    resolution: "This is the RUNTIME truth for messages. orbitStore is the CANONICAL truth not yet wired. Transition in progress.",
  },
  {
    name: "useConversationThreads threads state",
    file: "src/components/communication-hub/useConversationThreads.ts",
    owns: "inbox thread list",
    competing_with: "orbitStore.conversations",
    status: "active_primary",
    resolution: "Inbox uses enriched ConversationThread type with business metadata. orbitStore uses OrbitConversation. Will converge when view-model layer bridges them.",
  },
  {
    name: "orbitStore (domains/orbit)",
    file: "src/domains/orbit/stores/orbit.store.ts",
    owns: "conversations, messages, attachments, receipts canonical",
    competing_with: "runtime local states above",
    status: "canonical_not_primary",
    resolution: "Will become primary when runtime migration completes.",
  },
  {
    name: "composerStore",
    file: "src/stores/orbit/composer.store.ts",
    owns: "drafts, replies, edits, sending locks",
    competing_with: "nothing — single owner",
    status: "canonical_active",
    resolution: "No conflict. Sole owner of composer state.",
  },
  {
    name: "callStore",
    file: "src/stores/orbit/call.store.ts",
    owns: "call sessions, active call, streams",
    competing_with: "nothing — single owner",
    status: "canonical_active",
    resolution: "No conflict. Sole owner of call state.",
  },
] as const;

// ══════════════════════════════════════════════
// 5. PAGES / COMPONENTS TOO RESPONSIBLE
// ══════════════════════════════════════════════

export const OVERSIZED_COMPONENTS = [
  {
    file: "src/components/communication-hub/HudChatPanel.tsx",
    responsibilities: ["messages", "calls", "attachments", "payments", "media", "contacts", "security", "selection", "deals"],
    status: "thin_assembler",
    note: "Each responsibility is a family hook. No business logic in the file itself. Acceptable as assembler.",
  },
  {
    file: "src/pages/CommunicationCenter.tsx",
    responsibilities: ["thread list", "thread selection", "tab navigation", "search"],
    status: "acceptable",
    note: "Page-level orchestration. Normal scope.",
  },
] as const;

// ══════════════════════════════════════════════
// 6. EXTRACTIONS MADE
// ══════════════════════════════════════════════

export const EXTRACTIONS = [
  "receipt.controller.ts — centralized markRead replacing inline DB calls",
  "ChatProvider removed from App.tsx (was empty shell)",
  "useMessageLoader markRead delegated to receipt.controller",
  "runtime-conflict-report.ts — living audit document",
  "useHudMessageMutationBridge — centralizes all inline setRawMessages mutations (delete/edit/star) from HudChatPanel",
  "useMessageSender dead export removed from families/messages/index.ts",
  "orbit-flow-registry.ts — single registry of ALL official Orbit entries",
  "inbox.viewmodel.ts — read-only projection for inbox UI",
  "conversation.viewmodel.ts — read-only projection for chat thread UI",
  "call.viewmodel.ts — read-only projection for call overlay UI",
  "composer.viewmodel.ts — read-only projection for composer state",
  "store.selectors.ts — Zustand selector hooks for optimized reads",
  "orbit-flow-gate.ts — Full typed registries: PipelineRegistry, OwnerRegistry, SerialRegistry, BatchRegistry, SignalRegistry, executeFlow",
  "orbitDispatch wired through executeFlow — every command passes through flow-gate anti-duplication",
  "receipt.controller wired through flow-gate — markRead/markSingleRead/clearMarkedUnread protected",
  "orbit.services.ts wired through flow-gate — sendTextMessage/sendMediaMessage/sendVoiceMessage/createDirectConversation protected",
  "VoiceRecorder.tsx redirected through orbitDispatch — no more direct insertMessage",
  "createOrGetDirectConversation flow-gated — duplicate concurrent creation prevented",
] as const;

// ══════════════════════════════════════════════
// 7. SUPPRESSIONS MADE
// ══════════════════════════════════════════════

export const SUPPRESSIONS = [
  "ChatProvider import removed from App.tsx",
  "ChatProvider wrapper removed from App.tsx render tree",
  "Inline markRead DB calls in useMessageLoader replaced with receipt.controller",
  "useMessageSender re-export removed from families/messages/index.ts (dead code — no consumers)",
  "6 inline setRawMessages mutation lambdas removed from HudChatPanel (replaced by useHudMessageMutationBridge)",
  "VoiceRecorder direct insertMessage replaced with orbitDispatch send_voice",
] as const;

// ══════════════════════════════════════════════
// 8. FLUX REDIRECTIONS
// ══════════════════════════════════════════════

export const REDIRECTIONS = [
  {
    from: "useMessageLoader inline read_at update",
    to: "receipt.controller.markConversationMessagesRead",
    status: "done",
  },
  {
    from: "useMessageLoader inline read_at on realtime INSERT",
    to: "receipt.controller.markSingleMessageRead",
    status: "done",
  },
  {
    from: "HudChatPanel inline onDeletedForAll / onDeletedForMe / onEdited / onStarToggle lambdas",
    to: "useHudMessageMutationBridge stable callbacks",
    status: "done",
  },
  {
    from: "orbitDispatch raw switch/case (no flow-gate)",
    to: "orbitDispatch → executeFlow(entryKey) → executor",
    status: "done",
  },
  {
    from: "receipt.controller direct DB calls (no flow-gate)",
    to: "receipt.controller → enterFlow/exitFlow per operation",
    status: "done",
  },
  {
    from: "orbit.services.ts direct pipeline calls (no flow-gate)",
    to: "orbit.services.ts → enterFlow/exitFlow per sendText/sendMedia/sendVoice/createDirect",
    status: "done",
  },
  {
    from: "VoiceRecorder.tsx direct insertMessage",
    to: "VoiceRecorder.tsx → orbitDispatch({ type: 'send_voice' })",
    status: "done",
  },
  {
    from: "createOrGetDirectConversation direct DB (no dedup)",
    to: "createOrGetDirectConversation → enterFlow/exitFlow with pair-keyed lock",
    status: "done",
  },
] as const;

// ══════════════════════════════════════════════
// 9. REMAINING POINTS (KEPT TEMPORARILY)
// ══════════════════════════════════════════════

export const REMAINING_TEMPORARY = [
  {
    item: "useMessageSender.ts file still exists on disk",
    reason: "Still used by HudChatPanel runtime. Will be migrated to orbitDispatch exclusively.",
    risk: "medium — competing write path, documented in flow registry as deprecated",
  },
  {
    item: "createOrGetDirectConversation still used by conversation-resolver",
    reason: "Functionally equivalent to canonical pipeline. Migration is cosmetic at this point.",
    risk: "low",
  },
  {
    item: "useConversationThreads owns inbox state locally",
    reason: "Thread list uses enriched types not yet in orbitStore. Will converge with view-model migration.",
    risk: "low — inbox.viewmodel.ts ready as replacement consumer",
  },
  {
    item: "useMessageLoader owns message state locally",
    reason: "Runtime primary. orbitStore is canonical but not yet primary. Phase 2 migration.",
    risk: "medium — two sources of truth exist but don't conflict because they serve different consumers",
  },
  {
    item: "orbit-realtime-owner not mounted in runtime",
    reason: "Canonical realtime layer ready but not wired. useMessageLoader handles runtime. Will switch when orbitStore becomes primary.",
    risk: "low",
  },
  {
    item: "families/send/send-text.ts still does direct DB insert",
    reason: "Used by useMessageSender (legacy). orbitDispatch executors use same pattern. Will converge when useMessageSender is retired.",
    risk: "medium — documented in flow registry",
  },
] as const;

// ══════════════════════════════════════════════
// 10. FLOW REGISTRY STATUS
// ══════════════════════════════════════════════

export const FLOW_REGISTRY_STATUS = {
  file: "src/domains/orbit/orbit-flow-registry.ts",
  officialEntries: 27,
  legacyBridges: 5,
  status: "active",
  note: "All official entries documented. Legacy bridges contained and documented. No new bypass allowed.",
} as const;

// ══════════════════════════════════════════════
// 11. VIEWMODEL LAYER STATUS
// ══════════════════════════════════════════════

export const VIEWMODEL_LAYER = {
  files: [
    "src/domains/orbit/viewmodels/inbox.viewmodel.ts",
    "src/domains/orbit/viewmodels/conversation.viewmodel.ts",
    "src/domains/orbit/viewmodels/call.viewmodel.ts",
    "src/domains/orbit/viewmodels/composer.viewmodel.ts",
  ],
  status: "ready",
  note: "Read-only projection layer. Does not own data. UI can consume these instead of reading stores directly.",
} as const;

// ══════════════════════════════════════════════
// 12. FLOW GATE INTEGRATION STATUS
// ══════════════════════════════════════════════

export const FLOW_GATE_STATUS = {
  file: "src/domains/orbit/flow-gate/orbit-flow-gate.ts",
  registries: {
    PipelineRegistry: "31 entries → versioned pipeline keys",
    OwnerRegistry: "6 canonical owners (messages, attachments, conversations, receipts, drafts, callSessions)",
    SignalRegistry: "10 realtime signals mapped to owners",
    SerialRegistry: "unique ID issuance with TTL auto-cleanup",
    BatchRegistry: "grouped operations (receipt.read, upload.multipart, location.live)",
  },
  integration: {
    orbitDispatch: "✅ Every command passes through executeFlow(entryKey)",
    receiptController: "✅ markRead/markSingleRead/clearMarkedUnread flow-gated",
    orbitServices: "✅ sendText/sendMedia/sendVoice/createDirect flow-gated",
    createOrGetDirectConversation: "✅ Pair-keyed flow-gate prevents duplicate creation",
    voiceRecorder: "✅ Redirected through orbitDispatch (no direct insertMessage)",
    groupCreate: "✅ Routes through orbitDb + withFlowGate (no inline supabase)",
    supabaseAdapter: "✅ Routes through orbitDb + callRepo (no inline supabase)",
    opsChatAI: "✅ Routes through aiChatRepo (no inline supabase)",
    globalSupportEngine: "✅ Routes through supportRepo (no inline supabase)",
    customerSupport: "✅ Routes through storefrontSupportRepo (no inline supabase)",
  },
  ciGuards: {
    auditInlineSupabase: "✅ PASS — 0 inline supabase calls in UI layer",
    auditOrbitFlowGate: "✅ PASS — 0 orbit DB writes outside allowed zones",
  },
  repositories: {
    "support.repository.ts": "supportRepo + storefrontSupportRepo (tickets, messages, faq)",
    "ai-chat.repository.ts": "aiChatRepo (threads, messages, usage, invoke)",
    "call.repository.ts": "callRepo (ghost_call_sessions)",
    "orbitDb.ts": "conversations_v2 + chat_messages_v2",
  },
  note: "Architecture: UI → OrbitEntry → executeFlow → pipeline → guardedWrite → owner → emitOutput → UI",
} as const;
