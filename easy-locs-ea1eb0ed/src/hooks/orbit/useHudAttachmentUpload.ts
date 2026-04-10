/**
 * useHudAttachmentUpload — Optimistic media send pipeline.
 * Files are sent as optimistic messages immediately, uploaded in background.
 */
import { useCallback, useRef } from "react";
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
  const depsRef = useRef(deps);
  depsRef.current = deps;

  const handleUploadAndSendAttachments = useCallback(async () => {
    const d = depsRef.current;
    if (d.sendContext) {
      const promises = d.queue.map(async (item) => {
        if (item.status === "uploaded" && item.uploadedUrl) {
          return { item, uploaded: true };
        }
        try {
          await sendMediaOptimistic(d.sendContext!, {
            file: item.file,
            caption: "",
            viewOnce: d.viewOnceEnabled,
            uploadFn: async (file, path, onProgress) => {
              const result = await d.uploadSingleFile({
                file,
                pathPrefix: d.pathPrefix || "orbit-media",
                onProgress,
              });
              return result.publicUrl;
            },
            pathPrefix: d.pathPrefix || "orbit-media",
          });
          return { item, uploaded: true };
        } catch (err: any) {
          d.markFailed(item.localId, err?.message || "Upload failed");
          return { item, uploaded: false };
        }
      });

      const results = await Promise.allSettled(promises);
      const succeeded = results.filter(
        (r) => r.status === "fulfilled" && r.value?.uploaded,
      ).length;

      if (succeeded > 0) {
        d.clearQueue();
        d.setViewOnceEnabled(false);
      } else {
        toast.error("No files sent successfully");
      }
      return;
    }

    const uploadedItems: Array<{ localId: string; file: File; kind: string; url: string }> = [];

    for (const item of d.queue) {
      if (item.status === "uploaded" && item.uploadedUrl) {
        uploadedItems.push({ localId: item.localId, file: item.file, kind: item.kind, url: item.uploadedUrl });
        continue;
      }
      try {
        d.setItemProgress(item.localId, 15);
        const uploaded = await d.uploadSingleFile({
          file: item.file,
          pathPrefix: "orbit-media",
          onProgress: (progress) => d.setItemProgress(item.localId, progress),
        });
        d.markUploaded(item.localId, uploaded.publicUrl);
        uploadedItems.push({ localId: item.localId, file: item.file, kind: item.kind, url: uploaded.publicUrl });
      } catch (err: any) {
        d.markFailed(item.localId, err?.message || "Upload failed");
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
      viewOnce: d.viewOnceEnabled,
    }));

    await d.sendAttachments({ attachments: atts, body: "", viewOnce: d.viewOnceEnabled });
    d.clearQueue();
    d.setViewOnceEnabled(false);
  }, []);

  return { handleUploadAndSendAttachments };
}
