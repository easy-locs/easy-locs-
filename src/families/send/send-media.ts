/**
 * send.media — Canonical media (image/video/file) send pipeline.
 */
import { insertMessage, updateConversationTimestamp } from "@/repositories/communication.repository";
import { platformBus } from "@/lib/shared/platform-bus";
import type { SendContext } from "./send-context";

export async function sendMedia(
  ctx: SendContext,
  opts: {
    mediaUrl: string;
    body?: string;
    viewOnce?: boolean;
    disappearAt?: string | null;
    mediaKind?: string;
    attachments?: any[];
  },
) {
  const preview = opts.body || (opts.viewOnce ? "📷 View-once photo" : "📎 Attachment");

  const data = await insertMessage({
    conversationId: ctx.conversationId,
    senderUserId: ctx.senderUserId,
    senderOrbitId: ctx.senderOrbitId,
    receiverOrbitId: ctx.receiverOrbitId,
    type: "media",
    body: preview,
    metadata: {
      url: opts.mediaUrl,
      view_once: opts.viewOnce ?? false,
      disappear_at: opts.disappearAt ?? null,
      media_kind: opts.mediaKind || "image",
      has_attachments: true,
      ...(opts.attachments ? { attachments: opts.attachments } : {}),
    },
  });

  await updateConversationTimestamp(ctx.conversationId, preview);

  platformBus.emit("orbit:message_sent", {
    threadId: ctx.threadId,
    conversationId: ctx.conversationId,
    type: "media",
  }, "orbit", { userId: ctx.senderUserId, orgId: ctx.orgId || undefined });

  return data;
}
