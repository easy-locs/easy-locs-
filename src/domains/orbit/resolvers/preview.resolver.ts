/**
 * preview.resolver — SINGLE canonical source for message previews.
 *
 * RULES:
 * - buildMessagePreview: the ONE function to produce a conversation list preview from a message
 * - No other file may generate last-message previews independently.
 *
 * Handles all message types: text, image, video, voice, file, location, system, call, payment.
 */
import type { MessageType } from "../types/canonical-entities";

export interface PreviewableMessage {
  type?: MessageType | string | null;
  text?: string | null;
  body?: string | null;
  isDeleted?: boolean;
  status?: string | null;
}

const TYPE_PREVIEWS: Record<string, string> = {
  image: "📷 Photo",
  video: "🎬 Video",
  voice: "🎙️ Voice message",
  audio: "🎵 Audio",
  file: "📎 File",
  location_static: "📍 Location",
  location_live: "📍 Live location",
  call_event: "📞 Call",
  call_audio: "📞 Audio call",
  call_video: "📹 Video call",
  call_missed: "📞 Missed call",
  call_declined: "📞 Declined call",
  payment_request: "💰 Payment request",
  payment_receipt: "💰 Payment",
  system: "ℹ️ System message",
  ephemeral_notice: "⏳ Ephemeral message",
  reaction: "❤️ Reaction",
};

const MAX_PREVIEW_LEN = 80;

/**
 * buildMessagePreview — Single canonical message preview builder.
 *
 * Used for:
 * - Inbox / conversation list last message
 * - Notification body
 * - Push preview
 * - Search snippet
 *
 * Returns a concise, human-readable preview string.
 */
export function buildMessagePreview(
  message: PreviewableMessage | null | undefined,
  maxLen: number = MAX_PREVIEW_LEN,
): string {
  if (!message) return "";

  // Deleted
  if (message.isDeleted) return "🚫 Message deleted";

  // Failed / retrying
  if (message.status === "failed") return "⚠️ Message failed";
  if (message.status === "retrying") return "🔄 Retrying…";

  // Type-based preview for non-text types
  const type = message.type || "text";
  if (type !== "text" && type !== "reply") {
    const typePreview = TYPE_PREVIEWS[type];
    if (typePreview) {
      // Some typed messages also have text (e.g. image with caption)
      const caption = message.text?.trim() || message.body?.trim();
      if (caption) {
        const truncated = caption.length > maxLen ? caption.slice(0, maxLen) + "…" : caption;
        return `${typePreview}: ${truncated}`;
      }
      return typePreview;
    }
  }

  // Text content
  const text = message.text?.trim() || message.body?.trim();
  if (!text) return "";

  // E2E encrypted file marker
  if (text.startsWith("e2e-file:")) return "📎 Encrypted file";

  return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
}
