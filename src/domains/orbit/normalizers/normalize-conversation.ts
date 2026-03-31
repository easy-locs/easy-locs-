/**
 * normalizeConversation — Transform any raw conversation payload into OrbitConversation.
 * Handles: DB rows, realtime payloads, legacy formats.
 */
import type { OrbitConversation, ConversationKind } from "../types";

const VALID_KINDS: ConversationKind[] = ["direct", "group", "support", "ephemeral"];

export function normalizeConversation(raw: any): OrbitConversation {
  if (!raw) return emptyConversation();

  const kind = resolveKind(raw.type || raw.kind);
  const participants = resolveParticipantIds(raw.participants || raw.participantIds || []);

  return {
    id: raw.id || "",
    kind,
    participantIds: participants,
    title: raw.title || raw.group_name || null,
    avatarUrl: raw.avatar_url || raw.avatarUrl || null,
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updated_at || raw.updatedAt || raw.created_at || new Date().toISOString(),
    lastMessageId: raw.last_message_id || raw.lastMessageId || null,
    lastMessagePreview: raw.last_message_preview || raw.lastMessagePreview || null,
    lastMessageAt: raw.last_message_at || raw.lastMessageAt || null,
    unreadCount: raw.unread_count ?? raw.unreadCount ?? 0,
    isArchived: raw.is_archived ?? raw.isArchived ?? raw.archived ?? false,
    isMuted: raw.is_muted ?? raw.isMuted ?? raw.muted ?? false,
    isEphemeral: kind === "ephemeral" || raw.is_ephemeral || false,
    ephemeralConfig: raw.ephemeral_config || raw.ephemeralConfig || null,
  };
}

export function normalizeConversations(rows: any[]): OrbitConversation[] {
  return rows.map(normalizeConversation);
}

function resolveKind(raw: any): ConversationKind {
  if (typeof raw === "string" && VALID_KINDS.includes(raw as ConversationKind)) {
    return raw as ConversationKind;
  }
  return "direct";
}

function resolveParticipantIds(participants: any[]): string[] {
  if (!Array.isArray(participants)) return [];
  return participants.map((p) => {
    if (typeof p === "string") return p;
    // Object participant: { userId, user_id, orbitId, orbit_id, id }
    return p.userId || p.user_id || p.orbitId || p.orbit_id || p.id || "";
  }).filter(Boolean);
}

function emptyConversation(): OrbitConversation {
  return {
    id: "",
    kind: "direct",
    participantIds: [],
    title: null,
    avatarUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastMessageId: null,
    lastMessagePreview: null,
    lastMessageAt: null,
    unreadCount: 0,
    isArchived: false,
    isMuted: false,
    isEphemeral: false,
    ephemeralConfig: null,
  };
}
