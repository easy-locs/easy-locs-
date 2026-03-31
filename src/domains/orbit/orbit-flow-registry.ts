/**
 * ORBIT FLOW REGISTRY — Single source of truth for all official Orbit entries.
 *
 * Every Orbit business action MUST map to exactly one entry here.
 * No other function may perform the same action.
 * Legacy paths must delegate to these entries or become passive bridges.
 *
 * Structure: flowId → { entry, owner, pipeline, status }
 */

// ══════════════════════════════════════════════
// 1. MESSAGES
// ══════════════════════════════════════════════

export const MESSAGE_FLOWS = {
  send_text: {
    entry: "orbitDispatch({ type: 'send_text' })",
    executor: "families/orbit-dispatch/pipeline/executeSendText",
    service: "domains/orbit/services/orbit.services#sendTextMessage",
    owner: "orbitStore.messages",
    subPipelines: [
      "validateTextInput",
      "antiDuplicateSubmit (send-locks)",
      "buildOptimisticTextMessage",
      "mergeMessage (orbitStore)",
      "executeSendText (transport)",
      "reconcileTextMessage",
    ],
  },
  send_media: {
    entry: "orbitDispatch({ type: 'send_media' })",
    executor: "families/orbit-dispatch/pipeline/executeSendMedia",
    service: "domains/orbit/services/orbit.services#sendMediaMessage",
    owner: "orbitStore.messages + orbitStore.attachments",
    subPipelines: [
      "validateMediaInput",
      "buildLocalAttachment",
      "buildLocalPreview",
      "buildOptimisticMediaMessage",
      "mergeAttachment + mergeMessage (orbitStore)",
      "enqueueUpload",
      "executeUpload",
      "reconcileMediaAttachment",
    ],
  },
  send_media_batch: {
    entry: "orbitDispatch({ type: 'send_media_batch' })",
    executor: "families/orbit-dispatch/pipeline/executeSendMediaBatch",
    owner: "orbitStore.messages + orbitStore.attachments",
    subPipelines: ["per-file → send_media pipeline"],
  },
  send_voice: {
    entry: "orbitDispatch({ type: 'send_voice' })",
    executor: "families/orbit-dispatch/pipeline/executeSendVoice",
    service: "domains/orbit/services/orbit.services#sendVoiceMessage",
    owner: "orbitStore.messages + orbitStore.attachments",
    subPipelines: [
      "validateVoiceInput",
      "buildLocalVoiceAttachment",
      "buildOptimisticVoiceMessage",
      "mergeAttachment + mergeMessage (orbitStore)",
      "enqueueVoiceUpload",
      "executeVoiceUpload",
      "reconcileVoiceMessage",
    ],
  },
  send_location: {
    entry: "orbitDispatch({ type: 'send_location' })",
    executor: "families/orbit-dispatch/pipeline/executeSendLocation",
    service: "domains/orbit/location/location.service#sendLocation",
    owner: "orbitStore.messages",
    subPipelines: [
      "validateLocationInput",
      "buildLocationPayload",
      "buildOptimisticLocationMessage",
      "mergeMessage (orbitStore)",
      "executeLocationSend",
      "reconcileLocationMessage",
    ],
  },
  edit_message: {
    entry: "orbitDispatch({ type: 'edit_message' })",
    executor: "families/orbit-dispatch/pipeline/executeEditMessage",
    owner: "orbitStore.messages",
    subPipelines: ["validateEdit", "updateMessage", "reconcile"],
  },
  reply: {
    entry: "orbitDispatch({ type: 'reply' })",
    executor: "families/orbit-dispatch/pipeline/executeReplyMessage",
    owner: "orbitStore.messages",
    subPipelines: ["validateReply", "buildOptimisticReply", "sendReply", "reconcile"],
  },
} as const;

// ══════════════════════════════════════════════
// 2. CONVERSATIONS
// ══════════════════════════════════════════════

export const CONVERSATION_FLOWS = {
  open_direct: {
    entry: "domains/orbit/services/orbit.services#createDirectConversation",
    altEntry: "families/threads#getOrCreateCanonicalDirectConversation (legacy bridge)",
    owner: "orbitStore.conversations",
    subPipelines: [
      "resolveCanonicalTarget",
      "directConversationLookup",
      "inflightDedup",
      "createIfMissing",
      "normalizeConversation",
      "mergeConversation (orbitStore)",
    ],
  },
  create_group: {
    entry: "orbitDispatch({ type: 'group_create' })",
    executor: "families/groups/group-create#GroupCreate.execute",
    owner: "orbitStore.conversations",
    subPipelines: [
      "validateGroupInput",
      "deduplicateMembers",
      "createGroupConversation",
      "addParticipants",
      "normalizeAndMerge",
    ],
  },
  update_group: {
    entry: "orbitDispatch({ type: 'group_update' })",
    executor: "families/groups/group-update#updateOrbitGroup",
    owner: "orbitStore.conversations",
    subPipelines: ["validateUpdate", "applyChanges", "mergeConversation"],
  },
} as const;

