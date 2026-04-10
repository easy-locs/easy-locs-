/**
 * FAMILY: COMPOSER — Canonical composer state, voice, inline handlers.
 * Single source of truth: composerStore (Zustand).
 * NO local useState for reply/edit/forward — all keyed by conversationId in store.
 * Uses targeted selectors — never subscribes to the full store.
 */
import { useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useOrbitComposerStore } from "@/stores/orbit/composer.store";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useHudInlineHandlers } from "@/hooks/orbit/useHudInlineHandlers";
import type { ConversationThread } from "@/components/communication-hub/types";

export function useThreadComposerFamily(params: {
  thread: ConversationThread | null;
  orgId: string | null;
  userId: string | undefined;
  myOrbitId: string | null;
  e2eReady: boolean;
  encrypt: any;
  resolveAuthUserId: () => Promise<string | null>;
  resolveConversationId: (authUserId: string) => Promise<string | null>;
  setUploading: (v: boolean) => void;
  disappearTTL: string;
  defaultDisappearTtl: string;
  setSecurityLevel: (l: string) => void;
  setViewOnceNext: (v: boolean) => void;
  setShowLocationPicker: (v: boolean) => void;
  setNewMessage: (v: string) => void;
  setRawMessages: (updater: any) => void;
  t: (k: string) => string;
}) {
  const {
    thread, orgId, userId, myOrbitId, e2eReady, encrypt,
    resolveAuthUserId, resolveConversationId, setUploading,
    disappearTTL, defaultDisappearTtl, setSecurityLevel, setViewOnceNext,
    setShowLocationPicker, setNewMessage, setRawMessages, t,
  } = params;

  const conversationId = thread?.conversationId || thread?.id || "";

  const activeEdit = useOrbitComposerStore(s => s.edits[conversationId] ?? null);
  const replyState = useOrbitComposerStore(s => s.replies[conversationId] ?? null);
  const isSending = useOrbitComposerStore(s => s.sending[conversationId] ?? false);
  const hasDraft = useOrbitComposerStore(s => !!(s.drafts[conversationId] || "").trim());
  const hasVoice = useOrbitComposerStore(s => !!s.voiceDrafts[conversationId]);

  const voiceRecorder = useVoiceRecorder();
  const voiceRecorderRef = useRef(voiceRecorder);
  voiceRecorderRef.current = voiceRecorder;

  const inlineHandlers = useHudInlineHandlers({
    thread,
    orgId,
    userId,
    myOrbitId,
    e2eReady,
    encrypt,
    resolveAuthUserId,
    resolveConversationId,
    setUploading,
    disappearTTL,
    defaultDisappearTtl,
    setSecurityLevel,
    setViewOnceNext,
    setShowLocationPicker,
    setRawMessages,
    t,
  });
  const inlineHandlersRef = useRef(inlineHandlers);
  inlineHandlersRef.current = inlineHandlers;

  useEffect(() => {
    if (activeEdit) {
      setNewMessage(activeEdit.originalBody);
    }
  }, [activeEdit?.messageId]);

  const mode = useMemo(() => {
    if (isSending) return "sending";
    if (activeEdit) return "editing";
    if (hasVoice) return "voice";
    if (replyState) return "replying";
    if (hasDraft) return "typing";
    return "idle";
  }, [isSending, activeEdit, hasVoice, replyState, hasDraft]);

  const composer = useMemo(() => ({
    mode,
    editState: activeEdit,
    replyState,
  }), [mode, activeEdit, replyState]);

  const startVoice = useCallback(async () => {
    try {
      await voiceRecorderRef.current.start();
    } catch {
      toast.error(t("orbit.mic_denied") || "Microphone access denied");
    }
  }, [t]);

  const stopVoice = useCallback(async () => {
    const result = await voiceRecorderRef.current.stop();
    inlineHandlersRef.current.setVoicePreview(result);
    return result;
  }, []);

  const discardVoice = useCallback(() => {
    if (inlineHandlersRef.current.voicePreview) URL.revokeObjectURL(inlineHandlersRef.current.voicePreview.url);
    inlineHandlersRef.current.setVoicePreview(null);
  }, []);

  const cancelVoice = useCallback(() => {
    voiceRecorderRef.current.cancel();
  }, []);

  return {
    composer,
    voiceRecorder,
    voicePreview: inlineHandlers.voicePreview,
    handleViewOnceUpload: inlineHandlers.handleViewOnceUpload,
    handleVoiceSend: inlineHandlers.handleVoiceSend,
    handleLocationSend: inlineHandlers.handleLocationSend,
    startVoice,
    stopVoice,
    discardVoice,
    cancelVoice,
  };
}
