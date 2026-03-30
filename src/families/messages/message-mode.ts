/**
 * message-mode.ts — Canonical message mode taxonomy.
 * Re-exports CanonicalMessageType as MessageMode for backward compatibility.
 * The normalizer (normalize-message.ts) is the authoritative resolver now.
 */
import type { CanonicalMessageType, CanonicalDeliveryStatus } from "./canonical-envelope";

/** @deprecated Use CanonicalMessageType from canonical-envelope.ts */
export type MessageMode = CanonicalMessageType;

/** @deprecated Use CanonicalDeliveryStatus from canonical-envelope.ts */
export type MessageDeliveryStatus = CanonicalDeliveryStatus;

/** Resolve the canonical mode from a raw message object — legacy bridge */
export function resolveMessageMode(msg: any): MessageMode {
  if (!msg) return "text";

  const type = msg.type || msg.message_type || "";
  const meta = msg.metadata_json || msg.metadata || {};
  const content = msg.content || msg.body || "";

  // If canonical metadata exists, trust the type field
  if (meta?.schemaVersion === 1 && msg.type) {
    return msg.type as MessageMode;
  }

  if (meta?.deleted || msg.deleted_at || msg.deleted_for_all) return "text"; // deleted messages render as text
  if (meta?.forwarded_from) return "text"; // forwarded is just text with attribution

  // Call events
  if (meta?.call_event || content.match(/\[call:(ended|declined|missed):\d+\]/)) {
    const callEvent = meta?.call_event || content.match(/\[call:(ended|declined|missed):\d+\]/)?.[1];
    const isVideo = meta?.call_type === "video" || msg.is_video;
    if (callEvent === "missed") return "call_missed";
    if (callEvent === "declined") return "call_declined";
    return isVideo ? "call_video" : "call_audio";
  }

  if (type === "system" || type === "system_event" || type === "system_notice" ||
      msg.sender_id === "00000000-0000-0000-0000-000000000000") return "system_notice";

  if (type === "payment" || type === "payment_request" || type === "payment_receipt" ||
      meta?.payment_type || msg.category === "payment_receipt") {
    return type === "payment_request" || meta?.event_type === "payment_request"
      ? "payment_request" : "payment_receipt";
  }

  if (type === "voice" || msg.audio_url || meta?.audio_url) return "voice";

  if (type === "location" || type === "location_static" || type === "location_live" || meta?.lat != null) {
    return meta?.is_live || meta?.mode === "live" || type === "location_live"
      ? "location_live" : "location_static";
  }
  if (content.match(/openstreetmap\.org\/\?mlat=/)) return "location_static";

  if (type === "media" || msg.attachment_url || meta?.url) {
    const url = msg.attachment_url || meta?.url || "";
    if (url.match(/\.(mp4|mov|webm|avi)/i)) return "video";
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)/i)) return "image";
    if (url.match(/\.(pdf|doc|docx|xls|xlsx|zip|rar)/i)) return "file";
    if (meta?.media_kind === "video") return "video";
    return "image";
  }

  // Direct type matches
  if (type === "text" || type === "image" || type === "video" || type === "file" ||
      type === "audio" || type === "voice") {
    return type as MessageMode;
  }

  return "text";
}

/** Human-readable label for a message mode */
export function getModeLabel(mode: MessageMode): string {
  const labels: Record<string, string> = {
    text: "Text",
    image: "Photo",
    video: "Video",
    voice: "Voice message",
    audio: "Audio",
    file: "File",
    location_static: "Location",
    location_live: "Live Location",
    call_audio: "Audio call",
    call_video: "Video call",
    call_missed: "Missed call",
    call_declined: "Declined call",
    payment_request: "Payment request",
    payment_receipt: "Payment",
    system_notice: "System",
  };
  return labels[mode] || "Message";
}

/** @deprecated Use getModeLabel */
export const getModeLabelFr = getModeLabel;
