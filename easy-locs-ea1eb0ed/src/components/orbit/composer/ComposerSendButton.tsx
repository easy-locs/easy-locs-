import { memo, useRef, useCallback } from "react";
import { Send, Mic, Loader2 } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  hasText: boolean;
  sending?: boolean;
  disabled?: boolean;
  onSend: () => void;
  onStartVoice?: () => void;
}

function ComposerSendButton({ hasText, sending, disabled, onSend, onStartVoice }: Props) {
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didStartVoiceRef = useRef(false);

  const handleMicTap = useCallback(() => {
    if (onStartVoice) {
      haptic("medium");
      onStartVoice();
      didStartVoiceRef.current = true;
    }
  }, [onStartVoice]);

  const handleSend = useCallback(() => {
    if (!hasText || sending || disabled) return;
    haptic("light");
    onSend();
  }, [hasText, sending, disabled, onSend]);

  const clearHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  return (
    <motion.button
      onClick={() => {
        if (hasText) {
          handleSend();
        } else if (onStartVoice && !didStartVoiceRef.current) {
          handleMicTap();
        }
        didStartVoiceRef.current = false;
      }}
      onTouchStart={!hasText && onStartVoice ? () => {
        didStartVoiceRef.current = false;
        holdTimerRef.current = setTimeout(() => {
          handleMicTap();
        }, 300);
      } : undefined}
      onTouchEnd={!hasText ? () => {
        clearHold();
      } : undefined}
      onTouchCancel={clearHold}
      disabled={sending || disabled}
      whileTap={{ scale: 0.85 }}
      animate={{
        backgroundColor: hasText ? "hsl(142, 70%, 49%)" : "hsl(var(--muted))",
        boxShadow: hasText ? "0 4px 12px hsl(var(--primary) / 0.35)" : "none",
      }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`shrink-0 h-10 w-10 touch-target rounded-full flex items-center justify-center ${
        hasText
          ? "text-white"
          : "text-muted-foreground border border-border"
      }`}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <AnimatePresence mode="wait">
        {sending ? (
          <motion.div key="loading" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.1 }}>
            <Loader2 className="h-4 w-4 animate-spin" />
          </motion.div>
        ) : hasText ? (
          <motion.div key="send" initial={{ scale: 0.5, opacity: 0, rotate: -45 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
            <Send className="h-4 w-4" />
          </motion.div>
        ) : (
          <motion.div key="mic" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
            <Mic className="h-4 w-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export default memo(ComposerSendButton);
