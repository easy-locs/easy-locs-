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
    console.log("%c[TRACE][ATTACHMENT] STEP 1 — UI upload triggered", "color:cyan;font-weight:bold", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      threadId: params.thread?.id,
    });

    console.log("%c[TRACE][ATTACHMENT] STEP 3 — checking auth", "color:cyan;font-weight:bold");
    const authUserId = await params.resolveAuthUserId();
    console.log("%c[TRACE][ATTACHMENT] STEP 3 — auth result:", "color:cyan;font-weight:bold", { authUserId: authUserId || "NULL" });
    if (!authUserId) {
      console.error("%c[TRACE][ATTACHMENT] ❌ BLOCKED — no auth", "color:red;font-weight:bold");
      toast.error("Authentication required to send files.");
      return;
    }

    console.log("%c[TRACE][ATTACHMENT] STEP 4 — resolving conversationId", "color:cyan;font-weight:bold", {
      v2ConversationId: params.thread?.v2ConversationId,
      peerUserId: params.thread?.peerUserId,
    });
    const conversationId = await resolveConversationId(authUserId);
    console.log("%c[TRACE][ATTACHMENT] STEP 4 — result:", "color:cyan;font-weight:bold", { conversationId: conversationId || "NULL" });
    if (!conversationId) {
      console.error("%c[TRACE][ATTACHMENT] ❌ BLOCKED — no conversationId", "color:red;font-weight:bold");
      toast.error("No conversation found. Open a thread first.");
      return;
    }

    setUploading(true);
    try {
      const isMedia = file.type.startsWith("image/") || file.type.startsWith("video/");
      const orgId = params.orgId || "orbit";
      const path = `${orgId}/${params.thread!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split(".").pop() || "bin"}`;
      
      console.log("%c[TRACE][ATTACHMENT] STEP 5a — uploading to storage", "color:cyan;font-weight:bold", { path, bucket: "chat-attachments" });
      const finalUrl = await uploadToStorage(file, path);
      if (!finalUrl) {
        console.error("%c[TRACE][ATTACHMENT] ❌ STORAGE UPLOAD FAILED", "color:red;font-weight:bold");
        throw new Error("File upload failed. Please try again.");
      }
      console.log("%c[TRACE][ATTACHMENT] STEP 5a — ✅ storage OK", "color:lime;font-weight:bold", { urlLength: finalUrl.length });

      const content = isMedia ? `📷 ${file.name}` : `📎 ${file.name}`;

      console.log("%c[TRACE][ATTACHMENT] STEP 5b — DB insert chat_messages_v2", "color:cyan;font-weight:bold", { conversationId, type: isMedia ? "media" : "file" });
      const { error } = await db.from("chat_messages_v2").insert({
        conversation_id: conversationId,
        sender_user_id: authUserId,
        sender_orbit_id: params.myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
        receiver_orbit_id: params.thread?.peerOrbitId ?? null,
        type: isMedia ? "media" : "file",
        body: content,
        metadata: { url: finalUrl },
      });
      if (error) {
        console.error("%c[TRACE][ATTACHMENT] STEP 5b — ❌ DB INSERT FAILED", "color:red;font-weight:bold", error);
        throw error;
      }
      console.log("%c[TRACE][ATTACHMENT] STEP 5b — ✅ DB INSERT OK", "color:lime;font-weight:bold");

      await db.from("conversations_v2").update({
        last_message_at: new Date().toISOString(),
        last_message_preview: content,
        updated_at: new Date().toISOString(),
      }).eq("id", conversationId);

      console.log("%c[TRACE][ATTACHMENT] STEP 7 — ✅ COMPLETE", "color:lime;font-weight:bold");
      toast.success("File sent");
    } catch (e: any) {
      console.error("%c[TRACE][ATTACHMENT] ❌ FAILED", "color:red;font-weight:bold", e);
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
