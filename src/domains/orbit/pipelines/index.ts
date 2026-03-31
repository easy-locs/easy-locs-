/**
 * Orbit Pipelines — All decomposed pipeline re-exports.
 */

// ── Inbox ──
export { bootstrapInbox, mergeInboxDelta } from "./inbox/inbox-bootstrap.pipeline";

// ── Message Send ──
export {
  validateTextInput,
  buildOptimisticTextMessage,
  reconcileTextMessage,
} from "./message/send-text.pipeline";
export type { SendTextInput, SendTextResult } from "./message/send-text.pipeline";

export {
  validateMediaInput,
  resolveAttachmentKind,
  buildLocalAttachment,
  buildOptimisticMediaMessage,
} from "./message/send-media.pipeline";
export type { SendMediaInput } from "./message/send-media.pipeline";

export {
  validateVoiceInput,
  buildLocalVoiceAttachment,
  buildOptimisticVoiceMessage,
} from "./message/send-voice.pipeline";
export type { SendVoiceInput } from "./message/send-voice.pipeline";

// ── Conversation ──
export { findOrCreateDirect, buildDirectPairKey } from "./conversation/find-or-create-direct.pipeline";

// ── Receipts ──
export { queueReadReceipt, shouldSendReadReceipt } from "./receipts/receipt.pipeline";

// ── Calls ──
export { attemptCallTransition, isCallTerminal, shouldTimeoutRinging } from "./call/call-lifecycle.pipeline";

// ── Groups ──
export { validateGroupInput, deduplicateMembers } from "./group/create-group.pipeline";
export type { CreateGroupInput } from "./group/create-group.pipeline";

// ── Search ──
export { searchConversationsLocal, searchMessagesLocal } from "./search/orbit-search.pipeline";

// ── Drafts ──
export { captureDraft, restoreDraft, clearDraft, hasDraft } from "./drafts/draft.pipeline";
