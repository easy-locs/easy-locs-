/**
 * executeEndCall — Strict pipeline: instant local state + async cleanup.
 *
 * FLOW: intent → callStore.endCall NOW → overlay closes NOW → transport async → cleanup
 * Hangup is instant. Network cleanup happens after.
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

    // ── Phase 2: INSTANT LOCAL STATE — overlay closes NOW ──
    enterPhase(trace, "instant_insert");
    const { useCallStore } = await import("@/stores/orbit/call.store");
    useCallStore.getState().endCall("ended");

    if (import.meta.env.DEV) {
      console.debug("[executeEndCall] Instant hangup", { sessionId: cmd.sessionId });
    }
    exitPhase(trace);

    // ── Phase 3: Background transport cleanup (non-blocking) ──
    enterPhase(trace, "background_transport");
    void (async () => {
      try {
        const reason = cmd.reason || "hangup";
        const { hangupCallSession } = await import("@/repositories/communication.repository");
        await hangupCallSession(cmd.sessionId, reason);
      } catch (err) {
        console.warn("[executeEndCall] Transport cleanup failed (call already ended locally)", err);
      }
    })();
    exitPhase(trace);

    completeExecutorTrace(trace);
    return { ok: true, sessionId: cmd.sessionId };
  } catch (err: any) {
    failExecutorTrace(trace, err?.message || "unknown");
    return { ok: false, error: err?.message || "end_call_failed", phase: trace.phases[trace.phases.length - 1]?.phase };
  }
}
