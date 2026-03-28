import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildAttachmentSummary } from "@/lib/orbit/orbit-attachment-utils";
import type { OrbitAttachmentItem } from "@/lib/orbit/orbit-attachment-types";
import { toast } from "sonner";
import { createOrGetDirectConversation } from "@/lib/orbit/createOrGetDirectConversation";
import { startFlow, addStep, completeStep, failStep, endFlow } from "@/lib/runtime/flow-tracer";
import { platformBus } from "@/lib/shared/platform-bus";
import { reportHealth } from "@/lib/runtime/health-aggregator";
import { trackPropagation } from "@/lib/runtime/propagation-validator";

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

    // Auto-create conversation if missing
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
      const mediaKind =
        payload.attachments.length === 1 ? payload.attachments[0].kind : "file";
      const summary = buildAttachmentSummary(payload.attachments);

      const dbStep = addStep(flow, "db_write");
      const { error } = await (supabase as any)
        .from("chat_messages_v2")
        .insert({
          conversation_id: conversationId,
          sender_user_id: currentUserId,
          sender_orbit_id: currentOrbitId,
          type: "media",
          body: payload.body || summary || "Attachment",
          attachments: payload.attachments.map((x) => ({
            ...x,
            viewOnce: payload.viewOnce || x.viewOnce || false,
          })),
          view_once: !!payload.viewOnce,
          media_kind: mediaKind,
          media_count: payload.attachments.length,
          attachment_summary: summary,
          metadata: { has_attachments: true },
        });

      if (error) {
        failStep(flow, dbStep, error.message);
        throw error;
      }
      completeStep(flow, dbStep);

      const updateStep = addStep(flow, "conversation_update");
      await (supabase as any)
        .from("conversations_v2")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: payload.body || summary || "Attachment",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);
      completeStep(flow, updateStep);

      platformBus.emit("orbit:attachment_sent", {
        conversationId,
        count: payload.attachments.length,
        mediaKind,
      }, "orbit", { userId: currentUserId });

      trackPropagation({
        flowId: flow.flowId,
        domain: "orbit",
        action: "sendAttachment",
        dbWriteSuccess: true,
        eventEmitted: "orbit:attachment_sent",
        cacheInvalidated: [],
      });

      reportHealth("orbit", "ok");
      endFlow(flow, "success");
      toast.success("Attachment sent");
      onAfterSend?.();
    } catch (err: any) {
      reportHealth("orbit", "degraded", undefined, err?.message);
      trackPropagation({
        flowId: flow.flowId,
        domain: "orbit",
        action: "sendAttachment",
        dbWriteSuccess: false,
        eventEmitted: null,
        cacheInvalidated: [],
      });
      endFlow(flow, "failed");
      toast.error(err?.message || "Attachment send failed");
    } finally {
      setSendingAttachments(false);
    }
  };

  return { sendingAttachments, sendAttachments };
}
