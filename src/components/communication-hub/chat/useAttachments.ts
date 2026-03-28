import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createOrGetDirectConversation } from "@/lib/orbit/createOrGetDirectConversation";

const db = supabase as any;

type ThreadLike = {
  id: string;
  v2ConversationId?: string | null;
  peerOrbitId?: string | null;
  peerUserId?: string | null;
};

export function useAttachments(params: {
  thread: ThreadLike | null;
  myOrbitId?: string | null;
  resolveAuthUserId: () => Promise<string | null>;
  onThreadUpdate?: (threadId: string, updates: Record<string, unknown>) => void;
  orgId?: string | null;
  userId?: string;
  locale?: string;
  e2eReady?: boolean;
  encrypt?: (content: string, peerId: string) => Promise<string | null>;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Upload a file/blob to storage and return signed URL */
  const uploadToStorage = async (file: File | Blob, path: string): Promise<string | null> => {
    const bucket = "chat-attachments";
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) {
      console.error("[useAttachments] upload error:", error.message);
      return null;
    }
    const { data: signedData } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
    return signedData?.signedUrl || null;
  };

  /** Resolve or auto-create v2ConversationId */
  const resolveConversationId = async (authUserId: string): Promise<string | null> => {
    const thread = params.thread;
    if (!thread) return null;

    if (thread.v2ConversationId) return thread.v2ConversationId;

    // Auto-create if we have a peer
    if (thread.peerUserId) {
      try {
        const conv = await createOrGetDirectConversation({
          myUserId: authUserId,
          myOrbitId: params.myOrbitId,
          peerUserId: thread.peerUserId,
          peerOrbitId: thread.peerOrbitId,
        });
        params.onThreadUpdate?.(thread.id, { v2ConversationId: conv.id });
        return conv.id;
      } catch (err: any) {
        console.error("[useAttachments] auto-create conversation failed", err);
      }
    }

    return null;
  };

  /** Handle single file upload */
  const handleFileUpload = useCallback(async (file: File) => {
    const authUserId = await params.resolveAuthUserId();
    if (!authUserId) {
      toast.error("Authentication required to send files.");
      return;
    }

    const conversationId = await resolveConversationId(authUserId);
    if (!conversationId) {
      toast.error("No conversation found. Open a thread first.");
      console.error("[useAttachments] no conversationId resolved", { threadId: params.thread?.id });
      return;
    }

    setUploading(true);
    try {
      const isMedia = file.type.startsWith("image/") || file.type.startsWith("video/");
      const orgId = params.orgId || "orbit";
      const path = `${orgId}/${params.thread!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split(".").pop() || "bin"}`;
      const finalUrl = await uploadToStorage(file, path);
      if (!finalUrl) throw new Error("File upload failed. Please try again.");

      const content = isMedia ? `📷 ${file.name}` : `📎 ${file.name}`;

      const { error } = await db.from("chat_messages_v2").insert({
        conversation_id: conversationId,
        sender_user_id: authUserId,
        sender_orbit_id: params.myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
        receiver_orbit_id: params.thread?.peerOrbitId ?? null,
        type: isMedia ? "media" : "file",
        body: content,
        metadata: { url: finalUrl },
      });
      if (error) throw error;

      await db.from("conversations_v2").update({
        last_message_at: new Date().toISOString(),
        last_message_preview: content,
        updated_at: new Date().toISOString(),
      }).eq("id", conversationId);

      toast.success("File sent");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    }
    setUploading(false);
  }, [params]);

  /** Batch file send */
  const sendFiles = useCallback(async (files: File[]) => {
    for (const file of files) {
      await handleFileUpload(file);
    }
  }, [handleFileUpload]);

  return {
    uploading,
    setUploading,
    fileInputRef,
    handleFileUpload,
    uploadToStorage,
    sendFiles,
  };
}
