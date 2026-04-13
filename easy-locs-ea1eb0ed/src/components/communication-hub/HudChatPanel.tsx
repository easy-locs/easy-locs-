/**
 * HudChatPanel — Thread Shell (Thin Facade).
 * Composes canonical family hooks via micro-bridges.
 * Contains NO business logic — only wiring + layout.
 */
import React, { useCallback, useRef, memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

// ── Auth / Identity ──
import { useAuth, useResolveAuthUserId } from "@/families/auth";
import { useOrbitIdentity } from "@/families/identity";
import { useOrbitEncryption } from "@/hooks/useOrbitEncryption";
import { useOfflineMessages } from "@/hooks/useOfflineMessages";
import { usePrivacySettings } from "@/hooks/usePrivacySettings";
import { useCall } from "@/components/call/CallProvider";

import type { ConversationThread } from "./types";

// ── Canonical family hooks ──
import { useThreadCallFamily } from "@/hooks/orbit/families/useThreadCallFamily";
import { useThreadAttachmentFamily } from "@/hooks/orbit/families/useThreadAttachmentFamily";
import { useThreadComposerFamily } from "@/hooks/orbit/families/useThreadComposerFamily";
import { useThreadMessageFamily } from "@/hooks/orbit/families/useThreadMessageFamily";

// ── Micro-bridges ──
import {
  useHudSendBridge,
  useHudComposerBridge,
  useHudOverlayBridge,
  useHudSelectionBridge,
  useHudContextMenuBridge,
  useHudMultiPhotoSendBridge,
  useHudMessageMutationBridge,
} from "./chat/bridges";

// ── Canonical UI components ──
import ChatHeader from "./chat/ChatHeader";
import ChatEmptyState from "./chat/ChatEmptyState";
import MessageList from "./chat/MessageList";
import { ComposerShell } from "@/components/orbit/composer";
import MessageContextMenu from "./MessageContextMenu";
import MessageMultiSelectToolbar from "./MessageMultiSelect";
import DealContextHeader from "./DealContextHeader";
import ChatLocationPicker from "./ChatLocationPicker";
import ForwardMessageDialog from "@/components/communication/ForwardMessageDialog";
import OrbitSafetyNumber from "@/components/orbit/OrbitSafetyNumber";
import OrbitSelectionToolbar from "@/components/orbit/OrbitSelectionToolbar";
import OrbitSecurityPanel from "@/components/orbit/OrbitSecurityPanel";
import OrbitSmartPayment, { type PaymentConfirmation } from "@/components/orbit/payments/OrbitSmartPayment";
import { RequestMoneyModal } from "@/components/chat/RequestMoneyModal";
import { sendPaymentRequestMessageToThread, sendPaymentReceiptToThread } from "@/components/chat/ChatPaymentCards";
import { OrbitPinnedBanner } from "@/components/orbit/OrbitPinnedBanner";
import { OrbitJumpToBottomButton } from "@/components/orbit/OrbitJumpToBottomButton";
import { OrbitCallPermissionBanner } from "@/components/orbit/OrbitCallPermissionBanner";
import { LocationViewerOverlay } from "@/components/communication-hub/chat/LocationViewerOverlay";
import { OrbitUploadQueuePreview } from "@/components/orbit/OrbitUploadQueuePreview";
import { OrbitAttachmentViewer } from "@/components/orbit/OrbitAttachmentViewer";
import { MediaPreviewSheet } from "@/components/orbit/MediaPreviewSheet";
import { FullscreenMediaViewer } from "@/components/orbit/FullscreenMediaViewer";
import { useMediaPreviewState } from "@/families/media/media-preview-state";
import { useMediaPreviewSend } from "@/hooks/orbit/useMediaPreviewSend";
import { ContactProfileSheet } from "@/components/orbit/ContactProfileSheet";
import { MultiPhotoSelect } from "@/components/orbit/MultiPhotoSelect";

import { useSecurityDialogs } from "./chat/useSecurityDialogs";
import { usePaymentDialogs } from "@/hooks/usePaymentDialogs";
import { useHudConversationStatus } from "@/hooks/orbit/useHudConversationStatus";
import { useHudBookingActions } from "@/hooks/orbit/useHudBookingActions";
import { useHudConversationResolver } from "@/hooks/orbit/useHudConversationResolver";
import { useOrbitComposerStore } from "@/stores/orbit/composer.store";

interface Props {
  thread: ConversationThread | null;
  onBack: () => void;
  onToggleContext: () => void;
  showContext: boolean;
  onThreadUpdate: (threadId: string, updates: Partial<ConversationThread>) => void;
}

const VOLATILE_THREAD_KEYS = new Set([
  'unreadCount', 'lastMessage', 'lastMessageTime', 'lastMessagePreview',
  'lastMessageTimestamp', 'updatedAt',
]);

function arePropsEqual(prev: Props, next: Props): boolean {
  if (prev.showContext !== next.showContext) return false;
  if (prev.onBack !== next.onBack) return false;
  if (prev.onToggleContext !== next.onToggleContext) return false;
  if (prev.onThreadUpdate !== next.onThreadUpdate) return false;

  const pt = prev.thread;
  const nt = next.thread;
  if (pt === nt) return true;
  if (!pt || !nt) return pt === nt;

  const allKeys = new Set([...Object.keys(pt), ...Object.keys(nt)]);
  for (const k of allKeys) {
    if (VOLATILE_THREAD_KEYS.has(k)) continue;
    if ((pt as any)[k] !== (nt as any)[k]) return false;
  }
  return true;
}

const HudChatPanelInner = memo(function HudChatPanelInner({ thread, onBack, onToggleContext, onThreadUpdate }: Props) {
  const { user, orgId } = useAuth();
  const { t, locale } = useI18n();
  const myOrbitId = useOrbitIdentity()?.orbitId ?? null;
  const { ready: e2eReady, encrypt, decrypt } = useOrbitEncryption(user?.id);
  const offline = useOfflineMessages({ userId: user?.id, orgId: orgId || undefined, threadId: thread?.id });
  const { settings: privacySettings } = usePrivacySettings();

  const security = useSecurityDialogs();
  const currentConversationId = thread?.conversationId || thread?.v2ConversationId || thread?.id || "";

  // ── Micro-bridges ──
  const overlayBridge = useHudOverlayBridge(thread);
  const selectionBridge = useHudSelectionBridge(currentConversationId);

  // ── Identity resolver ──
  const resolveAuthUserId = useResolveAuthUserId(t);
  const { resolveConversationId } = useHudConversationResolver({ thread, myOrbitId, onThreadUpdate, t });

  // ── FAMILY: Messages ──
  const msgFamily = useThreadMessageFamily({
    thread, orgId: orgId || null, userId: user?.id, myOrbitId, locale,
    e2eReady, encrypt, decrypt, offline, privacySettings,
    disappearTTL: security.disappearTTL,
    securityLevel: security.securityLevel as string,
    setSecurityLevel: security.setSecurityLevel as (l: string) => void,
    resolveAuthUserId, onThreadUpdate,
  });

  // ── FAMILY: Attachments ──
  const loadMessagesRef = useRef(msgFamily.loader.loadMessages);
  loadMessagesRef.current = msgFamily.loader.loadMessages;
  const stableOnAfterSend = useCallback(() => { loadMessagesRef.current(); }, []);

  const attFamily = useThreadAttachmentFamily({
    thread, orgId: orgId || null, userId: user?.id, myOrbitId, locale,
    e2eReady, encrypt, resolveAuthUserId, onThreadUpdate,
    onAfterSend: stableOnAfterSend,
  });

  const storeDraft = useOrbitComposerStore(s => s.drafts[currentConversationId] ?? "");
  const setStoreDraft = useCallback((v: string) => useOrbitComposerStore.getState().setDraft(currentConversationId, v), [currentConversationId]);

  const compFamily = useThreadComposerFamily({
    thread, orgId: orgId || null, userId: user?.id, myOrbitId,
    e2eReady, encrypt, resolveAuthUserId, resolveConversationId,
    setUploading: attFamily.attachments.setUploading,
    disappearTTL: security.disappearTTL,
    defaultDisappearTtl: privacySettings.defaultDisappearTtl,
    setSecurityLevel: security.setSecurityLevel as (l: string) => void,
    setViewOnceNext: security.setViewOnceNext,
    setShowLocationPicker: security.setShowLocationPicker,
    setNewMessage: setStoreDraft,
    setRawMessages: msgFamily.loader.setRawMessages as (msgs: unknown[]) => void,
    t,
  });

  // ── FAMILY: Calls ──
  const callFamily = useThreadCallFamily({
    thread, currentUserId: user?.id ?? null, currentOrbitId: myOrbitId,
  });
  const { isInCall, isStartingCall: isStartingCallProvider } = useCall();

  const mediaPreviewSend = useMediaPreviewSend({
    conversationId: thread?.conversationId || thread?.v2ConversationId || null,
    userId: user?.id, myOrbitId,
    peerOrbitId: thread?.peerOrbitId ?? null,
    orgId: orgId || null, resolveConversationId,
    disappearTTL: security.disappearTTL,
  });

  // ── FAMILY: Payments ──
  const payment = usePaymentDialogs({ thread, orgId, locale, resolveAuthUserId });

  // ── Thread-level helpers ──
  const { updateConversationStatus } = useHudConversationStatus(thread, msgFamily.loader.setConvStatus, onThreadUpdate);
  const { handleBookingAction } = useHudBookingActions(thread, orgId, user?.id, myOrbitId, onThreadUpdate);

  // ── Short aliases ──
  const { selection, messages, loader, messageSender, messageActions, threadUi, pinnedMessage } = msgFamily;

  // ── Bridge: Message mutations (delete/edit/star local state) ──
  const mutations = useHudMessageMutationBridge({
    setRawMessages: loader.setRawMessages as (msgs: unknown[]) => void,
    setHiddenMsgIds: selection.setHiddenMsgIds,
  });

  // ── Bridge: Send ──
  const { stableHandleSend } = useHudSendBridge(currentConversationId, messageSender, messageActions, msgFamily.scrollToBottomInstant);

  // ── Bridge: Context menu ──
  const { stableContextMenu } = useHudContextMenuBridge(selection.setContextMessage);

  // ── Bridge: Typing ──
  const broadcastTypingRef = useRef(loader.broadcastTyping);
  broadcastTypingRef.current = loader.broadcastTyping;
  const typingIndicatorsRef = useRef(privacySettings.typingIndicators);
  typingIndicatorsRef.current = privacySettings.typingIndicators;

  const handleTyping = useCallback(
    () => broadcastTypingRef.current(typingIndicatorsRef.current),
    [],
  );

  const onOpenMultiPhoto = useCallback(() => overlayBridge.setShowMultiPhoto(true), [overlayBridge.setShowMultiPhoto]);

  // ── Bridge: Composer props ──
  const composerProps = useHudComposerBridge({
    conversationId: currentConversationId,
    compFamily, attFamily, security,
    stableHandleSend,
    onTyping: handleTyping,
    onOpenMultiPhoto,
  });

  // ── Bridge: Multi-photo send ──
  const { handleMultiPhotoSend } = useHudMultiPhotoSendBridge(thread, orgId);

  // ── Early return ──
  if (!thread) return <ChatEmptyState t={t} />;

  return (
    <>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden" style={{ background: "hsl(var(--background))" }}>
        {/* ── HEADER ── */}
        <ChatHeader
          thread={thread}
          convStatus={loader.convStatus}
          e2eReady={e2eReady}
          isInCall={isInCall}
          isStartingCall={isStartingCallProvider}
          onBack={onBack}
          onStartCall={(isVideo) => void (isVideo ? callFamily.handleStartVideoCall() : callFamily.handleStartAudioCall())}
          onUpdateStatus={updateConversationStatus}
          onToggleContext={onToggleContext}
          onShowSecurityPanel={() => security.setShowSecurityPanel(true)}
          onShowSafetyNumber={() => security.setShowSafetyNumber(true)}
          onEnterSelectMode={() => { selection.clearSelection(); }}
          onAvatarTap={() => overlayBridge.setShowContactProfile(true)}
          onSearchMessages={undefined}
          onMuteToggle={() => { onThreadUpdate(thread.id, { muted: !thread.muted }); toast.success(thread.muted ? t("orbit.unmuted_success", { name: thread.name }) : t("orbit.muted_success", { name: thread.name })); }}
          onClearChat={() => { onThreadUpdate(thread.id, { lastMessage: undefined, unreadCount: 0, clearedAt: new Date().toISOString() }); toast.success(t("orbit.cleared_success", { name: thread.name })); }}
          onBlockContact={() => { onThreadUpdate(thread.id, { archived: true, muted: true }); toast.success(t("orbit.blocked_success", { name: thread.name })); }}
          onDisappearTimerChange={(timer) => security.setDisappearTTL(timer)}
          disappearTTL={security.disappearTTL}
          t={t}
        />
        <DealContextHeader dealId={thread.dealId} contextType={thread.conversationType} contextId={thread.entityId} onToggleContext={onToggleContext} />

        {/* ── CALL UI (permission banner only — all call controls via full-screen OrbitCallScreen) ── */}
        <OrbitCallPermissionBanner
          mic={callFamily.devicePermissions.permissions.microphone}
          cam={callFamily.devicePermissions.permissions.camera}
          videoMode={callFamily.callState.activeCall?.mode === "video"}
          onRequestMic={() => void callFamily.devicePermissions.requestMicrophone()}
          onRequestCam={() => void callFamily.devicePermissions.requestCamera()}
        />

        {/* ── PINNED ── */}
        <OrbitPinnedBanner
          pinnedBody={(pinnedMessage && "content" in pinnedMessage ? (pinnedMessage as { content?: string }).content : null) || null}
          onClick={() => {
            if (threadUi.pinnedMessageId) {
              document.getElementById(`msg-${threadUi.pinnedMessageId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }}
          onUnpin={() => {
            if (threadUi.pinnedMessageId) void messageActions.togglePinMessage(threadUi.pinnedMessageId, false);
          }}
        />

        {/* ── SELECTION TOOLBAR ── */}
        {selection.selectMode && (
          <MessageMultiSelectToolbar
            selectedIds={selection.selectedMsgIds}
            messages={messages as Array<Record<string, unknown>>}
            currentUserId={user?.id}
            currentContextId={thread?.entityId}
            userEmail={user?.email}
            userName={user?.user_metadata?.full_name || "User"}
            onClearSelection={selection.clearSelection}
            onDeletedForMe={mutations.applyBatchDeleteForMe}
            onDeletedForAll={mutations.applyBatchDeleteForAll}
          />
        )}

        {/* ── MESSAGE LIST ── */}
        <div className="relative flex-1 min-h-0 flex flex-col">
          {msgFamily.isLoadingMessages ? (
            <div className="flex-1" style={{ background: "hsl(var(--background))" }} />
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
              onContextMenu={stableContextMenu}
              onToggleSelect={selection.toggleMsgSelect}
              onRetryMessage={msgFamily.retryMessage}
              getCategoryIcon={msgFamily.getCategoryIcon}
              t={t}
              conversationId={currentConversationId}
            />
          )}
          <OrbitJumpToBottomButton visible={msgFamily.showJumpToBottom} onClick={msgFamily.jumpToBottom} />
        </div>

        {/* ── DEAL ACTIONS ── */}
        {(thread.conversationType === "booking" || thread.conversationType === "listing" || thread.conversationType === "deal") && (
          <div className="px-4 py-2 shrink-0" style={{ borderTop: "1px solid hsl(var(--border) / 0.06)", background: "hsl(var(--card) / 0.25)" }}>
            <div className="flex items-center gap-2 overflow-x-auto" data-no-swipe>
              {!thread.dealId && <Button size="sm" variant="outline" className="text-[11px] h-7 min-h-[44px] sm:min-h-0 gap-1.5 rounded-full px-3 shrink-0" onClick={onToggleContext}>Deal</Button>}
              <Button size="sm" variant="outline" className="text-[11px] h-7 min-h-[44px] sm:min-h-0 gap-1.5 rounded-full px-3 shrink-0" onClick={() => payment.setPaymentLinkDialog(true)}>{t("orbit.payment")}</Button>
              <Button size="sm" variant="outline" className="text-[11px] h-7 min-h-[44px] sm:min-h-0 gap-1.5 rounded-full px-3 shrink-0" onClick={() => payment.setRequestMoneyDialog(true)}>Request</Button>
              {thread.bookingStatus === "pending" && <Button size="sm" className="text-[11px] h-7 min-h-[44px] sm:min-h-0 gap-1.5 rounded-full px-3 shrink-0" onClick={() => handleBookingAction("confirm")}>{t("orbit.confirm")}</Button>}
              {thread.bookingStatus === "confirmed" && <Button size="sm" variant="outline" className="text-[11px] h-7 min-h-[44px] sm:min-h-0 gap-1.5 rounded-full px-3 shrink-0" onClick={() => handleBookingAction("complete")}>{t("orbit.complete")}</Button>}
              {!(["cancelled", "completed"].includes(thread.bookingStatus || "")) && <Button size="sm" variant="ghost" className="text-[11px] h-7 min-h-[44px] sm:min-h-0 gap-1.5 rounded-full px-3 shrink-0" onClick={() => handleBookingAction("cancel")}>{t("orbit.cancel")}</Button>}
            </div>
          </div>
        )}

        {/* ── COMPOSER (hidden during selection) ── */}
        {!selection.selectMode && selectionBridge.composerVisible && (
          <ComposerShell key={currentConversationId} {...composerProps} />
        )}

        {/* ── SELECTION TOOLBAR (replaces composer) ── */}
        {selectionBridge.globalSelectionMode === "selecting" && (
          <OrbitSelectionToolbar
            onCopy={(ids) => {
              const msgs = messages as Array<Record<string, unknown>>;
              const texts = msgs.filter(m => ids.has(m.id as string)).map(m => String(m.content ?? "")).join("\n");
              navigator.clipboard.writeText(texts).then(() => toast.success(t("orbit.copied"))).catch(() => {});
              selectionBridge.clearGlobalSelection();
            }}
            onForward={(ids) => {
              const fMsgs = messages as Array<Record<string, unknown>>;
              const first = fMsgs.find(m => ids.has(m.id as string));
              if (first) selection.setForwardData({ messageId: first.id as string, content: String(first.content ?? "") });
              selectionBridge.clearGlobalSelection();
            }}
            onDelete={(ids) => { ids.forEach((id) => messageActions.softDeleteMessage(id)); selectionBridge.clearGlobalSelection(); }}
          />
        )}

        <OrbitUploadQueuePreview queue={attFamily.attachmentQueue.queue} onRemove={attFamily.attachmentQueue.removeQueueItem} />
        {attFamily.attachmentQueue.queue.length > 0 && (
          <div className="px-3 py-2 flex justify-end" style={{ borderTop: "1px solid hsl(var(--border) / 0.08)" }}>
            <button
              onClick={() => void attFamily.handleUploadAndSendAttachments()}
              className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-medium"
              disabled={attFamily.attachmentSend.sendingAttachments}
            >
              {attFamily.attachmentSend.sendingAttachments ? (t("orbit.sending") || "Sending...") : (t("orbit.send_attachments") || "Send attachments")}
            </button>
          </div>
        )}

        <input ref={attFamily.fileInputRef} type="file" multiple className="hidden" onChange={(e) => {
          const files = e.target.files;
          if (files?.length) useMediaPreviewState.getState().openWithFiles(files);
          e.target.value = "";
        }} />
        <input ref={attFamily.cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
          const files = e.target.files;
          if (files?.length) useMediaPreviewState.getState().openWithFiles(files);
          e.target.value = "";
        }} />
      </div>

      {/* ── PAYMENT DIALOGS ── */}
      <Sheet open={payment.paymentLinkDialog} onOpenChange={payment.setPaymentLinkDialog}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto p-0">
          <OrbitSmartPayment
            recipientUserId={thread.peerUserId || thread.tenantId || thread.entityId || null}
            recipientName={thread.name || t("orbit.contact")}
            context={thread.entityType ? { type: thread.entityType as string, id: thread.entityId, label: thread.serviceTitle || thread.propertyLabel || thread.listingTitle } : undefined}
            threadId={thread.conversationId || thread.v2ConversationId || thread.id}
            defaultCurrency={thread.currency?.toUpperCase()}
            onSuccess={(conf: PaymentConfirmation) => {
              payment.setPaymentLinkDialog(false);
              void (async () => {
                const authUserId = await resolveAuthUserId();
                if (!authUserId || !orgId) return;
                const peerId = thread.peerUserId || thread.tenantId || thread.entityId || thread.id;
                try {
                  await sendPaymentReceiptToThread({
                    threadId: thread.conversationId || thread.v2ConversationId || thread.id,
                    senderId: authUserId, orgId,
                    transactionId: conf.txnId, amount: conf.amount, currency: conf.currency,
                    recipientName: conf.recipientName || thread.name,
                    title: conf.status === "completed" ? (t("orbit.payment_sent") || "Payment sent") : (t("orbit.payment_initiated") || "Payment initiated"),
                    contextType: thread.entityType, contextId: thread.entityId,
                    tenantId: thread.tenantId, bookingId: thread.bookingId, bookingType: thread.bookingType,
                    encrypt: e2eReady ? encrypt : undefined, peerId: e2eReady ? peerId : null,
                  });
                } catch {}
              })();
              toast.success(conf.status === "completed" ? (t("orbit.payment_sent") || "Payment sent") : (t("orbit.payment_initiated") || "Payment initiated"));
            }}
            onCancel={() => payment.setPaymentLinkDialog(false)}
          />
        </SheetContent>
      </Sheet>

      <RequestMoneyModal
        open={payment.requestMoneyDialog}
        onClose={() => payment.setRequestMoneyDialog(false)}
        recipientId={thread.peerUserId || thread.tenantId || thread.entityId || null}
        contextId={thread.conversationId || thread.v2ConversationId || thread.id || null}
        onCreated={async (req) => {
          const authUserId = await resolveAuthUserId();
          if (!authUserId || !orgId) return;
          const peerId = thread.peerUserId || thread.tenantId || thread.entityId || thread.id;
          try {
            await sendPaymentRequestMessageToThread({
              threadId: thread.conversationId || thread.v2ConversationId || thread.id,
              senderId: authUserId, orgId, request: req,
              tenantId: thread.tenantId, bookingId: thread.bookingId, bookingType: thread.bookingType,
              contextType: thread.entityType, contextId: thread.entityId,
              encrypt: e2eReady ? encrypt : undefined, peerId: e2eReady ? peerId : null,
            });
          } catch {}
          toast.success(t("orbit.payment_request_sent"));
        }}
      />

      {/* ── CONTEXT MENU / DIALOGS ── */}
      <MessageContextMenu
        message={selection.contextMessage}
        onClose={() => selection.setContextMessage(null)}
        onDeleted={mutations.handleContextMenuDeleted}
        onCopy={() => {
          if (selection.contextMessage) {
            navigator.clipboard.writeText(selection.contextMessage.content || "").then(() => toast.success(t("orbit.copied"))).catch(() => {});
          }
        }}
        onEdited={mutations.applyEdit}
        onReply={(msgId, content, senderName) => { useOrbitComposerStore.getState().setReply(currentConversationId, { msgId, content, senderName }); }}
        onForward={(msgId, content) => selection.setForwardData({ messageId: msgId, content })}
        onStarToggle={mutations.applyStar}
        onEnterSelectMode={selection.enterSelectMode}
      />

      <ChatLocationPicker open={security.showLocationPicker} onClose={() => security.setShowLocationPicker(false)} onSend={compFamily.handleLocationSend} />
      <OrbitSafetyNumber peerId={thread.peerUserId || thread.tenantId || thread.entityId || thread.id || ""} peerName={thread.name || "Contact"} open={security.showSafetyNumber} onOpenChange={security.setShowSafetyNumber} />
      <OrbitSecurityPanel peerId={thread.peerUserId || thread.tenantId || thread.entityId || thread.id || ""} peerName={thread.name || "Contact"} open={security.showSecurityPanel} onOpenChange={security.setShowSecurityPanel} />

      {selection.forwardData && (
        <ForwardMessageDialog
          open={!!selection.forwardData}
          onClose={() => selection.setForwardData(null)}
          messageContent={selection.forwardData.content}
          messageId={selection.forwardData.messageId}
          userId={user?.id || ""}
          userEmail={user?.email || ""}
          userName={user?.user_metadata?.full_name || "User"}
          currentContextId={thread.entityId || ""}
        />
      )}

      <OrbitAttachmentViewer
        open={attFamily.viewerOpen}
        attachment={attFamily.viewerAttachment}
        onClose={() => { attFamily.setViewerOpen(false); attFamily.setViewerAttachment(null); }}
      />

      <LocationViewerOverlay />
      <MediaPreviewSheet onSend={mediaPreviewSend.sendFromPreview} />
      <FullscreenMediaViewer />

      <ContactProfileSheet
        open={overlayBridge.showContactProfile}
        onClose={() => overlayBridge.setShowContactProfile(false)}
        entity={overlayBridge.contactProfileEntity}
        onMessage={() => overlayBridge.setShowContactProfile(false)}
        onAudioCall={() => { overlayBridge.setShowContactProfile(false); void callFamily.handleStartAudioCall(); }}
        onVideoCall={() => { overlayBridge.setShowContactProfile(false); void callFamily.handleStartVideoCall(); }}
        disappearTTL={security.disappearTTL}
        onDisappearTimerChange={(timer) => security.setDisappearTTL(timer)}
        conversationId={currentConversationId || null}
        onChatCleared={() => { overlayBridge.setShowContactProfile(false); }}
        onShareQR={() => {
          overlayBridge.setShowContactProfile(false);
          const qrCanvas = document.createElement("canvas");
          const contactName = thread?.name || "Contact";
          const contactId = thread?.peerUserId || thread?.tenantId || thread?.entityId || "";
          const shareUrl = `${window.location.origin}/#/add-contact?userId=${contactId}&name=${encodeURIComponent(contactName)}`;
          import("qrcode").then(QRCodeLib => {
            QRCodeLib.default.toDataURL(shareUrl, { width: 400, margin: 2, errorCorrectionLevel: "H" }).then(dataUrl => {
              navigator.clipboard.writeText(shareUrl).then(() => {
                toast.success(`QR link for ${contactName} copied!`);
              }).catch(() => toast.info(shareUrl));
            });
          }).catch(() => {
            navigator.clipboard.writeText(shareUrl).then(() => toast.success("Contact link copied!")).catch(() => {});
          });
        }}
      />

      <MultiPhotoSelect
        open={overlayBridge.showMultiPhoto}
        onClose={() => overlayBridge.setShowMultiPhoto(false)}
        onSend={(attachments, caption) => handleMultiPhotoSend(attachments, caption)}
      />
    </>
  );
}, arePropsEqual);

class HudChatErrorBoundary extends React.Component<
  { children: React.ReactNode; onBack: () => void },
  { hasError: boolean; errorMsg: string }
> {
  state = { hasError: false, errorMsg: "" };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error?.message || "Unknown error" };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[HudChatPanel] Render crash caught:", error.message);
    console.error("[HudChatPanel] Stack:", error.stack);
    console.error("[HudChatPanel] Component stack:", info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center" style={{ background: "hsl(var(--background))" }}>
          <div className="text-center space-y-4 px-6">
            <p style={{ color: "hsl(var(--foreground))" }} className="text-sm font-medium">
              Something went wrong loading this conversation.
            </p>
            <p style={{ color: "hsl(var(--foreground))", opacity: 0.6 }} className="text-xs font-mono break-words max-w-xs">
              {this.state.errorMsg}
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  this.setState({ hasError: false, errorMsg: "" });
                }}
              >
                Retry
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  this.setState({ hasError: false, errorMsg: "" });
                  this.props.onBack();
                }}
              >
                Go back
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function HudChatPanel(props: Props) {
  return (
    <HudChatErrorBoundary onBack={props.onBack}>
      <HudChatPanelInner {...props} />
    </HudChatErrorBoundary>
  );
}
