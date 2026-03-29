/**
 * broadcast.send — Canonical broadcast fan-out send pipeline.
 * Sends one message to many recipients as separate private deliveries.
 */
import { sendText } from "@/families/send/send-text";
import { getOrCreateCanonicalDirectConversation } from "@/families/threads";
import type { SendContext } from "@/families/send/send-context";

export interface BroadcastDelivery {
  recipientId: string;
  success: boolean;
  error?: string;
}

export interface BroadcastResult {
  total: number;
  sent: number;
  failed: number;
  deliveries: BroadcastDelivery[];
}

export const BroadcastSend = {
  /** Fan-out send text to all recipients */
  async sendText(
    senderUserId: string,
    senderOrbitId: string,
    recipientIds: string[],
    body: string,
    opts?: { category?: string },
  ): Promise<BroadcastResult> {
    const deliveries: BroadcastDelivery[] = [];

    for (const recipientId of recipientIds) {
      try {
        const conv = await getOrCreateCanonicalDirectConversation(senderUserId, recipientId);
        const threadId = conv?.v2ConversationId || conv?.contextId;
        if (!threadId) throw new Error("Could not resolve thread");

        const ctx: SendContext = {
          conversationId: threadId,
          senderUserId,
          senderOrbitId,
        };

        await sendText(ctx, body, { category: opts?.category || "broadcast" });
        deliveries.push({ recipientId, success: true });
      } catch (err: any) {
        deliveries.push({ recipientId, success: false, error: err.message });
      }
    }

    return {
      total: recipientIds.length,
      sent: deliveries.filter((d) => d.success).length,
      failed: deliveries.filter((d) => !d.success).length,
      deliveries,
    };
  },
};
