/**
 * executeSendMedia — Strict pipeline: intent → canonical → optimistic → transport → reconcile
 */
import type { SendMediaCommand } from "../orbit-commands";
import type { ResolvedContext, ExecutorResult } from "./pipeline-types";
import { createTrace, enterPhase, exitPhase, completeExecutorTrace, failExecutorTrace } from "./pipeline-types";

export async function executeSendMedia(
  ctx: ResolvedContext,
  cmd: SendMediaCommand,
): Promise<ExecutorResult> {
  const trace = createTrace("sendMedia");

  try {
    // ── Phase 1: Intent ──
    enterPhase(trace, "intent");
    if (!cmd.file) return { ok: false, error: "no_file", phase: "intent" };
    if (!ctx.conversationId) return { ok: false, error: "no_conversation", phase: "intent" };
    exitPhase(trace);

    // ── Phase 2–5: Delegate to optimistic pipeline ──
    // sendMediaOptimistic already implements canonical→optimistic→transport→reconcile internally
    enterPhase(trace, "canonical");
    exitPhase(trace);

    enterPhase(trace, "optimistic");
    const { sendMediaOptimistic } = await import("@/families/send/send-media-optimistic");
    let resultId: string | undefined;

    await sendMediaOptimistic(ctx, {
      file: cmd.file,
      caption: cmd.caption,
      viewOnce: cmd.viewOnce,
      disappearAt: cmd.disappearAt,
      uploadFn: cmd.uploadFn,
      pathPrefix: cmd.pathPrefix,
    }, {
      onOptimisticCreated: (id) => { resultId = id; },
    });
    exitPhase(trace);

    // Transport + Reconcile handled inside sendMediaOptimistic
    enterPhase(trace, "transport");
    exitPhase(trace);
    enterPhase(trace, "reconcile");
    exitPhase(trace);

    completeExecutorTrace(trace);
    return { ok: true, messageId: resultId };
  } catch (err: any) {
    failExecutorTrace(trace, err?.message || "unknown");
    return { ok: false, error: err?.message || "send_media_failed", phase: trace.phases[trace.phases.length - 1]?.phase };
  }
}
