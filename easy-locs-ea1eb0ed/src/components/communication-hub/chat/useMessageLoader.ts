/**
 * useMessageLoader — V2-ONLY canonical message loader.
 * Reads from chat_messages_v2 exclusively. No legacy path.
 * Read receipts delegated to receipt.controller (single write path).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { isOutgoingMessage } from "@/domains/orbit/resolvers";
import { db } from "@/services/db";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { subscribeInstantMessages } from "@/lib/realtime-broadcast";
import {
  markConversationMessagesRead,
  markSingleMessageRead,
  clearMarkedUnread,
} from "@/domains/orbit/controllers/receipt.controller";
import { playMessageSound } from "@/lib/notifications/sounds";



type ThreadLike = {
  id: string;
  conversationId?: string | null;
  entityId?: string | null;
  v2ConversationId?: string | null;
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

function safeString(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  try { return JSON.stringify(val); } catch { return "[unrenderable]"; }
}

function resolveConversationId(thread: ThreadLike | null): string | null {
  return thread?.conversationId || thread?.v2ConversationId || null;
}

function mapV2ToChat(m: any, conversationId: string): ChatMessage {
  const meta = m.metadata ?? {};
  const mediaUrl = meta.media?.url ?? meta.media?.remote_url ?? null;
  const rawAtts = Array.isArray(m.attachments) ? m.attachments : [];
  const firstAttUrl = rawAtts[0]?.url ?? rawAtts[0]?.remote_url ?? null;
  const resolvedAttachmentUrl = mediaUrl || firstAttUrl || null;

  let msgType = m.type || "text";
  if (msgType === "media" && meta.media) {
    const mk = meta.media.media_kind || meta.media.kind || meta.media_kind || null;
    if (mk === "image") msgType = "image";
    else if (mk === "video") msgType = "video";
    else if (mk === "audio" || mk === "voice") msgType = "voice";
    else if (mk === "file") msgType = "file";
    else {
      const mime = (meta.media.mimeType || meta.media.mime_type || "").toLowerCase();
      if (mime.startsWith("image/")) msgType = "image";
      else if (mime.startsWith("video/")) msgType = "video";
      else if (mime.startsWith("audio/")) msgType = "voice";
      else if (resolvedAttachmentUrl) msgType = "file";
    }
  }

  return {
    id: m.id,
    sender_id: m.sender_user_id,
    content: safeString(m.body),
    created_at: m.created_at,
    read: !!m.read_at,
    category: (meta.category as string) || "general",
    tenant_id: null,
    translated_content: null,
    translated_locale: null,
    language_detected: null,
    message_type: msgType,
    context_type: "direct",
    context_id: conversationId,
    pending: false,
    failed: !!m.failed_at,
    reply_to_message_id: m.reply_to_message_id ?? null,
    metadata: meta,
    metadata_json: meta,
    contact_name: safeString(meta.contact_name || m.sender_display_name),
    attachment_url: resolvedAttachmentUrl,
    attachments: rawAtts,
    audio_url: msgType === "voice" ? resolvedAttachmentUrl : (m.audio_url || null),
    audio_duration_seconds: meta.media?.duration ?? meta.duration ?? null,
    video_duration_seconds: meta.media?.duration ?? meta.duration ?? null,
    view_once: !!m.view_once || !!meta.media?.viewOnce,
    media_kind: meta.media?.media_kind || meta.media?.kind || m.media_kind || null,
    media_count: m.media_count || 0,
    attachment_summary: m.attachment_summary || null,
    conversation_id: conversationId,
  } as any;
}

const messageCache = new Map<string, ChatMessage[]>();

export function useMessageLoader({
  thread,
  userId,
  readReceipts,
  onThreadUpdate,
  offline,
}: UseMessageLoaderOptions) {
  const offlineRef = useRef(offline);
  offlineRef.current = offline;
  const onThreadUpdateRef = useRef(onThreadUpdate);
  onThreadUpdateRef.current = onThreadUpdate;
  const threadRef = useRef(thread);
  threadRef.current = thread;

  const threadId = thread?.id ?? null;
  const conversationId = resolveConversationId(thread);
  const entityId = thread?.entityId ?? null;
  const isOnline = offline.isOnline;

  const [rawMessages, setRawMessages] = useState<ChatMessage[]>([]);
  const [pendingOffline, setPendingOffline] = useState<any[]>([]);
  const [convStatus, setConvStatus] = useState("active");
  const [typingIndicator, setTypingIndicator] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const typingChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);
  const markedReadForRef = useRef<string | null>(null);
  const loadInFlightForRef = useRef<string | null>(null);
  const prevConversationIdRef = useRef<string | null>(null);

  const realtimeTrace = useCallback((_step: string, _phase: string, _payload?: Record<string, unknown>) => {}, []);
  const loadCountRef = useRef({ cid: "", count: 0, ts: 0 });
  const readReceiptsRef = useRef(readReceipts);
  readReceiptsRef.current = readReceipts;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  if (prevConversationIdRef.current !== conversationId) {
    prevConversationIdRef.current = conversationId;
    markedReadForRef.current = null;
    loadInFlightForRef.current = null;
    loadCountRef.current = { cid: conversationId || "", count: 0, ts: Date.now() };
  }

  const loadMessages = useCallback(async () => {
    const cid = prevConversationIdRef.current;
    const currentThread = threadRef.current;
    const tid = currentThread?.id ?? null;
    const eid = currentThread?.entityId ?? null;
    const uid = userIdRef.current;

    if (!cid) {
      setRawMessages(prev => prev.length === 0 ? prev : []);
      setPendingOffline(prev => prev.length === 0 ? prev : []);
      setMessagesLoading(false);
      return;
    }

    if (loadInFlightForRef.current === cid) return;

    const lc = loadCountRef.current;
    if (lc.cid === cid) {
      const elapsed = Date.now() - lc.ts;
      if (elapsed < 2000 && lc.count >= 3) {
        console.warn("[MessageLoader] Rate limit hit — skipping load for", cid);
        return;
      }
      if (elapsed >= 2000) { lc.count = 0; lc.ts = Date.now(); }
      lc.count++;
    } else {
      loadCountRef.current = { cid, count: 1, ts: Date.now() };
    }

    loadInFlightForRef.current = cid;

    try {
      const cached = messageCache.get(cid);
      if (cached?.length) {
        setRawMessages(cached);
        setMessagesLoading(false);
      } else {
        setMessagesLoading(true);
      }

      if (!offlineRef.current.isOnline) {
        const offCached = await offlineRef.current.getCachedMessages();
        const pending = await offlineRef.current.getThreadPending();
        setRawMessages((offCached ?? []) as ChatMessage[]);
        setPendingOffline(pending ?? []);
        setMessagesLoading(false);
        return;
      }

      const { data, error } = await db
        .from("chat_messages_v2")
        .select("*")
        .eq("conversation_id", cid)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("[MessageLoader] DB error:", error.message);
        setMessagesLoading(false);
        return;
      }

      const mapped = (data ?? []).reverse().map((m: any) => mapV2ToChat(m, cid));
      const dbIds = new Set(mapped.map((m: ChatMessage) => m.id));
      setRawMessages((prev) => {
        const pendingOptimistic = prev.filter(m => m.pending && !dbIds.has(m.id));
        return pendingOptimistic.length > 0 ? [...mapped, ...pendingOptimistic] : mapped;
      });
      messageCache.set(cid, mapped);
      offlineRef.current.cacheMessages(mapped);
      setMessagesLoading(false);
      setPendingOffline(prev => prev.length === 0 ? prev : []);

      if (readReceiptsRef.current && uid && markedReadForRef.current !== cid) {
        const unreadIds = (data ?? [])
          .filter((m: any) => !m.read_at && m.sender_user_id !== uid)
          .map((m: any) => m.id);

        if (unreadIds.length > 0) {
          markedReadForRef.current = cid;
          markConversationMessagesRead(cid, uid).then(({ markedCount }) => {
            if (markedCount > 0 && tid) {
              onThreadUpdateRef.current(tid, { unreadCount: 0, lastMessagePreview: undefined });
            }
          }).catch(() => {});
          const ctxId = eid || tid;
          if (ctxId) clearMarkedUnread(uid, ctxId).catch(() => {});
        } else {
          markedReadForRef.current = cid;
        }
      }
    } finally {
      loadInFlightForRef.current = null;
    }
  }, []);

  const wasOnlineRef = useRef(isOnline);
  const loadMessagesRef = useRef(loadMessages);
  loadMessagesRef.current = loadMessages;

  const conversationIdRef = useRef(conversationId);
  useEffect(() => {
    if (conversationIdRef.current !== conversationId) {
      conversationIdRef.current = conversationId;
    }
    void loadMessages();
  }, [conversationId]);

  useEffect(() => {
    const cid = prevConversationIdRef.current;
    if (!wasOnlineRef.current && isOnline && cid) {
      loadCountRef.current = { cid, count: 0, ts: Date.now() };
      void loadMessagesRef.current();
    }
    wasOnlineRef.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    if (!conversationId) return;

    const cleanup = subscribeInstantMessages(conversationId, (broadcastMsg) => {
      const isOwn = isOutgoingMessage(broadcastMsg, userId);

      realtimeTrace("message.broadcast.instant", "output", {
        id: broadcastMsg.id,
        sender: broadcastMsg.senderUserId,
        conversationId,
        isOwn,
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
        if (isOwn) {
          let matched = false;
          const incomingTempId = (broadcastMsg.metadata as any)?._tempId ?? null;
          const reconciled = prev.filter(m => {
            if (!m.pending || m.sender_id !== userId || matched) return true;
            const myTempId = (m.metadata as any)?._tempId ?? null;
            if (incomingTempId && myTempId && incomingTempId === myTempId) {
              matched = true;
              return false;
            }
            if (m.content === safeString(broadcastMsg.body)) {
              matched = true;
              return false;
            }
            return true;
          });
          return [...reconciled, mapped];
        }
        return [...prev, mapped];
      });

      if (!isOwn) {
        playMessageSound();
        const currentThread = threadRef.current;
        if (currentThread?.id) {
          onThreadUpdateRef.current(currentThread.id, {
            lastMessageTime: broadcastMsg.createdAt,
            lastMessagePreview: broadcastMsg.body?.slice?.(0, 120) ?? "",
          });
        }
      }
    });

    return cleanup;
  }, [conversationId, userId, realtimeTrace]);

  useEffect(() => {
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
        (payload) => {
          const msg = payload.new as any;
          if (!msg?.id) return;
          const isOwn = msg.sender_user_id === userId;

          realtimeTrace("message.postgres.insert", "output", {
            id: msg.id,
            sender: msg.sender_user_id,
            conversationId,
            isOwn,
          });

          const mapped = mapV2ToChat(msg, conversationId);
          setRawMessages((prev) => {
            if (prev.some((m) => m.id === mapped.id)) return prev;
            if (isOwn) {
              let matched = false;
              const incomingTempId = (msg.metadata as any)?._tempId ?? null;
              const reconciled = prev.filter(m => {
                if (!m.pending || m.sender_id !== userId || matched) return true;
                const myTempId = (m.metadata as any)?._tempId ?? null;
                if (incomingTempId && myTempId && incomingTempId === myTempId) {
                  matched = true;
                  return false;
                }
                if (m.content === safeString(msg.body)) {
                  matched = true;
                  return false;
                }
                return true;
              });
              return [...reconciled, mapped];
            }
            return [...prev, mapped];
          });

          if (!isOwn) {
            const currentThread = threadRef.current;
            if (currentThread?.id) {
              onThreadUpdateRef.current(currentThread.id, {
                lastMessageTime: msg.created_at,
                lastMessagePreview: (msg.body || "").slice(0, 120),
              });
            }
          }
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

          setRawMessages((prev) => {
            if (msg.deleted_at) return prev.filter((m) => m.id !== msg.id);

            let anyChange = false;
            const next = prev.map((m) => {
              if (m.id !== msg.id) return m;
              const newContent = msg.body;
              const newRead = !!msg.read_at;
              const newFailed = !!msg.failed_at;
              const newReplyTo = msg.reply_to_message_id ?? null;
              if (
                m.content === newContent &&
                m.read === newRead &&
                m.failed === newFailed &&
                m.reply_to_message_id === newReplyTo
              ) return m;
              anyChange = true;
              return { ...m, content: newContent, read: newRead, failed: newFailed, reply_to_message_id: newReplyTo, metadata: msg.metadata ?? {} };
            });
            return anyChange ? next : prev;
          });
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
  }, [conversationId, userId, realtimeTrace]);

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
