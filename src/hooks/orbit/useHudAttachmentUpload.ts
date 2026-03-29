/**
 * useHudAttachmentUpload — Optimistic media send pipeline.
 * Files are sent as optimistic messages immediately, uploaded in background.
 */
import { useCallback } from "react";
import { sendMediaOptimistic } from "@/families/send/send-media-optimistic";
import type { SendContext } from "@/families/send/send-context";
import { toast } from "sonner";

interface AttachmentItem {
  localId: string;
  file: File;
  kind: string;
  status: string;
  uploadedUrl?: string;
}

interface Deps {
  queue: AttachmentItem[];
  setItemProgress: (id: string, progress: number) => void;
  markUploaded: (id: string, url: string) => void;
  markFailed: (id: string, err: string) => void;
  clearQueue: () => void;
  uploadSingleFile: (opts: { file: File; pathPrefix: string; onProgress: (p: number) => void }) => Promise<{ publicUrl: string }>;
  sendAttachments: (opts: { attachments: any[]; body: string; viewOnce: boolean }) => Promise<void>;
  sendingAttachments: boolean;
  viewOnceEnabled: boolean;
  setViewOnceEnabled: (v: boolean) => void;
  /** Send context for optimistic pipeline */
  sendContext?: SendContext | null;
  pathPrefix?: string;
}

export function useHudAttachmentUpload(deps: Deps) {
  const handleUploadAndSendAttachments = useCallback(async () => {
    // If we have a send context, use the optimistic pipeline
    if (deps.sendContext) {
      const promises = deps.queue.map(async (item) => {
        if (item.status === "uploaded" && item.uploadedUrl) {
          // Already uploaded — use legacy send path
          return { item, uploaded: true };
        }
        try {
          await sendMediaOptimistic(deps.sendContext!, {
            file: item.file,
            caption: "",
            viewOnce: deps.viewOnceEnabled,
            uploadFn: async (file, path, onProgress) => {
              const result = await deps.uploadSingleFile({
                file,
                pathPrefix: deps.pathPrefix || "orbit-media",
                onProgress,
              });
              return result.publicUrl;
            },
            pathPrefix: deps.pathPrefix || "orbit-media",
          });
          return { item, uploaded: true };
        } catch (err: any) {
          deps.markFailed(item.localId, err?.message || "Upload failed");
          return { item, uploaded: false };
        }
      });

      const results = await Promise.allSettled(promises);
      const succeeded = results.filter(
        (r) => r.status === "fulfilled" && r.value?.uploaded,
      ).length;

      if (succeeded > 0) {
        deps.clearQueue();
        deps.setViewOnceEnabled(false);
      } else {
        toast.error("No files sent successfully");
      }
      return;
    }

    // Fallback: legacy sequential upload → send
    const uploadedItems: Array<{ localId: string; file: File; kind: string; url: string }> = [];

    for (const item of deps.queue) {
      if (item.status === "uploaded" && item.uploadedUrl) {
        uploadedItems.push({ localId: item.localId, file: item.file, kind: item.kind, url: item.uploadedUrl });
        continue;
      }
      try {
        deps.setItemProgress(item.localId, 15);
        const uploaded = await deps.uploadSingleFile({
          file: item.file,
          pathPrefix: "orbit-media",
          onProgress: (progress) => deps.setItemProgress(item.localId, progress),
        });
        deps.markUploaded(item.localId, uploaded.publicUrl);
        uploadedItems.push({ localId: item.localId, file: item.file, kind: item.kind, url: uploaded.publicUrl });
      } catch (err: any) {
        deps.markFailed(item.localId, err?.message || "Upload failed");
      }
    }

    if (!uploadedItems.length) {
      toast.error("No files uploaded successfully");
      return;
    }

    const atts = uploadedItems.map((x) => ({
      id: x.localId,
      kind: x.kind as any,
      name: x.file.name,
      mimeType: x.file.type,
      sizeBytes: x.file.size,
      url: x.url,
      thumbnailUrl: null,
      viewOnce: deps.viewOnceEnabled,
    }));

    await deps.sendAttachments({ attachments: atts, body: "", viewOnce: deps.viewOnceEnabled });
    deps.clearQueue();
    deps.setViewOnceEnabled(false);
  }, [deps]);

  return { handleUploadAndSendAttachments };
}
