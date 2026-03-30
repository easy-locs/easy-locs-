/**
 * executeSendLocation — Strict pipeline: intent → canonical → optimistic → transport → reconcile
 */
import type { SendLocationCommand } from "../orbit-commands";
import type { ResolvedContext, ExecutorResult } from "./pipeline-types";
import { createTrace, enterPhase, exitPhase, completeExecutorTrace, failExecutorTrace } from "./pipeline-types";

export async function executeSendLocation(
  ctx: ResolvedContext,
  cmd: SendLocationCommand,
): Promise<ExecutorResult> {
  const trace = createTrace("sendLocation");

  try {
    // ── Phase 1: Intent ──
    enterPhase(trace, "intent");
    if (cmd.lat == null || cmd.lng == null) return { ok: false, error: "no_coordinates", phase: "intent" };
    if (!ctx.conversationId) return { ok: false, error: "no_conversation", phase: "intent" };
    exitPhase(trace);

    // ── Phase 2: Canonical ──
    enterPhase(trace, "canonical");
    // Location canonical form is built inside sendLocationOptimistic via buildLocationMeta
    exitPhase(trace);

    // ── Phase 3–5: Delegate to optimistic pipeline ──
    enterPhase(trace, "optimistic");
    const { sendLocationOptimistic } = await import("@/families/send/send-location-optimistic");
    await sendLocationOptimistic(ctx, {
      lat: cmd.lat,
      lng: cmd.lng,
      type: cmd.mode,
      label: cmd.label,
      address: cmd.address,
    });
    exitPhase(trace);

    enterPhase(trace, "transport");
    exitPhase(trace);
    enterPhase(trace, "reconcile");
    exitPhase(trace);

    completeExecutorTrace(trace);
    return { ok: true };
  } catch (err: any) {
    failExecutorTrace(trace, err?.message || "unknown");
    return { ok: false, error: err?.message || "send_location_failed", phase: trace.phases[trace.phases.length - 1]?.phase };
  }
}
