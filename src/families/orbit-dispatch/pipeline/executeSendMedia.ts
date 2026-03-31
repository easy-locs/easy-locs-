/**
 * executeSendMedia — Strict pipeline: store-first instant insert, then DB+upload background.
 *
 * FLOW: intent → validate → local preview → store insert (INSTANT) → DB persist → upload → reconcile
 * The bubble appears at T0+0ms. Network happens after.
 */
import type { SendMediaCommand } from "../orbit-commands";
import type { ResolvedContext, ExecutorResult } from "./pipeline-types";
import { createTrace, enterPhase, exitPhase, completeExecutorTrace, failExecutorTrace } from "./pipeline-types";
import { useOrbitStore } from "@/domains/orbit/stores/orbit.store";
import {
  validateMediaInput,
  buildLocalAttachment,
  buildOptimisticMediaMessage,
  type SendMediaInput,
} from "@/domains/orbit/pipelines/message/send-media.pipeline";

export async function executeSendMedia(
  ctx: ResolvedContext,
  cmd: SendMediaCommand,
): Promise<ExecutorResult> {
  const trace = createTrace("sendMedia");

  try {
    // ── Phase 1: Intent validation ──
    enterPhase(trace, "intent");
    if (!cmd.file) return { ok: false, error: "no_file", phase: "intent" };
    if (!ctx.conversationId) return { ok: false, error: "no_conversation", phase: "intent" };
    exitPhase(trace);

    // ── Phase 2: Build local preview + optimistic message ──
    enterPhase(trace, "preview");
    const input: SendMediaInput = {
      conversationId: ctx.conversationId,
      senderId: ctx.senderUserId,
      senderOrbitId: ctx.senderOrbitId,
      file: cmd.file,
      caption: cmd.caption,
      viewOnce: cmd.viewOnce,
    };

    const validationError = validateMediaInput(input);
    if (validationError) return { ok: false, error: validationError, phase: "preview" };

    const previewUrl = cmd.file.type.startsWith("image/") || cmd.file.type.startsWith("video/")
      ? URL.createObjectURL(cmd.file)
      : null;
    const attachment = buildLocalAttachment(input, previewUrl);
    const optimistic = buildOptimisticMediaMessage(input, attachment);
    exitPhase(trace);

    // ── Phase 3: INSTANT STORE INSERT — bubble visible NOW ──
    enterPhase(trace, "instant_insert");
    const store = useOrbitStore.getState();
    store.mergeAttachment(attachment);
    store.mergeMessage(optimistic);
    const tempId = optimistic.tempId ?? optimistic.id;

    if (import.meta.env.DEV) {
      const { assertPreviewBeforeUpload, markLatencyEnd } = await import(
        "@/domains/orbit/pipelines/message/pipeline-assertions"
      );
      assertPreviewBeforeUpload({
        attachmentId: attachment.id,
        hasLocalUri: !!attachment.localUri,
        hasPreview: !!previewUrl,
        uploadStatus: attachment.uploadStatus,
      });
      markLatencyEnd("tap_to_preview");
      console.debug("[executeSendMedia] Optimistic media merged", {
        tempId, conversationId: ctx.conversationId,
        type: optimistic.type, attachmentKind: attachment.kind,
        attachmentId: attachment.id, hasPreview: !!previewUrl, fileSize: cmd.file.size,
      });
    }
    exitPhase(trace);

    // ── Phase 4: Background DB persist + upload (non-blocking) ──
    enterPhase(trace, "background_transport");
    // Fire-and-forget: DB + upload happen after bubble is visible
    void (async () => {
      try {
        const { sendMediaOptimistic } = await import("@/families/send/send-media-optimistic");
        await sendMediaOptimistic(ctx, {
          file: cmd.file,
          caption: cmd.caption,
          viewOnce: cmd.viewOnce,
          disappearAt: cmd.disappearAt,
          uploadFn: cmd.uploadFn,
          pathPrefix: cmd.pathPrefix,
        }, {
          onOptimisticCreated: (serverId) => {
            // Reconcile store: tempId → serverId
            if (serverId !== tempId) {
              store.reconcileMessage(tempId, { ...optimistic, id: serverId, status: "sent" });
              store.updateAttachmentUpload(attachment.id, { messageId: serverId });
            } else {
              store.updateMessageStatus(tempId, "sent");
            }
          },
          onUploadProgress: (_uploadId, progress) => {
            store.updateAttachmentUpload(attachment.id, { uploadProgress: progress });
          },
          onCompleted: (messageId, remoteUrl) => {
            store.updateAttachmentUpload(attachment.id, {
              remoteUrl,
              uploadStatus: "uploaded",
              uploadProgress: 100,
            });
            store.updateMessageStatus(messageId, "sent");
          },
          onFailed: (_uploadId, error) => {
            store.updateAttachmentUpload(attachment.id, { uploadStatus: "failed" });
            store.updateMessageStatus(tempId, "failed" as any);
          },
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
    return { ok: false, error: err?.message || "send_media_failed", phase: trace.phases[trace.phases.length - 1]?.phase };
  }
}
