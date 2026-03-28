/**
 * Message Type Detector — determines message rendering type from raw message data.
 * Single responsibility: classify message content for bubble rendering.
 */
import type { ChatMessage } from "@/components/communication-hub/types";

const SYSTEM_SENDER_ID = "00000000-0000-0000-0000-000000000000";

export interface MessageTypeFlags {
  isSystem: boolean;
  isDeleted: boolean;
  isInboundEmail: boolean;
  isPayment: boolean;
  isPaymentRequest: boolean;
  isPaymentReceipt: boolean;
  isVoice: boolean;
  isViewOnce: boolean;
  isLocation: boolean;
  locLat: string | null;
  locLng: string | null;
  locLabel: string | null;
}

export function detectMessageType(msg: ChatMessage): MessageTypeFlags {
  const isDeleted = !!(msg as any).deleted_for_all;
  const isSystem = msg.message_type === "system" || msg.sender_id === SYSTEM_SENDER_ID;
  const isInboundEmail = msg.message_type === "inbound_email";
  const isPayment = !isDeleted && !!msg.content?.startsWith("💳");
  const isPaymentRequest = !isDeleted && msg.category === "payment_request";
  const isPaymentReceipt = !isDeleted && msg.category === "payment_receipt";
  const isVoice = !isDeleted && !!(msg as any).audio_url;
  const isViewOnce = !isDeleted && !!(msg as any).view_once;

  const osmMatch = !isDeleted && msg.content?.match(/openstreetmap\.org\/\?mlat=([\d.-]+)&mlon=([\d.-]+)/);
  const isLocation = !!osmMatch;

  return {
    isSystem, isDeleted, isInboundEmail,
    isPayment, isPaymentRequest, isPaymentReceipt,
    isVoice, isViewOnce, isLocation,
    locLat: osmMatch ? osmMatch[1] : null,
    locLng: osmMatch ? osmMatch[2] : null,
    locLabel: isLocation ? (msg.content?.split("\n")[0] || null) : null,
  };
}
