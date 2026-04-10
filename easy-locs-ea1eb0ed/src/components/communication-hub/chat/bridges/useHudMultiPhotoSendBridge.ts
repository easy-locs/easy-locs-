/**
 * useHudMultiPhotoSendBridge — Handles the multi-photo send flow.
 * Isolates the dynamic import + orbitDispatch logic from the panel.
 */
import { useCallback } from "react";
import type { ConversationThread } from "../../types";

export function useHudMultiPhotoSendBridge(
  thread: ConversationThread | null,
  orgId: string | null,
) {
  const handleMultiPhotoSend = useCallback(
    (attachments: { file: File; order: number }[], caption?: string) => {
      const sorted = [...attachments].sort((a, b) => a.order - b.order);
      const files = sorted.map((a) => a.file);
      const convId = thread?.conversationId || thread?.id;
      if (!convId || !files.length) return;

      void (async () => {
        const { orbitDispatch } = await import("@/families/orbit-dispatch/orbit-dispatch");
        const { transportUploadWithPrepare } = await import("@/families/media/transport/transport-engine");
        const { TransportPolicy } = await import("@/families/media/transport/transport-policy");

        await orbitDispatch({
          type: "send_media_batch",
          conversationId: convId,
          files,
          caption: caption || undefined,
          viewOnce: false,
          uploadFn: async (file, _path, onProgress) => {
            const decision = TransportPolicy.decide(file);
            const result = await transportUploadWithPrepare(file, {
              pathPrefix: orgId || "orbit-media",
              compress: decision.shouldCompress,
              maxDimension: decision.maxDimension || undefined,
              quality: decision.quality || undefined,
              targetFormat: decision.targetFormat,
              callbacks: { onProgress },
            });
            return result.publicUrl;
          },
          pathPrefix: orgId || "orbit-media",
        });
      })();
    },
    [thread?.conversationId, thread?.id, orgId],
  );

  return { handleMultiPhotoSend };
}
