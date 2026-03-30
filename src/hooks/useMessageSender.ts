/**
 * useMessageSender — THIN ORCHESTRATOR for message sending.
 * Delegates to canonical sendText() from the send family.
 * Keeps: optimistic UI, offline queue, encryption, event emission.
 * Draft is isolated per conversationId to prevent cross-thread leaking.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { platformBus } from "@/lib/shared/platform-bus";
import { resolveConversationId } from "@/lib/orbit/messaging/conversation-resolver";
import { sendText } from "@/families/send";
import { startFlow, addStep, completeStep, failStep, endFlow } from "@/lib/runtime/flow-tracer";
import { reportHealth } from "@/lib/runtime/health-aggregator";

type SecurityLevel = "normal" | "high" | "ghost";

type ThreadLike = {
  id: string;
  name?: string | null;
  /** Canonical conversation UUID */
  conversationId?: string | null;
  conversationType?: string | null;
  peerUserId?: string | null;
  peerOrbitId?: string | null;
  // ── Deprecated compat ──
  /** @deprecated Use conversationId */
  v2ConversationId?: string | null;
  /** @deprecated Use entityId */
  contextId?: string | null;
  /** @deprecated Use conversationId */
  threadId?: string | null;
  /** Business entity ID */
  entityId?: string | null;
};

type ChatMessage = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read: boolean;
  message_type: string;
  category?: string;
  pending?: boolean;
  failed?: boolean;
  reply_to_message_id?: string | null;
};

type Params = {
  thread: ThreadLike | null;
  orgId?: string | null;
  locale?: string;
  myOrbitId?: string | null;
  e2eReady?: boolean;
  encrypt?: (content: string, peerId: string) => Promise<string | null>;
  offline: {
    isOnline: boolean;
    queueMessage: (body: string, encrypted: boolean, meta: Record<string, unknown>) => Promise<string>;
  };
  privacySettings?: { defaultDisappearTtl?: string; readReceipts?: boolean };
  disappearTTL?: string;
  securityLevel: SecurityLevel;
  setSecurityLevel: (l: SecurityLevel) => void;
  selectedCategory?: string;
  replyTo: { msgId: string; content: string; senderName?: string } | null;
  setReplyTo: (r: { msgId: string; content: string; senderName?: string } | null) => void;
  setRawMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setPendingOffline: React.Dispatch<React.SetStateAction<any[]>>;
  onThreadUpdate: (threadId: string, updates: Record<string, unknown>) => void;
  resolveAuthUserId: () => Promise<string | null>;
};

/**
 * Per-conversation draft store — persists drafts across thread switches.
 * Module-level so drafts survive hook re-mounts within the same session.
 */
const draftsByConversation = new Map<string, string>();

