import { useEffect, useState } from "react";

interface StoryProgressBarProps {
  total: number;
  current: number;
  duration: number;
  paused: boolean;
  onComplete: () => void;
}

export default function StoryProgressBar({ total, current, duration, paused, onComplete }: StoryProgressBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
  }, [current]);

  useEffect(() => {
    if (paused) return;
    const interval = 30;
    const step = (interval / duration) * 100;
    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev + step;
        if (next >= 100) {
          clearInterval(timer);
          onComplete();
          return 100;
        }
        return next;
      });
    }, interval);
    return () => clearInterval(timer);
  }, [current, paused, duration, onComplete]);

  return (
    <div className="flex gap-1 px-3 pt-3" style={{ paddingTop: "calc(env(safe-area-inset-top, 12px) + 4px)" }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex-1 h-[2.5px] rounded-full overflow-hidden" style={{ background: "hsl(0 0% 100% / 0.25)" }}>
          <div
            className="h-full rounded-full transition-none"
            style={{
              width: i < current ? "100%" : i === current ? `${progress}%` : "0%",
              background: "hsl(var(--accent))",
            }}
          />
        </div>
      ))}
    </div>
  );
}
