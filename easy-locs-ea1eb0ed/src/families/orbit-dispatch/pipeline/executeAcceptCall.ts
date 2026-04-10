/**
 * executeAcceptCall — Strict pipeline: intent → canonical → optimistic → transport → reconcile
 */
import type { AcceptCallCommand } from "../orbit-commands";
import type { ExecutorResult } from "./pipeline-types";
import { createTrace, enterPhase, exitPhase, completeExecutorTrace, failExecutorTrace } from "./pipeline-types";

export async function executeAcceptCall(
  cmd: AcceptCallCommand,
): Promise<ExecutorResult> {
  const trace = createTrace("acceptCall");

  try {
    // ── Phase 1: Intent ──
    enterPhase(trace, "intent");
    if (!cmd.sessionId) return { ok: false, error: "no_session", phase: "intent" };
    exitPhase(trace);

    // ── Phase 2: Transport ──
    enterPhase(trace, "transport");
    const { acceptCallSession } = await import("@/repositories/communication.repository");
    await acceptCallSession(cmd.sessionId);
    exitPhase(trace);

    completeExecutorTrace(trace);
    return { ok: true, sessionId: cmd.sessionId };
  } catch (err: any) {
    failExecutorTrace(trace, err?.message || "unknown");
    return { ok: false, error: err?.message || "accept_call_failed", phase: trace.phases[trace.phases.length - 1]?.phase };
  }
}
