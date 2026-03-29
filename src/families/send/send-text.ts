/**
 * send.text — Canonical text message send pipeline.
 */
import { insertMessage, updateConversationTimestamp } from "@/repositories/communication.repository";
import { platformBus } from "@/lib/shared/platform-bus";
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
    metadata: {
      encrypted: opts?.encrypted ?? false,
      category: opts?.category || "general",
      locale: opts?.locale || "en",
      security_level: opts?.securityLevel || "normal",
      disappear_ttl: opts?.disappearTTL ?? null,
    },
  });

  await updateConversationTimestamp(ctx.conversationId, body.slice(0, 120));

  platformBus.emit("orbit:message_sent", {
    threadId: ctx.threadId,
    conversationId: ctx.conversationId,
    type: "text",
  }, "orbit", { userId: ctx.senderUserId, orgId: ctx.orgId || undefined });

  return data;
}
