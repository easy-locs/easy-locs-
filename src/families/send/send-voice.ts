/**
 * send.voice — Canonical voice message send pipeline.
 */
import { insertMessage, updateConversationTimestamp } from "@/repositories/communication.repository";
import { platformBus } from "@/lib/shared/platform-bus";
import type { SendContext } from "./send-context";

export async function sendVoice(
  ctx: SendContext,
  audioUrl: string,
  durationSeconds: number,
  durationLabel: string,
) {
  const body = `🎤 Voice message (${durationLabel})`;

  const data = await insertMessage({
    conversationId: ctx.conversationId,
    senderUserId: ctx.senderUserId,
    senderOrbitId: ctx.senderOrbitId,
    receiverOrbitId: ctx.receiverOrbitId,
    type: "voice",
    body,
    metadata: {
      audio_url: audioUrl,
      audio_duration_seconds: durationSeconds,
      transcript_status: "pending",
    },
  });

  await updateConversationTimestamp(ctx.conversationId, body);

  platformBus.emit("orbit:message_sent", {
    threadId: ctx.threadId,
    conversationId: ctx.conversationId,
    type: "voice",
  }, "orbit", { userId: ctx.senderUserId, orgId: ctx.orgId || undefined });

  return data;
}
