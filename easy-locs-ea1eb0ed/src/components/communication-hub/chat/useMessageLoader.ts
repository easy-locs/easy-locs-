/**
 * useMessageLoader — V2-ONLY canonical message loader.
 * 
 * Architecture:
 *   - Initial load: DB fetch → normalizeOrbitMessage → orbitStore.mergeMessages
 *   - Realtime: exclusively via orbit-realtime-owner.ts (subscribeConversationMessages)
 *   - rawMessages: derived from useOrbitMessagingStore via selector (single source of truth)
 *   - Broadcast channel: kept for instant peer sound notifications + thread preview updates
 *   - Typing channel: kept for presence indicators
 * 
 * No direct chat_messages_v2 realtime subscription here.
 * Read receipts delegated to receipt.controller (single write path).
 */
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { isOutgoingMessage } from "@/domains/orbit/resolvers";
import { db } from "@/services/db";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { subscribeInstantMessages } from "@/lib/realtime-broadcast";
import { subscribeConversationMessages } from "@/domains/orbit/realtime/orbit-realtime-owner";
import { useOrbitMessagingStore } from "@/domains/orbit/stores/orbit.store";
import { normalizeOrbitMessage } from "@/domains/orbit/normalizers";
import {
  markConversationMessagesRead,
  clearMarkedUnread,
} from "@/domains/orbit/controllers/receipt.controller";
import { playMessageSound } from "@/lib/notifications/sounds";
import type { OrbitMessage } from "@/domains/orbit/types";


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

