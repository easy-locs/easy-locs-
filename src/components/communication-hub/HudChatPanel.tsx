/**
 * HudChatPanel — Thread Shell.
 * Thin assembly layer that composes canonical family hooks.
 * Contains NO business logic — only wiring.
 */
import { useCallback } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";

// ── Canonical families ──
import { useAuth } from "@/families/auth";
import { useResolveAuthUserId } from "@/families/auth";
import { useOrbitIdentity } from "@/families/identity";
import { useOrbitEncryption } from "@/hooks/useOrbitEncryption";
import { useOfflineMessages } from "@/hooks/useOfflineMessages";
import { usePrivacySettings } from "@/hooks/usePrivacySettings";

import type { ConversationThread } from "./types";

// Canonical family hooks
import { useThreadCallFamily } from "@/hooks/orbit/families/useThreadCallFamily";
import { useThreadAttachmentFamily } from "@/hooks/orbit/families/useThreadAttachmentFamily";
import { useThreadComposerFamily } from "@/hooks/orbit/families/useThreadComposerFamily";
import { useThreadMessageFamily } from "@/hooks/orbit/families/useThreadMessageFamily";

// Canonical UI components (presentational)
import ChatHeader from "./chat/ChatHeader";
import ChatEmptyState from "./chat/ChatEmptyState";
import MessageList from "./chat/MessageList";
import MessageComposer from "@/components/orbit/MessageComposer";
import MessageContextMenu from "./MessageContextMenu";
import MessageMultiSelectToolbar from "./MessageMultiSelect";
import DealContextHeader from "./DealContextHeader";
import ChatLocationPicker from "./ChatLocationPicker";
import ForwardMessageDialog from "@/components/communication/ForwardMessageDialog";
import OrbitSafetyNumber from "@/components/orbit/OrbitSafetyNumber";
import OrbitSecurityPanel from "@/components/orbit/OrbitSecurityPanel";
import OrbitSmartPayment, { type PaymentConfirmation } from "@/components/orbit/payments/OrbitSmartPayment";
import { RequestMoneyModal } from "@/components/chat/RequestMoneyModal";
import { sendPaymentRequestMessageToThread, sendPaymentReceiptToThread } from "@/components/chat/ChatPaymentCards";
import { OrbitPinnedBanner } from "@/components/orbit/OrbitPinnedBanner";
import { OrbitJumpToBottomButton } from "@/components/orbit/OrbitJumpToBottomButton";
import { OrbitIncomingCallBar } from "@/components/orbit/OrbitIncomingCallBar";
import { OrbitCallControls } from "@/components/orbit/OrbitCallControls";
import { OrbitCallMiniPlayer } from "@/components/orbit/OrbitCallMiniPlayer";
import { OrbitCallPermissionBanner } from "@/components/orbit/OrbitCallPermissionBanner";
import { OrbitUploadQueuePreview } from "@/components/orbit/OrbitUploadQueuePreview";
import { OrbitAttachmentViewer } from "@/components/orbit/OrbitAttachmentViewer";

