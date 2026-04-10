export {
  selectSortedConversations,
  selectByKind,
  selectUnread,
  selectTotalUnreadCount,
  selectActiveConversations,
} from "./inbox.selectors";

export {
  selectSortedMessages,
  selectMessagesByConversation,
  selectPendingMessages,
  selectFailedMessages,
  selectLastMessage,
} from "./message.selectors";

// ── Store-level selector hooks (optimized reads) ──
export {
  useAllConversations,
  useConversation,
  useTotalUnreadCount,
  useConversationMessages,
  usePendingMessages,
  useFailedMessages,
  useAttachment,
  useMessageAttachments,
  useActiveConversationId,
  useIsHydrating,
} from "./store.selectors";
