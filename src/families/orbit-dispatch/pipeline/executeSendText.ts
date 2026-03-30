/**
 * executeSendText — Strict pipeline: intent → canonical → optimistic → transport → reconcile
 */
import type { SendTextCommand } from "../orbit-commands";
import type { ResolvedContext, ExecutorResult } from "./pipeline-types";
import { createTrace, enterPhase, exitPhase, completeExecutorTrace, failExecutorTrace } from "./pipeline-types";

export async function executeSendText(
  ctx: ResolvedContext,
  cmd: SendTextCommand,
): Promise<ExecutorResult> {
  const trace = createTrace("sendText");

  try {
    // ── Phase 1: Intent ──
    enterPhase(trace, "intent");
    const body = cmd.body?.trim();
    if (!body) return { ok: false, error: "empty_body", phase: "intent" };
    if (!ctx.conversationId) return { ok: false, error: "no_conversation", phase: "intent" };
    exitPhase(trace);

    // ── Phase 2: Canonical ──
    enterPhase(trace, "canonical");
    const { buildTextMeta } = await import("@/families/messages/build-metadata");
    const metadata = buildTextMeta({
      encrypted: cmd.encrypted,
      category: cmd.category,
      locale: cmd.locale,
      securityLevel: cmd.securityLevel,
      disappearTTL: cmd.disappearTTL,
    });
    exitPhase(trace);

    // ── Phase 3: Optimistic ──
    // Text uses DB-first optimistic (insert is the optimistic step)
    enterPhase(trace, "optimistic");
    exitPhase(trace);

    // ── Phase 4: Transport ──
    enterPhase(trace, "transport");
    const { insertMessage, updateConversationTimestamp } = await import("@/repositories/communication.repository");
    const { broadcastInstantMessage } = await import("@/lib/realtime-broadcast");
    const { platformBus } = await import("@/lib/shared/platform-bus");

    const data = await insertMessage({
      conversationId: ctx.conversationId,
      senderUserId: ctx.senderUserId,
      senderOrbitId: ctx.senderOrbitId,
      receiverOrbitId: ctx.receiverOrbitId,
      type: "text",
      body,
      replyToMessageId: cmd.replyToMessageId,
      metadata,
    });

    // Sub-50ms peer broadcast
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
    exitPhase(trace);

    // ── Phase 5: Reconcile ──
    enterPhase(trace, "reconcile");
    // Fire-and-forget: timestamp + domain event
    void updateConversationTimestamp(ctx.conversationId, body.slice(0, 120)).catch(() => {});
    platformBus.emit("orbit:message_sent", {
      conversationId: ctx.conversationId,
      type: "text",
    }, "orbit", { userId: ctx.senderUserId, orgId: ctx.orgId || undefined });
    exitPhase(trace);

    completeExecutorTrace(trace);
    return { ok: true, messageId: data?.id };
  } catch (err: any) {
    failExecutorTrace(trace, err?.message || "unknown");
    return { ok: false, error: err?.message || "send_text_failed", phase: trace.phases[trace.phases.length - 1]?.phase };
  }
}
