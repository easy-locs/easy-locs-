/**
 * send.preview — Canonical preview formatting for conversation list.
 * Normalizes the last_message_preview for any message type.
 */

export function formatSendPreview(type: string, body: string, metadata?: Record<string, any>): string {
  switch (type) {
    case "text":
      return body.slice(0, 120);
    case "voice":
      return "🎤 Voice message";
    case "media":
      if (metadata?.view_once) return "📷 View-once photo";
      if (metadata?.media_kind === "video") return "🎥 Video";
      return "📎 Attachment";
    case "location":
      if (metadata?.mode === "live") return "📡 Live location";
      return "📍 Location";
    case "payment":
      if (metadata?.event_type === "payment_request") return `💳 Payment request: ${metadata.amount} ${metadata.currency}`;
      if (metadata?.event_type === "payment_receipt") return `✅ Payment: ${metadata.amount} ${metadata.currency}`;
      return "💳 Payment";
    case "system":
      return body.slice(0, 120) || "ℹ️ System message";
    default:
      return body.slice(0, 120) || "Message";
  }
}

/** Build a preview label for thread list from a message row */
export function previewFromMessage(msg: { type?: string; body?: string; metadata?: any }): string {
  return formatSendPreview(msg.type || "text", msg.body || "", msg.metadata);
}
