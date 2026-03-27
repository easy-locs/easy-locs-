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

  const handleSend = useCallback(async () => {
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

    if (!thread || !newMessage.trim()) return;

    let conversationId = thread.v2ConversationId;

    // Auto-create V2 conversation if missing
    if (!conversationId) {
      const earlyAuthUserId = await resolveAuthUserId();
      if (!earlyAuthUserId) {
        toast.error("Authentication required.");
        return;
      }

      if (thread.peerUserId) {
        try {
          const conv = await createOrGetDirectConversation({
            myUserId: earlyAuthUserId,
            myOrbitId: myOrbitId,
            peerUserId: thread.peerUserId,
            peerOrbitId: thread.peerOrbitId,
          });
          conversationId = conv.id;
          onThreadUpdate(thread.id, { v2ConversationId: conv.id });
        } catch (err: any) {
          console.error("[useMessageSender] auto-create conversation failed:", err);
          toast.error("Failed to create conversation");
          return;
        }
      } else {
        toast.error("No V2 conversation found for this thread.");
        return;
      }
    }

    const authUserId = await resolveAuthUserId();
    if (!authUserId) {
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

    setRawMessages((prev) => [...prev, optimisticMsg]);
    setNewMessage("");
    const currentReply = replyTo;
    setReplyTo(null);

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
      } catch {
        // keep plaintext fallback
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
        throw error;
      }

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

      onThreadUpdate(thread.id, {
        lastMessage: msgText,
        lastMessageTime: data.created_at || now,
        lastMessagePreview: preview,
        unreadCount: 0,
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

      setSecurityLevel("normal");
    } catch (e: any) {
      setRawMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...m, pending: false, failed: true } : m))
      );
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

  return {
    sending,
    newMessage,
    setNewMessage,
    handleSend,
    handleKeyDown,
  };
}
