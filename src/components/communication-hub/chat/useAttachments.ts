import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

type ThreadLike = {
  id: string;
  v2ConversationId?: string | null;
  peerOrbitId?: string | null;
  [key: string]: unknown;
};

export function useAttachments(params: {
  thread: ThreadLike | null;
  myOrbitId?: string | null;
  resolveAuthUserId: () => Promise<string | null>;
  onThreadUpdate?: (threadId: string, updates: Record<string, unknown>) => void;
  // Legacy compat props (ignored but accepted)
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
    const buckets = ["chat-attachments", "chat-media", "property-photos"];
    for (const bucket of buckets) {
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
      if (error) continue;
      const { data: signedData } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
      return signedData?.signedUrl || null;
    }
    return null;
  };

  /** Handle single file upload — legacy API compat */
  const handleFileUpload = useCallback(async (file: File) => {
    if (!params.thread?.v2ConversationId) return;
    const authUserId = await params.resolveAuthUserId();
    if (!authUserId) { toast.error("Authentication required."); return; }

    setUploading(true);
    try {
      const isMedia = file.type.startsWith("image/") || file.type.startsWith("video/");
      const orgId = params.orgId || "orbit";
      const path = `${orgId}/${params.thread.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split(".").pop() || "bin"}`;
      const finalUrl = await uploadToStorage(file, path);
      if (!finalUrl) throw new Error("File upload failed. Please try again.");

      const content = isMedia ? `📷 ${file.name}` : `📎 ${file.name}`;

      const { error } = await db.from("chat_messages_v2").insert({
        conversation_id: params.thread.v2ConversationId,
        sender_user_id: authUserId,
        sender_orbit_id: params.myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
        receiver_orbit_id: params.thread.peerOrbitId ?? null,
        type: isMedia ? "media" : "file",
        body: content,
        metadata: { url: finalUrl },
      });
      if (error) throw error;

      await db.from("conversations_v2").update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", params.thread.v2ConversationId);

      toast.success("File sent");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    }
    setUploading(false);
  }, [params]);

  /** Batch file send — new API */
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