// ══════════════════════════════════════════════
// 3. CALLS
// ══════════════════════════════════════════════

export const CALL_FLOWS = {
  start_call: {
    entry: "orbitDispatch({ type: 'start_call' })",
    executor: "families/orbit-dispatch/pipeline/executeStartCall",
    owner: "callStore",
    subPipelines: [
      "callPermission",
      "callSessionCreate",
      "callSignalingSend",
      "activeCallState",
    ],
  },
  accept_call: {
    entry: "orbitDispatch({ type: 'accept_call' })",
    executor: "families/orbit-dispatch/pipeline/executeAcceptCall",
    owner: "callStore",
    subPipelines: ["acceptCallPipeline", "signalingAccept", "transitionToConnecting"],
  },
  decline_call: {
    entry: "orbitDispatch({ type: 'decline_call' })",
    executor: "families/orbit-dispatch/pipeline/executeDeclineCall",
    owner: "callStore",
    subPipelines: ["declineCallPipeline", "signalingDecline", "transitionToDeclined"],
  },
  end_call: {
    entry: "orbitDispatch({ type: 'end_call' })",
    executor: "families/orbit-dispatch/pipeline/executeEndCall",
    owner: "callStore",
    subPipelines: ["endCallPipeline", "signalingEnd", "transitionToEnded", "callHistoryPersist"],
  },
} as const;

// ══════════════════════════════════════════════
// 4. RECEIPTS
// ══════════════════════════════════════════════

export const RECEIPT_FLOWS = {
  mark_conversation_read: {
    entry: "domains/orbit/controllers/receipt.controller#markConversationMessagesRead",
    owner: "orbitStore via updateUnreadCount",
    subPipelines: [
      "readThrottle",
      "unreadMessageResolve",
      "batchMarkRead",
      "clearMarkedUnread",
      "updateUnreadState",
    ],
  },
  mark_single_read: {
    entry: "domains/orbit/controllers/receipt.controller#markSingleMessageRead",
    owner: "orbitStore",
    subPipelines: ["markRead", "receiptEmit"],
  },
} as const;

// ══════════════════════════════════════════════
// 5. DRAFTS
// ══════════════════════════════════════════════

export const DRAFT_FLOWS = {
  save_draft: {
    entry: "domains/orbit/pipelines/drafts/draft.pipeline#captureDraft",
    owner: "composerStore (keyed by conversationId)",
    subPipelines: ["draftCapture", "draftNormalize", "draftPersist"],
  },
  restore_draft: {
    entry: "domains/orbit/pipelines/drafts/draft.pipeline#restoreDraft",
    owner: "composerStore",
    subPipelines: ["draftRestore (read-only)"],
  },
  clear_draft: {
    entry: "domains/orbit/pipelines/drafts/draft.pipeline#clearDraft",
    owner: "composerStore",
    subPipelines: ["draftClear"],
  },
} as const;

// ══════════════════════════════════════════════
// 6. SEARCH
// ══════════════════════════════════════════════

export const SEARCH_FLOWS = {
  search_orbit: {
    entry: "domains/orbit/pipelines/search/orbit-search.pipeline#searchConversationsLocal",
    owner: "ephemeral (no store mutation)",
    subPipelines: ["searchConversationsLocal", "searchMessagesLocal"],
  },
} as const;

// ══════════════════════════════════════════════
// 7. PRESENCE / TYPING
// ══════════════════════════════════════════════

export const PRESENCE_FLOWS = {
  presence_update: {
    entry: "orbitDispatch({ type: 'presence_update' })",
    owner: "PresencePipeline (ephemeral)",
    subPipelines: ["sendPresence"],
  },
  typing_update: {
    entry: "orbitDispatch({ type: 'typing_update' })",
    owner: "PresencePipeline (ephemeral)",
    subPipelines: ["sendTyping"],
  },
} as const;

// ══════════════════════════════════════════════
// 8. ATTACHMENTS
// ══════════════════════════════════════════════

export const ATTACHMENT_FLOWS = {
  request_download: {
    entry: "domains/orbit/media#requestAttachmentDownload (planned)",
    owner: "orbitStore.attachments",
    subPipelines: [
      "downloadDecision",
      "downloadQueue",
      "downloadExecution",
      "localCacheWrite",
      "attachmentReady",
    ],
  },
  retry_upload: {
    entry: "domains/orbit/media#retryMediaUpload",
    owner: "orbitStore.attachments",
    subPipelines: ["retryUploadJob", "executeUpload", "reconcile"],
  },
} as const;

