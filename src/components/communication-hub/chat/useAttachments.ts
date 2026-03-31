import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { createOrGetDirectConversation } from "@/lib/orbit/createOrGetDirectConversation";
import { uploadToStorage } from "@/repositories/communication.repository";
import { orbitDispatch } from "@/families/orbit-dispatch";

type ThreadLike = {
  id: string;
  /** Canonical conversation UUID */
  conversationId?: string | null;
  peerOrbitId?: string | null;
  peerUserId?: string | null;
  /** @deprecated Use conversationId */
  v2ConversationId?: string | null;
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
  const uploadFile = async (file: File | Blob, path: string): Promise<string | null> => {
    const bucket = "chat-attachments";
    trace("attachment.storage.upload", "input", { path, bucket, size: (file as File)?.size ?? null, type: (file as File)?.type ?? null });
    try {
      const signedUrl = await uploadToStorage(bucket, path, file);
      if (!signedUrl) {
        trace("attachment.storage.upload", "error", { reason: "missing_signed_url", path });
        return null;
      }
      trace("attachment.storage.upload", "output", { path, signedUrlLength: signedUrl.length });
      return signedUrl;
    } catch (e: any) {
      trace("attachment.storage.upload", "error", { message: e?.message });
      return null;
    }
  };

  /** Resolve or auto-create conversationId */
  const resolveConversationId = async (authUserId: string): Promise<string | null> => {
    const thread = params.thread;
    const existingId = thread?.conversationId || thread?.v2ConversationId;
    trace("attachment.conversation.resolve", "input", {
      threadId: thread?.id ?? null,
      conversationId: existingId ?? null,
      peerUserId: thread?.peerUserId ?? null,
    });
    if (!thread) {
      trace("attachment.conversation.resolve", "error", { reason: "missing_thread" });
      return null;
    }

    if (existingId) {
      trace("attachment.conversation.resolve", "output", { conversationId: existingId, strategy: "existing_thread" });
      return existingId;
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
        params.onThreadUpdate?.(thread.id, { conversationId: conv.id, v2ConversationId: conv.id });
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
      
      const finalUrl = await uploadFile(file, path);
      if (!finalUrl) {
        trace("attachment.storage.upload", "error", { reason: "upload_returned_null", path });
        throw new Error("File upload failed. Please try again.");
      }

      trace("attachment.dispatch", "input", { conversationId, type: isMedia ? "media" : "file", fileName: file.name });
      const orgId = params.orgId || "orbit";
      const result = await orbitDispatch({
        type: "send_media",
        conversationId,
        file,
        caption: isMedia ? `📷 ${file.name}` : `📎 ${file.name}`,
        uploadFn: async (f, p, onProgress) => {
          onProgress(0);
          const url = await uploadFile(f, p);
          onProgress(100);
          if (!url) throw new Error("Upload failed");
          return url;
        },
        pathPrefix: `${orgId}/${params.thread!.id}`,
      });
      if (!result.ok) {
        throw new Error(result.error || "Send failed");
      }
      trace("attachment.dispatch", "output", { conversationId, dispatched: true, fileName: file.name });
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
    uploadToStorage: uploadFile,
    sendFiles,
  };
}
