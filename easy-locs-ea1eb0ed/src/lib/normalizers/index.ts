/**
 * Canonical Normalizers — Single entry point for all entity normalization.
 * Every object entering the system MUST pass through these before store insertion.
 */

import type { ConversationThread } from "@/components/communication-hub/types";

// ═══════════════════════════════════════════════════════════════
// Message Normalizer
// ═══════════════════════════════════════════════════════════════

export interface NormalizedMessage {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderOrbitId: string | null;
  type: string;
  body: string;
  metadata: Record<string, unknown>;
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  createdAt: string;
  updatedAt: string;
  isOptimistic: boolean;
  tempId?: string;
}

export function normalizeMessage(raw: any): NormalizedMessage {
  return {
    id: raw.id ?? raw.tempId ?? crypto.randomUUID(),
    conversationId: raw.conversation_id ?? raw.conversationId ?? "",
    senderUserId: raw.sender_user_id ?? raw.senderUserId ?? "",
    senderOrbitId: raw.sender_orbit_id ?? raw.senderOrbitId ?? null,
    type: raw.type ?? raw.message_type ?? "text",
    body: raw.body ?? raw.content ?? raw.text ?? "",
    metadata: raw.metadata ?? {},
    status: raw.status ?? (raw.id ? "sent" : "sending"),
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updated_at ?? raw.updatedAt ?? raw.created_at ?? new Date().toISOString(),
    isOptimistic: !raw.id || !!raw.tempId,
    tempId: raw.tempId,
  };
}

// ═══════════════════════════════════════════════════════════════
// Conversation Normalizer
// ═══════════════════════════════════════════════════════════════

export interface NormalizedConversation {
  id: string;
  type: "direct" | "group" | "support" | "channel";
  title: string;
  participants: string[];
  lastMessageAt: string;
  unreadCount: number;
  muted: boolean;
  archived: boolean;
  pinned: boolean;
}

export function normalizeConversation(raw: any): NormalizedConversation {
  return {
    id: raw.id ?? "",
    type: raw.type ?? "direct",
    title: raw.title ?? raw.name ?? "",
    participants: Array.isArray(raw.participants)
      ? raw.participants.map((p: any) => typeof p === "string" ? p : p?.user_id ?? p?.id ?? "")
      : [],
    lastMessageAt: raw.last_message_at ?? raw.lastMessageAt ?? raw.updated_at ?? "",
    unreadCount: raw.unread_count ?? raw.unreadCount ?? 0,
    muted: raw.muted ?? false,
    archived: raw.archived ?? false,
    pinned: raw.pinned ?? false,
  };
}

// ═══════════════════════════════════════════════════════════════
// Call Session Normalizer
// ═══════════════════════════════════════════════════════════════

export type CallState =
  | "idle" | "calling" | "ringing" | "incoming"
  | "connecting" | "active" | "ended"
  | "missed" | "declined" | "failed" | "reconnecting";

export interface NormalizedCallSession {
  id: string;
  callerOrbitId: string;
  receiverOrbitId: string;
  callType: "audio" | "video";
  state: CallState;
  startedAt: string;
  endedAt: string | null;
  duration: number | null;
}

export function normalizeCallSession(raw: any): NormalizedCallSession {
  return {
    id: raw.id ?? "",
    callerOrbitId: raw.caller_orbit_id ?? raw.callerOrbitId ?? "",
    receiverOrbitId: raw.receiver_orbit_id ?? raw.receiverOrbitId ?? "",
    callType: raw.call_type ?? raw.callType ?? "audio",
    state: raw.status ?? raw.state ?? "idle",
    startedAt: raw.started_at ?? raw.startedAt ?? raw.created_at ?? "",
    endedAt: raw.ended_at ?? raw.endedAt ?? null,
    duration: raw.duration_seconds ?? raw.duration ?? null,
  };
}

// ═══════════════════════════════════════════════════════════════
// User/Profile Normalizer
// ═══════════════════════════════════════════════════════════════

export interface NormalizedUser {
  id: string;
  orbitId: string | null;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
}

export function normalizeUser(raw: any): NormalizedUser {
  return {
    id: raw.id ?? raw.user_id ?? "",
    orbitId: raw.orbit_id ?? raw.orbitId ?? null,
    displayName: raw.display_name ?? raw.displayName ?? raw.name ?? raw.full_name ?? "",
    email: raw.email ?? "",
    avatarUrl: raw.avatar_url ?? raw.avatarUrl ?? null,
    role: raw.role ?? raw.user_type ?? "user",
  };
}

// ═══════════════════════════════════════════════════════════════
// Realtime Payload Normalizer
// ═══════════════════════════════════════════════════════════════

export function normalizeRealtimePayload(event: string, payload: any) {
  const record = payload.new ?? payload.record ?? payload;
  const table = payload.table ?? "";
  
  switch (table) {
    case "chat_messages_v2":
      return { type: "message" as const, data: normalizeMessage(record) };
    case "conversations_v2":
      return { type: "conversation" as const, data: normalizeConversation(record) };
    case "call_logs":
      return { type: "call" as const, data: normalizeCallSession(record) };
    default:
      return { type: "unknown" as const, data: record };
  }
}
