/**
 * useMessageSender — V2-ONLY canonical message sender.
 * Writes to chat_messages_v2 exclusively. No legacy path.
 * Auto-creates V2 conversation if missing.
 */
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";
import { createOrGetDirectConversation } from "@/lib/orbit/createOrGetDirectConversation";

const db = supabase as any;

type SecurityLevel = "normal" | "high" | "ghost";

type ThreadLike = {
  id: string;
  name?: string | null;
  contextId?: string | null;
  conversationType?: string | null;
  v2ConversationId?: string | null;
  peerUserId?: string | null;
  peerOrbitId?: string | null;
  threadId?: string | null;
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
    queueMessage: (
      body: string,
      encrypted: boolean,
      meta: Record<string, unknown>
    ) => Promise<string>;
  };
  privacySettings?: {
    defaultDisappearTtl?: string;
    readReceipts?: boolean;
  };
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

export function useMessageSender(params: Params) {
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");

  const trace = useCallback((step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
    const logger = phase === "error" ? console.error : console.log;
    logger(`[SEND_MESSAGE][${step}] ${phase}:`, payload ?? {});
  }, []);

  const handleSend = useCallback(async () => {
    trace("composer.read", "input", { rawValue: newMessage, trimmedValue: newMessage.trim(), length: newMessage.length });

    const {
      thread,
      orgId,
      locale,
      myOrbitId,
      e2eReady,
      encrypt,
      offline,
      securityLevel,
      setSecurityLevel,
      replyTo,
      setReplyTo,
      setRawMessages,
      setPendingOffline,
      onThreadUpdate,
      resolveAuthUserId,
      selectedCategory,
      disappearTTL,
    } = params;

    trace("composer.read", "output", {
      hasThread: !!thread,
      threadId: thread?.id,
      v2ConversationId: thread?.v2ConversationId,
      peerUserId: thread?.peerUserId,
      peerOrbitId: thread?.peerOrbitId,
      messageLength: newMessage.trim().length,
      messagePreview: newMessage.trim().slice(0, 30),
    });

    trace("composer.validate", "input", {
      hasThread: !!thread,
      trimmedLength: newMessage.trim().length,
    });

    if (!thread) {
      trace("composer.validate", "error", { reason: "missing_thread" });
      toast.error("No thread selected.");
      return;
    }

    if (!newMessage.trim()) {
      trace("composer.validate", "error", { reason: "empty_message" });
      toast.error("Message is empty.");
      return;
    }

    trace("composer.validate", "output", {
      valid: true,
      threadId: thread.id,
      trimmedLength: newMessage.trim().length,
    });

    let conversationId = thread.v2ConversationId;

    trace("conversation.resolve", "input", {
      threadId: thread.id,
      v2ConversationId: conversationId,
      peerUserId: thread.peerUserId,
      peerOrbitId: thread.peerOrbitId,
      contextId: thread.contextId,
      conversationType: thread.conversationType,
    });

    if (!conversationId) {
      trace("auth.resolve", "input", { stage: "pre-autocreate" });
      const earlyAuthUserId = await resolveAuthUserId();
      trace("auth.resolve", "output", { stage: "pre-autocreate", authUserId: earlyAuthUserId || null });
      if (!earlyAuthUserId) {
        trace("auth.resolve", "error", { stage: "pre-autocreate", reason: "missing_auth_user" });
        toast.error("Authentication required.");
        return;
      }

      if (thread.contextId) {
        trace("conversation.resolve", "input", { strategy: "contextId", candidate: thread.contextId });
        const { data: existingConv } = await (supabase as any)
          .from("conversations_v2")
          .select("id")
          .eq("id", thread.contextId)
          .maybeSingle();
        if (existingConv?.id) {
          conversationId = existingConv.id;
          onThreadUpdate(thread.id, { v2ConversationId: conversationId });
          trace("conversation.resolve", "output", { strategy: "contextId", conversationId });
        }
      }

      if (!conversationId && thread.threadId) {
        trace("conversation.resolve", "input", { strategy: "threadId", candidate: thread.threadId });
        const { data: existingConv } = await (supabase as any)
          .from("conversations_v2")
          .select("id")
          .eq("id", thread.threadId)
          .maybeSingle();
        if (existingConv?.id) {
          conversationId = existingConv.id;
          onThreadUpdate(thread.id, { v2ConversationId: conversationId });
          trace("conversation.resolve", "output", { strategy: "threadId", conversationId });
        }
      }

      if (!conversationId && thread.peerUserId) {
        trace("conversation.autoCreate", "input", {
          myUserId: earlyAuthUserId,
          myOrbitId,
          peerUserId: thread.peerUserId,
          peerOrbitId: thread.peerOrbitId,
        });
        try {
          const conv = await createOrGetDirectConversation({
            myUserId: earlyAuthUserId,
            myOrbitId: myOrbitId,
            peerUserId: thread.peerUserId,
            peerOrbitId: thread.peerOrbitId,
          });
          conversationId = conv.id;
          onThreadUpdate(thread.id, { v2ConversationId: conv.id });
          trace("conversation.autoCreate", "output", { conversationId: conv.id });
        } catch (err: any) {
          trace("conversation.autoCreate", "error", { message: err?.message || "auto_create_failed" });
          toast.error("Failed to create conversation");
          return;
        }
      }

      if (!conversationId) {
        trace("conversation.resolve", "error", { reason: "unresolved_conversation" });
        toast.error("No conversation found. Try reopening the chat.");
        return;
      }
    }

    trace("conversation.resolve", "output", { conversationId });

    trace("auth.resolve", "input", { stage: "send" });
    const authUserId = await resolveAuthUserId();
    trace("auth.resolve", "output", { stage: "send", authUserId: authUserId || null });
    if (!authUserId) {
      trace("auth.resolve", "error", { stage: "send", reason: "missing_auth_user" });
      toast.error("Authentication required.");
      return;
    }

    const msgText = newMessage.trim();
    const optimisticId = `opt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      content: msgText,
      sender_id: authUserId,
      created_at: now,
      read: false,
      message_type: "text",
      category: selectedCategory || "general",
      pending: true,
      failed: false,
      reply_to_message_id: replyTo?.msgId ?? null,
    };

    trace("message.optimistic.insert", "input", {
      optimisticId,
      conversationId,
      senderId: authUserId,
      preview: msgText.slice(0, 40),
    });
    setRawMessages((prev) => [...prev, optimisticMsg]);
    setNewMessage("");
    const currentReply = replyTo;
    setReplyTo(null);
    trace("message.optimistic.insert", "output", { optimisticId, inserted: true });

    let storedContent = msgText;
    let encryptedState = false;
    const peerId = thread.peerOrbitId || thread.peerUserId || null;

    if (e2eReady && encrypt && peerId) {
      try {
        const encrypted = await encrypt(msgText, peerId);
        if (encrypted) {
          storedContent = encrypted;
          encryptedState = true;
        }
      } catch (error: any) {
        trace("message.db.confirm", "error", { stage: "encrypt", message: error?.message || "encryption_failed_plaintext_fallback" });
      }
    }

    if (!offline.isOnline) {
      try {
        const queuedId = await offline.queueMessage(storedContent, encryptedState, {
          conversationId,
          sender_user_id: authUserId,
          sender_orbit_id: myOrbitId ?? null,
          receiver_orbit_id: thread.peerOrbitId ?? null,
          type: "text",
          reply_to_message_id: currentReply?.msgId ?? null,
          metadata: {
            encrypted: encryptedState,
            category: selectedCategory || "general",
            locale: locale || "en",
            security_level: securityLevel,
            disappear_ttl: disappearTTL ?? null,
          },
        });

        setRawMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticId ? { ...m, id: queuedId, pending: true, failed: false } : m
          )
        );

        setPendingOffline((prev) => [
          ...prev,
          {
            id: queuedId,
            conversationId,
            body: storedContent,
          },
        ]);

        onThreadUpdate(thread.id, {
          lastMessage: msgText,
          lastMessageTime: now,
          lastMessagePreview: msgText.slice(0, 120),
        });

        trace("thread.preview.update", "output", {
          threadId: thread.id,
          lastMessagePreview: msgText.slice(0, 120),
          offline: true,
        });

        platformBus.emit(
          "orbit:message_sent",
          {
            threadId: thread.id,
            conversationId,
            contentPreview: msgText.slice(0, 80),
            offline: true,
          },
          "orbit",
          { userId: authUserId, orgId: orgId || undefined }
        );

        toast("Queued — will send when connection returns.");
        return;
      } catch (e: any) {
        trace("message.optimistic.reconcile", "error", { stage: "offline_queue", message: e?.message || "queue_failed" });
        setRawMessages((prev) =>
          prev.map((m) => (m.id === optimisticId ? { ...m, pending: false, failed: true } : m))
        );
        setNewMessage(msgText);
        toast.error(e?.message || "Failed to queue message.");
        return;
      }
    }

    setSending(true);

    try {
      trace("message.db.insert", "input", {
        conversationId,
        senderUserId: authUserId,
        senderOrbitId: myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
        preview: msgText.slice(0, 40),
      });
      const { data, error } = await db
        .from("chat_messages_v2")
        .insert({
          conversation_id: conversationId,
          sender_user_id: authUserId,
          sender_orbit_id: myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
          receiver_orbit_id: thread.peerOrbitId ?? null,
          type: "text",
          body: storedContent,
          reply_to_message_id: currentReply?.msgId ?? null,
          metadata: {
            encrypted: encryptedState,
            category: selectedCategory || "general",
            locale: locale || "en",
            security_level: securityLevel,
            disappear_ttl: disappearTTL ?? null,
          },
        })
        .select("*")
        .single();

      if (error) {
        trace("message.db.insert", "error", { message: error.message, code: error.code });
        throw error;
      }

      trace("message.db.insert", "output", { id: data.id, created_at: data.created_at });
      trace("message.db.confirm", "output", { confirmedId: data.id, optimisticId });

      const preview = msgText.slice(0, 120);

      await db
        .from("conversations_v2")
        .update({
          last_message_at: data.created_at || now,
          last_message_preview: preview,
          updated_at: data.created_at || now,
        })
        .eq("id", conversationId);

      setRawMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId
            ? {
                ...m,
                id: data.id,
                created_at: data.created_at || now,
                pending: false,
                failed: false,
              }
            : m
        )
      );

      trace("message.optimistic.reconcile", "output", {
        optimisticId,
        confirmedId: data.id,
      });

      onThreadUpdate(thread.id, {
        lastMessage: msgText,
        lastMessageTime: data.created_at || now,
        lastMessagePreview: preview,
        unreadCount: 0,
      });

      trace("thread.preview.update", "output", {
        threadId: thread.id,
        lastMessagePreview: preview,
        lastMessageTime: data.created_at || now,
      });

      platformBus.emit(
        "orbit:message_sent",
        {
          threadId: thread.id,
          conversationId,
          contentPreview: msgText.slice(0, 80),
          offline: false,
        },
        "orbit",
        { userId: authUserId, orgId: orgId || undefined }
      );

      trace("message.realtime.echo", "output", {
        emitted: "orbit:message_sent",
        conversationId,
        threadId: thread.id,
      });

      setSecurityLevel("normal");
      trace("thread.preview.update", "output", { uiUpdated: true, securityLevel: "normal" });
    } catch (e: any) {
      trace("message.db.confirm", "error", { message: e?.message || "send_failed" });
      setRawMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...m, pending: false, failed: true } : m))
      );
      setNewMessage(msgText);
      toast.error(e?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  }, [newMessage, params, trace]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend]
  );

  return {
    sending,
    newMessage,
    setNewMessage,
    handleSend,
    handleKeyDown,
  };
}
