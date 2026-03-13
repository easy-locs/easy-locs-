/**
 * VoiceMessageBubble — Premium voice message player with animated waveform.
 * Signal/WhatsApp-grade design with smooth progress, play/pause, seek.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Mic } from "lucide-react";

interface Props {
  url: string;
  durationSeconds: number;
  isMe?: boolean;
  status?: "sending" | "sent" | "failed";
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
  const [loaded, setLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animRef = useRef<number>();
  const waveContainerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    return () => {
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

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const container = waveContainerRef.current;
    if (!audio || !container || !audio.duration) return;
    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    audio.currentTime = x * audio.duration;
    setProgress(x * 100);
    setCurrentTime(audio.currentTime);
  };

  const formatDur = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const isFailed = status === "failed";
  const isSending = status === "sending";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 py-1 min-w-[220px] max-w-[320px]"
    >
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onEnded={handleEnded}
        onLoadedMetadata={() => setLoaded(true)}
        playsInline
      />

      {/* Play/Pause button */}
      <button
        onClick={toggle}
        disabled={isSending || isFailed}
        className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
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
          className="flex items-end gap-[2px] h-7 cursor-pointer"
          onClick={handleSeek}
        >
          {waveform.map((h, i) => {
            const barProgress = (i / bars) * 100;
            const filled = barProgress <= progress;
            const isActive = playing && Math.abs(barProgress - progress) < (100 / bars);

            return (
              <motion.div
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
                animate={isActive ? { scaleY: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.3 }}
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
    </motion.div>
  );
}
