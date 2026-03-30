/**
 * executeSendLocation — Strict pipeline: intent → transport
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
    enterPhase(trace, "intent");
    if (cmd.lat == null || cmd.lng == null) return { ok: false, error: "no_coordinates", phase: "intent" };
    if (!ctx.conversationId) return { ok: false, error: "no_conversation", phase: "intent" };
    exitPhase(trace);

    enterPhase(trace, "transport");
    const { sendLocationOptimistic } = await import("@/families/send/send-location-optimistic");
    await sendLocationOptimistic(ctx, {
      lat: cmd.lat,
      lng: cmd.lng,
      type: cmd.mode,
      label: cmd.label,
      address: cmd.address,
    });
    exitPhase(trace);

    completeExecutorTrace(trace);
    return { ok: true };
  } catch (err: any) {
    failExecutorTrace(trace, err?.message || "unknown");
    return { ok: false, error: err?.message || "send_location_failed", phase: trace.phases[trace.phases.length - 1]?.phase };
  }
}
