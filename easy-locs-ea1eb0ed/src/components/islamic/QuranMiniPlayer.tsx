import { useCallback, useRef } from "react";
import { useQuranAudioStore } from "@/stores/islamic/quran-audio.store";
import { Play, Pause, X, SkipForward, SkipBack, Loader2 } from "lucide-react";
import { cancelTTS } from "@/lib/islamic/tts-engine";
import { clearMediaSession } from "@/lib/islamic/audio-robust";

export default function QuranMiniPlayer() {
  const {
    isPlaying, isLoading, currentSurah, currentAyah,
    surahName, surahNameAr, reciterName,
    progress, duration, showMiniPlayer, audioMode,
    setShowMiniPlayer, togglePlayPause,
    onNextAyah, onPrevAyah, audioElement,
    stop,
  } = useQuranAudioStore();

  const scrubRef = useRef<HTMLDivElement>(null);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!scrubRef.current || duration <= 0) return;
    const rect = scrubRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const seekTime = pct * duration;
    if (audioElement) {
      audioElement.currentTime = seekTime;
    }
  }, [audioElement, duration]);

  if (!showMiniPlayer || currentSurah === null) return null;

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handlePlayPause = () => {
    cancelTTS();
    togglePlayPause();
  };

  const handleNext = () => {
    if (onNextAyah) onNextAyah();
  };

  const handlePrev = () => {
    if (onPrevAyah) onPrevAyah();
  };

  const handleClose = () => {
    if (audioElement) {
      audioElement.pause();
    }
    cancelTTS();
    clearMediaSession();
    stop();
    setShowMiniPlayer(false);
  };

  const modeLabel = audioMode === "tts_only" ? "TTS" : audioMode === "arabic_tts" ? "Arabic+TTS" : "";

  return (
    <div
      className="fixed bottom-16 left-0 right-0 z-50 mx-2 rounded-2xl overflow-hidden shadow-2xl"
      style={{
        background: "linear-gradient(135deg, hsl(var(--navy, 226 22% 14%)) 0%, hsl(226 22% 20%) 100%)",
        border: "1px solid hsl(var(--accent) / 0.27)",
      }}
    >
      <div
        ref={scrubRef}
        className="h-1.5 w-full cursor-pointer group"
        style={{ background: "hsl(var(--accent) / 0.13)" }}
        onClick={handleSeek}
        onTouchStart={handleSeek}
        role="slider"
        aria-label="Seek"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
      >
        <div
          className="h-full transition-[width] duration-150 relative"
          style={{ width: `${progressPct}%`, background: "hsl(var(--accent))" }}
        >
          <div
            className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "hsl(var(--accent))", boxShadow: "0 0 4px hsl(var(--accent) / 0.5)" }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: "hsl(var(--accent))" }}>
            {surahName} — Verset {currentAyah}
            {modeLabel && (
              <span className="ml-1.5 text-[0.5625rem] font-medium px-1.5 py-0.5 rounded-full" style={{ background: "hsl(var(--accent) / 0.15)" }}>
                {modeLabel}
              </span>
            )}
          </p>
          <p className="text-[0.625rem] truncate" style={{ color: "hsl(var(--accent) / 0.53)" }}>
            {surahNameAr} · {reciterName}
          </p>
        </div>

        {duration > 0 && (
          <span className="text-[0.5625rem] tabular-nums shrink-0" style={{ color: "hsl(var(--accent) / 0.53)" }}>
            {formatTime(progress)}/{formatTime(duration)}
          </span>
        )}

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={handlePrev} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--accent) / 0.13)" }}>
            <SkipBack size={12} style={{ color: "hsl(var(--accent))" }} />
          </button>
          <button
            onClick={handlePlayPause}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "hsl(var(--accent))" }}
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" style={{ color: "hsl(var(--accent-foreground, 226 22% 14%))" }} />
            ) : isPlaying ? (
              <Pause size={16} style={{ color: "hsl(var(--accent-foreground, 226 22% 14%))" }} />
            ) : (
              <Play size={16} style={{ color: "hsl(var(--accent-foreground, 226 22% 14%))" }} />
            )}
          </button>
          <button onClick={handleNext} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--accent) / 0.13)" }}>
            <SkipForward size={12} style={{ color: "hsl(var(--accent))" }} />
          </button>
        </div>

        <button
          onClick={handleClose}
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "hsl(var(--accent) / 0.08)" }}
        >
          <X size={12} style={{ color: "hsl(var(--accent) / 0.53)" }} />
        </button>
      </div>
    </div>
  );
}
