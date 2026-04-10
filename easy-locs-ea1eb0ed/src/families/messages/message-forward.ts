/**
 * message.forward — Canonical message forwarding family.
 */
import { insertMessage, updateConversationTimestamp } from "@/repositories/communication.repository";
import { platformBus } from "@/lib/shared/platform-bus";
import { resolveMessageMode } from "./message-mode";
import type { CanonicalMessageType } from "./canonical-envelope";

export interface ForwardPayload {
  originalMessageId: string;
  originalSenderId: string;
  originalTimestamp: string;
  mode: CanonicalMessageType | string;
  body: string;
  metadata: Record<string, unknown>;
}

export const MessageForward = {
  /** Build a forward payload from an original message */
  buildPayload(originalMsg: any): ForwardPayload {
    const meta = originalMsg.metadata_json || originalMsg.metadata || {};
    return {
      originalMessageId: originalMsg.id,
      originalSenderId: originalMsg.sender_user_id,
      originalTimestamp: originalMsg.created_at,
      mode: resolveMessageMode(originalMsg),
      body: originalMsg.body || "",
      metadata: {
        ...meta,
        forwarded_from: originalMsg.id,
        forwarded_sender_id: originalMsg.sender_user_id,
        forwarded_at: new Date().toISOString(),
      },
    };
  },

  /** Build payloads for multiple messages (bulk forward) */
  buildBulkPayloads(messages: any[]): ForwardPayload[] {
    return messages
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((msg) => MessageForward.buildPayload(msg));
  },

  /** Execute forwarding a single message to a target conversation */
  async forwardSingle(
    payload: ForwardPayload,
    targetConversationId: string,
    senderUserId: string,
    senderOrbitId: string,
  ) {
    const preview = payload.body
      ? `↪ ${payload.body.slice(0, 80)}`
      : `↪ Forwarded ${payload.mode}`;

    // Map forwarded type to a DB-safe type
    const typeMap: Record<string, string> = {
      voice: "voice",
      image: "image",
      video: "video",
      file: "file",
    };
    const dbType = typeMap[payload.mode] || "text";

    const data = await insertMessage({
      conversationId: targetConversationId,
      senderUserId,
      senderOrbitId,
      type: dbType,
      body: preview,
      metadata: payload.metadata,
    });

    await updateConversationTimestamp(targetConversationId, preview);

    platformBus.emit("orbit:message_sent", {
      conversationId: targetConversationId,
      type: "text",
    }, "orbit", { userId: senderUserId });

    return data;
  },

  /** Execute forwarding multiple messages to a target conversation */
  async forwardBulk(
    payloads: ForwardPayload[],
    targetConversationId: string,
    senderUserId: string,
    senderOrbitId: string,
  ) {
    const results = [];
    for (const payload of payloads) {
      const result = await MessageForward.forwardSingle(
        payload, targetConversationId, senderUserId, senderOrbitId,
      );
      results.push(result);
    }
    return results;
  },

  /** Get preview label for a forwarded message */
  getForwardPreview(payload: ForwardPayload): string {
    if (payload.body) return `↪ ${payload.body.slice(0, 60)}`;
    const labels: Record<string, string> = {
      image: "↪ 📷 Photo",
      video: "↪ 🎬 Video",
      voice: "↪ 🎤 Voice message",
      file: "↪ 📎 File",
      location_static: "↪ 📍 Location",
      location_live: "↪ 📍 Live location",
      payment_request: "↪ 💳 Payment request",
      payment_receipt: "↪ 💳 Payment",
      call_audio: "↪ 📞 Audio call",
      call_video: "↪ 📹 Video call",
      call_missed: "↪ 📞 Missed call",
      call_declined: "↪ 📞 Declined call",
    };
    return labels[payload.mode] || "↪ Forwarded message";
  },
};
