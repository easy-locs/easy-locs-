/**
 * executeSendMediaBatch — Canonical batch multi-media pipeline.
 * Strict pipeline: intent → batch creation → ordered optimistic+transport per item → reconcile → batch completion.
 * Each item is independent: a single failure does not block the rest.
 */
import type { SendMediaBatchCommand } from "../orbit-commands";
import type { ResolvedContext, ExecutorResult } from "./pipeline-types";
import { createTrace, enterPhase, exitPhase, completeExecutorTrace, failExecutorTrace } from "./pipeline-types";
import { useBatchStore } from "@/families/media/batch/batch-store";
import { platformBus } from "@/lib/shared/platform-bus";

export async function executeSendMediaBatch(
  ctx: ResolvedContext,
  cmd: SendMediaBatchCommand,
): Promise<ExecutorResult> {
  const trace = createTrace("sendMediaBatch");

  try {
    // ── Phase 1: Intent ──
    enterPhase(trace, "intent");
    if (!cmd.files?.length) return { ok: false, error: "no_files", phase: "intent" };
    if (!ctx.conversationId) return { ok: false, error: "no_conversation", phase: "intent" };
    exitPhase(trace);

    // ── Phase 2: Canonical — create batch record ──
    enterPhase(trace, "canonical");
    const store = useBatchStore.getState();
    const batchId = store.createBatch(ctx.conversationId, cmd.files, cmd.caption || "");
    const batch = store.getBatch(batchId);
    if (!batch) return { ok: false, error: "batch_creation_failed", phase: "canonical" };
    exitPhase(trace);

    // ── Phase 3-5: Optimistic + Transport + Reconcile per item (ordered) ──
    enterPhase(trace, "optimistic");
    const { sendMediaOptimistic } = await import("@/families/send/send-media-optimistic");

    let firstMessageId: string | undefined;
    let anyFailed = false;

    for (let i = 0; i < batch.items.length; i++) {
      const item = batch.items[i];
      // Check if batch was cancelled
      const currentBatch = useBatchStore.getState().getBatch(batchId);
      if (currentBatch?.status === "cancelled") break;

      const isFirstItem = i === 0;
      const caption = isFirstItem ? cmd.caption : undefined;

      store.updateItemStatus(batchId, item.itemId, "uploading");

      try {
        await sendMediaOptimistic(
          ctx,
          {
            file: item.file,
            caption,
            viewOnce: cmd.viewOnce,
            uploadFn: (file, path, onProgress) => {
              return cmd.uploadFn(file, path, (progress) => {
                store.updateItemProgress(batchId, item.itemId, progress);
                onProgress(progress);
              });
            },
            pathPrefix: cmd.pathPrefix,
          },
          {
            onOptimisticCreated: (id) => {
              store.setItemOptimisticId(batchId, item.itemId, id);
              if (isFirstItem) firstMessageId = id;
            },
            onCompleted: (messageId, remoteUrl) => {
              store.setItemRemoteUrl(batchId, item.itemId, remoteUrl);
            },
            onFailed: (_uploadId, error) => {
              store.setItemError(batchId, item.itemId, error);
              anyFailed = true;
            },
          },
        );
      } catch (err: any) {
        store.setItemError(batchId, item.itemId, err?.message || "Item send failed");
        anyFailed = true;
        // Continue with next item — don't break the batch
      }
    }

    exitPhase(trace);

    enterPhase(trace, "transport");
    exitPhase(trace);
    enterPhase(trace, "reconcile");
    store.recomputeBatchStatus(batchId);
    exitPhase(trace);

    // Emit batch completion event
    platformBus.emit("orbit:media_batch_completed", {
      batchId,
      conversationId: ctx.conversationId,
      totalCount: batch.items.length,
      anyFailed,
    }, "orbit", { userId: ctx.senderUserId });

    // Auto-cleanup completed batches after 30s
    const finalBatch = useBatchStore.getState().getBatch(batchId);
    if (finalBatch?.status === "completed") {
      setTimeout(() => {
        useBatchStore.getState().removeBatch(batchId);
      }, 30_000);
    }

    completeExecutorTrace(trace);
    return { ok: !anyFailed, messageId: firstMessageId, error: anyFailed ? "partial_batch_failure" : undefined };
  } catch (err: any) {
    failExecutorTrace(trace, err?.message || "unknown");
    return { ok: false, error: err?.message || "send_media_batch_failed", phase: trace.phases[trace.phases.length - 1]?.phase };
  }
}
