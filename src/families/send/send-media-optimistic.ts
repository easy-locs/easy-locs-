/**
 * send-media-optimistic — Optimistic media send pipeline.
 * 1. Creates local preview + optimistic message shell immediately
 * 2. Uploads in background
 * 3. Reconciles optimistic → confirmed on completion
 * 4. Supports retry on failure
 */
import { MediaUpload, useMediaUploadQueue } from "@/families/media/media-upload";
import { insertMessage, updateConversationTimestamp, updateMessageFields } from "@/repositories/communication.repository";
import { platformBus } from "@/lib/shared/platform-bus";
import { buildMediaMeta } from "@/families/messages/build-metadata";
import type { SendContext } from "./send-context";

export interface OptimisticMediaPayload {
  file: File;
  caption?: string;
  viewOnce?: boolean;
  disappearAt?: string | null;
  /** Storage upload function injected from hook layer */
  uploadFn: (file: File, path: string, onProgress: (p: number) => void) => Promise<string>;
  /** Path prefix for storage */
  pathPrefix: string;
}

/**
 * Execute the full optimistic media send pipeline:
 * - Instant local preview
 * - Optimistic DB message with local URL
 * - Background upload
 * - Reconcile message with remote URL
 */
export async function sendMediaOptimistic(
  ctx: SendContext,
  payload: OptimisticMediaPayload,
  callbacks?: {
    onOptimisticCreated?: (optimisticId: string, localPreviewUrl: string) => void;
    onUploadProgress?: (uploadId: string, progress: number) => void;
    onCompleted?: (messageId: string, remoteUrl: string) => void;
    onFailed?: (uploadId: string, error: string) => void;
  },
): Promise<void> {
  const queue = useMediaUploadQueue.getState();
  const uploadId = MediaUpload.generateId();
  const mediaKind = MediaUpload.detectMediaKind(payload.file);
  const localPreviewUrl = URL.createObjectURL(payload.file);

  // Step 1: Generate thumbnail for video
  let thumbnailUrl: string | undefined;
  let duration: number | undefined;
  if (mediaKind === "video") {
    queue.enqueue({
      id: uploadId,
      file: payload.file,
      localPreviewUrl,
      mediaKind,
      fileSize: payload.file.size,
      conversationId: ctx.conversationId,
    });
    queue.updateStatus(uploadId, "preparing");

    const [thumb, dur] = await Promise.all([
      MediaUpload.generateVideoThumbnail(payload.file),
      MediaUpload.getVideoDuration(payload.file),
    ]);
    thumbnailUrl = thumb || undefined;
    duration = dur;
    if (thumbnailUrl) queue.setThumbnail(uploadId, thumbnailUrl);
  } else {
    queue.enqueue({
      id: uploadId,
      file: payload.file,
      localPreviewUrl,
      thumbnailUrl: mediaKind === "image" ? localPreviewUrl : undefined,
      mediaKind,
      fileSize: payload.file.size,
      conversationId: ctx.conversationId,
    });
  }

  // Step 2: Create optimistic message in DB immediately with local preview
  const preview = payload.caption || (payload.viewOnce ? "📷 View-once" : mediaKind === "video" ? "🎬 Video" : "📎 Attachment");

  let messageData: any;
  try {
    messageData = await insertMessage({
      conversationId: ctx.conversationId,
      senderUserId: ctx.senderUserId,
      senderOrbitId: ctx.senderOrbitId,
      receiverOrbitId: ctx.receiverOrbitId,
      type: "media",
      body: preview,
      metadata: {
        schemaVersion: 1,
        ui: {
          cardType: mediaKind === "audio" ? "voice" : "media",
          clickable: true,
          primaryAction: "open_media",
        },
        media: {
          kind: mediaKind as any,
          url: localPreviewUrl,
          mimeType: payload.file.type,
          fileName: payload.file.name,
          fileSize: payload.file.size,
          durationSeconds: duration ?? null,
          viewOnce: payload.viewOnce ?? false,
          transcriptionStatus: "none",
        },
        transport: {
          optimisticId: uploadId,
          source: "ui",
          dedupeKey: `media_${uploadId}`,
        },
      },
    });

    queue.bindOptimisticId(uploadId, messageData.id);
    callbacks?.onOptimisticCreated?.(messageData.id, localPreviewUrl);

    // Update conversation timestamp immediately
    await updateConversationTimestamp(ctx.conversationId, preview);

    platformBus.emit("orbit:message_sent", {
      conversationId: ctx.conversationId,
      type: "media",
      optimistic: true,
    }, "orbit", { userId: ctx.senderUserId, orgId: ctx.orgId || undefined });
  } catch (err: any) {
    queue.markFailed(uploadId, err?.message || "Failed to create message");
    callbacks?.onFailed?.(uploadId, err?.message || "Failed to create message");
    return;
  }

  // Step 3: Background upload
  queue.updateStatus(uploadId, "uploading");
  try {
    const ext = payload.file.name.split(".").pop() || "bin";
    const storagePath = `${payload.pathPrefix}/${ctx.conversationId}/${uploadId}.${ext}`;

    const remoteUrl = await payload.uploadFn(
      payload.file,
      storagePath,
      (progress) => {
        queue.updateProgress(uploadId, progress);
        callbacks?.onUploadProgress?.(uploadId, progress);
      },
    );

    // Step 4: Reconcile — update message with remote URL
    queue.updateStatus(uploadId, "processing");
    const existingMeta = (messageData as any).metadata || {};
    await updateMessageFields(messageData.id, {
      metadata: {
        ...existingMeta,
        media: {
          ...(existingMeta.media || {}),
          url: remoteUrl,
        },
        transport: {
          ...(existingMeta.transport || {}),
          optimisticId: uploadId,
          source: "ui",
        },
      },
    });

    queue.markCompleted(uploadId, remoteUrl);
    callbacks?.onCompleted?.(messageData.id, remoteUrl);

    platformBus.emit("orbit:media_upload_completed", {
      messageId: messageData.id,
      uploadId,
      remoteUrl,
      conversationId: ctx.conversationId,
    }, "orbit", { userId: ctx.senderUserId });
  } catch (err: any) {
    // Mark both queue and message as failed
    queue.markFailed(uploadId, err?.message || "Upload failed");

    try {
      await updateMessageFields(messageData.id, {
        metadata: {
          ...((messageData as any).metadata || {}),
          upload_status: "failed",
          upload_error: err?.message,
        },
      });
    } catch {
      // Best effort
    }

    callbacks?.onFailed?.(uploadId, err?.message || "Upload failed");
  }
}

