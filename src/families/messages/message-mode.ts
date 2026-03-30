/**
 * message.mode — Canonical message mode taxonomy.
 * Single source of truth for all message types/modes in Orbit.
 */

export type MessageMode =
  | "text"
  | "image"
  | "video"
  | "media"
  | "grouped_media"
  | "voice"
  | "file"
  | "static_location"
  | "live_location"
  | "call_audio"
  | "call_video"
  | "call_missed"
  | "call_declined"
  | "payment_request"
  | "payment_receipt"
  | "system_notice"
  | "ephemeral"
  | "view_once"
  | "story_reference"
  | "deleted"
  | "forwarded";

/** Delivery status for optimistic pipeline */
export type MessageDeliveryStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

/** Resolve the canonical mode from a raw message object */
export function resolveMessageMode(msg: any): MessageMode {
  if (!msg) return "text";

  const type = msg.type || msg.message_type || "";
  const meta = msg.metadata_json || msg.metadata || {};
  const content = msg.content || "";

  if (meta?.deleted || msg.deleted_at || msg.deleted_for_all) return "deleted";
  if (meta?.forwarded_from) return "forwarded";
  if (meta?.view_once || msg.view_once) return "view_once";
  if (meta?.ephemeral) return "ephemeral";
  if (meta?.story_ref) return "story_reference";

  // Call events — detected via metadata or content tag
  if (meta?.call_event || content.match(/\[call:(ended|declined|missed):\d+\]/)) {
    const callEvent = meta?.call_event || content.match(/\[call:(ended|declined|missed):\d+\]/)?.[1];
    const isVideo = meta?.call_type === "video" || msg.is_video;
    if (callEvent === "missed") return "call_missed";
    if (callEvent === "declined") return "call_declined";
    return isVideo ? "call_video" : "call_audio";
  }

  if (type === "system" || type === "system_event" || msg.sender_id === "00000000-0000-0000-0000-000000000000") return "system_notice";
  if (type === "payment" || meta?.payment_type || msg.category === "payment_receipt") return "payment_receipt";
  if (msg.category === "payment_request") return "payment_request";
  if (type === "voice" || msg.audio_url || meta?.audio_url) return "voice";

  if (type === "location" || meta?.lat != null) {
    return meta?.is_live ? "live_location" : "static_location";
  }
  // Location detected from OSM URL in content
  if (content.match(/openstreetmap\.org\/\?mlat=/)) return "static_location";

  if (type === "media" || msg.attachment_url || meta?.url) {
    const attachments = meta?.attachments;
    if (Array.isArray(attachments) && attachments.length > 1) return "grouped_media";
    // Determine image vs video from URL
    const url = msg.attachment_url || meta?.url || "";
    if (url.match(/\.(mp4|mov|webm|avi)/i)) return "video";
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)/i)) return "image";
    if (url.match(/\.(pdf|doc|docx|xls|xlsx|zip|rar)/i)) return "file";
    return "media";
  }

  return "text";
}

/** Human-readable label for a message mode */
export function getModeLabel(mode: MessageMode): string {
  const labels: Record<MessageMode, string> = {
    text: "Text",
    image: "Photo",
    video: "Video",
    media: "Media",
    grouped_media: "Album",
    voice: "Voice message",
    file: "File",
    static_location: "Location",
    live_location: "Live Location",
    call_audio: "Audio call",
    call_video: "Video call",
    call_missed: "Missed call",
    call_declined: "Declined call",
    payment_request: "Payment request",
    payment_receipt: "Payment",
    system_notice: "System",
    ephemeral: "Ephemeral",
    view_once: "View Once",
    story_reference: "Story",
    deleted: "Deleted",
    forwarded: "Forwarded",
  };
  return labels[mode] || "Message";
}

/** Deprecated — use getModeLabel instead */
export const getModeLabelFr = getModeLabel;
