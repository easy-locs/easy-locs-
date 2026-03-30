/**
 * executeSendVoice — Strict pipeline: intent → canonical → transport
 */
import type { SendVoiceCommand } from "../orbit-commands";
import type { ResolvedContext, ExecutorResult } from "./pipeline-types";
import { createTrace, enterPhase, exitPhase, completeExecutorTrace, failExecutorTrace } from "./pipeline-types";

export async function executeSendVoice(
  ctx: ResolvedContext,
  cmd: SendVoiceCommand,
): Promise<ExecutorResult> {
  const trace = createTrace("sendVoice");

  try {
    enterPhase(trace, "intent");
    if (!cmd.blob) return { ok: false, error: "no_blob", phase: "intent" };
    if (!ctx.conversationId) return { ok: false, error: "no_conversation", phase: "intent" };
    exitPhase(trace);

    enterPhase(trace, "canonical");
    const storagePath = `${cmd.pathPrefix}/${ctx.conversationId}/${Date.now()}.webm`;
    const mins = Math.floor(cmd.durationSeconds / 60);
    const secs = Math.round(cmd.durationSeconds % 60);
    const durationLabel = `${mins}:${secs.toString().padStart(2, "0")}`;
    exitPhase(trace);

    enterPhase(trace, "transport");
    const { sendVoiceOptimistic } = await import("@/families/send/send-voice-optimistic");
    await sendVoiceOptimistic(ctx, {
      blob: cmd.blob,
      localUrl: cmd.localUrl,
      durationSeconds: cmd.durationSeconds,
      durationLabel,
      uploadFn: cmd.uploadFn as any,
      storagePath,
    });
    exitPhase(trace);

    completeExecutorTrace(trace);
    return { ok: true };
  } catch (err: any) {
    failExecutorTrace(trace, err?.message || "unknown");
    return { ok: false, error: err?.message || "send_voice_failed", phase: trace.phases[trace.phases.length - 1]?.phase };
  }
}
