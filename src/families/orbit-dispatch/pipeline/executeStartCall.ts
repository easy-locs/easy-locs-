/**
 * executeStartCall — Strict pipeline: intent → canonical → optimistic → transport → reconcile
 */
import type { StartCallCommand } from "../orbit-commands";
import type { ResolvedContext, ExecutorResult } from "./pipeline-types";
import { createTrace, enterPhase, exitPhase, completeExecutorTrace, failExecutorTrace } from "./pipeline-types";

export async function executeStartCall(
  ctx: ResolvedContext,
  cmd: StartCallCommand,
): Promise<ExecutorResult> {
  const trace = createTrace("startCall");

  try {
    // ── Phase 1: Intent ──
    enterPhase(trace, "intent");
    if (!cmd.peerUserId) return { ok: false, error: "no_peer", phase: "intent" };
    if (!cmd.mode) return { ok: false, error: "no_mode", phase: "intent" };
    exitPhase(trace);

    // ── Phase 2: Canonical ──
    enterPhase(trace, "canonical");
    const callerOrbitId = ctx.senderOrbitId;
    exitPhase(trace);

    // ── Phase 3: Optimistic ──
    enterPhase(trace, "optimistic");
    // Call UI state is updated locally-first by the call player
    exitPhase(trace);

    // ── Phase 4: Transport ──
    enterPhase(trace, "transport");
    const { createOutgoingCallSession } = await import("@/repositories/communication.repository");
    const session = await createOutgoingCallSession({
      conversationId: cmd.conversationId,
      callerOrbitId,
      receiverOrbitId: cmd.peerOrbitId || null,
      mode: cmd.mode,
    });
    exitPhase(trace);

    // ── Phase 5: Reconcile ──
    enterPhase(trace, "reconcile");
    // Session is created; realtime will propagate to peer
    exitPhase(trace);

    completeExecutorTrace(trace);
    return { ok: true, sessionId: session?.id };
  } catch (err: any) {
    failExecutorTrace(trace, err?.message || "unknown");
    return { ok: false, error: err?.message || "start_call_failed", phase: trace.phases[trace.phases.length - 1]?.phase };
  }
}
