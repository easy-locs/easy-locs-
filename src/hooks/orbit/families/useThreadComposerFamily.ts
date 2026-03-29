/**
 * FAMILY: COMPOSER — Canonical composer state, voice, inline handlers.
 * Single source of truth for all composer-related logic in a thread.
 */
import { useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useOrbitComposerState } from "@/hooks/useOrbitComposerState";
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
  t: (k: string) => string;
}) {
  const {
    thread, orgId, userId, myOrbitId, e2eReady, encrypt,
    resolveAuthUserId, resolveConversationId, uploadToStorage, setUploading,
    disappearTTL, defaultDisappearTtl, setSecurityLevel, setViewOnceNext,
    setShowLocationPicker, setNewMessage, t,
  } = params;

  const composer = useOrbitComposerState();
  const voiceRecorder = useVoiceRecorder();

  const inlineHandlers = useHudInlineHandlers({
    thread,
    orgId,
    userId,
    myOrbitId,
    e2eReady,
    encrypt,
    resolveAuthUserId,
    resolveConversationId,
    uploadToStorage,
    setUploading,
    disappearTTL,
    defaultDisappearTtl,
    setSecurityLevel,
    setViewOnceNext,
    setShowLocationPicker,
    t,
  });

  // Edit mode: inject original body into composer
  useEffect(() => {
    if (composer.editState) {
      setNewMessage(composer.editState.originalBody);
    }
  }, [composer.editState]);

  const startVoice = useCallback(async () => {
    try {
      await voiceRecorder.start();
    } catch {
      toast.error(t("orbit.mic_denied") || "Microphone access denied");
    }
  }, [voiceRecorder, t]);

  const stopVoice = useCallback(async () => {
    const result = await voiceRecorder.stop();
    inlineHandlers.setVoicePreview(result);
    return result;
  }, [voiceRecorder, inlineHandlers]);

  const discardVoice = useCallback(() => {
    if (inlineHandlers.voicePreview) URL.revokeObjectURL(inlineHandlers.voicePreview.url);
    inlineHandlers.setVoicePreview(null);
  }, [inlineHandlers]);

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
    cancelVoice: voiceRecorder.cancel,
  };
}
