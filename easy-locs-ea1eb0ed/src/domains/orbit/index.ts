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

// ── Domain Services ──
export { sendMedia, reconcileMediaUpload, failMediaUpload, retryMediaUpload } from "./media";
export { sendVoice, reconcileVoiceUpload, failVoiceUpload } from "./voice";
export { sendLocation } from "./location";

// ── Domain Sub-modules ──
export { normalizeAttachment as normalizeAttachmentFromRaw } from "./attachments";
export { canTransitionUpload, canTransitionDownload, isUploadTerminal, isUploadRetryable } from "./attachments";
export { canTransitionVoice, assertVoiceTransition, isVoiceActive, isVoiceTerminal } from "./voice";
export { isValidCoords, isAccuracySufficient } from "./location";

// ── Location pipeline ──
export {
  validateLocationInput,
  buildLocationPayload,
  buildOptimisticLocationMessage,
} from "./pipelines/message/send-location.pipeline";

// ── Media selectors ──
export {
  selectAttachmentsForMessage,
  selectAttachment,
  selectPendingUploads,
  selectFailedUploads,
  hasActiveUploads,
  selectUploadProgress,
  selectAttachmentDisplayUrl,
} from "./media";

// ── ViewModels (read-only projection layer) ──
export { useInboxViewModel, useConversationViewModel, useCallViewModel, useComposerViewModel } from "./viewmodels";
export type { InboxItemViewModel, ConversationViewModel, CallViewModel, ComposerViewModel } from "./viewmodels";

// ── Flow Registry ──
export { ALL_OFFICIAL_ENTRIES } from "./orbit-flow-registry";
export type { OfficialEntry } from "./orbit-flow-registry";

// ── Flow Gate System ──
export {
  OrbitEntry,
  OrbitOutput,
  emitOutput,
  onOutput,
  assertSingleFlow,
  enterFlow,
  exitFlow,
  isFlowActive,
  assertCrossFlow,
  preventDuplicateExecution,
  guardedWrite,
  withFlowGate,
  withFlowGateSync,
  FlowGateError,
} from "./flow-gate";
