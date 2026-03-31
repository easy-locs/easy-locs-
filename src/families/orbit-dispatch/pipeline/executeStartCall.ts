/**
 * executeStartCall — Strict pipeline: instant UI + optimistic store + transport async.
 *
 * FLOW: intent → callStore.startOutgoing NOW → call overlay NOW → transport async → reconcile
 * The call UI appears at T0+0ms. Network happens after.
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

    if (import.meta.env.DEV) {
      const { markLatencyStart } = await import("@/domains/orbit/pipelines/message/pipeline-assertions");
      markLatencyStart("tap_to_call_ui");
    }
    exitPhase(trace);

    // ── Phase 2: INSTANT STORE INSERT — call UI visible NOW ──
    enterPhase(trace, "instant_insert");
    const { useCallStore } = await import("@/stores/orbit/call.store");
    const callId = crypto.randomUUID();

    useCallStore.getState().startOutgoing({
      callId,
      conversationId: cmd.conversationId,
      peer: {
        userId: cmd.peerUserId,
        orbitId: cmd.peerOrbitId,
        name: cmd.peerName || "Contact",
        avatarUrl: cmd.peerAvatarUrl || null,
      },
      mode: cmd.mode,
    });

    if (import.meta.env.DEV) {
      const { markLatencyEnd } = await import("@/domains/orbit/pipelines/message/pipeline-assertions");
      markLatencyEnd("tap_to_call_ui");
      console.debug("[executeStartCall] Call UI immediate", { callId, mode: cmd.mode, peer: cmd.peerUserId });
    }
    exitPhase(trace);

    // ── Phase 3: Background transport (non-blocking) ──
    enterPhase(trace, "background_transport");
    void (async () => {
      try {
        const { createOutgoingCallSession } = await import("@/repositories/communication.repository");
        const session = await createOutgoingCallSession({
          conversationId: cmd.conversationId,
          callerOrbitId: ctx.senderOrbitId,
          receiverOrbitId: cmd.peerOrbitId || null,
          mode: cmd.mode,
        });

        if (import.meta.env.DEV) {
          console.debug("[executeStartCall] Transport complete", { sessionId: session?.id });
        }
      } catch (err) {
        console.warn("[executeStartCall] Transport failed, transitioning to failed", err);
        useCallStore.getState().transition("failed");
      }
    })();
    exitPhase(trace);

    completeExecutorTrace(trace);
    return { ok: true, sessionId: callId };
  } catch (err: any) {
    failExecutorTrace(trace, err?.message || "unknown");
    return { ok: false, error: err?.message || "start_call_failed", phase: trace.phases[trace.phases.length - 1]?.phase };
  }
}
