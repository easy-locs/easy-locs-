/**
 * useMessageSender — V2-ONLY canonical message sender.
 * Writes to chat_messages_v2 exclusively. No legacy path.
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";
import { buildSecurityPayload, type SecurityLevel } from "@/lib/message-security";
import { toast } from "sonner";
import type { ConversationThread, ChatMessage } from "@/components/communication-hub/types";

const db = supabase as any;

interface UseMessageSenderParams {
  thread: ConversationThread | null;
  orgId: string | null | undefined;
  userId: string | undefined;
  locale: string;
  myOrbitId: string | null;
  e2eReady: boolean;
  encrypt: (text: string, peerId: string) => Promise<string | null>;
  offline: { isOnline: boolean; queueMessage: (...args: any[]) => Promise<string> };
  privacySettings: { defaultDisappearTtl: string; readReceipts: boolean };
  disappearTTL: string;
  securityLevel: SecurityLevel;
  setSecurityLevel: (l: SecurityLevel) => void;
  selectedCategory: string;
  replyTo: { msgId: string; content: string; senderName?: string } | null;
  setReplyTo: (r: null) => void;
  setRawMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setPendingOffline: React.Dispatch<React.SetStateAction<any[]>>;
  onThreadUpdate: (threadId: string, updates: Partial<ConversationThread>) => void;
  resolveAuthUserId: () => Promise<string | null>;
}

export function useMessageSender(params: UseMessageSenderParams) {
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");

  const handleSend = useCallback(async () => {
    const {
      thread, orgId, locale, myOrbitId, e2eReady, encrypt, offline,
      securityLevel, setSecurityLevel,
      replyTo, setReplyTo, setRawMessages, setPendingOffline,
      onThreadUpdate, resolveAuthUserId,
    } = params;

    if (!newMessage.trim() || !thread) return;
    const msgText = newMessage.trim();

    const authUserId = await resolveAuthUserId();
    if (!authUserId) return;

    // Rate limit check
    const { checkMessageRate, detectAbuse } = await import("@/lib/orbit-rate-limiter");
    const rateCheck = checkMessageRate(authUserId);
    if (!rateCheck.allowed) {
      toast.error(rateCheck.inCooldown ? `Too many messages. Wait ${rateCheck.retryAfter}s` : "Slow down...");
      return;
    }
    const abuseCheck = detectAbuse(msgText);
    if (abuseCheck.suspicious) {
      toast.error(abuseCheck.reason || "Message blocked");
      return;
    }

    // Optimistic insert
    const optimisticId = `opt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const optimisticMsg: ChatMessage = {
      id: optimisticId, content: msgText, sender_id: authUserId,
      created_at: new Date().toISOString(), read: false, message_type: "user",
      category: "general",
    } as any;
    setRawMessages(prev => [...prev, optimisticMsg]);
    setNewMessage("");
    const currentReplyTo = replyTo;
    setReplyTo(null);

    // Compress
    const { compressMessage } = await import("@/lib/orbit-message-compress");
    const content = await compressMessage(msgText);

    // Encrypt if ready
    let storedContent = content;
    let isEncrypted = false;
    const peerId = thread.peerUserId || thread.contextId || thread.id;
    if (e2eReady && peerId) {
      const encrypted = await encrypt(content, peerId);
      if (encrypted) { storedContent = encrypted; isEncrypted = true; }
    }

    // Offline queue
    if (!offline.isOnline) {
      const queuedId = await offline.queueMessage(storedContent, isEncrypted, {
        conversationId: thread.v2ConversationId,
        category: "general",
        senderLocale: locale,
      });
      setRawMessages(prev => prev.map(m => m.id === optimisticId ? { ...m, id: queuedId } as any : m));
      setPendingOffline(prev => [...prev, { id: queuedId }]);
      toast("📡 Queued — will send when back online", { duration: 2000 });
      return;
    }

    // V2 CANONICAL PATH ONLY
    const conversationId = thread.v2ConversationId;
    if (!conversationId) {
      setRawMessages(prev => prev.filter(m => m.id !== optimisticId));
      toast.error("No V2 conversation found for this thread.");
      setNewMessage(msgText);
      return;
    }

    setSending(true);
    try {
      const { error: v2Err } = await db
        .from("chat_messages_v2")
        .insert({
          conversation_id: conversationId,
          sender_user_id: authUserId,
          sender_orbit_id: myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
          receiver_orbit_id: thread.peerOrbitId ?? null,
          type: "text",
          body: storedContent,
          reply_to_message_id: currentReplyTo?.msgId || null,
          metadata: isEncrypted ? { encrypted: true } : null,
        });

      if (v2Err) {
        setRawMessages(prev => prev.filter(m => m.id !== optimisticId));
        toast.error("Failed to send: " + v2Err.message);
        setNewMessage(msgText);
        return;
      }

      // Update conversation metadata
      const now = new Date().toISOString();
      await db.from("conversations_v2")
        .update({
          last_message_at: now,
          last_message_preview: content.slice(0, 120),
          updated_at: now,
        })
        .eq("id", conversationId);

      platformBus.emit("orbit:message_sent", {
        threadId: thread.id, contextId: thread.contextId,
        recipientName: thread.name, contentPreview: content.slice(0, 80),
      }, "orbit", { userId: authUserId, orgId });

      onThreadUpdate(thread.id, { lastMessage: msgText, lastMessageTime: now });
      setSecurityLevel("normal");
    } catch (e: any) {
      setRawMessages(prev => prev.filter(m => m.id !== optimisticId));
      toast.error("Send failed: " + (e?.message || "unknown error"));
      setNewMessage(msgText);
    } finally {
      setSending(false);
    }
  }, [newMessage, params]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  return { sending, newMessage, setNewMessage, handleSend, handleKeyDown };
}
