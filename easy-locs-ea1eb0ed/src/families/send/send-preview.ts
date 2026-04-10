/**
 * send.preview — Canonical preview formatting for conversation list.
 * Uses CanonicalMessageType taxonomy.
 */
import type { CanonicalMessageType } from "@/families/messages/canonical-envelope";

export function formatSendPreview(type: string, body: string, metadata?: Record<string, any>): string {
  const t = type as CanonicalMessageType;

  switch (t) {
    case "text":
      return body.slice(0, 120);
    case "voice":
      return "🎤 Voice message";
    case "audio":
      return "🎵 Audio";
    case "image":
      return metadata?.media?.viewOnce ? "📷 View-once photo" : "📸 Photo";
    case "video":
      return "🎥 Video";
    case "file":
      return "📎 File";
    case "location_static":
      return "📍 Location";
    case "location_live":
      return "📡 Live location";
    case "call_audio":
      return "📞 Audio call";
    case "call_video":
      return "📹 Video call";
    case "call_missed":
      return "📵 Missed call";
    case "call_declined":
      return "⛔ Declined call";
    case "payment_request":
      return `💳 Payment request${metadata?.payment?.amount ? `: ${metadata.payment.amount} ${metadata.payment.currency || ""}` : ""}`;
    case "payment_receipt":
      return `✅ Payment${metadata?.payment?.amount ? `: ${metadata.payment.amount} ${metadata.payment.currency || ""}` : ""}`;
    case "system_notice":
      return body.slice(0, 120) || "ℹ️ System message";
    default:
      // Legacy fallback
      if (type === "media") {
        if (metadata?.view_once) return "📷 View-once photo";
        if (metadata?.media_kind === "video") return "🎥 Video";
        return "📎 Attachment";
      }
      if (type === "location") {
        return metadata?.mode === "live" ? "📡 Live location" : "📍 Location";
      }
      if (type === "payment") {
        if (metadata?.event_type === "payment_request") return `💳 Payment request: ${metadata.amount} ${metadata.currency}`;
        return `✅ Payment: ${metadata?.amount} ${metadata?.currency}`;
      }
      return body.slice(0, 120) || "Message";
  }
}

/** Build a preview label for thread list from a message row */
export function previewFromMessage(msg: { type?: string; body?: string; metadata?: any }): string {
  return formatSendPreview(msg.type || "text", msg.body || "", msg.metadata);
}
