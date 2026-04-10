/**
 * send.text — Canonical text message send pipeline.
 * Instrumented with WhatsApp-grade timing.
 */
import { insertMessage, updateConversationTimestamp } from "@/repositories/communication.repository";
import { platformBus } from "@/lib/shared/platform-bus";
import { buildTextMeta } from "@/families/messages/build-metadata";
import { startTrace, markTrace, completeTrace, failTrace } from "@/lib/debug/send-timing";
import { broadcastInstantMessage } from "@/lib/realtime-broadcast";
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
    /** Trace ID from caller for end-to-end timing */
    _traceId?: string;
  },
) {
  const traceId = opts?._traceId || startTrace("text");
  markTrace(traceId, "t1_optimistic");

  try {
    let disappearAt: string | null = null;
    if (opts?.disappearTTL && opts.disappearTTL !== "off") {
      const { EphemeralPolicy } = await import("@/families/ephemeral/ephemeral-policy");
      disappearAt = EphemeralPolicy.computeDisappearAt(new Date(), opts.disappearTTL as any);
    }

    const data = await insertMessage({
      conversationId: ctx.conversationId,
      senderUserId: ctx.senderUserId,
      senderOrbitId: ctx.senderOrbitId,
      receiverOrbitId: ctx.receiverOrbitId,
      type: "text",
      body,
      replyToMessageId: opts?.replyToMessageId,
      metadata: buildTextMeta(opts),
      ...(disappearAt ? { disappear_at: disappearAt } : {}),
    });

    markTrace(traceId, "t2_db_insert");

    // Broadcast instantly for sub-50ms peer delivery
    broadcastInstantMessage(ctx.conversationId, {
      id: data.id,
      conversationId: ctx.conversationId,
      senderUserId: ctx.senderUserId,
      senderOrbitId: ctx.senderOrbitId,
      type: "text",
      body,
      metadata: data.metadata,
      createdAt: data.created_at,
      confirmed: true,
    });

    // Fire-and-forget: don't block send return for a timestamp update
    void updateConversationTimestamp(ctx.conversationId, body.slice(0, 120)).catch(() => {});

    platformBus.emit("orbit:message_sent", {
      conversationId: ctx.conversationId,
      type: "text",
    }, "orbit", { userId: ctx.senderUserId, orgId: ctx.orgId || undefined });

    completeTrace(traceId);
    return data;
  } catch (err: any) {
    failTrace(traceId, err?.message || "send failed");
    throw err;
  }
}
