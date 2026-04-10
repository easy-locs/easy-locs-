import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { createOrGetDirectConversation } from "@/lib/orbit/createOrGetDirectConversation";
import { uploadToStorage } from "@/repositories/communication.repository";
import { orbitDispatch } from "@/families/orbit-dispatch";

type ThreadLike = {
  id: string;
  conversationId?: string | null;
  peerOrbitId?: string | null;
  peerUserId?: string | null;
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
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;

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

  const resolveConversationId = async (authUserId: string): Promise<string | null> => {
    const p = paramsRef.current;
    const thread = p.thread;
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
          myOrbitId: p.myOrbitId,
          peerUserId: thread.peerUserId,
          peerOrbitId: thread.peerOrbitId,
        });
        p.onThreadUpdate?.(thread.id, { conversationId: conv.id, v2ConversationId: conv.id });
        trace("attachment.conversation.resolve", "output", { conversationId: conv.id, strategy: "auto_create" });
        return conv.id;
      } catch (err: any) {
        trace("attachment.conversation.resolve", "error", { message: err?.message || "auto_create_failed" });
      }
    }

    trace("attachment.conversation.resolve", "error", { reason: "unresolved_conversation" });
    return null;
  };

  const handleFileUpload = useCallback(async (file: File) => {
    const p = paramsRef.current;
    trace("attachment.pick", "input", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      threadId: p.thread?.id,
    });

    trace("attachment.validate", "input", {
      exists: !!file,
      size: file.size,
      type: file.type,
    });
    if (!file) {
      trace("attachment.validate", "error", { reason: "missing_file" });
      toast.error(t("orbit.no_file_selected"));
      return;
    }
    trace("attachment.validate", "output", { valid: true, fileName: file.name });

    trace("attachment.auth.resolve", "input", { threadId: p.thread?.id ?? null });
    const authUserId = await p.resolveAuthUserId();
    trace("attachment.auth.resolve", "output", { authUserId: authUserId || null });
    if (!authUserId) {
      trace("attachment.auth.resolve", "error", { reason: "missing_auth" });
      toast.error(t("orbit.auth_required_files"));
      return;
    }

    const conversationId = await resolveConversationId(authUserId);
    if (!conversationId) {
      trace("attachment.conversation.resolve", "error", { reason: "missing_conversationId_after_resolution" });
      toast.error(t("orbit.no_conversation"));
      return;
    }

    setUploading(true);
    try {
      const orgId = p.orgId || "orbit";
      const pathPrefix = `${orgId}/${p.thread!.id}`;

      trace("attachment.dispatch", "input", { conversationId, fileName: file.name });
      const result = await orbitDispatch({
        type: "send_media",
        conversationId,
        file,
        caption: file.type.startsWith("image/") || file.type.startsWith("video/")
          ? `📷 ${file.name}` : `📎 ${file.name}`,
        uploadFn: async (f, fp, onProgress) => {
          onProgress(0);
          const url = await uploadFile(f, fp);
          onProgress(100);
          if (!url) throw new Error("Upload failed");
          return url;
        },
        pathPrefix,
      });
      if (!result.ok) {
        throw new Error(result.error || "Send failed");
      }
      trace("attachment.dispatch", "output", { conversationId, dispatched: true, fileName: file.name });
    } catch (e: any) {
      trace("attachment.message.insert", "error", { message: e?.message || "attachment_failed" });
      toast.error(t("orbit.upload_failed"));
    } finally {
      setUploading(false);
    }
  }, [trace]);

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
