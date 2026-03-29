/**
 * useMediaPreviewSend — Canonical hook for sending media from the preview sheet.
 * Isolates transport + optimistic send logic from HudChatPanel.
 * 
 * Input: PreviewItem[], caption, viewOnce, thread context
 * Output: fires optimistic send pipeline per item
 */
import { useCallback } from "react";
import { sendMediaOptimistic } from "@/families/send/send-media-optimistic";
import { transportUploadWithPrepare } from "@/families/media/transport/transport-engine";
import { TransportPolicy } from "@/families/media/transport/transport-policy";
import { useMediaPreviewState, type PreviewItem } from "@/families/media/media-preview-state";
import { toast } from "sonner";
import type { SendContext } from "@/families/send/send-context";

interface MediaPreviewSendDeps {
  conversationId: string | null;
  userId: string | undefined;
  myOrbitId: string | null;
  peerOrbitId: string | null;
  threadId: string | null;
  orgId: string | null;
}

export function useMediaPreviewSend(deps: MediaPreviewSendDeps) {
  const sendFromPreview = useCallback(
    (items: PreviewItem[], caption: string, viewOnce: boolean) => {
      if (!deps.conversationId || !deps.userId) {
        toast.error("Cannot send: no conversation context");
        return;
      }

      const ctx: SendContext = {
        conversationId: deps.conversationId,
        senderUserId: deps.userId,
        senderOrbitId: deps.myOrbitId || `orbit_${deps.userId.slice(0, 12)}`,
        receiverOrbitId: deps.peerOrbitId,
        threadId: deps.threadId || undefined,
        orgId: deps.orgId,
      };

      for (const item of items) {
        const decision = TransportPolicy.decide(item.media.file);
        void sendMediaOptimistic(ctx, {
          file: item.media.file,
          caption: items.length === 1 ? caption : item.caption || caption,
          viewOnce,
          uploadFn: async (file, _path, onProgress) => {
            const result = await transportUploadWithPrepare(file, {
              pathPrefix: deps.orgId || "orbit-media",
              compress: decision.shouldCompress,
              maxDimension: decision.maxDimension || undefined,
              quality: decision.quality || undefined,
              callbacks: { onProgress },
            });
            return result.publicUrl;
          },
          pathPrefix: deps.orgId || "orbit-media",
        });
      }

      useMediaPreviewState.getState().markSent();
    },
    [deps.conversationId, deps.userId, deps.myOrbitId, deps.peerOrbitId, deps.threadId, deps.orgId],
  );

  return { sendFromPreview };
}
