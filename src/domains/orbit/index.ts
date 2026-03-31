/**
 * DOMAIN: ORBIT — Canonical communication domain.
 * Single source of truth for all Orbit sub-domains.
 *
 * Sub-domains:
 * - types       → Canonical entity definitions
 * - normalizers  → Payload normalization layer
 * - resolvers    → ID resolution layer
 * - selectors    → Derived read paths
 * - machines     → State machine definitions
 * - pipelines    → Decomposed business logic
 * - guards       → Anti-duplicate, validation guards
 *
 * Existing modules (kept for backward compat):
 * - stores/orbit/  → Zustand stores (thread, call, composer, etc.)
 * - families/       → Domain families (send, calls, messages, etc.)
 * - repositories/   → DB access layer
 */

// ── Types ──
export type * from "./types";

// ── Normalizers ──
export {
  normalizeConversation,
  normalizeConversations,
  normalizeOrbitMessage,
  normalizeOrbitMessages,
  normalizeCallSession,
  normalizeCallSessions,
  normalizeAttachment,
  normalizeReceipt,
} from "./normalizers";

// ── Resolvers ──
export {
  resolveCanonicalUserId,
  resolveCanonicalConversationId,
  resolveCanonicalMessageId,
  resolveCanonicalParticipantId,
  resolveCanonicalAttachmentId,
  isValidOrbitUUID,
  buildOrbitAlias,
} from "./resolvers";

// ── Selectors ──
export {
  selectSortedConversations,
  selectByKind,
  selectUnread,
  selectTotalUnreadCount,
  selectActiveConversations,
  selectSortedMessages,
  selectMessagesByConversation,
  selectPendingMessages,
  selectFailedMessages,
  selectLastMessage,
} from "./selectors";

// ── Machines ──
export {
  transition,
  MESSAGE_MACHINE,
  CALL_MACHINE,
  UPLOAD_MACHINE,
  DRAFT_MACHINE,
  EPHEMERAL_MACHINE,
} from "./machines";

// ── Pipelines ──
export {
  bootstrapInbox,
  mergeInboxDelta,
  validateTextInput,
  buildOptimisticTextMessage,
  reconcileTextMessage,
  validateMediaInput,
  buildLocalAttachment,
  buildOptimisticMediaMessage,
  validateVoiceInput,
  buildLocalVoiceAttachment,
  buildOptimisticVoiceMessage,
  findOrCreateDirect,
  queueReadReceipt,
  shouldSendReadReceipt,
  attemptCallTransition,
  isCallTerminal,
  validateGroupInput,
  deduplicateMembers,
  searchConversationsLocal,
  searchMessagesLocal,
  captureDraft,
  restoreDraft,
  clearDraft,
  hasDraft,
} from "./pipelines";

// ── Guards ──
export {
  acquireSubmitLock,
  isContentDuplicate,
  releaseSubmitLock,
} from "./guards/send-guard";

// ── Controllers ──
export {
  markConversationMessagesRead,
  markSingleMessageRead,
  clearMarkedUnread,
} from "./controllers";
