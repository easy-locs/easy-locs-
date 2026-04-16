import { memo, useRef, useCallback, useState, useEffect } from "react";
import { X, Send, Mic } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  duration: number;
  onCancel: () => void;
  onStop: () => Promise<any>;
}

function formatDuration(seconds: number) {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const BAR_COUNT = 28;

function ComposerVoiceRecording({ duration, onCancel, onStop }: Props) {
  const [slideX, setSlideX] = useState(0);
  const [bars, setBars] = useState<number[]>(() => Array(BAR_COUNT).fill(0.15));
  const startXRef = useRef(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      setBars(prev => {
        const next = [...prev.slice(1)];
        next.push(0.15 + Math.random() * 0.85);
        return next;
      });
    }, 120);
    return () => clearInterval(id);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    cancelledRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startXRef.current;
    const clamped = Math.min(0, Math.max(-160, dx));
    setSlideX(clamped);
    if (clamped < -120 && !cancelledRef.current) {
      cancelledRef.current = true;
      haptic("light");
      onCancel();
    }
  }, [onCancel]);

  const handleTouchEnd = useCallback(() => {
    setSlideX(0);
  }, []);

  const cancelProgress = Math.min(1, Math.abs(slideX) / 120);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.15 }}
        className="flex items-center gap-2"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <button
          onClick={() => { onCancel(); haptic("light"); }}
          className="shrink-0 h-10 w-10 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full flex items-center justify-center bg-destructive/15 text-destructive active:scale-90 transition-transform"
        >
          <X className="h-4 w-4" />
        </button>

        <motion.div
          className="flex-1 flex items-center gap-2 min-w-0 rounded-2xl px-3 py-2 bg-background border border-border"
          style={{ transform: `translateX(${slideX}px)` }}
        >
          <div className="flex items-center gap-1.5 shrink-0">
            <motion.div
              className="h-2.5 w-2.5 rounded-full bg-destructive"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <span className="text-sm font-mono tabular-nums font-semibold text-foreground w-[42px]">
              {formatDuration(duration)}
            </span>
          </div>

          <div className="flex-1 flex items-center gap-[2px] h-6 overflow-hidden">
            {bars.map((h, i) => (
              <motion.div
                key={i}
                className="w-[3px] rounded-full bg-primary/60"
                style={{ height: `${h * 24}px` }}
                animate={{ height: `${h * 24}px` }}
                transition={{ duration: 0.08 }}
              />
            ))}
          </div>

          <motion.span
            className="text-[0.625rem] text-muted-foreground shrink-0 whitespace-nowrap"
            animate={{ opacity: cancelProgress > 0.3 ? 0 : [0.4, 0.7, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ← Slide to cancel
          </motion.span>
        </motion.div>

        <button
          onClick={async () => { haptic("medium"); await onStop(); }}
          className="shrink-0 h-12 w-12 min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-lg active:scale-90 transition-transform"
        >
          <Send className="h-5 w-5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

export default memo(ComposerVoiceRecording);