import { useSecurityDialogs } from "./chat/useSecurityDialogs";
import { usePaymentDialogs } from "@/hooks/usePaymentDialogs";
import { useHudConversationStatus } from "@/hooks/orbit/useHudConversationStatus";
import { useHudBookingActions } from "@/hooks/orbit/useHudBookingActions";

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

  const security = useSecurityDialogs();

  // ── Identity resolver (canonical family) ──
  const resolveAuthUserId = useResolveAuthUserId(t);

  // ── FAMILY: Messages ──
  const msgFamily = useThreadMessageFamily({
    thread, orgId: orgId || null, userId: user?.id, myOrbitId, locale,
    e2eReady, encrypt, decrypt, offline, privacySettings,
    disappearTTL: security.disappearTTL,
    securityLevel: security.securityLevel as string,
    setSecurityLevel: security.setSecurityLevel as (l: string) => void,
    replyTo: null, setReplyTo: () => {},
    resolveAuthUserId, onThreadUpdate,
  });

  // ── FAMILY: Attachments ──
  const attFamily = useThreadAttachmentFamily({
    thread, orgId: orgId || null, userId: user?.id, myOrbitId, locale,
    e2eReady, encrypt, resolveAuthUserId, onThreadUpdate,
    onAfterSend: () => msgFamily.loader.loadMessages(),
  });

  // ── FAMILY: Composer ──
  const compFamily = useThreadComposerFamily({
    thread, orgId: orgId || null, userId: user?.id, myOrbitId,
    e2eReady, encrypt, resolveAuthUserId, resolveConversationId,
    uploadToStorage: attFamily.attachments.uploadToStorage,
    setUploading: attFamily.attachments.setUploading,
    disappearTTL: security.disappearTTL,
    defaultDisappearTtl: privacySettings.defaultDisappearTtl,
    setSecurityLevel: security.setSecurityLevel as (l: string) => void,
    setViewOnceNext: security.setViewOnceNext,
    setShowLocationPicker: security.setShowLocationPicker,
    setNewMessage: msgFamily.messageSender.setNewMessage,
    t,
  });

  // ── FAMILY: Calls ──
  const callFamily = useThreadCallFamily({
    thread, currentUserId: user?.id ?? null, currentOrbitId: myOrbitId,
  });

  // ── FAMILY: Payments ──
  const payment = usePaymentDialogs({ thread, orgId, locale, resolveAuthUserId });

  // ── Thread-level helpers ──
  const { updateConversationStatus } = useHudConversationStatus(
    thread, msgFamily.loader.setConvStatus, onThreadUpdate
  );
  const { handleBookingAction } = useHudBookingActions(
    thread, orgId, user?.id, myOrbitId, onThreadUpdate
  );

  // ── Short aliases ──
  const { selection, messages, loader, messageSender, messageActions, threadUi, pinnedMessage } = msgFamily;

  if (!thread) return <ChatEmptyState t={t} />;

  return (
    <>
      <div className="flex-1 min-h-0 flex flex-col" style={{ background: "hsl(var(--hud-bg))" }}>
        {/* ── HEADER FAMILY ── */}
        <ChatHeader
          thread={thread}
          convStatus={loader.convStatus}
          e2eReady={e2eReady}
          isInCall={callFamily.callState.hasActiveCall}
          isStartingCall={callFamily.callActions.busy}
          onBack={onBack}
          onStartCall={(isVideo) => void (isVideo ? callFamily.handleStartVideoCall() : callFamily.handleStartAudioCall())}
          onUpdateStatus={updateConversationStatus}
          onToggleContext={onToggleContext}
          onShowSecurityPanel={() => security.setShowSecurityPanel(true)}
          onShowSafetyNumber={() => security.setShowSafetyNumber(true)}
          onEnterSelectMode={() => { selection.setSelectMode(true); selection.setSelectedMsgIds(new Set()); }}
          t={t}
        />

        <DealContextHeader dealId={thread.dealId} contextType={thread.conversationType} contextId={thread.contextId} onToggleContext={onToggleContext} />

        {/* ── CALL FAMILY UI ── */}
        <OrbitCallPermissionBanner
          mic={callFamily.devicePermissions.permissions.microphone}
          cam={callFamily.devicePermissions.permissions.camera}
          videoMode={callFamily.callState.activeCall?.mode === "video"}
          onRequestMic={() => void callFamily.devicePermissions.requestMicrophone()}
          onRequestCam={() => void callFamily.devicePermissions.requestCamera()}
        />
        <OrbitIncomingCallBar
          visible={callFamily.callState.activeCall?.uiState === "incoming"}
          peerName={callFamily.callState.activeCall?.peerName}
          mode={callFamily.callState.activeCall?.mode}
          onAccept={() => void callFamily.callActions.acceptIncomingCall()}
          onDecline={() => void callFamily.callActions.declineIncomingCall()}
        />
        {callFamily.callState.activeCall &&
          ["outgoing", "connecting", "active", "reconnecting"].includes(callFamily.callState.activeCall.uiState) && (
            <OrbitCallControls
              muted={callFamily.callState.activeCall.muted}
              speakerOn={callFamily.callState.activeCall.speakerOn}
              cameraOn={callFamily.callState.activeCall.cameraOn}
              isVideo={callFamily.callState.activeCall.mode === "video"}
              reconnecting={callFamily.callState.activeCall.uiState === "reconnecting"}
              onToggleMute={() => void callFamily.callActions.toggleMute()}
              onToggleSpeaker={() => void callFamily.callActions.toggleSpeaker()}
              onToggleCamera={() => void callFamily.callActions.toggleCamera()}
              onHangup={() => void callFamily.callActions.hangupCall()}
            />
          )}
        <OrbitCallMiniPlayer
          visible={!!callFamily.callState.activeCall && callFamily.callState.activeCall.uiState === "active"}
          peerName={callFamily.callState.activeCall?.peerName}
          state={callFamily.callState.activeCall?.uiState}
          mode={callFamily.callState.activeCall?.mode}
          muted={callFamily.callState.activeCall?.muted}
          onHangup={() => void callFamily.callActions.hangupCall()}
        />

        {/* ── PINNED MESSAGE ── */}
        <OrbitPinnedBanner
          pinnedBody={(pinnedMessage as any)?.content || null}
          onClick={() => {
            if (threadUi.pinnedMessageId) {
              document.getElementById(`msg-${threadUi.pinnedMessageId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }}
          onUnpin={() => {
            if (threadUi.pinnedMessageId) void messageActions.togglePinMessage(threadUi.pinnedMessageId, false);
          }}
        />

        {/* ── SELECTION FAMILY UI ── */}
        {selection.selectMode && (
          <MessageMultiSelectToolbar
            selectedIds={selection.selectedMsgIds}
            messages={messages as any[]}
            currentUserId={user?.id}
            currentContextId={thread?.contextId}
            userEmail={user?.email}
            userName={user?.user_metadata?.full_name || user?.email || "User"}
            onClearSelection={selection.clearSelection}
            onDeletedForMe={(ids) => selection.setHiddenMsgIds(prev => new Set([...prev, ...ids]))}
            onDeletedForAll={(ids) => loader.setRawMessages(prev => prev.map(m => ids.includes(m.id) ? { ...m, content: "🚫 This message was deleted", deleted_for_all: true, attachment_url: null, audio_url: null, audio_duration_seconds: null } as any : m))}
          />
        )}

        {/* ── MESSAGE LIST FAMILY UI ── */}
        <div className="relative flex-1 min-h-0 flex flex-col">
          {msgFamily.isLoadingMessages ? (
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
              ref={msgFamily.scrollRef}
              messages={messages}
              rawCount={loader.rawMessages.length}
              isDecrypting={loader.rawMessages.length > 0 && messages.length === 0}
              typingIndicator={loader.typingIndicator}
              hiddenMsgIds={selection.hiddenMsgIds}
              selectedMsgIds={selection.selectedMsgIds}
              selectMode={selection.selectMode}
              pendingOffline={loader.pendingOffline}
              userId={user?.id}
              threadName={thread.name}
              locale={locale}
              showOriginal={msgFamily.showOriginal}
              translatingMsgId={msgFamily.translatingMsgId}
              onTranslate={msgFamily.handleTranslateMessage}
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
              getCategoryIcon={msgFamily.getCategoryIcon}
              t={t}
            />
          )}
          <OrbitJumpToBottomButton visible={msgFamily.showJumpToBottom} onClick={msgFamily.jumpToBottom} />
        </div>

        {/* ── DEAL ACTIONS ── */}
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

        {/* ── COMPOSER FAMILY UI ── */}
        <MessageComposer
          value={messageSender.newMessage}
          sending={messageSender.sending}
          uploading={attFamily.attachments.uploading}
          voiceRecording={compFamily.voiceRecorder.recording}
          voicePreview={compFamily.voicePreview}
          voiceDuration={compFamily.voiceRecorder.duration}
          replyTo={selection.replyTo ? { content: selection.replyTo.content, senderName: selection.replyTo.senderName } : null}
          onChange={messageSender.setNewMessage}
          onSend={async () => {
            if (compFamily.composer.editState) {
              await messageActions.editMessage(compFamily.composer.editState.messageId, messageSender.newMessage.trim());
              messageSender.setNewMessage("");
              compFamily.composer.setEditState(null);
              return;
            }
            await messageSender.handleSend();
            compFamily.composer.setReplyState(null);
          }}
          onKeyDown={messageSender.handleKeyDown}
          onTyping={() => loader.broadcastTyping(privacySettings.typingIndicators)}
          attachmentActions={{
            onFileUpload: attFamily.attachments.handleFileUpload,
            onCameraCapture: attFamily.attachments.handleFileUpload,
            onLocation: () => security.setShowLocationPicker(true),
            onViewOnce: compFamily.handleViewOnceUpload,
          }}
          onStartVoice={compFamily.startVoice}
          onStopVoice={compFamily.stopVoice}
          onCancelVoice={compFamily.cancelVoice}
          onSendVoice={compFamily.handleVoiceSend}
          onDiscardVoice={compFamily.discardVoice}
          onClearReply={() => selection.setReplyTo(null)}
        />

        {/* ── ATTACHMENT QUEUE ── */}
        <OrbitUploadQueuePreview
          queue={attFamily.attachmentQueue.queue}
          onRemove={attFamily.attachmentQueue.removeQueueItem}
        />
        {attFamily.attachmentQueue.queue.length > 0 && (
          <div className="px-3 py-2 flex justify-end" style={{ borderTop: "1px solid hsl(var(--border) / 0.08)" }}>
            <button
              onClick={() => void attFamily.handleUploadAndSendAttachments()}
              className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-medium"
              disabled={attFamily.attachmentSend.sendingAttachments}
            >
              {attFamily.attachmentSend.sendingAttachments ? "Sending..." : "Send attachments"}
            </button>
          </div>
        )}

        <input ref={attFamily.fileInputRef} type="file" multiple className="hidden" onChange={(e) => attFamily.handleFilesSelected(e.target.files)} />
        <input ref={attFamily.cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => attFamily.handleFilesSelected(e.target.files)} />
      </div>

      {/* ── PAYMENT FAMILY DIALOGS ── */}
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

      {/* ── CONTEXT MENU / FORWARD / SECURITY DIALOGS ── */}
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

      <ChatLocationPicker open={security.showLocationPicker} onClose={() => security.setShowLocationPicker(false)} onSend={compFamily.handleLocationSend} />
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
        open={attFamily.viewerOpen}
        attachment={attFamily.viewerAttachment}
        onClose={() => { attFamily.setViewerOpen(false); attFamily.setViewerAttachment(null); }}
      />
    </>
  );
}
