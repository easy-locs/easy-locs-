/**
 * OrbitQuickCard — Premium quick-access card for Orbit Home.
 * Unified HUD design with glass morphism, consistent icon styling.
 */
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface OrbitQuickCardProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  counter?: number;
  status?: "active" | "idle" | "warning";
  to: string;
}

export default function OrbitQuickCard({
  icon: Icon,
  label,
  description,
  counter,
  status = "idle",
  to,
}: OrbitQuickCardProps) {
  const navigate = useNavigate();

  const hasActivity = status === "active" || (counter != null && counter > 0);
  const isWarning = status === "warning";

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ y: -2 }}
      onClick={() => navigate(to)}
      className="relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all duration-200 min-w-0 text-center overflow-hidden"
      style={{
        background: hasActivity
          ? "linear-gradient(145deg, hsl(var(--hud-surface)), hsl(var(--hud-surface-2)))"
          : "hsl(var(--hud-surface))",
        borderColor: isWarning
          ? "hsl(var(--hud-warning) / 0.3)"
          : hasActivity
            ? "hsl(var(--hud-cyan) / 0.15)"
            : "hsl(var(--hud-border) / 0.06)",
        boxShadow: hasActivity
          ? "0 2px 16px hsl(var(--hud-cyan) / 0.06)"
          : "none",
      }}
    >
      {/* Counter badge */}
      {counter != null && counter > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold px-1 z-10"
          style={{
            background: "hsl(var(--hud-danger))",
            color: "#fff",
            boxShadow: "0 1px 6px hsl(var(--hud-danger) / 0.4)",
          }}
        >
          {counter > 99 ? "99+" : counter}
        </span>
      )}

      {/* Icon container */}
      <div
        className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
        style={{
          background: isWarning
            ? "hsl(var(--hud-warning) / 0.12)"
            : hasActivity
              ? "hsl(var(--hud-cyan) / 0.12)"
              : "hsl(var(--hud-surface-2) / 0.6)",
        }}
      >
        <Icon
          className="w-[18px] h-[18px]"
          style={{
            color: isWarning
              ? "hsl(var(--hud-warning))"
              : hasActivity
                ? "hsl(var(--hud-cyan))"
                : "hsl(var(--hud-text-dim))",
          }}
        />
      </div>

      {/* Label */}
      <span
        className="text-[10px] font-semibold leading-tight text-center break-words w-full"
        style={{ color: "hsl(var(--hud-text))" }}
      >
        {label}
      </span>

      {/* Description */}
      {description && (
        <span
          className="text-[9px] leading-tight line-clamp-2 break-words -mt-0.5 w-full"
          style={{ color: "hsl(var(--hud-text-dim))" }}
        >
          {description}
        </span>
      )}
    </motion.button>
  );
}
