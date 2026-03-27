import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildAttachmentSummary } from "@/lib/orbit/orbit-attachment-utils";
import type { OrbitAttachmentItem } from "@/lib/orbit/orbit-attachment-types";
import { toast } from "sonner";

export function useOrbitAttachmentSend(params: {
  conversationId?: string | null;
  currentUserId?: string | null;
  currentOrbitId?: string | null;
  onAfterSend?: () => void;
}) {
  const { conversationId, currentUserId, currentOrbitId, onAfterSend } = params;
  const [sendingAttachments, setSendingAttachments] = useState(false);

  const sendAttachments = async (payload: {
    attachments: OrbitAttachmentItem[];
    body?: string;
    viewOnce?: boolean;
  }) => {
    if (!conversationId || !currentUserId || !currentOrbitId) return;
    if (!payload.attachments.length) return;

    setSendingAttachments(true);
    try {
      const mediaKind =
        payload.attachments.length === 1 ? payload.attachments[0].kind : "file";
      const summary = buildAttachmentSummary(payload.attachments);

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

      if (error) throw error;

      await (supabase as any)
        .from("conversations_v2")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: payload.body || summary || "Attachment",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      toast.success("Attachment sent");
      onAfterSend?.();
    } catch (err: any) {
      toast.error(err?.message || "Attachment send failed");
    } finally {
      setSendingAttachments(false);
    }
  };

  return { sendingAttachments, sendAttachments };
}
