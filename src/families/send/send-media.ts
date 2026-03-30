/**
 * send.media — Canonical media (image/video/file) send pipeline.
 * Now writes schemaVersion: 1 canonical metadata.
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
  const kind = (opts.mediaKind || "image") as "image" | "video" | "voice" | "audio" | "file";

  const data = await insertMessage({
    conversationId: ctx.conversationId,
    senderUserId: ctx.senderUserId,
    senderOrbitId: ctx.senderOrbitId,
    receiverOrbitId: ctx.receiverOrbitId,
    type: "media",
    body: preview,
    metadata: {
      schemaVersion: 1,
      ui: {
        cardType: kind === "voice" ? "voice" : "media",
        clickable: true,
        primaryAction: "open_media",
      },
      media: {
        kind,
        url: opts.mediaUrl,
        viewOnce: opts.viewOnce ?? false,
        ...(opts.attachments ? { attachments: opts.attachments } : {}),
      },
      transport: { source: "ui" as const },
    },
  });

  await updateConversationTimestamp(ctx.conversationId, preview);

  platformBus.emit("orbit:message_sent", {
    conversationId: ctx.conversationId,
    type: "media",
  }, "orbit", { userId: ctx.senderUserId, orgId: ctx.orgId || undefined });

  return data;
}
