import { useCallback, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

type ThreadLike = {
  id: string;
  v2ConversationId?: string | null;
  peerOrbitId?: string | null;
};

export function useAttachments(params: {
  thread: ThreadLike | null;
  myOrbitId?: string | null;
  resolveAuthUserId: () => Promise<string | null>;
  onThreadUpdate: (threadId: string, updates: Record<string, unknown>) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const sendFiles = useCallback(
    async (files: File[]) => {
      if (!params.thread?.v2ConversationId || files.length === 0) return;

      const authUserId = await params.resolveAuthUserId();
      if (!authUserId) {
        toast.error("Authentication required.");
        return;
      }

      setUploading(true);

      try {
        const uploaded: Array<{
          name: string;
          size: number;
          type: string;
          url: string;
        }> = [];

        for (const file of files) {
          const path = `orbit/${params.thread.v2ConversationId}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from("chat-attachments")
            .upload(path, file, { upsert: false });

          if (uploadError) throw uploadError;

          const { data } = supabase.storage
            .from("chat-attachments")
            .getPublicUrl(path);

          uploaded.push({
            name: file.name,
            size: file.size,
            type: file.type,
            url: data.publicUrl,
          });
        }

        const body =
          uploaded.length === 1
            ? `📎 ${uploaded[0].name}`
            : `📎 ${uploaded.length} attachments`;

        const now = new Date().toISOString();

        const { error } = await db.from("chat_messages_v2").insert({
          conversation_id: params.thread.v2ConversationId,
          sender_user_id: authUserId,
          sender_orbit_id:
            params.myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
          receiver_orbit_id: params.thread.peerOrbitId ?? null,
          type: "attachment",
          body,
          attachments: uploaded,
          metadata: {
            attachment_count: uploaded.length,
          },
        });

        if (error) throw error;

        await db
          .from("conversations_v2")
          .update({
            last_message_at: now,
            last_message_preview: body,
            updated_at: now,
          })
          .eq("id", params.thread.v2ConversationId);

        params.onThreadUpdate(params.thread.id, {
          lastMessage: body,
          lastMessageTime: now,
          lastMessagePreview: body,
        });

        toast.success("Attachment sent.");
      } catch (e: any) {
        toast.error(e?.message || "Attachment upload failed.");
      } finally {
        setUploading(false);
      }
    },
    [params]
  );

  return {
    uploading,
    setUploading,
    sendFiles,
  };
}
