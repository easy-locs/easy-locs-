/**
 * ComposerSendButton — Single-purpose: Send (text) or Mic (voice) toggle button.
 */
import { memo, useRef, useCallback } from "react";
import { Send, Mic, Loader2 } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface Props {
  hasText: boolean;
  sending?: boolean;
  disabled?: boolean;
  onSend: () => void;
  onStartVoice?: () => void;
}

function ComposerSendButton({ hasText, sending, disabled, onSend, onStartVoice }: Props) {
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMicStart = useCallback(() => {
    if (onStartVoice) {
      haptic("medium");
      onStartVoice();
    }
  }, [onStartVoice]);

  const handleSend = useCallback(() => {
    if (!hasText || sending || disabled) return;
    haptic("light");
    onSend();
  }, [hasText, sending, disabled, onSend]);

  return (
    <button
      onClick={hasText ? handleSend : undefined}
      onTouchStart={!hasText && onStartVoice ? () => {
        holdTimerRef.current = setTimeout(handleMicStart, 200);
      } : undefined}
      onTouchEnd={!hasText && onStartVoice ? () => {
        if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
      } : undefined}
      onMouseDown={!hasText && onStartVoice ? handleMicStart : undefined}
      disabled={sending || disabled}
      className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all active:scale-90 ${
        hasText
          ? "bg-primary text-primary-foreground shadow-md"
          : "bg-muted text-muted-foreground border border-border"
      }`}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {sending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : hasText ? (
        <Send className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </button>
  );
}

export default memo(ComposerSendButton);