// ══════════════════════════════════════════════
// 9. REALTIME OWNERS
// ══════════════════════════════════════════════

export const REALTIME_OWNERS = {
  orbit_messages: {
    owner: "domains/orbit/realtime/orbit-realtime-owner#subscribeConversationMessages",
    table: "chat_messages_v2",
    status: "canonical",
    pipeline: "event → normalize → dedup → reconcile → mergeMessage (orbitStore)",
  },
  orbit_conversations: {
    owner: "domains/orbit/realtime/orbit-realtime-owner#subscribeUserConversations",
    table: "conversations_v2",
    status: "canonical",
    pipeline: "event → normalizeConversation → mergeConversation (orbitStore)",
  },
  call_signaling: {
    owner: "callRealtimeOwner (to be created)",
    table: "call_sessions_v2",
    status: "planned",
    pipeline: "event → normalizeCallSession → callStore",
  },
} as const;

// ══════════════════════════════════════════════
// 10. STORE OWNERS
// ══════════════════════════════════════════════

export const STORE_OWNERS = {
  conversations: { store: "orbitStore", key: "conversations" },
  messages: { store: "orbitStore", key: "messages" },
  attachments: { store: "orbitStore", key: "attachments" },
  receipts: { store: "orbitStore", key: "receipts" },
  drafts: { store: "composerStore", key: "draftsByConversation" },
  call_sessions: { store: "callStore", key: "activeCall" },
  selection: { store: "selectionStore", key: "selectedIds" },
  audio_playback: { store: "audioStore", key: "currentTrack" },
} as const;

// ══════════════════════════════════════════════
// 11. LEGACY BRIDGES (contained, not deleted)
// ══════════════════════════════════════════════

export const LEGACY_BRIDGES = [
  {
    file: "src/hooks/useMessageSender.ts",
    status: "deprecated",
    redirectsTo: "orbitDispatch send_text/send_media/send_voice",
    ownsNothing: true,
  },
  {
    file: "src/families/send/index.ts",
    status: "legacy_active",
    redirectsTo: "Used by broadcast + useMessageSender. Should delegate to orbit services.",
    ownsNothing: false,
    note: "send-text.ts still does direct DB insert. Needs containment.",
  },
  {
    file: "src/families/threads/index.ts",
    status: "legacy_bridge",
    redirectsTo: "domains/orbit/services#createDirectConversation",
    ownsNothing: true,
  },
  {
    file: "src/lib/orbit/createOrGetDirectConversation.ts",
    status: "legacy_active",
    redirectsTo: "Should delegate to findOrCreateDirect pipeline",
    ownsNothing: false,
    note: "Still does direct DB operations. Functionally equivalent to canonical.",
  },
  {
    file: "src/components/communication-hub/chat/useMessageLoader.ts",
    status: "runtime_primary",
    redirectsTo: "Will migrate to orbitStore when full local-first ready",
    ownsNothing: false,
    note: "Currently owns runtime message state. Transitional.",
  },
] as const;

// ══════════════════════════════════════════════
// ENFORCEMENT
// ══════════════════════════════════════════════

/**
 * ALL_OFFICIAL_ENTRIES — The complete list of official Orbit business entries.
 * No other function may perform these actions.
 * Any code path doing the same action must delegate to one of these.
 */
export const ALL_OFFICIAL_ENTRIES = [
  // Messages
  "orbitDispatch:send_text",
  "orbitDispatch:send_media",
  "orbitDispatch:send_media_batch",
  "orbitDispatch:send_voice",
  "orbitDispatch:send_location",
  "orbitDispatch:edit_message",
  "orbitDispatch:reply",
  // Conversations
  "orbitServices:createDirectConversation",
  "orbitDispatch:group_create",
  "orbitDispatch:group_update",
  // Calls
  "orbitDispatch:start_call",
  "orbitDispatch:accept_call",
  "orbitDispatch:decline_call",
  "orbitDispatch:end_call",
  // Receipts
  "receiptController:markConversationMessagesRead",
  "receiptController:markSingleMessageRead",
  // Drafts
  "draftPipeline:captureDraft",
  "draftPipeline:clearDraft",
  "draftPipeline:restoreDraft",
  // Search
  "searchPipeline:searchConversationsLocal",
  "searchPipeline:searchMessagesLocal",
  // Presence
  "orbitDispatch:presence_update",
  "orbitDispatch:typing_update",
  // Attachments
  "mediaService:retryMediaUpload",
  "mediaService:requestAttachmentDownload",
] as const;

export type OfficialEntry = typeof ALL_OFFICIAL_ENTRIES[number];
