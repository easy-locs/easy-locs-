/**
 * OrbitQuickCard — Premium quick-access card for Orbit Home.
 * PASS155: Refined proportions, stronger icon presence, better label readability.
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
      onClick={() => navigate(to)}
      className="relative flex flex-col items-center gap-1 p-2.5 rounded-2xl border transition-colors duration-150 min-w-0 text-center"
      style={{
        background: hasActivity
          ? "linear-gradient(145deg, hsl(var(--hud-surface)), hsl(var(--hud-surface-2)))"
          : "hsl(var(--hud-surface))",
        borderColor: isWarning
          ? "hsl(var(--hud-warning) / 0.25)"
          : hasActivity
            ? "hsl(var(--hud-cyan) / 0.12)"
            : "hsl(var(--hud-border) / 0.06)",
      }}
    >
      {/* Counter badge */}
      {counter != null && counter > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold px-1 z-10"
          style={{
            background: "hsl(var(--hud-danger))",
            color: "#fff",
            boxShadow: "0 2px 8px hsl(var(--hud-danger) / 0.35)",
          }}
        >
          {counter > 99 ? "99+" : counter}
        </span>
      )}

      {/* Icon */}
      <div
        className="w-10 h-10 flex items-center justify-center rounded-xl"
        style={{
          background: isWarning
            ? "hsl(var(--hud-warning) / 0.1)"
            : hasActivity
              ? "hsl(var(--hud-cyan) / 0.1)"
              : "hsl(var(--hud-surface-2) / 0.5)",
        }}
      >
        <Icon
          className="w-[18px] h-[18px]"
          strokeWidth={2}
          style={{
            color: isWarning
              ? "hsl(var(--hud-warning))"
              : hasActivity
                ? "hsl(var(--hud-cyan))"
                : "hsl(var(--hud-text-dim) / 0.7)",
          }}
        />
      </div>

      {/* Label */}
      <span
        className="text-[11px] font-semibold leading-tight truncate w-full"
        style={{ color: "hsl(var(--hud-text))" }}
      >
        {label}
      </span>

      {/* Description */}
      {description && (
        <span
          className="text-[9px] leading-tight truncate w-full -mt-0.5"
          style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}
        >
          {description}
        </span>
      )}
    </motion.button>
  );
}
