/**
 * FAMILY: MESSAGE — Canonical message loading, sending, actions, translation, scroll.
 * Single source of truth for all message-related logic in a thread.
 */
import { useRef, useMemo, useCallback } from "react";
import { useMessageLoader } from "@/components/communication-hub/chat/useMessageLoader";
import { useDecryptedMessages } from "@/hooks/useDecryptedMessages";
import { useMessageSender } from "@/hooks/useMessageSender";
import { useTranslation } from "@/hooks/useTranslation";
import { useOrbitMessageActions } from "@/hooks/useOrbitMessageActions";
import { useOrbitScrollManager } from "@/hooks/useOrbitScrollManager";
import { useOrbitThreadUiState } from "@/hooks/useOrbitThreadUiState";
import { useMessageSelection } from "@/components/communication-hub/chat/useMessageSelection";
import type { ConversationThread, ChatMessage } from "@/components/communication-hub/types";

export function useThreadMessageFamily(params: {
  thread: ConversationThread | null;
  orgId: string | null;
  userId: string | undefined;
  myOrbitId: string | null;
  locale: string;
  e2eReady: boolean;
  encrypt: any;
  decrypt: any;
  offline: any;
  privacySettings: any;
  disappearTTL: string;
  securityLevel: string;
  setSecurityLevel: (l: string) => void;
  replyTo: any;
  setReplyTo: (r: any) => void;
  resolveAuthUserId: () => Promise<string | null>;
  onThreadUpdate: (threadId: string, updates: any) => void;
}) {
  const {
    thread, orgId, userId, myOrbitId, locale, e2eReady, encrypt, decrypt,
    offline, privacySettings, disappearTTL, securityLevel, setSecurityLevel,
    replyTo, setReplyTo, resolveAuthUserId, onThreadUpdate,
  } = params;

  const scrollRef = useRef<HTMLDivElement>(null);

  const selection = useMessageSelection();

  const loader = useMessageLoader({
    thread,
    orgId,
    userId,
    readReceipts: privacySettings.readReceipts,
    onThreadUpdate,
    offline,
  });

  const { messages: decryptedMessages } = useDecryptedMessages(loader.rawMessages, decrypt, userId);
  const messages = decryptedMessages as ChatMessage[];

  const { showOriginal, translatingMsgId, handleTranslateMessage } = useTranslation(locale, loader.setRawMessages as any);

  const messageSender = useMessageSender({
    thread,
    orgId,
    locale,
    myOrbitId,
    e2eReady,
    encrypt,
    offline,
    privacySettings,
    disappearTTL,
    securityLevel: securityLevel as "normal" | "high" | "ghost",
    setSecurityLevel: setSecurityLevel as (l: "normal" | "high" | "ghost") => void,
    selectedCategory: "general",
    replyTo: selection.replyTo,
    setReplyTo: (r: any) => selection.setReplyTo(r),
    setRawMessages: loader.setRawMessages as any,
    setPendingOffline: loader.setPendingOffline,
    onThreadUpdate,
    resolveAuthUserId,
  });

  const messageActions = useOrbitMessageActions({
    conversationId: thread?.v2ConversationId ?? null,
    currentUserId: userId ?? null,
    onAfterChange: () => loader.loadMessages(),
  });

  const { showJumpToBottom, jumpToBottom } = useOrbitScrollManager(
    scrollRef,
    [messages.length, loader.typingIndicator]
  );

  const threadUi = useOrbitThreadUiState({
    conversationType: thread?.conversationType ?? null,
    metadata: (thread as any)?.metadata ?? null,
  });

  const pinnedMessage = useMemo(() => {
    if (!threadUi.pinnedMessageId) return null;
    return messages.find((m: any) => m.id === threadUi.pinnedMessageId) || null;
  }, [messages, threadUi.pinnedMessageId]);

  const getCategoryIcon = useCallback((cat: string) => {
    const { MESSAGE_CATEGORIES } = require("@/components/communication-hub/types");
    return MESSAGE_CATEGORIES.find((c: any) => c.value === cat)?.icon || "💬";
  }, []);

  const isLoadingMessages = loader.messagesLoading && messages.length === 0;

  return {
    scrollRef,
    selection,
    loader,
    messages,
    messageSender,
    messageActions,
    showOriginal,
    translatingMsgId,
    handleTranslateMessage,
    showJumpToBottom,
    jumpToBottom,
    threadUi,
    pinnedMessage,
    getCategoryIcon,
    isLoadingMessages,
  };
}
