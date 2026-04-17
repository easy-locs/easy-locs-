/**
 * AgentSparkline — minimal inline SVG sparkline (no charting lib).
 * Renders three tiny series per row: runs, latency p50, errors.
 * Designed to be readable at 36×16 px without legends or axes.
 */
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface Props {
  values: number[];
  tone?: "primary" | "muted" | "destructive";
  className?: string;
  width?: number;
  height?: number;
  ariaLabel?: string;
}

export function AgentSparkline({
  values,
  tone = "primary",
  className,
  width = 56,
  height = 16,
  ariaLabel,
}: Props) {
  const path = useMemo(() => {
    if (values.length === 0) return "";
    const max = Math.max(...values, 1);
    const step = values.length > 1 ? width / (values.length - 1) : width;
    return values
      .map((v, i) => {
        const x = i * step;
        const y = height - (v / max) * (height - 2) - 1;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [values, width, height]);

  if (values.length === 0 || values.every((v) => v === 0)) {
    return (
      <div
        className={cn("text-[0.5625rem] text-muted-foreground/60 tabular-nums", className)}
        aria-label={ariaLabel}
      >
        —
      </div>
    );
  }

  const stroke =
    tone === "destructive"
      ? "hsl(var(--destructive))"
      : tone === "muted"
        ? "hsl(var(--muted-foreground))"
        : "hsl(var(--primary))";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("inline-block align-middle", className)}
      role="img"
      aria-label={ariaLabel}
    >
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
