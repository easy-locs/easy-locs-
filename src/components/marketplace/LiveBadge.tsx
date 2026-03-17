/**
 * LiveBadge — Premium pulsing "LIVE" indicator
 * PASS152: Upgraded with glow, gradient, and multi-ring pulse.
 */
import { motion } from "framer-motion";

interface LiveBadgeProps {
  isLive: boolean;
  className?: string;
  size?: "sm" | "md";
}

export default function LiveBadge({ isLive, className = "", size = "sm" }: LiveBadgeProps) {
  if (!isLive) return null;

  const sizeClasses = size === "sm"
    ? "text-[8px] px-2 py-0.5 gap-1.5"
    : "text-[9px] px-2.5 py-1 gap-1.5";

  const dotSize = size === "sm" ? 6 : 7;

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold uppercase tracking-widest ${sizeClasses} ${className}`}
      style={{
        background: "linear-gradient(135deg, hsl(0 72% 51% / 0.12), hsl(0 72% 51% / 0.06))",
        color: "hsl(0 72% 55%)",
        border: "1px solid hsl(0 72% 51% / 0.25)",
        boxShadow: "0 0 12px hsl(0 72% 51% / 0.1)",
        backdropFilter: "blur(8px)",
      }}
    >
      <span className="relative flex items-center justify-center" style={{ width: dotSize, height: dotSize }}>
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ background: "hsl(0 72% 51%)" }}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="absolute rounded-full"
          style={{ inset: -3, border: "1.5px solid hsl(0 72% 51% / 0.4)" }}
          animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
        />
      </span>
      LIVE
    </span>
  );
}
