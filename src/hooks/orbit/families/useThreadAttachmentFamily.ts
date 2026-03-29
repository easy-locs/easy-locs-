/**
 * FAMILY: ATTACHMENT — Canonical attachment queue, upload, send, view-once, file handlers.
 * Single source of truth for all attachment-related logic in a thread.
 */
import { useRef, useState, useCallback } from "react";
import { useOrbitAttachmentQueue } from "@/hooks/useOrbitAttachmentQueue";
import { useOrbitUploadTransport } from "@/hooks/useOrbitUploadTransport";
import { useOrbitAttachmentSend } from "@/hooks/useOrbitAttachmentSend";
import { useOrbitViewOnce } from "@/hooks/useOrbitViewOnce";
import { useHudAttachmentUpload } from "@/hooks/orbit/useHudAttachmentUpload";
import { useAttachments } from "@/components/communication-hub/chat/useAttachments";
import type { ConversationThread } from "@/components/communication-hub/types";

export function useThreadAttachmentFamily(params: {
  thread: ConversationThread | null;
  orgId: string | null;
  userId: string | undefined;
  myOrbitId: string | null;
  locale: string;
  e2eReady: boolean;
  encrypt: any;
  resolveAuthUserId: () => Promise<string | null>;
  onThreadUpdate: (threadId: string, updates: any) => void;
  onAfterSend: () => void;
}) {
  const {
    thread, orgId, userId, myOrbitId, locale, e2eReady, encrypt,
    resolveAuthUserId, onThreadUpdate, onAfterSend,
  } = params;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [viewOnceEnabled, setViewOnceEnabled] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerAttachment, setViewerAttachment] = useState<any>(null);

  const attachments = useAttachments({
    thread,
    orgId,
    userId,
    myOrbitId,
    locale,
    e2eReady,
    encrypt,
    resolveAuthUserId,
    onThreadUpdate,
  });

  const attachmentQueue = useOrbitAttachmentQueue();
  const uploadTransport = useOrbitUploadTransport();

  const attachmentSend = useOrbitAttachmentSend({
    conversationId: thread?.v2ConversationId ?? null,
    currentUserId: userId ?? null,
    currentOrbitId: myOrbitId ?? null,
    peerUserId: thread?.peerUserId ?? null,
    peerOrbitId: thread?.peerOrbitId ?? null,
    onAfterSend,
    onConversationCreated: (convId) => {
      if (thread) onThreadUpdate(thread.id, { v2ConversationId: convId });
    },
  });

  const viewOnceHook = useOrbitViewOnce({ currentUserId: userId ?? null });

  const { handleUploadAndSendAttachments } = useHudAttachmentUpload({
    queue: attachmentQueue.queue,
    setItemProgress: attachmentQueue.setItemProgress,
    markUploaded: attachmentQueue.markUploaded,
    markFailed: attachmentQueue.markFailed,
    clearQueue: attachmentQueue.clearQueue,
    uploadSingleFile: uploadTransport.uploadSingleFile,
    sendAttachments: attachmentSend.sendAttachments,
    sendingAttachments: attachmentSend.sendingAttachments,
    viewOnceEnabled,
    setViewOnceEnabled,
  });

  const handlePickFiles = useCallback(() => fileInputRef.current?.click(), []);
  const handlePickCamera = useCallback(() => cameraInputRef.current?.click(), []);

  const handleFilesSelected = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    attachmentQueue.enqueueFiles(files);
  }, [attachmentQueue]);

  const handleOpenAttachment = useCallback(async (message: any, attachment: any) => {
    setViewerAttachment(attachment);
    setViewerOpen(true);
    if (attachment.viewOnce && thread?.v2ConversationId) {
      await viewOnceHook.markViewOnceOpened({
        messageId: message.id,
        conversationId: thread.v2ConversationId,
      });
    }
  }, [thread?.v2ConversationId, viewOnceHook]);

  return {
    fileInputRef,
    cameraInputRef,
    viewOnceEnabled,
    setViewOnceEnabled,
    viewerOpen,
    setViewerOpen,
    viewerAttachment,
    setViewerAttachment,
    attachments,
    attachmentQueue,
    attachmentSend,
    viewOnceHook,
    handleUploadAndSendAttachments,
    handlePickFiles,
    handlePickCamera,
    handleFilesSelected,
    handleOpenAttachment,
  };
}
