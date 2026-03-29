/**
 * send.system-event — Canonical system event message pipeline.
 * Covers: call events, delete events, forward events, admin notices.
 */
import { insertMessage, updateConversationTimestamp } from "@/repositories/communication.repository";
import type { SendContext } from "./send-context";

export async function sendSystemEvent(
  ctx: SendContext,
  eventType: string,
  body: string,
  metadata?: Record<string, unknown>,
) {
  const data = await insertMessage({
    conversationId: ctx.conversationId,
    senderUserId: ctx.senderUserId,
    senderOrbitId: ctx.senderOrbitId,
    receiverOrbitId: ctx.receiverOrbitId,
    type: "system",
    body,
    metadata: { event_type: eventType, ...metadata },
  });

  await updateConversationTimestamp(ctx.conversationId, body.slice(0, 120));

  return data;
}
