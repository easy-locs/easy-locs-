/**
 * executeEndCall — Strict pipeline: intent → canonical → optimistic → transport → reconcile
 */
import type { EndCallCommand } from "../orbit-commands";
import type { ExecutorResult } from "./pipeline-types";
import { createTrace, enterPhase, exitPhase, completeExecutorTrace, failExecutorTrace } from "./pipeline-types";

export async function executeEndCall(
  cmd: EndCallCommand,
): Promise<ExecutorResult> {
  const trace = createTrace("endCall");

  try {
    // ── Phase 1: Intent ──
    enterPhase(trace, "intent");
    if (!cmd.sessionId) return { ok: false, error: "no_session", phase: "intent" };
    exitPhase(trace);

    // ── Phase 2: Transport ──
    enterPhase(trace, "transport");
    const reason = cmd.reason || "hangup";
    const { hangupCallSession } = await import("@/repositories/communication.repository");
    await hangupCallSession(cmd.sessionId, reason);
    exitPhase(trace);

    completeExecutorTrace(trace);
    return { ok: true, sessionId: cmd.sessionId };
  } catch (err: any) {
    failExecutorTrace(trace, err?.message || "unknown");
    return { ok: false, error: err?.message || "end_call_failed", phase: trace.phases[trace.phases.length - 1]?.phase };
  }
}