/**
 * Retry a failed media upload.
 */
export async function retryMediaUpload(
  uploadId: string,
  ctx: SendContext,
  uploadFn: (file: File, path: string, onProgress: (p: number) => void) => Promise<string>,
  pathPrefix: string,
): Promise<void> {
  const queue = useMediaUploadQueue.getState();
  const item = queue.items.find((i) => i.id === uploadId);
  if (!item || !item.optimisticMessageId) return;

  queue.retry(uploadId);

  try {
    const ext = item.file.name.split(".").pop() || "bin";
    const storagePath = `${pathPrefix}/${ctx.conversationId}/${uploadId}.${ext}`;

    const remoteUrl = await uploadFn(item.file, storagePath, (progress) => {
      queue.updateProgress(uploadId, progress);
    });

    queue.updateStatus(uploadId, "processing");
    await updateMessageFields(item.optimisticMessageId, {
      metadata: {
        url: remoteUrl,
        thumbnail_url: item.thumbnailUrl || (item.mediaKind === "image" ? remoteUrl : null),
        upload_status: "completed",
        upload_id: uploadId,
        media_kind: item.mediaKind,
        has_attachments: true,
        file_size: item.fileSize,
        file_name: item.file.name,
        mime_type: item.file.type,
        duration: item.duration,
      },
    });

    queue.markCompleted(uploadId, remoteUrl);

    platformBus.emit("orbit:media_upload_completed", {
      messageId: item.optimisticMessageId,
      uploadId,
      remoteUrl,
      conversationId: ctx.conversationId,
    }, "orbit", { userId: ctx.senderUserId });
  } catch (err: any) {
    queue.markFailed(uploadId, err?.message || "Retry failed");
  }
}
