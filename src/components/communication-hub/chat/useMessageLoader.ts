/**
 * useMessageLoader — V2-ONLY canonical message loader.
 * Reads from chat_messages_v2 exclusively. No legacy path.
 * Read receipts delegated to receipt.controller (single write path).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { subscribeInstantMessages } from "@/lib/realtime-broadcast";
import {
  markConversationMessagesRead,
  markSingleMessageRead,
  clearMarkedUnread,
} from "@/domains/orbit/controllers/receipt.controller";

const db = supabase as any;

type ThreadLike = {
  id: string;
  /** Canonical conversation UUID */
  conversationId?: string | null;
  /** Business entity ID */
  entityId?: string | null;
  /** @deprecated Use conversationId */
  v2ConversationId?: string | null;
  /** @deprecated Use entityId */
  contextId?: string | null;
};

type ChatMessage = {
  id: string;
  sender_id: string | null;
  content: string;
  created_at: string;
  read: boolean;
  category?: string;
  tenant_id?: string | null;
  translated_content?: string | null;
  translated_locale?: string | null;
  language_detected?: string | null;
  message_type: string;
  context_type?: string | null;
  context_id?: string | null;
  pending?: boolean;
  failed?: boolean;
  reply_to_message_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

type UseMessageLoaderOptions = {
  thread: ThreadLike | null;
  orgId?: string | null;
  userId?: string | null;
  readReceipts?: boolean;
  onThreadUpdate: (threadId: string, updates: Record<string, unknown>) => void;
  offline: {
    isOnline: boolean;
    getCachedMessages: () => Promise<any[]>;
    getThreadPending: () => Promise<any[]>;
    cacheMessages: (msgs: any[]) => void;
  };
};

/** Safely coerce a value to a renderable string — prevents React error #185 */
function safeString(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  try { return JSON.stringify(val); } catch { return "[unrenderable]"; }
}

/** Resolve canonical conversationId from thread */
function resolveConversationId(thread: ThreadLike | null): string | null {
  return thread?.conversationId || null;
}

function mapV2ToChat(m: any, conversationId: string): ChatMessage {
  return {
    id: m.id,
    sender_id: m.sender_user_id,
    content: safeString(m.body),
    created_at: m.created_at,
    read: !!m.read_at,
    category: (m.metadata?.category as string) || "general",
    tenant_id: null,
    translated_content: null,
    translated_locale: null,
    language_detected: null,
    message_type: m.type || "text",
    context_type: "direct",
    context_id: conversationId,
    pending: false,
    failed: !!m.failed_at,
    reply_to_message_id: m.reply_to_message_id ?? null,
    metadata: m.metadata ?? {},
    contact_name: safeString(m.metadata?.contact_name || m.sender_display_name),
    attachments: Array.isArray(m.attachments) ? m.attachments : [],
    view_once: !!m.view_once,
    media_kind: m.media_kind || null,
    media_count: m.media_count || 0,
    attachment_summary: m.attachment_summary || null,
  } as any;
}

// Simple in-memory cache for instant re-open
const messageCache = new Map<string, ChatMessage[]>();

export function useMessageLoader({
  thread,
  userId,
  readReceipts,
  onThreadUpdate,
  offline,
}: UseMessageLoaderOptions) {
  const [rawMessages, setRawMessages] = useState<ChatMessage[]>([]);
  const [pendingOffline, setPendingOffline] = useState<any[]>([]);
  const [convStatus, setConvStatus] = useState("active");
  const [typingIndicator, setTypingIndicator] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const typingChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);

  const trace = useCallback((step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
    const logger = phase === "error" ? console.error : console.log;
    logger(`[THREAD_OPEN][${step}] ${phase}:`, payload ?? {});
  }, []);

  const realtimeTrace = useCallback((step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
    const logger = phase === "error" ? console.error : console.log;
    logger(`[SEND_MESSAGE][${step}] ${phase}:`, payload ?? {});
  }, []);

  const loadMessages = useCallback(async () => {
    const conversationId = resolveConversationId(thread);

    trace("messages.load.request", "input", {
      threadId: thread?.id,
      conversationId,
    });

    if (!conversationId) {
      trace("messages.load.request", "error", { reason: "missing_conversationId", threadId: thread?.id ?? null });
      setRawMessages([]);
      setPendingOffline([]);
      setMessagesLoading(false);
      return;
    }

    trace("messages.load.request", "output", { conversationId });

    const cached = messageCache.get(conversationId);
    if (cached?.length) {
      trace("messages.load.cache", "output", { hit: true, count: cached.length, conversationId });
      setRawMessages(cached);
      setMessagesLoading(false);
    } else {
      trace("messages.load.cache", "output", { hit: false, count: 0, conversationId });
      setMessagesLoading(true);
    }

    if (!offline.isOnline) {
      trace("messages.load.cache", "input", { source: "offline_cache", conversationId });
      const cached = await offline.getCachedMessages();
      const pending = await offline.getThreadPending();
      setRawMessages((cached ?? []) as ChatMessage[]);
      setPendingOffline(pending ?? []);
      setMessagesLoading(false);
      trace("messages.load.render", "output", {
        source: "offline_cache",
        rawCount: (cached ?? []).length,
        pendingCount: (pending ?? []).length,
      });
      return;
    }

    trace("messages.load.db", "input", { conversationId, limit: 300 });
    const { data, error } = await db
      .from("chat_messages_v2")
      .select("*")
      .eq("conversation_id", conversationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(300);

    if (error) {
      trace("messages.load.db", "error", { message: error.message, code: error.code, conversationId });
      setMessagesLoading(false);
      return;
    }

    trace("messages.load.db", "output", { rowCount: (data ?? []).length, conversationId });
    const mapped = (data ?? []).map((m: any) => mapV2ToChat(m, conversationId));
    trace("messages.load.map", "output", { mappedCount: mapped.length, conversationId });
    setRawMessages(mapped);
    messageCache.set(conversationId, mapped);
    offline.cacheMessages(mapped);
    setMessagesLoading(false);
    setPendingOffline([]);
    trace("messages.load.cache", "output", { storedCount: mapped.length, conversationId });
    trace("messages.load.render", "output", { renderedCount: mapped.length, conversationId });

    const unreadIds = (data ?? [])
      .filter((m: any) => !m.read_at && m.sender_user_id !== userId)
      .map((m: any) => m.id);

    if (readReceipts && unreadIds.length > 0) {
      trace("messages.load.render", "input", { action: "mark_read", unreadCount: unreadIds.length, conversationId });
      // Delegate to canonical receipt controller (single write path)
      markConversationMessagesRead(conversationId, userId!).then(({ markedCount }) => {
        if (markedCount > 0) onThreadUpdate(thread!.id, { unreadCount: 0 });
      });
      // Clear marked_unread preference
      const ctxId = thread?.entityId || thread?.id;
      if (ctxId) clearMarkedUnread(userId!, ctxId);
    }
  }, [thread, userId, readReceipts, onThreadUpdate, offline, trace]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (offline.isOnline) {
      void loadMessages();
    }
  }, [offline.isOnline, loadMessages]);

  // ── Broadcast (fast path: ~10-50ms) ──
  useEffect(() => {
    const conversationId = resolveConversationId(thread);
    if (!conversationId) return;

    const cleanup = subscribeInstantMessages(conversationId, (broadcastMsg) => {
      // Skip own messages — already handled by optimistic insert
      if (broadcastMsg.senderUserId === userId) return;

      realtimeTrace("message.broadcast.instant", "output", {
        id: broadcastMsg.id,
        sender: broadcastMsg.senderUserId,
        conversationId,
      });

      const mapped = mapV2ToChat({
        id: broadcastMsg.id,
        sender_user_id: broadcastMsg.senderUserId,
        sender_orbit_id: broadcastMsg.senderOrbitId,
        body: broadcastMsg.body,
        type: broadcastMsg.type,
        metadata: broadcastMsg.metadata,
        created_at: broadcastMsg.createdAt,
        conversation_id: conversationId,
      }, conversationId);

      setRawMessages((prev) => {
        if (prev.some((m) => m.id === mapped.id)) return prev;
        return [...prev, mapped];
      });

      onThreadUpdate(thread!.id, {
        lastMessageTime: broadcastMsg.createdAt,
        lastMessagePreview: broadcastMsg.body?.slice?.(0, 120) ?? "",
      });
    });

    return cleanup;
  }, [thread, userId, onThreadUpdate, realtimeTrace]);

  // ── Postgres Changes (slow path: ~200-500ms, authoritative) ──
  useEffect(() => {
    const conversationId = resolveConversationId(thread);
    if (!conversationId) return;

    realtimeTrace("message.realtime.echo", "input", { conversationId, channel: `rt:v2:${conversationId}` });

    const channel = createRealtimeChannel(`rt:v2:${conversationId}`)
      
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages_v2",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const msg = payload.new as any;
          if (!msg?.id) {
            realtimeTrace("message.realtime.echo", "error", { reason: "missing_message_id", conversationId });
            return;
          }

          realtimeTrace("message.realtime.echo", "output", {
            id: msg.id,
            sender: msg.sender_user_id,
            body: (msg.body || "").slice(0, 30),
            conversation_id: msg.conversation_id,
          });

          const mapped = mapV2ToChat(msg, conversationId);

          setRawMessages((prev) => {
            // Deduplicate: already present from broadcast or optimistic
            if (prev.some((m) => m.id === mapped.id)) {
              realtimeTrace("message.realtime.echo", "output", { deduped: true, id: msg.id });
              return prev;
            }
            // Reconcile: replace optimistic with confirmed
            // Match by: (1) pending flag + content match, OR (2) opt- prefix ID + content match
            // This handles the race where sender_id may still be "" on the optimistic msg
            const isOwnMessage = msg.sender_user_id === userId;
            const withoutOptimistic = isOwnMessage
              ? prev.filter((m) => {
                  if (!m.pending) return true;
                  // Match by content + sender OR by optimistic ID prefix + content
                  const contentMatch = m.content === mapped.content;
                  const senderMatch = m.sender_id === userId || m.sender_id === "";
                  const isOptimisticId = m.id.startsWith("opt-");
                  return !(contentMatch && (senderMatch || isOptimisticId));
                })
              : prev;
            realtimeTrace("message.optimistic.reconcile", "output", { id: mapped.id, replacedOptimistic: isOwnMessage });
            return [...withoutOptimistic, mapped];
          });

          // Invalidate message cache
          messageCache.set(conversationId, []);

          if (msg.sender_user_id !== userId && !msg.read_at && readReceipts) {
            await db
              .from("chat_messages_v2")
              .update({ read_at: new Date().toISOString() })
              .eq("id", msg.id);

            onThreadUpdate(thread!.id, { unreadCount: 0 });
          }

          onThreadUpdate(thread!.id, {
            lastMessageTime: msg.created_at,
            lastMessagePreview: msg.body?.slice?.(0, 120) ?? "",
          });

          realtimeTrace("thread.preview.update", "output", {
            conversationId,
            lastMessagePreview: msg.body?.slice?.(0, 120) ?? "",
            lastMessageTime: msg.created_at,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages_v2",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const msg = payload.new as any;
          if (!msg?.id) return;

          setRawMessages((prev) =>
            prev
              .filter((m) => !(msg.deleted_at && m.id === msg.id))
              .map((m) =>
                m.id === msg.id
                  ? {
                      ...m,
                      content: msg.body,
                      read: !!msg.read_at,
                      failed: !!msg.failed_at,
                      reply_to_message_id: msg.reply_to_message_id ?? null,
                      metadata: msg.metadata ?? {},
                    }
                  : m
              )
          );
        }
      )
      .subscribe();

    const typingChannel = createRealtimeChannel(`rt:typing:v2:${conversationId}`);

    typingChannel
      .on("presence", { event: "sync" }, () => {
        const state = typingChannel.presenceState();
        const others = Object.values(state)
          .flat()
          .filter((p: any) => p.user_id !== userId);
        setTypingIndicator(others.length > 0);
      })
      .subscribe();

    typingChannelRef.current = typingChannel;

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingChannelRef.current = null;
      removeRealtimeChannel(channel);
      removeRealtimeChannel(typingChannel);
    };
  }, [thread, userId, readReceipts, onThreadUpdate, realtimeTrace]);

  const broadcastTyping = useCallback(
    (typingEnabled: boolean) => {
      if (!typingEnabled || !typingChannelRef.current || !userId) return;

      typingChannelRef.current
        .track({
          user_id: userId,
          typing: true,
          ts: Date.now(),
        })
        .catch(() => {});

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        typingChannelRef.current?.untrack?.().catch?.(() => {});
      }, 2500);
    },
    [userId]
  );

  return {
    rawMessages,
    setRawMessages,
    pendingOffline,
    setPendingOffline,
    convStatus,
    setConvStatus,
    typingIndicator,
    broadcastTyping,
    loadMessages,
    messagesLoading,
  };
}