export function useMessageSender(params: Params) {
  const [sending, setSending] = useState(false);

  // Resolve the current conversationId for draft isolation
  const conversationId = params.thread?.conversationId || params.thread?.id || "";
  const prevConversationIdRef = useRef(conversationId);

  // Draft state — initialized from per-conversation store
  const [newMessage, setNewMessageRaw] = useState(() => draftsByConversation.get(conversationId) || "");

  // When conversationId changes, swap to the correct draft
  useEffect(() => {
    if (conversationId !== prevConversationIdRef.current) {
      // Save current draft for the old conversation
      if (prevConversationIdRef.current) {
        const currentDraft = newMessage;
        if (currentDraft.trim()) {
          draftsByConversation.set(prevConversationIdRef.current, currentDraft);
        } else {
          draftsByConversation.delete(prevConversationIdRef.current);
        }
      }
      // Load draft for new conversation
      setNewMessageRaw(draftsByConversation.get(conversationId) || "");
      prevConversationIdRef.current = conversationId;
    }
  }, [conversationId]);

  // Wrap setNewMessage to also sync to the draft store
  const setNewMessage = useCallback((value: string | ((prev: string) => string)) => {
    setNewMessageRaw((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      if (next.trim()) {
        draftsByConversation.set(conversationId, next);
      } else {
        draftsByConversation.delete(conversationId);
      }
      return next;
    });
  }, [conversationId]);

  const handleSend = useCallback(async (explicitDraft?: string) => {
    const {
      thread, orgId, locale, myOrbitId, e2eReady, encrypt,
      offline, securityLevel, setSecurityLevel, replyTo, setReplyTo,
      setRawMessages, setPendingOffline, onThreadUpdate,
      resolveAuthUserId, selectedCategory, disappearTTL,
    } = params;

    const flow = startFlow("orbit", "sendMessage");

    // ── Validate ──
    const validateStep = addStep(flow, "validate");
    if (!thread) {
      failStep(flow, validateStep, "missing_thread");
      endFlow(flow, "failed");
      toast.error("No thread selected.");
      return;
    }
    // Use explicit draft if provided, otherwise fall back to local state
    const draftToSend = explicitDraft !== undefined ? explicitDraft : newMessage;
    if (!draftToSend.trim()) {
      failStep(flow, validateStep, "empty_message");
      endFlow(flow, "failed");
      toast.error("Message is empty.");
      return;
    }
    completeStep(flow, validateStep);

    const msgText = draftToSend.trim();
    const optimisticId = `opt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    // ── IMMEDIATE optimistic insert — before ANY network call ──
    const optimisticMsg: ChatMessage = {
      id: optimisticId, content: msgText, sender_id: "", // filled below
      created_at: now, read: false, message_type: "text",
      category: selectedCategory || "general", pending: true, failed: false,
      reply_to_message_id: replyTo?.msgId ?? null,
    };
    setRawMessages((prev) => [...prev, optimisticMsg]);
    setNewMessage("");
    const currentReply = replyTo;
    setReplyTo(null);

    // ── Resolve auth ONCE ──
    const resolveStep = addStep(flow, "resolve");
    let authUserId: string;
    try {
      const uid = await resolveAuthUserId();
      if (!uid) {
        failStep(flow, resolveStep, "missing_auth_user");
        endFlow(flow, "failed");
        setRawMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setNewMessage(msgText);
        toast.error("Authentication required.");
        return;
      }
      authUserId = uid;
      // Patch optimistic message with real sender
      setRawMessages((prev) => prev.map((m) => m.id === optimisticId ? { ...m, sender_id: authUserId } : m));
    } catch (err: any) {
      failStep(flow, resolveStep, err.message);
      endFlow(flow, "failed");
      setRawMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setNewMessage(msgText);
      toast.error("Authentication required.");
      return;
    }

    // ── Resolve conversation ──
    let conversationId: string;
    try {
      const result = await resolveConversationId({
        conversationId: thread.conversationId,
        entityId: thread.entityId,
        peerUserId: thread.peerUserId,
        peerOrbitId: thread.peerOrbitId,
        myUserId: authUserId,
        myOrbitId,
      });

      conversationId = result.conversationId;
      if (result.wasCreated) {
        onThreadUpdate(thread.id, { conversationId });
      }
    } catch (err: any) {
      failStep(flow, resolveStep, err.message);
      endFlow(flow, "failed");
      setRawMessages((prev) => prev.map((m) => m.id === optimisticId ? { ...m, pending: false, failed: true } : m));
      setNewMessage(msgText);
      toast.error("Failed to resolve conversation");
      return;
    }
    completeStep(flow, resolveStep, { conversationId });

    // ── Encryption ──
    let storedContent = msgText;
    let encryptedState = false;
    const peerId = thread.peerOrbitId || thread.peerUserId || null;
    if (e2eReady && encrypt && peerId) {
      try {
        const encrypted = await encrypt(msgText, peerId);
        if (encrypted) { storedContent = encrypted; encryptedState = true; }
      } catch { /* plaintext fallback */ }
    }

    // ── Offline queue ──
    if (!offline.isOnline) {
      const offlineStep = addStep(flow, "offline_queue");
      try {
        const senderOrbitId = myOrbitId || `orbit_${authUserId.slice(0, 12)}`;
        const queuedId = await offline.queueMessage(storedContent, encryptedState, {
          conversation_id: conversationId,
          sender_user_id: authUserId,
          sender_orbit_id: senderOrbitId,
          receiver_orbit_id: thread.peerOrbitId ?? null,
          type: "text",
          body: storedContent,
          reply_to_message_id: currentReply?.msgId ?? null,
          metadata: { encrypted: encryptedState, category: selectedCategory || "general", locale: locale || "en", security_level: securityLevel || "normal", disappear_ttl: disappearTTL ?? null },
        });
        setRawMessages((prev) => prev.map((m) => m.id === optimisticId ? { ...m, id: queuedId, pending: true, failed: false } : m));
        setPendingOffline((prev) => [...prev, { id: queuedId, conversationId, body: storedContent }]);
        onThreadUpdate(thread.id, { lastMessage: msgText, lastMessageTime: now, lastMessagePreview: msgText.slice(0, 120) });
        platformBus.emit("orbit:message_sent", { threadId: thread.id, conversationId, contentPreview: msgText.slice(0, 80), offline: true }, "orbit", { userId: authUserId, orgId: orgId || undefined });
        completeStep(flow, offlineStep);
        endFlow(flow, "success");
        toast("Queued — will send when connection returns.");
        return;
      } catch (e: any) {
        failStep(flow, offlineStep, e.message);
        endFlow(flow, "failed");
        setRawMessages((prev) => prev.map((m) => m.id === optimisticId ? { ...m, pending: false, failed: true } : m));
        setNewMessage(msgText);
        toast.error(e?.message || "Failed to queue message.");
        return;
      }
    }

    // ── Canonical send via send family ──
    setSending(true);
    const dbStep = addStep(flow, "canonical_send");
    try {
      const senderOrbitId = myOrbitId || `orbit_${authUserId.slice(0, 12)}`;
      const data = await sendText(
        {
          conversationId,
          senderUserId: authUserId,
          senderOrbitId,
          receiverOrbitId: thread.peerOrbitId,
          orgId: orgId || null,
        },
        storedContent,
        {
          encrypted: encryptedState,
          replyToMessageId: currentReply?.msgId,
          category: selectedCategory,
          locale,
          securityLevel,
          disappearTTL: disappearTTL ?? null,
        },
      );

      completeStep(flow, dbStep, { id: data?.id });

      // ── Reconcile optimistic ──
      setRawMessages((prev) => prev.map((m) =>
        m.id === optimisticId ? { ...m, id: data?.id || optimisticId, created_at: data?.created_at || now, pending: false, failed: false } : m
      ));

      onThreadUpdate(thread.id, {
        lastMessage: msgText, lastMessageTime: data?.created_at || now,
        lastMessagePreview: msgText.slice(0, 120), unreadCount: 0,
      });

      setSecurityLevel("normal");
      reportHealth("orbit", "ok");
      endFlow(flow, "success");
    } catch (e: any) {
      failStep(flow, dbStep, e?.message || "send_failed");
      reportHealth("orbit", "degraded", undefined, e?.message);
      endFlow(flow, "failed");
      setRawMessages((prev) => prev.map((m) => m.id === optimisticId ? { ...m, pending: false, failed: true } : m));
      setNewMessage(msgText);
      toast.error(e?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  }, [newMessage, params]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend]
  );

  return { sending, newMessage, setNewMessage, handleSend, handleKeyDown };
}
