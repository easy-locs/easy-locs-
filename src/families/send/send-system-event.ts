/**
 * send.system-event — Canonical system event message pipeline.
 */
import { insertMessage, updateConversationTimestamp } from "@/repositories/communication.repository";
import { buildSystemMeta, buildCallMeta } from "@/families/messages/build-metadata";
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
    type: "system_notice",
    body,
    metadata: buildSystemMeta(eventType, metadata as any),
  });

  await updateConversationTimestamp(ctx.conversationId, body.slice(0, 120));
  return data;
}

/** Specialized: send a call event as a canonical call message */
export async function sendCallEvent(
  ctx: SendContext,
  mode: "audio" | "video",
  status: "ended" | "missed" | "declined",
  opts?: {
    callId?: string;
    direction?: "incoming" | "outgoing";
    durationSeconds?: number;
    peerOrbitId?: string;
    startedAt?: string;
    endedAt?: string;
  },
) {
  const typeMap = {
    ended: mode === "video" ? "call_video" : "call_audio",
    missed: "call_missed",
    declined: "call_declined",
  } as const;

  const labels = {
    ended: `${mode === "video" ? "Video" : "Audio"} call`,
    missed: "Missed call",
    declined: "Declined call",
  };

  const data = await insertMessage({
    conversationId: ctx.conversationId,
    senderUserId: ctx.senderUserId,
    senderOrbitId: ctx.senderOrbitId,
    receiverOrbitId: ctx.receiverOrbitId,
    type: typeMap[status],
    body: labels[status],
    metadata: buildCallMeta(mode, status, opts),
  });

  await updateConversationTimestamp(ctx.conversationId, labels[status]);
  return data;
}
