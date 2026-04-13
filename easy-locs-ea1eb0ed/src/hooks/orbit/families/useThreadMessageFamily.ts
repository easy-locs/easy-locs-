/**
 * FAMILY: MESSAGE — Canonical message loading, sending, actions, translation, scroll.
 * Single source of truth for all message-related logic in a thread.
 */
import { useRef, useMemo, useCallback, useEffect } from "react";
import { useMessageLoader } from "@/components/communication-hub/chat/useMessageLoader";
import { useDecryptedMessages } from "@/hooks/useDecryptedMessages";
import { useOrbitDispatch } from "@/families/orbit-dispatch/useOrbitDispatch";
import { useTranslation } from "@/hooks/useTranslation";
import { useOrbitMessageActions } from "@/hooks/useOrbitMessageActions";
import { useOrbitScrollManager } from "@/hooks/useOrbitScrollManager";
import { useOrbitThreadUiState } from "@/hooks/useOrbitThreadUiState";
import { useMessageSelection } from "@/components/communication-hub/chat/useMessageSelection";
import { toMessageViewModels } from "@/families/messages/message-view-model";
import type { ConversationThread, ChatMessage } from "@/components/communication-hub/types";
import { MESSAGE_CATEGORIES } from "@/components/communication-hub/types";

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
  // replyTo/setReplyTo removed — composerStore is single source of truth
  resolveAuthUserId: () => Promise<string | null>;
  onThreadUpdate: (conversationId: string, updates: any) => void;
}) {
  const {
    thread, orgId, userId, myOrbitId, locale, e2eReady, encrypt, decrypt,
    offline, privacySettings, disappearTTL, securityLevel, setSecurityLevel,
    resolveAuthUserId, onThreadUpdate,
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

  // ── View Model layer: canonical transform for UI consumption ──
  const viewModels = useMemo(
    () => toMessageViewModels(messages as any, userId ?? null),
    [messages, userId],
  );

  const { showOriginal, translatingMsgId, handleTranslateMessage } = useTranslation(locale, loader.setRawMessages as any);

  const dispatch = useOrbitDispatch();

  const setRawMessagesRef = useRef(loader.setRawMessages);
  setRawMessagesRef.current = loader.setRawMessages;

  const messageSender = useMemo(() => ({
    handleSend: async (explicitDraft: string) => {
      const conversationId = thread?.conversationId || thread?.v2ConversationId || "";
      if (!conversationId || !explicitDraft.trim()) return;
      const body = explicitDraft.trim();
      const tempId = crypto.randomUUID();
      const now = new Date().toISOString();

      const optimistic: ChatMessage = {
        id: tempId,
        sender_id: userId || null,
        content: body,
        created_at: now,
        read: true,
        category: "general",
        message_type: "text",
        pending: true,
        failed: false,
        reply_to_message_id: null,
        metadata: { _tempId: tempId },
      } as ChatMessage;
      setRawMessagesRef.current((prev: ChatMessage[]) => [...prev, optimistic]);

      const result = await dispatch({
        type: "send_text",
        conversationId,
        body,
        locale,
        category: "general",
        ...(disappearTTL && disappearTTL !== "off" ? { disappearTTL } : {}),
        _uiTempId: tempId,
      });

      if (!result.ok) {
        setRawMessagesRef.current((prev: ChatMessage[]) =>
          prev.map(m => m.id === tempId ? { ...m, pending: false, failed: true } : m)
        );
      }
    },
  }), [thread?.conversationId, thread?.v2ConversationId, locale, dispatch, disappearTTL, userId]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRawMessagesRef.current((prev: ChatMessage[]) => {
        const stale = prev.some(m => m.pending && !m.failed && (now - new Date(m.created_at).getTime()) > 10_000);
        if (!stale) return prev;
        return prev.map(m =>
          m.pending && !m.failed && (now - new Date(m.created_at).getTime()) > 10_000
            ? { ...m, pending: false, failed: true, status: "failed" as const }
            : m
        );
      });
    }, 3_000);
    return () => clearInterval(interval);
  }, []);

  const retryMessage = useCallback(async (msg: ChatMessage) => {
    const conversationId = thread?.conversationId || thread?.v2ConversationId || "";
    if (!conversationId || !msg.content?.trim()) return;
    setRawMessagesRef.current((prev: ChatMessage[]) =>
      prev.map(m => m.id === msg.id ? { ...m, pending: true, failed: false, status: "sending" as const, created_at: new Date().toISOString() } : m)
    );
    const result = await dispatch({
      type: "send_text",
      conversationId,
      body: msg.content.trim(),
      locale,
      category: msg.category || "general",
      _uiTempId: msg.id,
    });
    if (!result.ok) {
      setRawMessagesRef.current((prev: ChatMessage[]) =>
        prev.map(m => m.id === msg.id ? { ...m, pending: false, failed: true, status: "failed" as const } : m)
      );
    }
  }, [thread?.conversationId, thread?.v2ConversationId, locale, dispatch]);

  const loadMessagesRef = useRef(loader.loadMessages);
  loadMessagesRef.current = loader.loadMessages;
  const stableOnAfterChange = useCallback(() => { loadMessagesRef.current(); }, []);

  const messageActions = useOrbitMessageActions({
    conversationId: thread?.conversationId || thread?.v2ConversationId || null,
    currentUserId: userId ?? null,
    onAfterChange: stableOnAfterChange,
  });

  const { showJumpToBottom, jumpToBottom, scrollToBottomInstant } = useOrbitScrollManager(
    scrollRef,
    messages.length,
    loader.typingIndicator,
    thread?.conversationId || thread?.v2ConversationId || thread?.id || undefined
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
    return MESSAGE_CATEGORIES.find((c: any) => c.value === cat)?.icon || "💬";
  }, []);

  const isLoadingMessages = loader.messagesLoading && messages.length === 0;

  return {
    scrollRef,
    selection,
    loader,
    messages,
    viewModels,
    messageSender,
    retryMessage,
    messageActions,
    showOriginal,
    translatingMsgId,
    handleTranslateMessage,
    showJumpToBottom,
    jumpToBottom,
    scrollToBottomInstant,
    threadUi,
    pinnedMessage,
    getCategoryIcon,
    isLoadingMessages,
  };
}
