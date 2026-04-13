/**
 * broadcast.send — Canonical broadcast fan-out send pipeline.
 * Sends one message to many recipients as separate private deliveries.
 */
import { orbitDispatch } from "@/families/orbit-dispatch/orbit-dispatch";
import { getOrCreateCanonicalDirectConversation } from "@/families/threads";

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
        const conversationId = conv?.conversationId;
        if (!conversationId) throw new Error("Could not resolve conversation");

        await orbitDispatch({ type: "send_text", conversationId, body, category: opts?.category || "broadcast" });
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
