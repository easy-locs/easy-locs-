import { memo } from "react";

export type CardHealth = "ok" | "degraded" | "disabled" | "loading" | "error";

interface CardHealthDotProps {
  status: CardHealth;
  title?: string;
  className?: string;
}

const COLORS: Record<CardHealth, string> = {
  ok: "hsl(142 65% 45%)",
  degraded: "hsl(45 93% 47%)",
  disabled: "hsl(0 0% 55% / 0.5)",
  loading: "hsl(210 60% 55%)",
  error: "hsl(0 72% 58%)",
};

const LABELS: Record<CardHealth, string> = {
  ok: "Live",
  degraded: "Stale",
  disabled: "Off",
  loading: "Loading",
  error: "Error",
};

const CardHealthDot = memo(function CardHealthDot({ status, title, className }: CardHealthDotProps) {
  const color = COLORS[status];
  return (
    <span
      role="status"
      aria-label={title || LABELS[status]}
      title={title || LABELS[status]}
      className={className}
      style={{
        display: "inline-block",
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: color,
        boxShadow: status === "ok" ? `0 0 4px ${color}` : undefined,
        flexShrink: 0,
      }}
    />
  );
});

export default CardHealthDot;
