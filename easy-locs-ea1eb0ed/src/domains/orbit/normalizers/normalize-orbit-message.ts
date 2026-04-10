/**
 * normalizeOrbitMessage — Transform raw DB/realtime message into OrbitMessage.
 * Canonical, strict, handles legacy formats.
 */
import type { OrbitMessage, MessageType, MessageStatus } from "../types";

const VALID_TYPES: MessageType[] = [
  "text", "image", "video", "audio", "voice", "file", "system",
  "reply", "reaction", "call_event", "ephemeral_notice",
  "location_static", "location_live", "payment_request", "payment_receipt",
];

export function normalizeOrbitMessage(raw: any): OrbitMessage {
  if (!raw) return emptyMessage();

  return {
    id: raw.id || "",
    tempId: raw.tempId || raw.temp_id || raw.metadata?.optimistic_id || null,
    conversationId: raw.conversation_id || raw.conversationId || "",
    senderId: raw.sender_user_id || raw.sender_id || raw.senderId || "",
    senderOrbitId: raw.sender_orbit_id || raw.senderOrbitId || null,
    type: resolveType(raw),
    text: raw.body || raw.content || raw.text || null,
    attachmentIds: raw.attachment_ids || raw.attachmentIds || [],
    replyToId: raw.reply_to_message_id || raw.replyToId || null,
    reactionSummary: raw.reaction_summary || raw.reactionSummary || null,
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updated_at || raw.updatedAt || null,
    status: resolveStatus(raw),
    isDeleted: raw.deleted_for_all || raw.isDeleted || false,
    isEdited: raw.edited_at != null || raw.isEdited || false,
    metadata: raw.metadata || raw.metadata_json || {},
  };
}

export function normalizeOrbitMessages(rows: any[]): OrbitMessage[] {
  return rows.map(normalizeOrbitMessage);
}

function resolveType(raw: any): MessageType {
  const t = raw.type || raw.message_type || "text";
  if (VALID_TYPES.includes(t as MessageType)) return t as MessageType;

  // Legacy mapping
  const meta = raw.metadata || {};
  if (meta.call_event) return "call_event";
  if (t === "system_event" || t === "system_notice") return "system";
  if (t === "media") {
    const url = raw.attachment_url || meta.url || "";
    if (url.match(/\.(mp4|mov|webm)/i)) return "video";
    if (url.match(/\.(mp3|ogg|wav|m4a)/i)) return "audio";
    return "image";
  }
  if (t === "location") return raw.metadata?.mode === "live" ? "location_live" : "location_static";

  return "text";
}

function resolveStatus(raw: any): MessageStatus {
  if (raw.pending || raw.status === "sending") return "sending";
  if (raw.failed || raw.status === "failed") return "failed";
  if (raw.read_at || raw.status === "read") return "read";
  if (raw.delivered_at || raw.status === "delivered") return "delivered";
  if (raw.id) return "sent";
  return "sending";
}

function emptyMessage(): OrbitMessage {
  return {
    id: "",
    tempId: null,
    conversationId: "",
    senderId: "",
    senderOrbitId: null,
    type: "text",
    text: null,
    attachmentIds: [],
    replyToId: null,
    reactionSummary: null,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    status: "sending",
    isDeleted: false,
    isEdited: false,
    metadata: {},
  };
}