/** Map OrbitMessage (store format) to ChatMessage (UI format). */
function mapOrbitToChat(m: OrbitMessage, conversationId: string): ChatMessage {
  const meta = (m.metadata ?? {}) as Record<string, any>;
  const mediaUrl = meta.media?.url ?? meta.media?.remote_url ?? null;
  const rawAtts = Array.isArray(meta.attachments) ? meta.attachments : [];
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
    sender_id: m.senderId,
    content: safeString(m.text),
    created_at: m.createdAt,
    read: m.status === "read",
    category: (meta.category as string) || "general",
    tenant_id: null,
    translated_content: null,
    translated_locale: null,
    language_detected: null,
    message_type: msgType,
    context_type: "direct",
    context_id: conversationId,
    pending: m.status === "sending",
    failed: m.status === "failed",
    reply_to_message_id: m.replyToId ?? null,
    metadata: meta,
    metadata_json: meta,
    contact_name: safeString(meta.contact_name || m.senderOrbitId),
    attachment_url: resolvedAttachmentUrl,
    attachments: rawAtts,
    audio_url: msgType === "voice" ? resolvedAttachmentUrl : null,
    audio_duration_seconds: meta.media?.duration ?? meta.duration ?? null,
    video_duration_seconds: meta.media?.duration ?? meta.duration ?? null,
    view_once: !!m.metadata?.view_once || !!meta.media?.viewOnce,
    media_kind: meta.media?.media_kind || meta.media?.kind || m.type || null,
    media_count: meta.media_count || 0,
    attachment_summary: meta.attachment_summary || null,
    conversation_id: conversationId,
  } as any;
}

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

  const [pendingOffline, setPendingOffline] = useState<any[]>([]);
  const [convStatus, setConvStatus] = useState("active");
  const [typingIndicator, setTypingIndicator] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const typingChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);
  const markedReadForRef = useRef<string | null>(null);
  const loadInFlightForRef = useRef<string | null>(null);
  const prevConversationIdRef = useRef<string | null>(null);
  const readReceiptsRef = useRef(readReceipts);
  readReceiptsRef.current = readReceipts;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  if (prevConversationIdRef.current !== conversationId) {
    prevConversationIdRef.current = conversationId;
    markedReadForRef.current = null;
    loadInFlightForRef.current = null;
  }

  // ── Store-driven rawMessages (single source of truth) ──
  const storeMessages = useOrbitMessagingStore(
    useCallback(
      (s) => conversationId ? s.getMessagesForConversation(conversationId) : [],
      [conversationId]
    )
  );

  const rawMessages = useMemo<ChatMessage[]>(
    () => conversationId
      ? storeMessages.map((m) => mapOrbitToChat(m, conversationId))
      : [],
    [storeMessages, conversationId]
  );

  // setRawMessages is kept for backward-compat (optimistic UI: insert, edit, delete, star,
  // translation, pending/failed transitions from useThreadMessageFamily and mutation bridge).
  // All mutations are applied to the orbit store so they propagate through the selector above.
  const setRawMessages = useCallback((updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    const store = useOrbitMessagingStore.getState();
    if (!conversationId) return;

    const current = store.getMessagesForConversation(conversationId);
    const currentMapped = current.map((m) => mapOrbitToChat(m, conversationId));
    const next = typeof updater === "function" ? updater(currentMapped) : updater;

    next.forEach((chatMsg) => {
      const existingOrbit = current.find((m) => m.id === chatMsg.id);

      if (!existingOrbit) {
        // New message (optimistic insert)
        const meta = (chatMsg.metadata ?? {}) as Record<string, unknown>;
        const orbitMsg: OrbitMessage = {
          id: chatMsg.id,
          tempId: (meta._tempId as string | null) ?? null,
          conversationId,
          senderId: chatMsg.sender_id ?? "",
          senderOrbitId: null,
          type: (chatMsg.message_type as OrbitMessage["type"]) || "text",
          text: chatMsg.content,
          attachmentIds: [],
          replyToId: chatMsg.reply_to_message_id ?? null,
          reactionSummary: null,
          createdAt: chatMsg.created_at,
          updatedAt: null,
          status: chatMsg.pending ? "sending" : chatMsg.failed ? "failed" : "sent",
          isDeleted: false,
          isEdited: false,
          metadata: meta,
        };
        store.mergeMessage(orbitMsg);
        return;
      }

      // Existing message — build a partial patch with only changed fields.
      // patchMessage bypasses the version guard (local optimistic mutation, not server data).
      const patch: Partial<Omit<OrbitMessage, "id" | "conversationId" | "senderId">> = {};
      let hasPatch = false;

      // text / content
      if (chatMsg.content !== existingOrbit.text) {
        patch.text = chatMsg.content;
        hasPatch = true;
      }

      // type
      const incomingType = (chatMsg.message_type as OrbitMessage["type"]) || "text";
      if (incomingType !== existingOrbit.type) {
        patch.type = incomingType;
        hasPatch = true;
      }

      // deleted_for_all → isDeleted
      const incomingDeleted = !!(chatMsg as Record<string, unknown>).deleted_for_all;
      if (incomingDeleted !== existingOrbit.isDeleted) {
        patch.isDeleted = incomingDeleted;
        hasPatch = true;
      }

      // edited_at → isEdited
      const incomingEdited = !!(chatMsg as Record<string, unknown>).edited_at;
      if (incomingEdited && !existingOrbit.isEdited) {
        patch.isEdited = true;
        hasPatch = true;
      }

      // pending / failed → status (optimistic, bypass status machine)
      const incomingStatus: OrbitMessage["status"] = chatMsg.pending
        ? "sending"
        : chatMsg.failed
          ? "failed"
          : existingOrbit.status;
      if (incomingStatus !== existingOrbit.status) {
        patch.status = incomingStatus;
        hasPatch = true;
      }

      // metadata field updates: starred, translated_content, translated_locale
      const prevMeta = existingOrbit.metadata ?? {};
      const incomingStarred = (chatMsg as Record<string, unknown>).starred;
      const incomingTranslated = (chatMsg as Record<string, unknown>).translated_content;
      const incomingTranslatedLocale = (chatMsg as Record<string, unknown>).translated_locale;
      const metaChanged =
        incomingStarred !== undefined && incomingStarred !== prevMeta.starred ||
        incomingTranslated !== undefined && incomingTranslated !== prevMeta.translated_content ||
        incomingTranslatedLocale !== undefined && incomingTranslatedLocale !== prevMeta.translated_locale;
      if (metaChanged) {
        patch.metadata = {
          ...prevMeta,
          ...(incomingStarred !== undefined ? { starred: incomingStarred } : {}),
          ...(incomingTranslated !== undefined ? { translated_content: incomingTranslated } : {}),
          ...(incomingTranslatedLocale !== undefined ? { translated_locale: incomingTranslatedLocale } : {}),
        };
        hasPatch = true;
      }

      if (hasPatch) {
        store.patchMessage(chatMsg.id, patch);
      }
    });

    // Handle removals: if the updater produced a shorter list, remove IDs absent from `next`.
    const nextIds = new Set(next.map((m) => m.id));
    current.forEach((orbitMsg) => {
      if (!nextIds.has(orbitMsg.id)) {
        store.removeMessage(orbitMsg.id);
      }
    });
  }, [conversationId]);

  const loadMessages = useCallback(async () => {
    const cid = prevConversationIdRef.current;
    const currentThread = threadRef.current;
    const tid = currentThread?.id ?? null;
    const eid = currentThread?.entityId ?? null;
    const uid = userIdRef.current;

    if (!cid) {
      setMessagesLoading(false);
      return;
    }

    if (loadInFlightForRef.current === cid) return;
    loadInFlightForRef.current = cid;

    try {
      if (!offlineRef.current.isOnline) {
        const offCached = await offlineRef.current.getCachedMessages();
        const pending = await offlineRef.current.getThreadPending();
        const store = useOrbitMessagingStore.getState();
        (offCached ?? []).forEach((m: any) => {
          const normalized = normalizeOrbitMessage({ ...m, conversation_id: cid });
          store.mergeMessage(normalized);
        });
        setPendingOffline(pending ?? []);
        setMessagesLoading(false);
        return;
      }

      setMessagesLoading(true);

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

      const rows = (data ?? []).reverse();
      const store = useOrbitMessagingStore.getState();
      const normalized = rows.map((m: any) => normalizeOrbitMessage(m));
      store.mergeMessages(normalized);

      offlineRef.current.cacheMessages(rows);
      setMessagesLoading(false);
      setPendingOffline((prev) => (prev.length === 0 ? prev : []));

      if (readReceiptsRef.current && uid && markedReadForRef.current !== cid) {
        const unreadIds = rows
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
    conversationIdRef.current = conversationId;
    void loadMessages();
  }, [conversationId]);

  // ── Canonical realtime subscription (orbit-realtime-owner) ──
  useEffect(() => {
    if (!conversationId) return;
    const unsub = subscribeConversationMessages(conversationId);
    return unsub;
  }, [conversationId]);

  useEffect(() => {
    const cid = prevConversationIdRef.current;
    if (!wasOnlineRef.current && isOnline && cid) {
      void loadMessagesRef.current();
    }
    wasOnlineRef.current = isOnline;
  }, [isOnline]);

  // ── Broadcast channel: instant peer notification + thread preview ──
  useEffect(() => {
    if (!conversationId) return;

    const cleanup = subscribeInstantMessages(conversationId, (broadcastMsg) => {
      const isOwn = isOutgoingMessage(broadcastMsg, userId);

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
  }, [conversationId, userId]);

  // ── Typing presence channel ──
  useEffect(() => {
    if (!conversationId) return;

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
      removeRealtimeChannel(typingChannel);
    };
  }, [conversationId, userId]);

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
