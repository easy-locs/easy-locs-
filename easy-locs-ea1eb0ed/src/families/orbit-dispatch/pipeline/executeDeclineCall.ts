/**
 * executeDeclineCall — Strict pipeline: intent → transport → reconcile
 */
import type { DeclineCallCommand } from "../orbit-commands";
import type { ExecutorResult } from "./pipeline-types";
import { createTrace, enterPhase, exitPhase, completeExecutorTrace, failExecutorTrace } from "./pipeline-types";

export async function executeDeclineCall(
  cmd: DeclineCallCommand,
): Promise<ExecutorResult> {
  const trace = createTrace("declineCall");

  try {
    enterPhase(trace, "intent");
    if (!cmd.sessionId) return { ok: false, error: "no_session", phase: "intent" };
    exitPhase(trace);

    enterPhase(trace, "transport");
    const { declineCallSession } = await import("@/repositories/communication.repository");
    await declineCallSession(cmd.sessionId);
    exitPhase(trace);

    completeExecutorTrace(trace);
    return { ok: true, sessionId: cmd.sessionId };
  } catch (err: any) {
    failExecutorTrace(trace, err?.message || "unknown");
    return { ok: false, error: err?.message || "decline_call_failed", phase: trace.phases[trace.phases.length - 1]?.phase };
  }
}
