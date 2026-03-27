/**
 * useMessageLoader — Loads and manages messages for a conversation thread.
 * Extracted from HudChatPanel monolith.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { realtimeManager } from "@/lib/realtime-manager";
import type { ConversationThread, ChatMessage } from "../types";

interface UseMessageLoaderOptions {
  thread: ConversationThread | null;
  orgId: string | null;
  userId: string | undefined;
  readReceipts: boolean;
  onThreadUpdate: (threadId: string, updates: Partial<ConversationThread>) => void;
  offline: { isOnline: boolean; getCachedMessages: () => Promise<any[]>; getThreadPending: () => Promise<any[]>; cacheMessages: (msgs: any[]) => void };
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

    // ── V2 CANONICAL PATH ──
    if (thread.isV2 && thread.v2ConversationId) {
      const { data } = await (supabase as any)
        .from("chat_messages_v2")
        .select("*")
        .eq("conversation_id", thread.v2ConversationId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (data) {
        const mapped = data.map((m: any) => ({
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
          context_id: thread.v2ConversationId,
        }));
        setRawMessages(mapped as ChatMessage[]);
        const unreadIds = data
          .filter((m: any) => !m.read_at && m.sender_user_id !== userId)
          .map((m: any) => m.id);
        if (unreadIds.length > 0) {
          await (supabase as any)
            .from("chat_messages_v2")
            .update({ read_at: new Date().toISOString() })
            .in("id", unreadIds);
          onThreadUpdate(thread.id, { unreadCount: 0 });
        }
      }
      setPendingOffline([]);
      return;
    }

    // ── LEGACY PATH ──
    if (!orgId) return;
    if (!offline.isOnline) {
      const cached = await offline.getCachedMessages();
      if (cached.length > 0) setRawMessages(cached as ChatMessage[]);
      const pending = await offline.getThreadPending();
      setPendingOffline(pending);
      return;
    }

    let query = supabase.from("messages").select("*").eq("org_id", orgId).order("created_at", { ascending: true });
    if (thread.contextType === "guest_session" && thread.contextId) query = query.eq("guest_session_id", thread.contextId);
    else if (thread.conversationType === "listing" && thread.leadId) query = query.eq("context_type", "real_estate_lead").eq("context_id", thread.leadId);
    else if (thread.conversationType === "direct" && thread.contextId) query = query.eq("context_id", thread.contextId);
    else if (thread.bookingId) query = query.eq("booking_id", thread.bookingId);
    else if (thread.tenantId) query = query.eq("tenant_id", thread.tenantId).is("booking_id", null);
    const { data } = await query;
    if (data) {
      const clearedAt = thread.clearedAt;
      const visible = clearedAt ? data.filter((m: any) => m.created_at > clearedAt) : data;
      const enriched = visible.map((msg: any) => {
        if (msg.reply_to_id && !msg.reply_to_content) {
          const parent = visible.find((m: any) => m.id === msg.reply_to_id);
          if (parent) return { ...msg, reply_to_content: (parent as any).content?.slice(0, 120) || "Message" };
        }
        return msg;
      });
      setRawMessages(enriched as ChatMessage[]);
      offline.cacheMessages(enriched);
      const lastMsg = enriched[enriched.length - 1] as any;
      if (lastMsg?.conversation_status) setConvStatus(lastMsg.conversation_status);
      const unreadIds = data.filter(m => !m.read && m.sender_id !== userId).map(m => m.id);
      if (unreadIds.length > 0 && readReceipts) {
        await supabase.from("messages").update({ read: true } as any).in("id", unreadIds);
        onThreadUpdate(thread.id, { unreadCount: 0 });
      } else if (unreadIds.length > 0) {
        onThreadUpdate(thread.id, { unreadCount: 0 });
      }
    }
    setPendingOffline([]);
  }, [orgId, thread, userId, onThreadUpdate, offline, readReceipts]);

  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(() => { if (offline.isOnline) loadMessages(); }, [offline.isOnline]);

  // Realtime subscription
  useEffect(() => {
    if (!thread) return;

    if (thread.isV2 && thread.v2ConversationId) {
      const v2Channel = supabase
        .channel(`rt:v2:${thread.v2ConversationId}`)
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "chat_messages_v2",
          filter: `conversation_id=eq.${thread.v2ConversationId}`,
        }, (payload) => {
          const msg = payload.new as any;
          if (!msg?.id) return;
          const mapped: ChatMessage = {
            id: msg.id, sender_id: msg.sender_user_id, content: msg.body,
            created_at: msg.created_at, read: !!msg.read_at, category: "general",
            tenant_id: null, translated_content: null, translated_locale: null,
            language_detected: null, message_type: msg.type || "user",
            context_type: "direct", context_id: thread.v2ConversationId,
          } as any;
          setRawMessages(prev => prev.some(m => m.id === mapped.id) ? prev : [...prev, mapped]);
          if (msg.sender_user_id !== userId && !msg.read_at) {
            (supabase as any).from("chat_messages_v2").update({ read_at: new Date().toISOString() }).eq("id", msg.id);
            onThreadUpdate(thread.id, { unreadCount: 0 });
          }
        })
        .on("postgres_changes", {
          event: "UPDATE", schema: "public", table: "chat_messages_v2",
          filter: `conversation_id=eq.${thread.v2ConversationId}`,
        }, (payload) => {
          const msg = payload.new as any;
          if (!msg?.id) return;
          setRawMessages(prev => prev.map(m => m.id === msg.id ? { ...m, content: msg.body, read: !!msg.read_at } : m));
        })
        .subscribe();

      const typChannel = supabase.channel(`rt:typing:v2:${thread.v2ConversationId}`);
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
    }

    // Legacy realtime
    if (!orgId) return;
    const matchThread = (msg: any) => {
      const msgKey = msg.booking_id ? `booking-${msg.booking_id}` : msg.tenant_id ? `tenant-${msg.tenant_id}` : null;
      return msgKey === thread.id || msg.context_id === thread.contextId;
    };
    const sub = realtimeManager.openThread(thread.id, orgId, {
      onMessage: (payload: any) => {
        const newMsg = payload.new as ChatMessage;
        if (matchThread(newMsg)) {
          setRawMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
          if (newMsg.sender_id !== userId && readReceipts) {
            supabase.from("messages").update({ read: true } as any).eq("id", newMsg.id);
          }
        }
      },
      onUpdate: (payload: any) => {
        const updated = payload.new as ChatMessage;
        if (matchThread(updated)) {
          setRawMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
        }
      },
      onDelete: (payload: any) => {
        const deleted = payload.old as any;
        if (deleted?.id) setRawMessages(prev => prev.filter(m => m.id !== deleted.id));
      },
      onTypingSync: (others) => setTypingIndicator(others.length > 0),
      currentUserId: userId,
    });
    typingChannelRef.current = sub.typingChannel;
    return () => {
      typingChannelRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      sub.unsubscribe();
    };
  }, [orgId, thread, userId, readReceipts, onThreadUpdate]);

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
