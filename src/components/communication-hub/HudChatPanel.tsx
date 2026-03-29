import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { getAuthUser } from "@/repositories/auth-utils.repository";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { haptic } from "@/lib/haptics";
import { useOrbitIdentity } from "@/hooks/useOrbitIdentity";
import { useOrbitEncryption } from "@/hooks/useOrbitEncryption";
import { useDecryptedMessages } from "@/hooks/useDecryptedMessages";
import { useOfflineMessages } from "@/hooks/useOfflineMessages";
import { usePrivacySettings, computeDisappearAt } from "@/hooks/usePrivacySettings";
import { useVoiceRecorder, formatVoiceDuration } from "@/hooks/useVoiceRecorder";
import { type SecurityLevel } from "@/lib/message-security";
import { platformBus } from "@/lib/shared/platform-bus";

import type { ConversationThread, ChatMessage } from "./types";
import { MESSAGE_CATEGORIES, CONV_STATUSES } from "./types";
import DealContextHeader from "./DealContextHeader";
import MessageContextMenu from "./MessageContextMenu";
import MessageMultiSelectToolbar from "./MessageMultiSelect";
import ChatLocationPicker from "./ChatLocationPicker";
import ForwardMessageDialog from "@/components/communication/ForwardMessageDialog";
import OrbitSafetyNumber from "@/components/orbit/OrbitSafetyNumber";
import OrbitSecurityPanel from "@/components/orbit/OrbitSecurityPanel";
import OrbitSmartPayment, { type PaymentConfirmation } from "@/components/orbit/payments/OrbitSmartPayment";
import { RequestMoneyModal } from "@/components/chat/RequestMoneyModal";
import { sendPaymentRequestMessageToThread, sendPaymentReceiptToThread } from "@/components/chat/ChatPaymentCards";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useHudCallSetup } from "@/hooks/orbit/useHudCallSetup";
import { useHudBookingActions } from "@/hooks/orbit/useHudBookingActions";
import { useHudConversationStatus } from "@/hooks/orbit/useHudConversationStatus";
import { useHudAttachmentUpload } from "@/hooks/orbit/useHudAttachmentUpload";
import { useHudInlineHandlers } from "@/hooks/orbit/useHudInlineHandlers";
import { Button } from "@/components/ui/button";

import ChatHeader from "./chat/ChatHeader";
import ChatEmptyState from "./chat/ChatEmptyState";
import MessageList from "./chat/MessageList";
import MessageComposer from "@/components/orbit/MessageComposer";
import { useMessageLoader } from "./chat/useMessageLoader";
import { useAttachments } from "./chat/useAttachments";
import { useCallActions } from "./chat/useCallActions";
import { useMessageSelection } from "./chat/useMessageSelection";
import { useSecurityDialogs } from "./chat/useSecurityDialogs";

import { useMessageSender } from "@/hooks/useMessageSender";
import { usePaymentDialogs } from "@/hooks/usePaymentDialogs";
import { useTranslation } from "@/hooks/useTranslation";

import { useOrbitScrollManager } from "@/hooks/useOrbitScrollManager";
import { useOrbitComposerState } from "@/hooks/useOrbitComposerState";
import { useOrbitMessageActions } from "@/hooks/useOrbitMessageActions";
import { useOrbitThreadUiState } from "@/hooks/useOrbitThreadUiState";
import { OrbitPinnedBanner } from "@/components/orbit/OrbitPinnedBanner";
import { OrbitJumpToBottomButton } from "@/components/orbit/OrbitJumpToBottomButton";

