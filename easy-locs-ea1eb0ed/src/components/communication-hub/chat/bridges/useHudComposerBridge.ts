/**
 * useHudComposerBridge — Builds the complete props object for ComposerShell.
 * Single bridge between families/stores and the canonical ComposerShell component.
 * Uses targeted selectors — never subscribes to the full store.
 */
import { useCallback, useMemo } from "react";
import { useOrbitComposerStore } from "@/stores/orbit/composer.store";
import type { ComposerShellProps } from "@/components/orbit/composer/ComposerShell";

interface ComposerBridgeDeps {
  conversationId: string;
  compFamily: {
    voiceRecorder: { recording: boolean; duration: number };
    voicePreview: { blob: Blob; duration: number; url: string } | null;
    startVoice: () => void;
    stopVoice: () => Promise<any>;
    cancelVoice: () => void;
    handleVoiceSend: () => void;
    discardVoice: () => void;
    handleViewOnceUpload: (file: File) => void;
  };
  attFamily: {
    attachments: {
      uploading: boolean;
      handleFileUpload: (file: File) => void;
    };
  };
  security: {
    setShowLocationPicker: (v: boolean) => void;
  };
  stableHandleSend: () => Promise<void>;
  onTyping: () => void;
  onOpenMultiPhoto: () => void;
}

export function useHudComposerBridge(deps: ComposerBridgeDeps): Omit<ComposerShellProps, "placeholder" | "onKeyDown" | "onEmoji" | "disabled"> {
  const storeDraft = useOrbitComposerStore(s => s.drafts[deps.conversationId] ?? "");
  const isSending = useOrbitComposerStore(s => s.sending[deps.conversationId] ?? false);

  const setStoreDraft = useCallback(
    (v: string) => useOrbitComposerStore.getState().setDraft(deps.conversationId, v),
    [deps.conversationId],
  );

  const attachmentActions = useMemo(() => ({
    onFileUpload: deps.attFamily.attachments.handleFileUpload,
    onCameraCapture: deps.attFamily.attachments.handleFileUpload,
    onLocation: () => deps.security.setShowLocationPicker(true),
    onViewOnce: deps.compFamily.handleViewOnceUpload,
    onMultiPhoto: deps.onOpenMultiPhoto,
    onDocument: deps.attFamily.attachments.handleFileUpload,
    onAudio: deps.attFamily.attachments.handleFileUpload,
  }), [
    deps.attFamily.attachments.handleFileUpload,
    deps.compFamily.handleViewOnceUpload,
    deps.security.setShowLocationPicker,
    deps.onOpenMultiPhoto,
  ]);

  return {
    conversationId: deps.conversationId,
    value: storeDraft,
    onChange: setStoreDraft,
    onSend: deps.stableHandleSend,
    onTyping: deps.onTyping,
    sending: isSending,
    uploading: deps.attFamily.attachments.uploading,
    voiceRecording: deps.compFamily.voiceRecorder.recording,
    voicePreview: deps.compFamily.voicePreview,
    voiceDuration: deps.compFamily.voiceRecorder.duration,
    attachmentActions,
    onStartVoice: deps.compFamily.startVoice,
    onStopVoice: deps.compFamily.stopVoice,
    onCancelVoice: deps.compFamily.cancelVoice,
    onSendVoice: deps.compFamily.handleVoiceSend,
    onDiscardVoice: deps.compFamily.discardVoice,
  };
}
