import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { useOrbitStore } from "@/stores/orbitStore";
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
import { Button } from "@/components/ui/button";

import ChatHeader from "./chat/ChatHeader";
import ChatEmptyState from "./chat/ChatEmptyState";
import MessageList from "./chat/MessageList";
import ComposerBar from "./chat/ComposerBar";
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
import { OrbitComposerTopState } from "@/components/orbit/OrbitComposerTopState";
import { OrbitCallMiniBar } from "@/components/orbit/OrbitCallMiniBar";
import { OrbitMediaBar } from "@/components/orbit/OrbitMediaBar";
import { useOrbitDevicePermissions } from "@/hooks/useOrbitDevicePermissions";
import { useOrbitCallState } from "@/hooks/useOrbitCallState";
import { useOrbitCallActions } from "@/hooks/useOrbitCallActions";
import { useOrbitCallHistory } from "@/hooks/useOrbitCallHistory";
import { useOrbitCallRealtime } from "@/hooks/useOrbitCallRealtime";
import { OrbitIncomingCallBar } from "@/components/orbit/OrbitIncomingCallBar";
import { OrbitCallControls } from "@/components/orbit/OrbitCallControls";
import { OrbitCallMiniPlayer } from "@/components/orbit/OrbitCallMiniPlayer";
import { OrbitCallPermissionBanner } from "@/components/orbit/OrbitCallPermissionBanner";
import { useOrbitAttachmentQueue } from "@/hooks/useOrbitAttachmentQueue";
import { useOrbitUploadTransport } from "@/hooks/useOrbitUploadTransport";
import { useOrbitAttachmentSend } from "@/hooks/useOrbitAttachmentSend";
import { useOrbitViewOnce } from "@/hooks/useOrbitViewOnce";
import { OrbitAttachmentPickerBar } from "@/components/orbit/OrbitAttachmentPickerBar";
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
  const myOrbitId = useOrbitStore((s) => s.profile?.orbitId ?? null);
  const { ready: e2eReady, encrypt, decrypt } = useOrbitEncryption(user?.id);
  const offline = useOfflineMessages({ userId: user?.id, orgId: orgId || undefined, threadId: thread?.id });
  const { settings: privacySettings } = usePrivacySettings();
  const voiceRecorder = useVoiceRecorder();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [voicePreview, setVoicePreview] = useState<{ blob: Blob; duration: number; url: string } | null>(null);
  const [viewOnceEnabled, setViewOnceEnabled] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerAttachment, setViewerAttachment] = useState<any>(null);

  const selection = useMessageSelection();
  const security = useSecurityDialogs();
  const callActions = useCallActions(thread, orgId || null);

  const resolveAuthUserId = useCallback(async (): Promise<string | null> => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.id) {
      toast.error(t("orbit.session_expired") || "Session expired");
      return null;
    }
    return data.user.id;
  }, [t]);

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
  });

  const payment = usePaymentDialogs({ thread, orgId, locale, resolveAuthUserId });

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

  useOrbitCallRealtime({
    currentOrbitId: myOrbitId ?? null,
    onIncomingCall: (row: any) => {
      callStateV2.startIncoming({
        sessionId: row.id,
        conversationId: row.conversation_id || null,
        peerOrbitId: row.caller_orbit_id || null,
        peerName: thread?.name || "Incoming call",
        mode: row.call_type === "video" ? "video" : "audio",
      });
    },
    onCallEnded: (row: any) => {
      if (callStateV2.activeCall?.sessionId === row.id) {
        callStateV2.endCall(row.status === "missed" ? "missed" : "ended");
      }
    },
    onCallUpdated: (row: any) => {
      if (callStateV2.activeCall?.sessionId === row.id) {
        callStateV2.patchCall({
          uiState: row.status === "active" ? "active" : callStateV2.activeCall?.uiState,
          qualityState: row.quality_state || null,
          reconnectCount: row.reconnect_count || 0,
          answeredAt: row.answered_at || null,
        });
      }
    },
  });

  // Missed call timeout
  useEffect(() => {
    if (!callStateV2.activeCall?.sessionId) return;
    if (callStateV2.activeCall.uiState !== "incoming") return;
    const timer = window.setTimeout(() => {
      void (async () => {
        await (supabase as any).rpc("mark_call_as_missed_v2", {
          p_session_id: callStateV2.activeCall?.sessionId,
          p_reason: "timeout",
        });
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

  const handleStartAudioCall = async () => {
    if (!thread?.peerOrbitId) return;
    const micOk = devicePermissions.permissions.microphone === "granted" || await devicePermissions.requestMicrophone();
    if (!micOk) return;
    const session = await callActionsV2.createOutgoingCall({
      conversationId: thread.v2ConversationId || null,
      peerOrbitId: thread.peerOrbitId,
      peerName: thread.name || "Contact",
      mode: "audio",
    });
    if (!session) return;
    callStateV2.startOutgoing({
      sessionId: session.id,
      conversationId: thread.v2ConversationId || null,
      peerOrbitId: thread.peerOrbitId,
      peerUserId: thread.peerUserId || null,
      peerName: thread.name || "Contact",
      mode: "audio",
    });
  };

  const handleStartVideoCall = async () => {
    if (!thread?.peerOrbitId) return;
    const micOk = devicePermissions.permissions.microphone === "granted" || await devicePermissions.requestMicrophone();
    const camOk = devicePermissions.permissions.camera === "granted" || await devicePermissions.requestCamera();
    if (!micOk || !camOk) return;
    const session = await callActionsV2.createOutgoingCall({
      conversationId: thread.v2ConversationId || null,
      peerOrbitId: thread.peerOrbitId,
      peerName: thread.name || "Contact",
      mode: "video",
    });
    if (!session) return;
    callStateV2.startOutgoing({
      sessionId: session.id,
      conversationId: thread.v2ConversationId || null,
      peerOrbitId: thread.peerOrbitId,
      peerUserId: thread.peerUserId || null,
      peerName: thread.name || "Contact",
      mode: "video",
    });
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

  const updateConversationStatus = useCallback(async (status: string) => {
    if (!thread) return;
    loader.setConvStatus(status);
    onThreadUpdate(thread.id, { conversationStatus: status });
    // V2: status is managed at conversation level, not message level
    if (thread.v2ConversationId) {
      await (supabase as any).from("conversations_v2").update({
        metadata: { conversation_status: status },
        updated_at: new Date().toISOString(),
      }).eq("id", thread.v2ConversationId);
    }
  }, [thread, loader, onThreadUpdate]);

  const handleBookingAction = useCallback(async (action: "confirm" | "cancel" | "complete") => {
    if (!orgId || !user || !thread?.bookingId) return;
    const statusMap = { confirm: "confirmed", cancel: "cancelled", complete: "completed" };
    const newStatus = statusMap[action];
    try {
      if (thread.bookingType === "marketplace") await supabase.from("marketplace_bookings").update({ status: newStatus }).eq("id", thread.bookingId);
      else if (thread.bookingType === "concierge") {
        const updates: any = { status: newStatus };
        if (action === "confirm") updates.confirmed_at = new Date().toISOString();
        if (action === "cancel") updates.cancelled_at = new Date().toISOString();
        if (action === "complete") updates.completed_at = new Date().toISOString();
        await supabase.from("concierge_orders").update(updates).eq("id", thread.bookingId);
      } else if (thread.bookingType === "seasonal") await supabase.from("booking_requests").update({ status: newStatus }).eq("id", thread.bookingId);

      // V2: Write system message to chat_messages_v2
      if (thread.v2ConversationId) {
        const actionLabels = { confirm: "✅ Booking confirmed", cancel: "❌ Booking cancelled", complete: "🏁 Booking completed" };
        await (supabase as any).from("chat_messages_v2").insert({
          conversation_id: thread.v2ConversationId,
          sender_user_id: user.id,
          sender_orbit_id: myOrbitId || `orbit_${user.id.slice(0, 12)}`,
          type: "system",
          body: actionLabels[action],
          metadata: { booking_action: action, booking_id: thread.bookingId },
        });
        await (supabase as any).from("conversations_v2").update({
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", thread.v2ConversationId);
      }

      onThreadUpdate(thread.id, { bookingStatus: newStatus });
      toast.success(t(`orbit.booking_${action}`) || action);
    } catch (e: any) {
      toast.error(e?.message || "Booking action failed");
    }
  }, [orgId, user, thread, onThreadUpdate, t, myOrbitId]);

  const handleViewOnceUpload = useCallback(async (file: File) => {
    if (!thread || !orgId) return;
    const authUserId = await resolveAuthUserId();
    if (!authUserId) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("orbit.view_once_only_photo") || "View once only supports photos");
      return;
    }
    attachments.setUploading(true);
    try {
      const path = `${orgId}/${thread.id}/viewonce-${Date.now()}.${file.name.split(".").pop() || "jpg"}`;
      const finalUrl = await attachments.uploadToStorage(file, path);
      if (!finalUrl) throw new Error("Upload failed");
      const disappearAt = computeDisappearAt(security.disappearTTL !== "off" ? security.disappearTTL : privacySettings.defaultDisappearTtl);

      // V2 only
      const conversationId = thread.v2ConversationId;
      if (!conversationId) throw new Error("No V2 conversation");
      await (supabase as any).from("chat_messages_v2").insert({
        conversation_id: conversationId,
        sender_user_id: authUserId,
        sender_orbit_id: myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
        receiver_orbit_id: thread.peerOrbitId ?? null,
        type: "media",
        body: "📷 View-once photo",
        metadata: { url: finalUrl, view_once: true, disappear_at: disappearAt },
      });
      await (supabase as any).from("conversations_v2").update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", conversationId);
      toast.success(t("orbit.view_once_sent") || "View-once photo sent");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      attachments.setUploading(false);
      security.setViewOnceNext(false);
    }
  }, [thread, orgId, resolveAuthUserId, attachments, security, privacySettings.defaultDisappearTtl, myOrbitId, locale, t]);

  const handleVoiceSend = useCallback(async () => {
    if (!voicePreview || !thread || !orgId) return;
    const authUserId = await resolveAuthUserId();
    if (!authUserId) return;
    attachments.setUploading(true);
    try {
      const blob = voicePreview.blob;
      const dur = voicePreview.duration;
      const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("webm") ? "webm" : "ogg";
      const path = `${orgId}/${thread.id}/voice-${Date.now()}.${ext}`;
      const audioUrl = await attachments.uploadToStorage(blob, path);
      if (!audioUrl) throw new Error("Voice upload failed");

      // V2 only
      const conversationId = thread.v2ConversationId;
      if (!conversationId) throw new Error("No V2 conversation");
      const { error } = await (supabase as any).from("chat_messages_v2").insert({
        conversation_id: conversationId,
        sender_user_id: authUserId,
        sender_orbit_id: myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
        receiver_orbit_id: thread.peerOrbitId ?? null,
        type: "voice",
        body: `🎤 Voice message (${formatVoiceDuration(dur)})`,
        metadata: { audio_url: audioUrl, audio_duration_seconds: dur, transcript_status: "pending" },
      });
      if (error) throw error;
      await (supabase as any).from("conversations_v2").update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", conversationId);
      security.setSecurityLevel("normal");
      toast.success(t("orbit.voice_sent") || "Voice message sent");
      platformBus.emit("orbit:message_sent", { threadId: thread.threadId || thread.id, contextId: thread.contextId, type: "voice" }, "orbit", { userId: authUserId, orgId });
    } catch (e: any) {
      toast.error(e?.message || "Failed to send voice message");
    } finally {
      URL.revokeObjectURL(voicePreview.url);
      setVoicePreview(null);
      attachments.setUploading(false);
    }
  }, [voicePreview, thread, orgId, resolveAuthUserId, attachments, security, myOrbitId, locale, t]);

  const handleLocationSend = useCallback(async (loc: any) => {
    if (!thread) return;
    const authUserId = await resolveAuthUserId();
    if (!authUserId) return;
    const mapUrl = `https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lng}#map=16/${loc.lat}/${loc.lng}`;
    const locationMsg = loc.type === "live"
      ? `📡 Live location shared for ${loc.duration}min\n📍 ${mapUrl}`
      : loc.type === "place"
      ? `📍 ${loc.label}\n${loc.address || ""}\n${mapUrl}`
      : `📍 My location\n${mapUrl}`;

    let storedContent = locationMsg;
    const peerId = thread.peerUserId || thread.contextId || thread.id;
    if (e2eReady && peerId) {
      const enc = await encrypt(locationMsg, peerId);
      if (enc) { storedContent = enc; }
    }

    // V2 only
    const conversationId = thread.v2ConversationId;
    if (!conversationId) {
      toast.error("No V2 conversation for location sharing");
      return;
    }
    await (supabase as any).from("chat_messages_v2").insert({
      conversation_id: conversationId,
      sender_user_id: authUserId,
      sender_orbit_id: myOrbitId || `orbit_${authUserId.slice(0, 12)}`,
      receiver_orbit_id: thread.peerOrbitId ?? null,
      type: "location",
      body: storedContent,
      metadata: { lat: loc.lat, lng: loc.lng, mode: loc.type },
    });
    await (supabase as any).from("conversations_v2").update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", conversationId);

    platformBus.emit("orbit:message_sent", { threadId: thread.threadId || thread.id, contextId: thread.contextId, type: "location" }, "orbit", { userId: user?.id, orgId });
    toast.success(t("orbit.location_shared") || "Location shared");
    security.setShowLocationPicker(false);
  }, [thread, resolveAuthUserId, e2eReady, encrypt, myOrbitId, user?.id, orgId, t, security]);

  const empty = !thread;
  const visibleMessages = useMemo(() => messages, [messages]);

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

        <OrbitCallMiniBar
          active={callActions.isInCall}
          label={thread.name || undefined}
          onHangup={() => { void callActionsV2.hangupCall(); }}
        />

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

        <OrbitComposerTopState
          replyState={composer.replyState}
          editState={composer.editState}
          onClose={() => {
            composer.setReplyState(null);
            composer.setEditState(null);
            messageSender.setNewMessage("");
          }}
        />

        <ComposerBar
          newMessage={messageSender.newMessage}
          sending={messageSender.sending}
          uploading={attachments.uploading}
          securityLevel={security.securityLevel}
          voiceRecording={voiceRecorder.recording}
          voicePreview={voicePreview}
          voiceDuration={voiceRecorder.duration}
          replyTo={selection.replyTo}
          userId={user?.id}
          onMessageChange={messageSender.setNewMessage}
          onSend={async () => {
            // Handle edit mode
            if (composer.editState) {
              await messageActions.editMessage(composer.editState.messageId, messageSender.newMessage.trim());
              messageSender.setNewMessage("");
              composer.setEditState(null);
              return;
            }
            // Normal send
            await messageSender.handleSend();
            composer.setReplyState(null);
          }}
          onKeyDown={messageSender.handleKeyDown}
          onSecurityLevelChange={security.setSecurityLevel}
          onFileUpload={attachments.handleFileUpload}
          onViewOnceUpload={handleViewOnceUpload}
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
          onShowLocation={() => security.setShowLocationPicker(true)}
          onShowPayment={() => payment.setPaymentLinkDialog(true)}
          onShowRequestMoney={() => payment.setRequestMoneyDialog(true)}
          onClearReply={() => selection.setReplyTo(null)}
          onBroadcastTyping={() => loader.broadcastTyping(privacySettings.typingIndicators)}
          t={t}
        />

        <OrbitMediaBar
          attachmentCount={0}
          recording={voiceRecorder.recording}
          onOpenGallery={() => attachments.fileInputRef.current?.click()}
          onOpenCamera={() => attachments.fileInputRef.current?.click()}
          onOpenFiles={() => attachments.fileInputRef.current?.click()}
          onStartVoice={() => composer.setIsRecording(!composer.isRecording)}
        />
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
    </>
  );
}
