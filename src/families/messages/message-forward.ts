/**
 * message.forward — Canonical message forwarding family.
 * Handles: single forward, bulk forward, payload building, target picking, execution.
 */
import { insertMessage, updateConversationTimestamp } from "@/repositories/communication.repository";
import { platformBus } from "@/lib/shared/platform-bus";
import { resolveMessageMode } from "./message-mode";
import type { MessageMode } from "./message-mode";

export interface ForwardPayload {
  originalMessageId: string;
  originalSenderId: string;
  originalTimestamp: string;
  mode: MessageMode;
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

    const data = await insertMessage({
      conversationId: targetConversationId,
      senderUserId,
      senderOrbitId,
      type: payload.mode === "voice" ? "voice" : payload.mode === "media" || payload.mode === "grouped_media" ? "media" : "text",
      body: preview,
      metadata: payload.metadata,
    });

    await updateConversationTimestamp(targetConversationId, preview);

    platformBus.emit("orbit:message_sent", {
      conversationId: targetConversationId,
      type: "forward",
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
    const labels: Partial<Record<MessageMode, string>> = {
      media: "↪ 📷 Photo",
      grouped_media: "↪ 📷 Album",
      voice: "↪ 🎤 Voice message",
      static_location: "↪ 📍 Location",
      live_location: "↪ 📍 Live location",
      payment: "↪ 💳 Payment",
    };
    return labels[payload.mode] || "↪ Forwarded message";
  },
};
