/**
 * send.text — Canonical text message send pipeline.
 */
import { insertMessage, updateConversationTimestamp } from "@/repositories/communication.repository";
import { platformBus } from "@/lib/shared/platform-bus";
import { buildTextMeta } from "@/families/messages/build-metadata";
import type { SendContext } from "./send-context";

export async function sendText(
  ctx: SendContext,
  body: string,
  opts?: {
    encrypted?: boolean;
    replyToMessageId?: string | null;
    category?: string;
    locale?: string;
    securityLevel?: string;
    disappearTTL?: string | null;
  },
) {
  const data = await insertMessage({
    conversationId: ctx.conversationId,
    senderUserId: ctx.senderUserId,
    senderOrbitId: ctx.senderOrbitId,
    receiverOrbitId: ctx.receiverOrbitId,
    type: "text",
    body,
    replyToMessageId: opts?.replyToMessageId,
    metadata: buildTextMeta(opts),
  });

  await updateConversationTimestamp(ctx.conversationId, body.slice(0, 120));

  platformBus.emit("orbit:message_sent", {
    conversationId: ctx.conversationId,
    type: "text",
  }, "orbit", { userId: ctx.senderUserId, orgId: ctx.orgId || undefined });

  return data;
}
