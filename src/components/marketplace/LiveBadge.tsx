/**
 * LiveBadge — Pulsing "LIVE" indicator for providers
 * PASS55 Block E: Seller/Video/Live
 */

interface LiveBadgeProps {
  isLive: boolean;
  className?: string;
  size?: "sm" | "md";
}

export default function LiveBadge({ isLive, className = "", size = "sm" }: LiveBadgeProps) {
  if (!isLive) return null;

  const sizeClasses = size === "sm"
    ? "text-[9px] px-1.5 py-0.5 gap-1"
    : "text-[10px] px-2 py-0.5 gap-1.5";

  const dotSize = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold uppercase tracking-wider ${sizeClasses} ${className}`}
      style={{
        background: "hsl(0 72% 51% / 0.15)",
        color: "hsl(0 72% 51%)",
        border: "1px solid hsl(0 72% 51% / 0.3)",
      }}
    >
      <span className={`${dotSize} rounded-full animate-pulse`} style={{ background: "hsl(0 72% 51%)" }} />
      LIVE
    </span>
  );
}