import { useOrbitDevicePermissions } from "@/hooks/useOrbitDevicePermissions";
import { useOrbitCallState } from "@/hooks/useOrbitCallState";
import { useOrbitCallActions } from "@/hooks/useOrbitCallActions";
import { useOrbitCallHistory } from "@/hooks/useOrbitCallHistory";
// useOrbitCallRealtime REMOVED — it listened on call_sessions but RPC writes to call_logs.
// CallProvider.useIncomingCallListener is the canonical incoming call listener.
import { OrbitIncomingCallBar } from "@/components/orbit/OrbitIncomingCallBar";
import { OrbitCallControls } from "@/components/orbit/OrbitCallControls";
import { OrbitCallMiniPlayer } from "@/components/orbit/OrbitCallMiniPlayer";
import { OrbitCallPermissionBanner } from "@/components/orbit/OrbitCallPermissionBanner";
import { useOrbitAttachmentQueue } from "@/hooks/useOrbitAttachmentQueue";
import { useOrbitUploadTransport } from "@/hooks/useOrbitUploadTransport";
import { useOrbitAttachmentSend } from "@/hooks/useOrbitAttachmentSend";
import { useOrbitViewOnce } from "@/hooks/useOrbitViewOnce";
import { OrbitUploadQueuePreview } from "@/components/orbit/OrbitUploadQueuePreview";
import { OrbitMediaMessage } from "@/components/orbit/OrbitMediaMessage";
import { OrbitAttachmentViewer } from "@/components/orbit/OrbitAttachmentViewer";

// V2 only — no legacy SYSTEM_SENDER_ID needed

interface Props {
  thread: ConversationThread | null;
  onBack: () => void;
  onToggleContext: () => void;
  showContext: boolean;
  onThreadUpdate: (threadId: string, updates: Partial<ConversationThread>) => void;
}

