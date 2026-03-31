/**
 * ComposerShell — Canonical shell for the Orbit message composer zone.
 * 
 * Structure:
 *   TopContextLayer  → reply/edit banner (from store)
 *   MainInputRow     → [attach-menu] [text-input] [send|mic]
 *   VoiceOverlay     → replaces MainInputRow when recording/previewing
 * 
 * Single visual wrapper — no duplicate borders, no competing bars.
 */
import { memo, useCallback } from "react";
import { Paperclip } from "lucide-react";
import { orbitLabels } from "@/families/orbit-i18n/orbit-labels";

import ComposerContextBanner from "./ComposerContextBanner";
import ComposerTextInput from "./ComposerTextInput";
import ComposerSendButton from "./ComposerSendButton";
import ComposerVoiceRecording from "./ComposerVoiceRecording";
import ComposerVoicePreview from "./ComposerVoicePreview";
import ComposerAttachMenu from "./ComposerAttachMenu";

export interface ComposerShellProps {
  conversationId: string;
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onTyping?: () => void;
  onEmoji?: () => void;
  disabled?: boolean;
  sending?: boolean;
  uploading?: boolean;
  placeholder?: string;
  // Voice
  voiceRecording?: boolean;
  voiceDuration?: number;
  voicePreview?: { blob: Blob; duration: number; url: string } | null;
  onStartVoice?: () => void;
  onStopVoice?: () => Promise<any>;
  onCancelVoice?: () => void;
  onSendVoice?: () => void;
  onDiscardVoice?: () => void;
  // Attachments
  attachmentActions?: {
    onFileUpload?: (file: File) => void;
    onCameraCapture?: (file: File) => void;
    onLocation?: () => void;
    onViewOnce?: (file: File) => void;
    onMultiPhoto?: () => void;
  };
}

function ComposerShell({
  conversationId, value, onChange, onSend, onKeyDown, onTyping, onEmoji,
  disabled = false, sending = false, uploading = false, placeholder,
  voiceRecording = false, voiceDuration = 0, voicePreview = null,
  onStartVoice, onStopVoice, onCancelVoice, onSendVoice, onDiscardVoice,
  attachmentActions,
}: ComposerShellProps) {
  const hasText = value.trim().length > 0;
  const resolvedPlaceholder = placeholder || orbitLabels.composer.placeholder;

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (hasText && !sending && !disabled) onSend();
      return;
    }
    onKeyDown?.(e);
  }, [hasText, sending, disabled, onSend, onKeyDown]);

  // Determine which visual mode to render
  const isVoiceActive = voiceRecording || !!voicePreview;

  return (
    <div className="shrink-0">
      {/* ── Top Context Layer (reply/edit) ── */}
      <ComposerContextBanner conversationId={conversationId} />

      {/* ── Main Composer Bar ── */}
      <div className="px-2 sm:px-3 py-2 safe-area-pb bg-muted/40 border-t border-border">
        {voiceRecording ? (
          <ComposerVoiceRecording
            duration={voiceDuration}
            onCancel={() => onCancelVoice?.()}
            onStop={() => onStopVoice?.() ?? Promise.resolve()}
          />
        ) : voicePreview ? (
          <ComposerVoicePreview
            voicePreview={voicePreview}
            uploading={uploading}
            disabled={disabled}
            onDiscard={() => onDiscardVoice?.()}
            onSend={() => onSendVoice?.()}
          />
        ) : (
          <div className="flex items-end gap-1.5">
            {attachmentActions ? (
              <ComposerAttachMenu actions={attachmentActions} disabled={disabled}>
                <button className="shrink-0 h-8 w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center rounded-full hover:bg-muted active:scale-90 transition-transform">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                </button>
              </ComposerAttachMenu>
            ) : null}
            <ComposerTextInput
              value={value}
              onChange={onChange}
              onKeyDown={handleKeyDown}
              onTyping={onTyping}
              onEmoji={onEmoji}
              placeholder={resolvedPlaceholder}
              disabled={disabled}
            />
            <ComposerSendButton
              hasText={hasText}
              sending={sending}
              disabled={disabled}
              onSend={onSend}
              onStartVoice={onStartVoice}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ComposerShell);
