/**
 * executeSendVoice — Strict pipeline: store-first instant insert, then DB+upload background.
 *
 * FLOW: intent → validate → local preview → store insert (INSTANT) → DB persist → upload → reconcile
 * The voice bubble appears at T0+0ms. Network happens after.
 */
import type { SendVoiceCommand } from "../orbit-commands";
import type { ResolvedContext, ExecutorResult } from "./pipeline-types";
import { createTrace, enterPhase, exitPhase, completeExecutorTrace, failExecutorTrace } from "./pipeline-types";
import { useOrbitStore } from "@/domains/orbit/stores/orbit.store";
import {
  validateVoiceInput,
  buildLocalVoiceAttachment,
  buildOptimisticVoiceMessage,
  type SendVoiceInput,
} from "@/domains/orbit/pipelines/message/send-voice.pipeline";

export async function executeSendVoice(
  ctx: ResolvedContext,
  cmd: SendVoiceCommand,
): Promise<ExecutorResult> {
  const trace = createTrace("sendVoice");

  try {
    // ── Phase 1: Intent validation ──
    enterPhase(trace, "intent");
    if (!cmd.blob) return { ok: false, error: "no_blob", phase: "intent" };
    if (!ctx.conversationId) return { ok: false, error: "no_conversation", phase: "intent" };
    exitPhase(trace);

    // ── Phase 2: Build local voice attachment + optimistic message ──
    enterPhase(trace, "preview");
    const input: SendVoiceInput = {
      conversationId: ctx.conversationId,
      senderId: ctx.senderUserId,
      senderOrbitId: ctx.senderOrbitId,
      blob: cmd.blob,
      durationSeconds: cmd.durationSeconds,
      localUrl: cmd.localUrl,
    };

    const validationError = validateVoiceInput(input);
    if (validationError) return { ok: false, error: validationError, phase: "preview" };

    const attachment = buildLocalVoiceAttachment(input);
    const optimistic = buildOptimisticVoiceMessage(input, attachment);
    exitPhase(trace);

    // ── Phase 3: INSTANT STORE INSERT — voice bubble visible NOW ──
    enterPhase(trace, "instant_insert");
    const store = useOrbitStore.getState();
    store.mergeAttachment(attachment);
    store.mergeMessage(optimistic);
    const tempId = optimistic.tempId ?? optimistic.id;

    if (import.meta.env.DEV) {
      const { assertPreviewBeforeUpload } = await import(
        "@/domains/orbit/pipelines/message/pipeline-assertions"
      );
      assertPreviewBeforeUpload({
        attachmentId: attachment.id,
        hasLocalUri: !!attachment.localUri,
        hasPreview: !!attachment.previewDataUrl,
        uploadStatus: attachment.uploadStatus,
      });
      console.debug("[executeSendVoice] Optimistic voice merged", {
        tempId, conversationId: ctx.conversationId,
        type: optimistic.type, duration: cmd.durationSeconds,
      });
    }
    exitPhase(trace);

    // ── Phase 4: Background DB persist + upload (non-blocking) ──
    enterPhase(trace, "background_transport");
    const storagePath = `${cmd.pathPrefix}/${ctx.conversationId}/${Date.now()}.webm`;
    const mins = Math.floor(cmd.durationSeconds / 60);
    const secs = Math.round(cmd.durationSeconds % 60);
    const durationLabel = `${mins}:${secs.toString().padStart(2, "0")}`;

    void (async () => {
      try {
        const { sendVoiceOptimistic } = await import("@/families/send/send-voice-optimistic");
        await sendVoiceOptimistic(ctx, {
          blob: cmd.blob,
          localUrl: cmd.localUrl,
          durationSeconds: cmd.durationSeconds,
          durationLabel,
          uploadFn: cmd.uploadFn as any,
          storagePath,
        });
        // Reconcile: mark as sent after DB+upload succeed
        store.updateMessageStatus(tempId, "sent");
        store.updateAttachmentUpload(attachment.id, {
          uploadStatus: "uploaded",
          uploadProgress: 100,
        });
      } catch (err) {
        store.updateMessageStatus(tempId, "failed" as any);
        store.updateAttachmentUpload(attachment.id, { uploadStatus: "failed" });
      }
    })();
    exitPhase(trace);

    completeExecutorTrace(trace);
    return { ok: true, messageId: tempId };
  } catch (err: any) {
    failExecutorTrace(trace, err?.message || "unknown");
    return { ok: false, error: err?.message || "send_voice_failed", phase: trace.phases[trace.phases.length - 1]?.phase };
  }
}