export default function HudChatPanel({ thread, onBack, onToggleContext, onThreadUpdate }: Props) {
  const { user, orgId } = useAuth();
  const { t, locale } = useI18n();
  const myOrbitId = useOrbitIdentity()?.orbitId ?? null;
  const { ready: e2eReady, encrypt, decrypt } = useOrbitEncryption(user?.id);
  const offline = useOfflineMessages({ userId: user?.id, orgId: orgId || undefined, threadId: thread?.id });
  const { settings: privacySettings } = usePrivacySettings();
  const voiceRecorder = useVoiceRecorder();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [viewOnceEnabled, setViewOnceEnabled] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerAttachment, setViewerAttachment] = useState<any>(null);

  const selection = useMessageSelection();
  const security = useSecurityDialogs();
  const callActions = useCallActions(thread, orgId || null);

  const resolveAuthUserId = useCallback(async (): Promise<string | null> => {
    const { user, error } = await getAuthUser();
    if (error || !user?.id) {
      toast.error(t("orbit.session_expired") || "Session expired");
      return null;
    }
    return user.id;
  }, [t]);

  /** Resolve or auto-create V2 conversationId for this thread */
  const resolveConversationId = useCallback(async (authUserId: string): Promise<string | null> => {
    if (!thread) return null;
    if (thread.v2ConversationId) return thread.v2ConversationId;
    if (!thread.peerUserId) {
      toast.error("No conversation found. Open a thread first.");
      return null;
    }
    try {
      const { createOrGetDirectConversation } = await import("@/lib/orbit/createOrGetDirectConversation");
      const conv = await createOrGetDirectConversation({
        myUserId: authUserId,
        myOrbitId: myOrbitId,
        peerUserId: thread.peerUserId,
        peerOrbitId: thread.peerOrbitId,
      });
      onThreadUpdate(thread.id, { v2ConversationId: conv.id });
      return conv.id;
    } catch (err: any) {
      console.error("[HudChatPanel] auto-create conversation failed", err);
      toast.error("Failed to create conversation.");
      return null;
    }
  }, [thread, myOrbitId, onThreadUpdate]);

  const loader = useMessageLoader({
    thread,
    orgId: orgId || null,
    userId: user?.id,
    readReceipts: privacySettings.readReceipts,
    onThreadUpdate,
    offline,
  });

  const { messages: decryptedMessages } = useDecryptedMessages(loader.rawMessages, decrypt, user?.id);
  const messages = decryptedMessages as ChatMessage[];

  const { showOriginal, translatingMsgId, handleTranslateMessage } = useTranslation(locale, loader.setRawMessages as any);

  const messageSender = useMessageSender({
    thread,
    orgId,
    locale,
    myOrbitId,
    e2eReady,
    encrypt,
    offline,
    privacySettings,
    disappearTTL: security.disappearTTL,
    securityLevel: security.securityLevel as "normal" | "high" | "ghost",
    setSecurityLevel: security.setSecurityLevel as (l: "normal" | "high" | "ghost") => void,
    selectedCategory: "general",
    replyTo: selection.replyTo,
    setReplyTo: (r: any) => selection.setReplyTo(r),
    setRawMessages: loader.setRawMessages as any,
    setPendingOffline: loader.setPendingOffline,
    onThreadUpdate,
    resolveAuthUserId,
  });

  const attachments = useAttachments({
    thread,
    orgId: orgId || null,
    userId: user?.id,
    myOrbitId,
    locale,
    e2eReady,
    encrypt,
    resolveAuthUserId,
    onThreadUpdate,
  });

  const payment = usePaymentDialogs({ thread, orgId, locale, resolveAuthUserId });

  // Orbit Attachments Pro — Bloc 11
  const attachmentQueue = useOrbitAttachmentQueue();
  const uploadTransport = useOrbitUploadTransport();

  const attachmentSend = useOrbitAttachmentSend({
    conversationId: thread?.v2ConversationId ?? null,
    currentUserId: user?.id ?? null,
    currentOrbitId: myOrbitId ?? null,
    peerUserId: thread?.peerUserId ?? null,
    peerOrbitId: thread?.peerOrbitId ?? null,
    onAfterSend: () => loader.loadMessages(),
    onConversationCreated: (convId) => {
      if (thread) onThreadUpdate(thread.id, { v2ConversationId: convId });
    },
  });

  const viewOnceHook = useOrbitViewOnce({ currentUserId: user?.id ?? null });

  // Orbit UX Bloc 8 — scroll, composer, actions, thread UI
  const composer = useOrbitComposerState();

  const { showJumpToBottom, jumpToBottom } = useOrbitScrollManager(
    scrollRef,
    [messages.length, loader.typingIndicator]
  );

  const messageActions = useOrbitMessageActions({
    conversationId: thread?.v2ConversationId ?? null,
    currentUserId: user?.id ?? null,
    onAfterChange: () => {
      loader.loadMessages();
    },
  });

  const threadUi = useOrbitThreadUiState({
    conversationType: thread?.conversationType ?? null,
    metadata: (thread as any)?.metadata ?? null,
  });

  const pinnedMessage = useMemo(() => {
    if (!threadUi.pinnedMessageId) return null;
    return messages.find((m: any) => m.id === threadUi.pinnedMessageId) || null;
  }, [messages, threadUi.pinnedMessageId]);

  // Orbit Calls Pro — Bloc 10
  const devicePermissions = useOrbitDevicePermissions();
  const callStateV2 = useOrbitCallState();

  const callActionsV2 = useOrbitCallActions({
    currentUserId: user?.id ?? null,
    currentOrbitId: myOrbitId ?? null,
    activeCall: callStateV2.activeCall,
    patchCall: callStateV2.patchCall,
    setUiState: callStateV2.setUiState,
    endCall: callStateV2.endCall,
  });

  const callHistory = useOrbitCallHistory(myOrbitId ?? null);

  // NOTE: Incoming calls are handled by CallProvider.useIncomingCallListener (on call_logs table).
  // useOrbitCallRealtime was removed because it listened on call_sessions (wrong table).

  // Missed call timeout
  useEffect(() => {
    if (!callStateV2.activeCall?.sessionId) return;
    if (callStateV2.activeCall.uiState !== "incoming") return;
    const timer = window.setTimeout(() => {
      void (async () => {
        const { markCallAsMissedV2 } = await import("@/repositories/communication.repository");
        await markCallAsMissedV2(callStateV2.activeCall?.sessionId!, "timeout");
        callStateV2.endCall("missed");
      })();
    }, 30000);
    return () => window.clearTimeout(timer);
  }, [callStateV2.activeCall?.sessionId, callStateV2.activeCall?.uiState]);

  // Reconnect recovery
  useEffect(() => {
    if (!callStateV2.activeCall) return;
    if (callStateV2.activeCall.uiState !== "reconnecting") return;
    const timer = window.setTimeout(() => {
      callStateV2.patchCall({ uiState: "active", qualityState: "stable" });
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [callStateV2.activeCall?.uiState]);

  // ── Extracted hooks replace 290 lines of inline handlers ──
  const { handleStartAudioCall, handleStartVideoCall } = useHudCallSetup(
    thread, devicePermissions, callActionsV2, callStateV2
  );

  const { updateConversationStatus } = useHudConversationStatus(
    thread, loader.setConvStatus, onThreadUpdate
  );

  const { handleBookingAction } = useHudBookingActions(
    thread, orgId, user?.id, myOrbitId, onThreadUpdate
  );

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

  // Attachment file handlers
  const handlePickFiles = () => fileInputRef.current?.click();
  const handlePickCamera = () => cameraInputRef.current?.click();
  const handlePickGallery = () => fileInputRef.current?.click();

  const handleFilesSelected = (files: FileList | null) => {
    if (!files?.length) return;
    attachmentQueue.enqueueFiles(files);
  };

  const handleOpenAttachment = async (message: any, attachment: any) => {
    setViewerAttachment(attachment);
    setViewerOpen(true);
    if (attachment.viewOnce && thread?.v2ConversationId) {
      await viewOnceHook.markViewOnceOpened({
        messageId: message.id,
        conversationId: thread.v2ConversationId,
      });
    }
  };

  // Edit mode: inject original body into composer
  useEffect(() => {
    if (composer.editState) {
      messageSender.setNewMessage(composer.editState.originalBody);
    }
  }, [composer.editState]);

  const getCategoryIcon = useCallback((cat: string) => {
    return MESSAGE_CATEGORIES.find(c => c.value === cat)?.icon || "💬";
  }, []);

  // ── Extracted inline handlers (voice, location, view-once) ──
  const inlineHandlers = useHudInlineHandlers({
    thread,
    orgId: orgId || null,
    userId: user?.id,
    myOrbitId,
    e2eReady,
    encrypt,
    resolveAuthUserId,
    resolveConversationId,
    uploadToStorage: attachments.uploadToStorage,
    setUploading: attachments.setUploading,
    disappearTTL: security.disappearTTL,
    defaultDisappearTtl: privacySettings.defaultDisappearTtl,
    setSecurityLevel: security.setSecurityLevel as (l: string) => void,
    setViewOnceNext: security.setViewOnceNext,
    setShowLocationPicker: security.setShowLocationPicker,
    t,
  });

  const handleViewOnceUpload = inlineHandlers.handleViewOnceUpload;
  const handleVoiceSend = inlineHandlers.handleVoiceSend;
  const handleLocationSend = inlineHandlers.handleLocationSend;
  const voicePreview = inlineHandlers.voicePreview;
  const setVoicePreview = inlineHandlers.setVoicePreview;

  const empty = !thread;
  const visibleMessages = useMemo(() => messages, [messages]);
  const isLoadingMessages = loader.messagesLoading && messages.length === 0;

  if (empty) return <ChatEmptyState t={t} />;

  return (
    <>
      <div className="flex-1 min-h-0 flex flex-col" style={{ background: "hsl(var(--hud-bg))" }}>
        <ChatHeader
          thread={thread}
          convStatus={loader.convStatus}
          e2eReady={e2eReady}
          isInCall={callActions.isInCall}
          isStartingCall={callActions.isStartingCall}
          onBack={onBack}
          onStartCall={callActions.handleStartCall}
          onUpdateStatus={updateConversationStatus}
          onToggleContext={onToggleContext}
          onShowSecurityPanel={() => security.setShowSecurityPanel(true)}
          onShowSafetyNumber={() => security.setShowSafetyNumber(true)}
          onEnterSelectMode={() => { selection.setSelectMode(true); selection.setSelectedMsgIds(new Set()); }}
          t={t}
        />

        <DealContextHeader dealId={thread.dealId} contextType={thread.conversationType} contextId={thread.contextId} onToggleContext={onToggleContext} />


        <OrbitCallPermissionBanner
          mic={devicePermissions.permissions.microphone}
          cam={devicePermissions.permissions.camera}
          videoMode={callStateV2.activeCall?.mode === "video"}
          onRequestMic={() => { void devicePermissions.requestMicrophone(); }}
          onRequestCam={() => { void devicePermissions.requestCamera(); }}
        />

        <OrbitIncomingCallBar
          visible={callStateV2.activeCall?.uiState === "incoming"}
          peerName={callStateV2.activeCall?.peerName}
          mode={callStateV2.activeCall?.mode}
          onAccept={() => { void callActionsV2.acceptIncomingCall(); }}
          onDecline={() => { void callActionsV2.declineIncomingCall(); }}
        />

        {callStateV2.activeCall &&
          ["outgoing", "connecting", "active", "reconnecting"].includes(callStateV2.activeCall.uiState) && (
            <OrbitCallControls
              muted={callStateV2.activeCall.muted}
              speakerOn={callStateV2.activeCall.speakerOn}
              cameraOn={callStateV2.activeCall.cameraOn}
              isVideo={callStateV2.activeCall.mode === "video"}
              reconnecting={callStateV2.activeCall.uiState === "reconnecting"}
              onToggleMute={() => { void callActionsV2.toggleMute(); }}
              onToggleSpeaker={() => { void callActionsV2.toggleSpeaker(); }}
              onToggleCamera={() => { void callActionsV2.toggleCamera(); }}
              onHangup={() => { void callActionsV2.hangupCall(); }}
            />
          )}

        <OrbitCallMiniPlayer
          visible={!!callStateV2.activeCall && callStateV2.activeCall.uiState === "active"}
          peerName={callStateV2.activeCall?.peerName}
          state={callStateV2.activeCall?.uiState}
          mode={callStateV2.activeCall?.mode}
          muted={callStateV2.activeCall?.muted}
          onHangup={() => { void callActionsV2.hangupCall(); }}
        />

        <OrbitPinnedBanner
          pinnedBody={(pinnedMessage as any)?.content || null}
          onClick={() => {
            if (threadUi.pinnedMessageId) {
              const el = document.getElementById(`msg-${threadUi.pinnedMessageId}`);
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }}
          onUnpin={() => {
            if (threadUi.pinnedMessageId) {
              void messageActions.togglePinMessage(threadUi.pinnedMessageId, false);
            }
          }}
        />

        {selection.selectMode && (
          <MessageMultiSelectToolbar
            selectedIds={selection.selectedMsgIds}
            messages={visibleMessages as any[]}
            currentUserId={user?.id}
            currentContextId={thread?.contextId}
            userEmail={user?.email}
            userName={user?.user_metadata?.full_name || user?.email || "User"}
            onClearSelection={selection.clearSelection}
            onDeletedForMe={(ids) => selection.setHiddenMsgIds(prev => new Set([...prev, ...ids]))}
            onDeletedForAll={(ids) => loader.setRawMessages(prev => prev.map(m => ids.includes(m.id) ? { ...m, content: "🚫 This message was deleted", deleted_for_all: true, attachment_url: null, audio_url: null, audio_duration_seconds: null } as any : m))}
          />
        )}

        <div className="relative flex-1 min-h-0">
          {isLoadingMessages ? (
            <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 pb-6 space-y-4" style={{ background: "hsl(var(--hud-bg))" }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                  <div className="space-y-1.5" style={{ maxWidth: "75%" }}>
                    {i % 2 === 0 && <Skeleton className="h-2.5 w-16" />}
                    <Skeleton className={`h-10 rounded-2xl ${i % 2 === 0 ? "w-48 rounded-bl-md" : "w-40 rounded-br-md"}`} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <MessageList
              ref={scrollRef}
              messages={visibleMessages}
              rawCount={loader.rawMessages.length}
              isDecrypting={loader.rawMessages.length > 0 && visibleMessages.length === 0}
              typingIndicator={loader.typingIndicator}
              hiddenMsgIds={selection.hiddenMsgIds}
              selectedMsgIds={selection.selectedMsgIds}
              selectMode={selection.selectMode}
              pendingOffline={loader.pendingOffline}
              userId={user?.id}
              threadName={thread.name}
              locale={locale}
              showOriginal={showOriginal}
              translatingMsgId={translatingMsgId}
              onTranslate={handleTranslateMessage}
              onContextMenu={(_, msg, isMe) => {
                selection.setContextMessage({
                  msgId: msg.id,
                  content: msg.content,
                  isMe,
                  createdAt: msg.created_at,
                  hasAudio: !!(msg as any).audio_url,
                  hasAttachment: !!msg.attachment_url,
                  senderId: msg.sender_id,
                  canModerate: false,
                  isStarred: !!(msg as any).starred,
                });
              }}
              onToggleSelect={selection.toggleMsgSelect}
              getCategoryIcon={getCategoryIcon}
              t={t}
            />
          )}

          <OrbitJumpToBottomButton visible={showJumpToBottom} onClick={jumpToBottom} />
        </div>

        {(thread.conversationType === "booking" || thread.conversationType === "listing" || thread.conversationType === "deal") && (
          <div className="px-3 sm:px-4 py-2 shrink-0" style={{ borderTop: "1px solid hsl(var(--hud-border) / 0.06)", background: "hsl(var(--hud-surface) / 0.25)" }}>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {!thread.dealId && <Button size="sm" variant="outline" className="text-[11px] h-7 min-h-[44px] sm:min-h-0 gap-1.5 rounded-full px-3 shrink-0" onClick={onToggleContext}>Deal</Button>}
              <Button size="sm" variant="outline" className="text-[11px] h-7 min-h-[44px] sm:min-h-0 gap-1.5 rounded-full px-3 shrink-0" onClick={() => payment.setPaymentLinkDialog(true)}>{t("orbit.payment") || "Payment"}</Button>
              <Button size="sm" variant="outline" className="text-[11px] h-7 min-h-[44px] sm:min-h-0 gap-1.5 rounded-full px-3 shrink-0" onClick={() => payment.setRequestMoneyDialog(true)}>Request</Button>
              {thread.bookingStatus === "pending" && <Button size="sm" className="text-[11px] h-7 min-h-[44px] sm:min-h-0 gap-1.5 rounded-full px-3 shrink-0" onClick={() => handleBookingAction("confirm")}>{t("orbit.confirm") || "Confirm"}</Button>}
              {thread.bookingStatus === "confirmed" && <Button size="sm" variant="outline" className="text-[11px] h-7 min-h-[44px] sm:min-h-0 gap-1.5 rounded-full px-3 shrink-0" onClick={() => handleBookingAction("complete")}>{t("orbit.complete") || "Complete"}</Button>}
              {!(["cancelled", "completed"].includes(thread.bookingStatus || "")) && <Button size="sm" variant="ghost" className="text-[11px] h-7 min-h-[44px] sm:min-h-0 gap-1.5 rounded-full px-3 shrink-0" onClick={() => handleBookingAction("cancel")}>{t("orbit.cancel") || "Cancel"}</Button>}
            </div>
          </div>
        )}

        <MessageComposer
          value={messageSender.newMessage}
          sending={messageSender.sending}
          uploading={attachments.uploading}
          voiceRecording={voiceRecorder.recording}
          voicePreview={voicePreview}
          voiceDuration={voiceRecorder.duration}
          replyTo={selection.replyTo ? { content: selection.replyTo.content, senderName: selection.replyTo.senderName } : null}
          onChange={messageSender.setNewMessage}
          onSend={async () => {
            if (composer.editState) {
              await messageActions.editMessage(composer.editState.messageId, messageSender.newMessage.trim());
              messageSender.setNewMessage("");
              composer.setEditState(null);
              return;
            }
            await messageSender.handleSend();
            composer.setReplyState(null);
          }}
          onKeyDown={messageSender.handleKeyDown}
          onTyping={() => loader.broadcastTyping(privacySettings.typingIndicators)}
          attachmentActions={{
            onFileUpload: attachments.handleFileUpload,
            onCameraCapture: attachments.handleFileUpload,
            onLocation: () => security.setShowLocationPicker(true),
            onViewOnce: handleViewOnceUpload,
          }}
          onStartVoice={async () => {
            try {
              await voiceRecorder.start();
            } catch {
              toast.error(t("orbit.mic_denied") || "Microphone access denied");
            }
          }}
          onStopVoice={async () => {
            const result = await voiceRecorder.stop();
            setVoicePreview(result);
            return result;
          }}
          onCancelVoice={voiceRecorder.cancel}
          onSendVoice={handleVoiceSend}
          onDiscardVoice={() => {
            if (voicePreview) URL.revokeObjectURL(voicePreview.url);
            setVoicePreview(null);
          }}
          onClearReply={() => selection.setReplyTo(null)}
        />

        {/* Attachment queue preview only — media/attachment picker bars removed to prevent overlap */}

        <OrbitUploadQueuePreview
          queue={attachmentQueue.queue}
          onRemove={attachmentQueue.removeQueueItem}
        />

        {attachmentQueue.queue.length > 0 && (
          <div className="px-3 py-2 flex justify-end" style={{ borderTop: "1px solid hsl(var(--border) / 0.08)" }}>
            <button
              onClick={() => { void handleUploadAndSendAttachments(); }}
              className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-medium"
              disabled={attachmentSend.sendingAttachments}
            >
              {attachmentSend.sendingAttachments ? "Sending..." : "Send attachments"}
            </button>
          </div>
        )}

        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleFilesSelected(e.target.files)} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFilesSelected(e.target.files)} />
      </div>

      <Sheet open={payment.paymentLinkDialog} onOpenChange={payment.setPaymentLinkDialog}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto p-0">
          <OrbitSmartPayment
            recipientUserId={thread.peerUserId || thread.tenantId || thread.contextId || null}
            recipientName={thread.name || "Recipient"}
            context={thread.contextType ? { type: thread.contextType as any, id: thread.contextId, label: thread.serviceTitle || thread.propertyLabel || thread.listingTitle } : undefined}
            threadId={thread.v2ConversationId || thread.threadId || thread.id}
            defaultCurrency={thread.currency?.toUpperCase()}
            onSuccess={(conf: PaymentConfirmation) => {
              payment.setPaymentLinkDialog(false);
              void (async () => {
                const authUserId = await resolveAuthUserId();
                if (!authUserId || !orgId) return;
                const peerId = thread.peerUserId || thread.tenantId || thread.contextId || thread.id;
                try {
                  await sendPaymentReceiptToThread({
                    threadId: thread.threadId || thread.id,
                    senderId: authUserId,
                    orgId,
                    transactionId: conf.txnId,
                    amount: conf.amount,
                    currency: conf.currency,
                    recipientName: conf.recipientName || thread.name,
                    title: conf.status === "completed" ? "Payment sent" : "Payment initiated",
                    contextType: thread.contextType,
                    contextId: thread.contextId,
                    tenantId: thread.tenantId,
                    bookingId: thread.bookingId,
                    bookingType: thread.bookingType,
                    encrypt: e2eReady ? encrypt : undefined,
                    peerId: e2eReady ? peerId : null,
                  });
                } catch {}
              })();
              toast.success(conf.status === "completed" ? "Payment sent" : "Payment initiated");
            }}
            onCancel={() => payment.setPaymentLinkDialog(false)}
          />
        </SheetContent>
      </Sheet>

      <RequestMoneyModal
        open={payment.requestMoneyDialog}
        onClose={() => payment.setRequestMoneyDialog(false)}
        recipientId={thread.peerUserId || thread.tenantId || thread.contextId || null}
        contextId={thread.threadId || thread.id || null}
        onCreated={async (req) => {
          const authUserId = await resolveAuthUserId();
          if (!authUserId || !orgId) return;
          const peerId = thread.peerUserId || thread.tenantId || thread.contextId || thread.id;
          try {
            await sendPaymentRequestMessageToThread({
              threadId: thread.threadId || thread.id,
              senderId: authUserId,
              orgId,
              request: req,
              tenantId: thread.tenantId,
              bookingId: thread.bookingId,
              bookingType: thread.bookingType,
              contextType: thread.contextType,
              contextId: thread.contextId,
              encrypt: e2eReady ? encrypt : undefined,
              peerId: e2eReady ? peerId : null,
            });
          } catch {}
          toast.success(t("orbit.payment_request_sent") || "Payment request sent in chat");
        }}
      />

      <MessageContextMenu
        message={selection.contextMessage}
        onClose={() => selection.setContextMessage(null)}
        onDeleted={(msgId, type) => {
          if (type === "self") selection.setHiddenMsgIds(prev => new Set([...prev, msgId]));
          else loader.setRawMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: "🚫 This message was deleted", message_type: "system", attachment_url: null, audio_url: undefined, audio_duration_seconds: undefined, deleted_for_all: true } as any : m));
        }}
        onCopy={() => {}}
        onEdited={(msgId, newContent) => loader.setRawMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: newContent, edited_at: new Date().toISOString() } as any : m))}
        onReply={(msgId, content, senderName) => selection.setReplyTo({ msgId, content, senderName })}
        onForward={(msgId, content) => selection.setForwardData({ messageId: msgId, content })}
        onStarToggle={(msgId, starred) => loader.setRawMessages(prev => prev.map(m => m.id === msgId ? { ...m, starred } as any : m))}
        onEnterSelectMode={selection.enterSelectMode}
      />

      <ChatLocationPicker open={security.showLocationPicker} onClose={() => security.setShowLocationPicker(false)} onSend={handleLocationSend} />
      <OrbitSafetyNumber peerId={thread.peerUserId || thread.tenantId || thread.contextId || thread.id || ""} peerName={thread.name || "Contact"} open={security.showSafetyNumber} onOpenChange={security.setShowSafetyNumber} />
      <OrbitSecurityPanel peerId={thread.peerUserId || thread.tenantId || thread.contextId || thread.id || ""} peerName={thread.name || "Contact"} open={security.showSecurityPanel} onOpenChange={security.setShowSecurityPanel} />

      {selection.forwardData && (
        <ForwardMessageDialog
          open={!!selection.forwardData}
          onClose={() => selection.setForwardData(null)}
          messageContent={selection.forwardData.content}
          messageId={selection.forwardData.messageId}
          userId={user?.id || ""}
          userEmail={user?.email || ""}
          userName={user?.user_metadata?.full_name || user?.email || "User"}
          currentContextId={thread.contextId || ""}
        />
      )}

      <OrbitAttachmentViewer
        open={viewerOpen}
        attachment={viewerAttachment}
        onClose={() => { setViewerOpen(false); setViewerAttachment(null); }}
      />
    </>
  );
}
