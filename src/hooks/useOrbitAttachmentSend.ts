/**
 * useOrbitAttachmentSend — Attachment send via canonical send family.
 * Zero inline supabase insert calls.
 */
import { useState } from "react";
import { sendMedia } from "@/families/send/send-media";
import { buildAttachmentSummary } from "@/lib/orbit/orbit-attachment-utils";
import type { OrbitAttachmentItem } from "@/lib/orbit/orbit-attachment-types";
import { toast } from "sonner";
import { createOrGetDirectConversation } from "@/lib/orbit/createOrGetDirectConversation";
import { startFlow, addStep, completeStep, failStep, endFlow } from "@/lib/runtime/flow-tracer";
import { platformBus } from "@/lib/shared/platform-bus";
import { reportHealth } from "@/lib/runtime/health-aggregator";
import type { SendContext } from "@/families/send/send-context";

export function useOrbitAttachmentSend(params: {
  conversationId?: string | null;
  currentUserId?: string | null;
  currentOrbitId?: string | null;
  peerUserId?: string | null;
  peerOrbitId?: string | null;
  onAfterSend?: () => void;
  onConversationCreated?: (convId: string) => void;
}) {
  const { currentUserId, currentOrbitId, peerUserId, peerOrbitId, onAfterSend, onConversationCreated } = params;
  const [sendingAttachments, setSendingAttachments] = useState(false);

  const sendAttachments = async (payload: {
    attachments: OrbitAttachmentItem[];
    body?: string;
    viewOnce?: boolean;
  }) => {
    if (!currentUserId || !currentOrbitId) {
      toast.error("Authentication required to send attachments.");
      return;
    }
    if (!payload.attachments.length) return;

    let conversationId = params.conversationId;

    if (!conversationId && peerUserId) {
      try {
        const conv = await createOrGetDirectConversation({
          myUserId: currentUserId,
          myOrbitId: currentOrbitId,
          peerUserId,
          peerOrbitId,
        });
        conversationId = conv.id;
        onConversationCreated?.(conv.id);
      } catch (err: any) {
        console.error("[useOrbitAttachmentSend] auto-create failed", err);
        toast.error("Failed to create conversation for attachment.");
        return;
      }
    }

    if (!conversationId) {
      toast.error("No conversation found. Open a thread first.");
      return;
    }

    setSendingAttachments(true);
    const flow = startFlow("orbit", "sendAttachment");
    const validateStep = addStep(flow, "validate");
    completeStep(flow, validateStep, { count: payload.attachments.length, conversationId });

    try {
      const summary = buildAttachmentSummary(payload.attachments);
      const mediaKind = payload.attachments.length === 1 ? payload.attachments[0].kind : "file";

      const ctx: SendContext = {
        conversationId,
        senderUserId: currentUserId,
        senderOrbitId: currentOrbitId,
        receiverOrbitId: peerOrbitId,
      };

      await sendMedia(ctx, {
        mediaUrl: payload.attachments[0]?.url || "",
        body: payload.body || summary || "Attachment",
        viewOnce: payload.viewOnce,
        mediaKind,
        attachments: payload.attachments.map((x) => ({
          ...x,
          viewOnce: payload.viewOnce || x.viewOnce || false,
        })),
      });

      reportHealth("orbit", "ok");
      endFlow(flow, "success");
      toast.success("Attachment sent");
      onAfterSend?.();
    } catch (err: any) {
      reportHealth("orbit", "degraded", undefined, err?.message);
      endFlow(flow, "failed");
      toast.error(err?.message || "Attachment send failed");
    } finally {
      setSendingAttachments(false);
    }
  };

  return { sendingAttachments, sendAttachments };
}
