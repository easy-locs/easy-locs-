/**
 * message-payload-builder — Atomic unit: construct the DB insert payload for a chat message.
 * Single responsibility: payload construction only, no DB calls, no side effects.
 */

export interface MessagePayloadInput {
  conversationId: string;
  senderUserId: string;
  senderOrbitId: string;
  receiverOrbitId?: string | null;
  body: string;
  encrypted: boolean;
  replyToMessageId?: string | null;
  category?: string;
  locale?: string;
  securityLevel?: string;
  disappearTTL?: string | null;
}

export interface MessagePayload {
  conversation_id: string;
  sender_user_id: string;
  sender_orbit_id: string;
  receiver_orbit_id: string | null;
  type: string;
  body: string;
  reply_to_message_id: string | null;
  metadata: Record<string, unknown>;
}

export function buildMessagePayload(input: MessagePayloadInput): MessagePayload {
  return {
    conversation_id: input.conversationId,
    sender_user_id: input.senderUserId,
    sender_orbit_id: input.senderOrbitId,
    receiver_orbit_id: input.receiverOrbitId ?? null,
    type: "text",
    body: input.body,
    reply_to_message_id: input.replyToMessageId ?? null,
    metadata: {
      encrypted: input.encrypted,
      category: input.category || "general",
      locale: input.locale || "en",
      security_level: input.securityLevel || "normal",
      disappear_ttl: input.disappearTTL ?? null,
    },
  };
}