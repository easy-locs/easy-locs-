import { memo, useState, useRef, useEffect, useCallback } from "react";
import { Trash2, Send, Play, Pause, Loader2 } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { motion } from "framer-motion";

interface Props {
  voicePreview: { blob: Blob; duration: number; url: string };
  uploading?: boolean;
  disabled?: boolean;
  onDiscard: () => void;
  onSend: () => void;
}

function formatDuration(seconds: number) {
  if (!seconds) return "0:00";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const WAVEFORM_BARS = 40;

function generateWaveform(): number[] {
  const bars: number[] = [];
  for (let i = 0; i < WAVEFORM_BARS; i++) {
    const base = 0.2 + Math.sin(i * 0.4) * 0.15;
    bars.push(Math.min(1, base + Math.random() * 0.6));
  }
  return bars;
}

function ComposerVoicePreview({ voicePreview, uploading, disabled, onDiscard, onSend }: Props) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [waveform] = useState(generateWaveform);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const audio = new Audio(voicePreview.url);
    audio.preload = "auto";
    audioRef.current = audio;

    audio.addEventListener("ended", () => {
      setPlaying(false);
      setProgress(0);
    });

    return () => {
      audio.pause();
      audio.src = "";
      cancelAnimationFrame(rafRef.current);
    };
  }, [voicePreview.url]);

  const updateProgress = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    setProgress(audio.currentTime / audio.duration);
    if (!audio.paused) {
      rafRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      cancelAnimationFrame(rafRef.current);
      setPlaying(false);
    } else {
      audio.play().then(() => {
        setPlaying(true);
        rafRef.current = requestAnimationFrame(updateProgress);
      }).catch(() => {
        setPlaying(false);
      });
    }
  }, [playing, updateProgress]);

  const handleBarClick = useCallback((idx: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const ratio = idx / WAVEFORM_BARS;
    audio.currentTime = ratio * audio.duration;
    setProgress(ratio);
  }, []);

  const currentTime = audioRef.current?.currentTime ?? 0;
  const totalDuration = voicePreview.duration || audioRef.current?.duration || 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2"
    >
      <button
        onClick={() => { onDiscard(); haptic("light"); }}
        className="shrink-0 h-10 w-10 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full flex items-center justify-center bg-destructive/15 text-destructive active:scale-90 transition-transform"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <div className="flex-1 flex items-center gap-2 rounded-2xl px-3 py-2.5 bg-background border border-border min-w-0">
        <button
          onClick={togglePlay}
          className="h-8 w-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground shrink-0 active:scale-90 transition-transform"
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
        </button>

        <div className="flex-1 flex items-center gap-[1.5px] h-7 cursor-pointer">
          {waveform.map((h, i) => {
            const filled = i / WAVEFORM_BARS <= progress;
            return (
              <div
                key={i}
                className="rounded-full transition-colors duration-75"
                style={{
                  width: "2.5px",
                  height: `${Math.max(3, h * 24)}px`,
                  backgroundColor: filled
                    ? "hsl(var(--primary))"
                    : "hsl(var(--muted-foreground) / 0.25)",
                }}
                onClick={() => handleBarClick(i)}
              />
            );
          })}
        </div>

        <span className="text-[0.6875rem] font-mono tabular-nums text-muted-foreground shrink-0 w-[38px] text-right">
          {playing ? formatDuration(currentTime) : formatDuration(totalDuration)}
        </span>
      </div>

      <button
        onClick={() => { haptic("medium"); onSend(); }}
        className="shrink-0 h-12 w-12 min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-lg active:scale-90 transition-transform"
        disabled={uploading || disabled}
      >
        {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
      </button>
    </motion.div>
  );
}

export default memo(ComposerVoicePreview);
