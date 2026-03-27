/**
 * useMessageLoader — V2-ONLY canonical message loader.
 * Reads from chat_messages_v2 exclusively. No legacy path.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ConversationThread, ChatMessage } from "../types";

const db = supabase as any;

interface UseMessageLoaderOptions {
  thread: ConversationThread | null;
  orgId: string | null;
  userId: string | undefined;
  readReceipts: boolean;
  onThreadUpdate: (threadId: string, updates: Partial<ConversationThread>) => void;
  offline: { isOnline: boolean; getCachedMessages: () => Promise<any[]>; getThreadPending: () => Promise<any[]>; cacheMessages: (msgs: any[]) => void };
}

function mapV2ToChat(m: any, conversationId: string): ChatMessage {
  return {
    id: m.id,
    sender_id: m.sender_user_id,
    content: m.body,
    created_at: m.created_at,
    read: !!m.read_at,
    category: "general",
    tenant_id: null,
    translated_content: null,
    translated_locale: null,
    language_detected: null,
    message_type: m.type || "user",
    context_type: "direct",
    context_id: conversationId,
  } as any;
}

export function useMessageLoader({ thread, orgId, userId, readReceipts, onThreadUpdate, offline }: UseMessageLoaderOptions) {
  const [rawMessages, setRawMessages] = useState<ChatMessage[]>([]);
  const [pendingOffline, setPendingOffline] = useState<any[]>([]);
  const [convStatus, setConvStatus] = useState("active");
  const [typingIndicator, setTypingIndicator] = useState(false);
  const typingChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMessages = useCallback(async () => {
    if (!thread) return;

    const conversationId = thread.v2ConversationId;
    if (!conversationId) {
      setRawMessages([]);
      return;
    }

    // Offline cache
    if (!offline.isOnline) {
      const cached = await offline.getCachedMessages();
      if (cached.length > 0) setRawMessages(cached as ChatMessage[]);
      const pending = await offline.getThreadPending();
      setPendingOffline(pending);
      return;
    }

    const { data } = await db
      .from("chat_messages_v2")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (data) {
      const mapped = data.map((m: any) => mapV2ToChat(m, conversationId));
      setRawMessages(mapped);
      offline.cacheMessages(mapped);

      // Mark unread messages as read
      if (readReceipts) {
        const unreadIds = data
          .filter((m: any) => !m.read_at && m.sender_user_id !== userId)
          .map((m: any) => m.id);
        if (unreadIds.length > 0) {
          await db
            .from("chat_messages_v2")
            .update({ read_at: new Date().toISOString() })
            .in("id", unreadIds);
          onThreadUpdate(thread.id, { unreadCount: 0 });
        }
      }
    }
    setPendingOffline([]);
  }, [thread, userId, onThreadUpdate, offline, readReceipts, orgId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(() => { if (offline.isOnline) loadMessages(); }, [offline.isOnline]);

  // Realtime subscription — V2 only
  useEffect(() => {
    if (!thread) return;
    const conversationId = thread.v2ConversationId;
    if (!conversationId) return;

    const v2Channel = supabase
      .channel(`rt:v2:${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "chat_messages_v2",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const msg = payload.new as any;
        if (!msg?.id) return;
        const mapped = mapV2ToChat(msg, conversationId);
        setRawMessages(prev => prev.some(m => m.id === mapped.id) ? prev : [...prev, mapped]);
        if (msg.sender_user_id !== userId && !msg.read_at && readReceipts) {
          db.from("chat_messages_v2").update({ read_at: new Date().toISOString() }).eq("id", msg.id);
          onThreadUpdate(thread.id, { unreadCount: 0 });
        }
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "chat_messages_v2",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const msg = payload.new as any;
        if (!msg?.id) return;
        setRawMessages(prev => prev.map(m => m.id === msg.id ? { ...m, content: msg.body, read: !!msg.read_at } : m));
      })
      .subscribe();

    // Typing presence
    const typChannel = supabase.channel(`rt:typing:v2:${conversationId}`);
    typChannel
      .on("presence", { event: "sync" }, () => {
        const state = typChannel.presenceState();
        const others = Object.values(state).flat().filter((p: any) => p.user_id !== userId);
        setTypingIndicator(others.length > 0);
      })
      .subscribe();
    typingChannelRef.current = typChannel;

    return () => {
      typingChannelRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(v2Channel);
      supabase.removeChannel(typChannel);
    };
  }, [thread, userId, readReceipts, onThreadUpdate]);

  const broadcastTyping = useCallback((typingIndicatorsEnabled: boolean) => {
    if (!typingIndicatorsEnabled || !typingChannelRef.current) return;
    typingChannelRef.current.track({ user_id: userId, typing: true, ts: Date.now() }).catch(() => {});
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingChannelRef.current?.untrack().catch(() => {});
    }, 3000);
  }, [userId]);

  return {
    rawMessages, setRawMessages,
    pendingOffline, setPendingOffline,
    convStatus, setConvStatus,
    typingIndicator,
    broadcastTyping,
    loadMessages,
  };
}
