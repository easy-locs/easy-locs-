/**
 * message.mode — Canonical message mode taxonomy.
 * Single source of truth for all message types/modes in Orbit.
 */

export type MessageMode =
  | "text"
  | "media"
  | "grouped_media"
  | "voice"
  | "static_location"
  | "live_location"
  | "payment"
  | "system_event"
  | "ephemeral"
  | "view_once"
  | "story_reference"
  | "deleted"
  | "forwarded";

/** Resolve the canonical mode from a raw message object */
export function resolveMessageMode(msg: any): MessageMode {
  if (!msg) return "text";

  const type = msg.type || msg.message_type || "";
  const meta = msg.metadata_json || msg.metadata || {};

  if (meta?.deleted || msg.deleted_at) return "deleted";
  if (meta?.forwarded_from) return "forwarded";
  if (meta?.view_once) return "view_once";
  if (meta?.ephemeral) return "ephemeral";
  if (meta?.story_ref) return "story_reference";

  if (type === "system" || type === "system_event") return "system_event";
  if (type === "payment" || meta?.payment_type) return "payment";
  if (type === "voice" || msg.audio_url || meta?.audio_url) return "voice";

  if (type === "location" || meta?.lat != null) {
    return meta?.is_live ? "live_location" : "static_location";
  }

  if (type === "media" || msg.attachment_url || meta?.url) {
    const attachments = meta?.attachments;
    if (Array.isArray(attachments) && attachments.length > 1) return "grouped_media";
    return "media";
  }

  return "text";
}

/** Get a human-readable label for a message mode */
export function getModeLabelFr(mode: MessageMode): string {
  const labels: Record<MessageMode, string> = {
    text: "Text",
    media: "Media",
    grouped_media: "Album",
    voice: "Voice",
    static_location: "Location",
    live_location: "Live Location",
    payment: "Payment",
    system_event: "System",
    ephemeral: "Ephemeral",
    view_once: "View Once",
    story_reference: "Story",
    deleted: "Deleted",
    forwarded: "Forwarded",
  };
  return labels[mode] || "Message";
}
