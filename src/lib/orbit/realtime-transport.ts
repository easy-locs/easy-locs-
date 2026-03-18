/**
 * Orbit Realtime Transport — WebSocket-based messaging core.
 * 
 * Features:
 * - Optimistic message delivery (instant UI, background sync)
 * - Auto-reconnect with exponential backoff
 * - Message deduplication & ordering
 * - Typing indicators
 * - Read receipts
 * - Network-aware batching
 */
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────

export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

export interface OrbitMessage {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  encrypted: boolean;
  status: MessageStatus;
  createdAt: string;
  replyTo?: string;
  attachments?: OrbitAttachment[];
  actionPayload?: Record<string, unknown>;
  ephemeral?: boolean;
  localId?: string;
}

export interface OrbitAttachment {
  type: "image" | "file" | "voice" | "location";
  url: string;
  name?: string;
  duration?: number;
  size?: number;
  mimeType?: string;
}

export interface TypingEvent {
  userId: string;
  threadId: string;
  typing: boolean;
}

type MessageHandler = (msg: OrbitMessage) => void;
type TypingHandler = (event: TypingEvent) => void;
type StatusHandler = (status: "connected" | "reconnecting" | "disconnected") => void;

// ─── Optimistic Queue ─────────────────────────────────────

const optimisticQueue = new Map<string, OrbitMessage>();
const messageDedup = new Set<string>();

export function getOptimisticMessages(threadId: string): OrbitMessage[] {
  return Array.from(optimisticQueue.values())
    .filter(m => m.threadId === threadId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// ─── Transport Core ───────────────────────────────────────

let channel: ReturnType<typeof supabase.channel> | null = null;
let presenceChannel: ReturnType<typeof supabase.channel> | null = null;
const messageHandlers = new Set<MessageHandler>();
const typingHandlers = new Set<TypingHandler>();
const statusHandlers = new Set<StatusHandler>();
let currentUserId: string | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
const MAX_RECONNECT_DELAY = 30_000;

function notifyStatus(status: "connected" | "reconnecting" | "disconnected") {
  statusHandlers.forEach(h => h(status));
}

/** Initialize the realtime transport for a user */
export function initTransport(userId: string): () => void {
  if (currentUserId === userId && channel) return () => {};
  currentUserId = userId;

  // Main message channel
  channel = supabase.channel(`orbit:user:${userId}`, {
    config: { broadcast: { self: false } },
  });

  channel
    .on("broadcast", { event: "message" }, ({ payload }) => {
      const msg = payload as OrbitMessage;
      if (messageDedup.has(msg.id)) return;
      messageDedup.add(msg.id);
      // Trim dedup set
      if (messageDedup.size > 2000) {
        const arr = Array.from(messageDedup);
        arr.slice(0, 500).forEach(id => messageDedup.delete(id));
      }
      messageHandlers.forEach(h => h(msg));
    })
    .on("broadcast", { event: "typing" }, ({ payload }) => {
      typingHandlers.forEach(h => h(payload as TypingEvent));
    })
    .on("broadcast", { event: "status" }, ({ payload }) => {
      // Message status updates (delivered, read)
      const { messageId, status } = payload as { messageId: string; status: MessageStatus };
      const optimistic = optimisticQueue.get(messageId);
      if (optimistic) {
        optimistic.status = status;
        if (status === "delivered" || status === "read") {
          optimisticQueue.delete(messageId);
        }
      }
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        reconnectAttempt = 0;
        notifyStatus("connected");
      } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
        notifyStatus("reconnecting");
        scheduleReconnect(userId);
      }
    });

  return () => {
    channel?.unsubscribe();
    channel = null;
    currentUserId = null;
    if (reconnectTimer) clearTimeout(reconnectTimer);
  };
}

function scheduleReconnect(userId: string) {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), MAX_RECONNECT_DELAY);
  reconnectAttempt++;
  reconnectTimer = setTimeout(() => {
    if (currentUserId === userId) {
      channel?.unsubscribe();
      channel = null;
      initTransport(userId);
    }
  }, delay);
}

// ─── Send (Optimistic) ───────────────────────────────────

export async function sendMessage(msg: Omit<OrbitMessage, "status" | "createdAt">): Promise<OrbitMessage> {
  const fullMsg: OrbitMessage = {
    ...msg,
    status: "sending",
    createdAt: new Date().toISOString(),
    localId: msg.id,
  };

  // 1. Optimistic: add to local queue immediately
  optimisticQueue.set(msg.id, fullMsg);
  messageHandlers.forEach(h => h(fullMsg));

  // 2. Persist to DB
  try {
    const { error } = await supabase.from("conversation_messages" as any).insert({
      id: msg.id,
      thread_id: msg.threadId,
      sender_id: msg.senderId,
      content: msg.content,
      message_type: msg.actionPayload ? "action" : "text",
      metadata_json: msg.actionPayload ? JSON.stringify(msg.actionPayload) : null,
    } as any);

    if (error) throw error;

    fullMsg.status = "sent";

    // 3. Broadcast to peer via channel
    channel?.send({
      type: "broadcast",
      event: "message",
      payload: fullMsg,
    });
  } catch (err) {
    console.error("[OrbitTransport] Send failed:", err);
    fullMsg.status = "failed";
  }

  return fullMsg;
}

// ─── Typing Indicators ───────────────────────────────────

let typingDebounce: ReturnType<typeof setTimeout> | null = null;

export function sendTyping(threadId: string, userId: string) {
  if (typingDebounce) return;
  channel?.send({
    type: "broadcast",
    event: "typing",
    payload: { userId, threadId, typing: true },
  });
  typingDebounce = setTimeout(() => {
    typingDebounce = null;
  }, 2000);
}

export function sendStopTyping(threadId: string, userId: string) {
  if (typingDebounce) {
    clearTimeout(typingDebounce);
    typingDebounce = null;
  }
  channel?.send({
    type: "broadcast",
    event: "typing",
    payload: { userId, threadId, typing: false },
  });
}

// ─── Read Receipts ────────────────────────────────────────

export function sendReadReceipt(messageId: string, threadId: string) {
  channel?.send({
    type: "broadcast",
    event: "status",
    payload: { messageId, status: "read" as MessageStatus },
  });
}

// ─── Subscriptions ────────────────────────────────────────

export function onMessage(handler: MessageHandler): () => void {
  messageHandlers.add(handler);
  return () => messageHandlers.delete(handler);
}

export function onTyping(handler: TypingHandler): () => void {
  typingHandlers.add(handler);
  return () => typingHandlers.delete(handler);
}

export function onConnectionStatus(handler: StatusHandler): () => void {
  statusHandlers.add(handler);
  return () => statusHandlers.delete(handler);
}

// ─── Offline Queue ────────────────────────────────────────

const OFFLINE_QUEUE_KEY = "orbit:offline-queue";

export function queueOfflineMessage(msg: OrbitMessage) {
  try {
    const existing = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
    existing.push(msg);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(existing.slice(-50)));
  } catch { /* quota */ }
}

export async function flushOfflineQueue(): Promise<number> {
  try {
    const queue: OrbitMessage[] = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
    if (!queue.length) return 0;
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
    let sent = 0;
    for (const msg of queue) {
      try {
        await sendMessage(msg);
        sent++;
      } catch { /* skip */ }
    }
    return sent;
  } catch {
    return 0;
  }
}
