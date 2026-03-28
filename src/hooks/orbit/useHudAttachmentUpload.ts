/**
 * useHudAttachmentUpload — Extracted from HudChatPanel.
 * Single responsibility: file queue → upload → send as attachment messages.
 */
import { useCallback } from "react";
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
}

export function useHudAttachmentUpload(deps: Deps) {
  const handleUploadAndSendAttachments = useCallback(async () => {
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
