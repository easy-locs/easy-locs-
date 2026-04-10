/**
 * useMediaPreviewSend — THIN WRAPPER around orbitDispatch for media preview sends.
 * No inline SendContext construction — delegated to orbit-dispatch.
 */
import { useCallback } from "react";
import { orbitDispatch } from "@/families/orbit-dispatch/orbit-dispatch";
import { transportUploadWithPrepare } from "@/families/media/transport/transport-engine";
import { TransportPolicy } from "@/families/media/transport/transport-policy";
import { useMediaPreviewState, type PreviewItem } from "@/families/media/media-preview-state";
import { toast } from "sonner";
import { computeDisappearAt } from "@/hooks/usePrivacySettings";

interface MediaPreviewSendDeps {
  conversationId: string | null;
  userId: string | undefined;
  myOrbitId: string | null;
  peerOrbitId: string | null;
  orgId: string | null;
  resolveConversationId?: (authUserId: string) => Promise<string | null>;
  disappearTTL?: string;
}

export function useMediaPreviewSend(deps: MediaPreviewSendDeps) {
  const sendFromPreview = useCallback(
    (items: PreviewItem[], caption: string, viewOnce: boolean) => {
      void (async () => {
        if (!deps.userId) {
          toast.error("Cannot send: authentication required");
          return;
        }

        let conversationId = deps.conversationId;
        if (!conversationId && deps.resolveConversationId) {
          conversationId = await deps.resolveConversationId(deps.userId);
        }

        if (!conversationId) {
          toast.error("Cannot send: no conversation context");
          return;
        }

        const disappearAt = deps.disappearTTL ? computeDisappearAt(deps.disappearTTL) : null;

        for (const item of items) {
          const decision = TransportPolicy.decide(item.media.file);
          await orbitDispatch({
            type: "send_media",
            conversationId,
            file: item.media.file,
            caption: items.length === 1 ? caption : item.caption || caption,
            viewOnce,
            disappearAt,
            uploadFn: async (file, _path, onProgress) => {
              const result = await transportUploadWithPrepare(file, {
                pathPrefix: deps.orgId || "orbit-media",
                compress: decision.shouldCompress,
                maxDimension: decision.maxDimension || undefined,
                quality: decision.quality || undefined,
                targetFormat: decision.targetFormat,
                callbacks: { onProgress },
              });
              return result.publicUrl;
            },
            pathPrefix: deps.orgId || "orbit-media",
          });
        }

        useMediaPreviewState.getState().markSent();
      })();
    },
    [deps.conversationId, deps.userId, deps.myOrbitId, deps.peerOrbitId, deps.orgId, deps.resolveConversationId, deps.disappearTTL],
  );

  return { sendFromPreview };
}
