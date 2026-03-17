/**
 * VoiceMessageBubble — Premium voice message player with animated waveform.
 * Signal/WhatsApp-grade design with smooth progress, play/pause, seek.
 * Supports global audio isolation (only one voice plays at a time).
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Mic } from "lucide-react";

interface Props {
  url: string;
  durationSeconds: number;
  isMe?: boolean;
  status?: "sending" | "sent" | "failed";
}

// Global audio manager — ensures only one voice message plays at a time
let globalPlayingAudio: HTMLAudioElement | null = null;
const globalListeners = new Set<() => void>();

function registerAudio(audio: HTMLAudioElement, onPaused: () => void) {
  globalListeners.add(onPaused);
  return () => { globalListeners.delete(onPaused); };
}

function setGlobalPlaying(audio: HTMLAudioElement) {
  if (globalPlayingAudio && globalPlayingAudio !== audio) {
    globalPlayingAudio.pause();
    // Notify the previous player it was paused
    globalListeners.forEach(cb => cb());
  }
  globalPlayingAudio = audio;
}

// Generate deterministic waveform from url hash
function generateWaveform(seed: string, bars: number): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Array.from({ length: bars }, (_, i) => {
    const v = Math.abs(Math.sin(hash * (i + 1) * 0.7 + i * 1.3)) * 0.75 + 0.25;
    return v;
  });
}

export default function VoiceMessageBubble({ url, durationSeconds, isMe, status }: Props) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animRef = useRef<number | undefined>(undefined);
  const waveContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const bars = 36;
  const waveform = generateWaveform(url, bars);

  const updateProgress = useCallback(() => {
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
      setProgress(pct);
      setCurrentTime(audio.currentTime);
      animRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  // Register for global audio isolation
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const cleanup = registerAudio(audio, () => {
      if (audio !== globalPlayingAudio) {
        setPlaying(false);
        if (animRef.current) cancelAnimationFrame(animRef.current);
      }
    });
    return () => {
      cleanup();
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    } else {
      setGlobalPlaying(audio);
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setPlaying(true);
            animRef.current = requestAnimationFrame(updateProgress);
          })
          .catch(() => setPlaying(false));
      }
    }
  };

  const handleEnded = () => {
    setPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    if (animRef.current) cancelAnimationFrame(animRef.current);
  };

  const seekFromPosition = (clientX: number) => {
    const audio = audioRef.current;
    const container = waveContainerRef.current;
    if (!audio || !container || !audio.duration) return;
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    audio.currentTime = x * audio.duration;
    setProgress(x * 100);
    setCurrentTime(audio.currentTime);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => seekFromPosition(e.clientX);

  // Touch: tap to seek + drag to scrub
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingRef.current = true;
    seekFromPosition(e.touches[0].clientX);
  };
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    seekFromPosition(e.touches[0].clientX);
  };
  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  const formatDur = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const isFailed = status === "failed";
  const isSending = status === "sending";

  return (
    <div className="flex items-center gap-3 py-1 min-w-[220px] max-w-[320px]">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onEnded={handleEnded}
        playsInline
      />

      {/* Play/Pause button — 40px touch target */}
      <button
        onClick={toggle}
        disabled={isSending || isFailed}
        className="shrink-0 h-10 w-10 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
        style={{
          background: isFailed
            ? "hsl(var(--hud-danger) / 0.15)"
            : isMe
              ? "hsl(var(--hud-cyan) / 0.15)"
              : "hsl(var(--hud-cyan) / 0.12)",
          color: isFailed
            ? "hsl(var(--hud-danger))"
            : "hsl(var(--hud-cyan))",
          boxShadow: playing ? "0 0 12px hsl(var(--hud-cyan) / 0.2)" : "none",
        }}
      >
        {isSending ? (
          <div className="h-4 w-4 border-2 rounded-full animate-spin" style={{ borderColor: "hsl(var(--hud-cyan) / 0.3)", borderTopColor: "hsl(var(--hud-cyan))" }} />
        ) : playing ? (
          <Pause className="h-4 w-4" fill="currentColor" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" fill="currentColor" />
        )}
      </button>

      {/* Waveform + progress */}
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        <div
          ref={waveContainerRef}
          className="flex items-end gap-[2px] h-7 cursor-pointer select-none"
          onClick={handleSeek}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {waveform.map((h, i) => {
            const barProgress = (i / bars) * 100;
            const filled = barProgress <= progress;

            return (
              <div
                key={i}
                className="rounded-full transition-colors duration-100"
                style={{
                  width: 3,
                  height: `${h * 100}%`,
                  minHeight: 3,
                  background: filled
                    ? "hsl(var(--hud-cyan))"
                    : isMe
                      ? "hsl(var(--hud-cyan) / 0.2)"
                      : "hsl(var(--hud-text-dim) / 0.25)",
                }}
              />
            );
          })}
        </div>

        {/* Duration + mic icon */}
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-mono tabular-nums font-medium"
            style={{ color: "hsl(var(--hud-text-dim))" }}
          >
            {playing ? formatDur(currentTime) : formatDur(durationSeconds)}
          </span>
          <div className="flex items-center gap-1">
            {isFailed && (
              <span className="text-[9px] font-medium" style={{ color: "hsl(var(--hud-danger))" }}>
                Failed
              </span>
            )}
            <Mic
              className="h-3 w-3"
              style={{
                color: isFailed
                  ? "hsl(var(--hud-danger) / 0.5)"
                  : "hsl(var(--hud-cyan) / 0.4)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
