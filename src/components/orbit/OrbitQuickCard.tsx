/**
 * OrbitQuickCard — Premium quick-access card for Orbit Home.
 * Phase 2: richer layout, description line, subtle glass effect.
 */
import { useNavigate } from "react-router-dom";
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

  return (
    <button
      onClick={() => navigate(to)}
      className="relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all duration-200 active:scale-[0.94] hover:scale-[1.03] min-w-0 text-center overflow-hidden"
      style={{
        background: hasActivity
          ? "linear-gradient(145deg, hsl(var(--hud-surface)), hsl(var(--hud-surface-2)))"
          : "hsl(var(--hud-surface))",
        borderColor: hasActivity
          ? "hsl(var(--hud-cyan) / 0.25)"
          : "hsl(var(--hud-border) / 0.12)",
        boxShadow: hasActivity ? "0 2px 12px hsl(var(--hud-cyan) / 0.08)" : "none",
      }}
    >
      {/* Counter badge */}
      {counter != null && counter > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold px-1 z-10"
          style={{
            background: "hsl(var(--hud-danger))",
            color: "#fff",
            boxShadow: "0 1px 4px hsl(var(--hud-danger) / 0.4)",
          }}
        >
          {counter > 99 ? "99+" : counter}
        </span>
      )}

      {/* Icon */}
      <div className="relative w-9 h-9 flex items-center justify-center rounded-xl"
        style={{
          background: hasActivity
            ? "hsl(var(--hud-cyan) / 0.12)"
            : "hsl(var(--hud-surface-2) / 0.6)",
        }}
      >
        <Icon
          className="w-[18px] h-[18px]"
          style={{
            color: hasActivity ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim))",
          }}
        />
      </div>

      {/* Label */}
      <span
        className="text-[11px] font-semibold leading-tight"
        style={{ color: "hsl(var(--hud-text))" }}
      >
        {label}
      </span>

      {/* Description */}
      {description && (
        <span
          className="text-[9px] leading-tight line-clamp-1 -mt-0.5"
          style={{ color: "hsl(var(--hud-text-dim))" }}
        >
          {description}
        </span>
      )}
    </button>
  );
}
