import { useMemo, useState } from "react";
import type { OrbitAttachmentItem, OrbitUploadQueueItem } from "@/lib/orbit/orbit-attachment-types";
import { detectAttachmentKind } from "@/lib/orbit/orbit-attachment-utils";

export function useOrbitAttachmentQueue() {
  const [queue, setQueue] = useState<OrbitUploadQueueItem[]>([]);

  const enqueueFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const next: OrbitUploadQueueItem[] = arr.map((file) => ({
      localId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      kind: detectAttachmentKind(file),
      previewUrl:
        file.type.startsWith("image/") || file.type.startsWith("video/")
          ? URL.createObjectURL(file)
          : null,
      progress: 0,
      status: "queued",
      uploadedUrl: null,
      errorMessage: null,
    }));
    setQueue((prev) => [...prev, ...next]);
  };

  const removeQueueItem = (localId: string) => {
    setQueue((prev) => {
      const found = prev.find((x) => x.localId === localId);
      if (found?.previewUrl) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((x) => x.localId !== localId);
    });
  };

  const clearQueue = () => {
    setQueue((prev) => {
      prev.forEach((x) => {
        if (x.previewUrl) URL.revokeObjectURL(x.previewUrl);
      });
      return [];
    });
  };

  const setItemProgress = (localId: string, progress: number) => {
    setQueue((prev) =>
      prev.map((x) => (x.localId === localId ? { ...x, progress, status: "uploading" as const } : x))
    );
  };

  const markUploaded = (localId: string, uploadedUrl: string) => {
    setQueue((prev) =>
      prev.map((x) =>
        x.localId === localId
          ? { ...x, uploadedUrl, progress: 100, status: "uploaded" as const }
          : x
      )
    );
  };

  const markFailed = (localId: string, errorMessage: string) => {
    setQueue((prev) =>
      prev.map((x) =>
        x.localId === localId ? { ...x, status: "failed" as const, errorMessage } : x
      )
    );
  };

  const uploadedAttachments = useMemo<OrbitAttachmentItem[]>(() => {
    return queue
      .filter((x) => x.status === "uploaded" && x.uploadedUrl)
      .map((x) => ({
        id: x.localId,
        kind: x.kind,
        name: x.file.name,
        mimeType: x.file.type,
        sizeBytes: x.file.size,
        url: x.uploadedUrl!,
        thumbnailUrl: x.previewUrl || null,
        viewOnce: false,
      }));
  }, [queue]);

  return {
    queue,
    enqueueFiles,
    removeQueueItem,
    clearQueue,
    setItemProgress,
    markUploaded,
    markFailed,
    uploadedAttachments,
  };
}
