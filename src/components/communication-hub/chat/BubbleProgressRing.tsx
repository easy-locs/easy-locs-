/**
 * BubbleProgressRing — Lightweight SVG progress ring for media uploads.
 * Micro-component: only rerenders when progress changes.
 * No layout shift — absolutely positioned overlay.
 */
import { memo } from "react";

interface Props {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
}

function BubbleProgressRingInner({ progress, size = 32, strokeWidth = 2.5 }: Props) {
  if (progress <= 0 || progress >= 100) return null;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="rounded-full p-1" style={{ background: "hsl(0 0% 0% / 0.35)" }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(0 0% 100% / 0.2)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(0 0% 100% / 0.9)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-200 ease-out"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-white tabular-nums">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}

export const BubbleProgressRing = memo(BubbleProgressRingInner);
BubbleProgressRing.displayName = "BubbleProgressRing";
