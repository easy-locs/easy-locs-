import { useQuranAudioStore } from "@/stores/islamic/quran-audio.store";
import { Play, Pause, X, SkipForward, SkipBack, Loader2 } from "lucide-react";
import { cancelTTS } from "@/lib/islamic/tts-engine";
import { clearMediaSession } from "@/lib/islamic/audio-robust";

const GOLD = "hsl(var(--accent))";
const NAVY = "hsl(226 22% 14%)";

export default function QuranMiniPlayer() {
  const {
    isPlaying, isLoading, currentSurah, currentAyah,
    surahName, surahNameAr, reciterName,
    progress, duration, showMiniPlayer,
    setShowMiniPlayer, togglePlayPause,
    onNextAyah, onPrevAyah, audioElement,
    stop,
  } = useQuranAudioStore();

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

  return (
    <div
      className="fixed bottom-16 left-0 right-0 z-50 mx-2 rounded-2xl overflow-hidden shadow-2xl"
      style={{
        background: `linear-gradient(135deg, ${NAVY} 0%, hsl(226 22% 20%) 100%)`,
        border: `1px solid ${GOLD}44`,
      }}
    >
      <div className="h-0.5 w-full" style={{ background: `${GOLD}22` }}>
        <div className="h-full transition-all duration-300" style={{ width: `${progressPct}%`, background: GOLD }} />
      </div>

      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: GOLD }}>
            {surahName} — Verset {currentAyah}
          </p>
          <p className="text-[10px] truncate" style={{ color: `${GOLD}88` }}>
            {surahNameAr} · {reciterName}
          </p>
        </div>

        {duration > 0 && (
          <span className="text-[9px] tabular-nums shrink-0" style={{ color: `${GOLD}88` }}>
            {formatTime(progress)}/{formatTime(duration)}
          </span>
        )}

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={handlePrev} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `${GOLD}22` }}>
            <SkipBack size={12} style={{ color: GOLD }} />
          </button>
          <button
            onClick={handlePlayPause}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: GOLD }}
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" style={{ color: NAVY }} />
            ) : isPlaying ? (
              <Pause size={16} style={{ color: NAVY }} />
            ) : (
              <Play size={16} style={{ color: NAVY }} />
            )}
          </button>
          <button onClick={handleNext} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `${GOLD}22` }}>
            <SkipForward size={12} style={{ color: GOLD }} />
          </button>
        </div>

        <button
          onClick={handleClose}
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
          style={{ background: `${GOLD}15` }}
        >
          <X size={12} style={{ color: `${GOLD}88` }} />
        </button>
      </div>
    </div>
  );
}
