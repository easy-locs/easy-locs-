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

  const trace = useCallback((step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
    const logger = phase === "error" ? console.error : console.log;
    logger(`[ATTACHMENT][${step}] ${phase}:`, payload ?? {});
  }, []);

  /** Upload a file/blob to storage and return signed URL */
  const uploadToStorage = async (file: File | Blob, path: string): Promise<string | null> => {
    const bucket = "chat-attachments";
    trace("attachment.storage.upload", "input", { path, bucket, size: (file as File)?.size ?? null, type: (file as File)?.type ?? null });
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) {
      trace("attachment.storage.upload", "error", { message: error.message });
      return null;
    }
    const { data: signedData } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
    const signedUrl = signedData?.signedUrl || null;
    if (!signedUrl) {
      trace("attachment.storage.upload", "error", { reason: "missing_signed_url", path });
      return null;
    }
    trace("attachment.storage.upload", "output", { path, signedUrlLength: signedUrl.length });
    return signedUrl;
  };

  /** Resolve or auto-create v2ConversationId */
  const resolveConversationId = async (authUserId: string): Promise<string | null> => {
    const thread = params.thread;
    trace("attachment.conversation.resolve", "input", {
      threadId: thread?.id ?? null,
      v2ConversationId: thread?.v2ConversationId ?? null,
      peerUserId: thread?.peerUserId ?? null,
    });
    if (!thread) {
      trace("attachment.conversation.resolve", "error", { reason: "missing_thread" });
      return null;
    }

    if (thread.v2ConversationId) {
      trace("attachment.conversation.resolve", "output", { conversationId: thread.v2ConversationId, strategy: "existing_thread" });
      return thread.v2ConversationId;
    }

    if (thread.peerUserId) {
      trace("attachment.conversation.resolve", "output", { strategy: "needs_auto_create" });
      try {
        trace("attachment.auth.resolve", "output", { authUserId });
        const conv = await createOrGetDirectConversation({
          myUserId: authUserId,
          myOrbitId: params.myOrbitId,
          peerUserId: thread.peerUserId,
          peerOrbitId: thread.peerOrbitId,
        });
        params.onThreadUpdate?.(thread.id, { v2ConversationId: conv.id });
        trace("attachment.conversation.resolve", "output", { conversationId: conv.id, strategy: "auto_create" });
        return conv.id;
      } catch (err: any) {
        trace("attachment.conversation.resolve", "error", { message: err?.message || "auto_create_failed" });
      }
    }

    trace("attachment.conversation.resolve", "error", { reason: "unresolved_conversation" });
    return null;
  };

  /** Handle single file upload */
  const handleFileUpload = useCallback(async (file: File) => {
    trace("attachment.pick", "input", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      threadId: params.thread?.id,
    });

    trace("attachment.validate", "input", {
      exists: !!file,
      size: file.size,
      type: file.type,
    });
    if (!file) {
      trace("attachment.validate", "error", { reason: "missing_file" });
      toast.error("No file selected.");
      return;
    }
    trace("attachment.validate", "output", { valid: true, fileName: file.name });

    trace("attachment.auth.resolve", "input", { threadId: params.thread?.id ?? null });
    const authUserId = await params.resolveAuthUserId();
    trace("attachment.auth.resolve", "output", { authUserId: authUserId || null });
    if (!authUserId) {
      trace("attachment.auth.resolve", "error", { reason: "missing_auth" });
      toast.error("Authentication required to send files.");
      return;
    }

    const conversationId = await resolveConversationId(authUserId);
    if (!conversationId) {
      trace("attachment.conversation.resolve", "error", { reason: "missing_conversationId_after_resolution" });
      toast.error("No conversation found. Open a thread first.");
      return;
    }

    setUploading(true);
    try {
      const isMedia = file.type.startsWith("image/") || file.type.startsWith("video/");
      const orgId = params.orgId || "orbit";
      const path = `${orgId}/${params.thread!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split(".").pop() || "bin"}`;
      
      const finalUrl = await uploadToStorage(file, path);
      if (!finalUrl) {
        trace("attachment.storage.upload", "error", { reason: "upload_returned_null", path });
        throw new Error("File upload failed. Please try again.");
      }

      const content = isMedia ? `📷 ${file.name}` : `📎 ${file.name}`;

      trace("attachment.message.insert", "input", { conversationId, type: isMedia ? "media" : "file", fileName: file.name });
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
        trace("attachment.message.insert", "error", { message: error.message, code: error.code });
        throw error;
      }
      trace("attachment.message.insert", "output", { conversationId, inserted: true, fileName: file.name });

      await db.from("conversations_v2").update({
        last_message_at: new Date().toISOString(),
        last_message_preview: content,
        updated_at: new Date().toISOString(),
      }).eq("id", conversationId);

      trace("attachment.preview.update", "output", { conversationId, preview: content, threadId: params.thread?.id ?? null });
      trace("attachment.realtime.reconcile", "output", { expectedViaRealtime: true, conversationId });
      toast.success("File sent");
    } catch (e: any) {
      trace("attachment.message.insert", "error", { message: e?.message || "attachment_failed" });
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [params, trace]);

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
