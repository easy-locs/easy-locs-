/**
 * VoiceMessageBubble — Plays back voice messages in chat with waveform visualization.
 */
import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface Props {
  url: string;
  durationSeconds: number;
  isMe?: boolean;
}

export default function VoiceMessageBubble({ url, durationSeconds, isMe }: Props) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animRef = useRef<number>();

  const updateProgress = () => {
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
      setProgress(pct);
      setCurrentTime(Math.floor(audio.currentTime));
      animRef.current = requestAnimationFrame(updateProgress);
    }
  };

  useEffect(() => {
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    } else {
      // Safari requires handling the play() promise
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setPlaying(true);
            animRef.current = requestAnimationFrame(updateProgress);
          })
          .catch(() => {
            // Autoplay blocked or audio load failed — reset state
            setPlaying(false);
          });
      } else {
        setPlaying(true);
        animRef.current = requestAnimationFrame(updateProgress);
      }
    }
  };

  const handleEnded = () => {
    setPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    if (animRef.current) cancelAnimationFrame(animRef.current);
  };

  const formatDur = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Generate fake waveform bars
  const bars = 28;
  const waveform = Array.from({ length: bars }, (_, i) => {
    const seed = Math.sin(i * 1.5 + 3) * 0.5 + 0.5;
    return 0.15 + seed * 0.85;
  });

  return (
    <div className="flex items-center gap-2.5 mt-1">
      <audio ref={audioRef} src={url} preload="metadata" onEnded={handleEnded} playsInline />
      
      {/* Play/pause */}
      <button
        onClick={toggle}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          isMe
            ? "bg-accent-foreground/15 text-accent-foreground hover:bg-accent-foreground/25"
            : "bg-accent/15 text-accent hover:bg-accent/25"
        }`}
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
      </button>

      {/* Waveform */}
      <div className="flex-1 flex items-center gap-[2px] h-6">
        {waveform.map((h, i) => {
          const filled = (i / bars) * 100 <= progress;
          return (
            <div
              key={i}
              className={`w-[3px] rounded-full transition-colors duration-150 ${
                filled
                  ? isMe ? "bg-accent-foreground/80" : "bg-accent/80"
                  : isMe ? "bg-accent-foreground/20" : "bg-accent/20"
              }`}
              style={{ height: `${h * 100}%` }}
            />
          );
        })}
      </div>

      {/* Duration */}
      <span className={`text-[10px] font-mono tabular-nums shrink-0 ${
        isMe ? "text-accent-foreground/60" : "text-muted-foreground"
      }`}>
        {playing ? formatDur(currentTime) : formatDur(durationSeconds)}
      </span>
    </div>
  );
}
