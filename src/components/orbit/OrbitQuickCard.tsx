/**
 * OrbitQuickCard — Quick-access card for Orbit Home modules.
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
  actions?: { label: string; onClick: () => void }[];
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

  const statusColor =
    status === "active"
      ? "hsl(var(--hud-success))"
      : status === "warning"
      ? "hsl(var(--hud-warning))"
      : "hsl(var(--hud-text-dim))";

  return (
    <button
      onClick={() => navigate(to)}
      className="relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 active:scale-95 hover:scale-[1.03] min-w-0 text-center group"
      style={{
        background: "hsl(var(--hud-surface))",
        borderColor: "hsl(var(--hud-border) / 0.2)",
      }}
    >
      {/* Counter badge */}
      {counter != null && counter > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 flex items-center justify-center rounded-full text-[11px] font-bold px-1.5"
          style={{
            background: "hsl(var(--hud-danger))",
            color: "#fff",
          }}
        >
          {counter > 99 ? "99+" : counter}
        </span>
      )}

      {/* Status dot */}
      <div className="relative">
        <Icon
          className="w-6 h-6 transition-colors"
          style={{ color: "hsl(var(--hud-cyan))" }}
        />
        <span
          className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full"
          style={{ background: statusColor }}
        />
      </div>

      <span
        className="text-xs font-semibold leading-tight"
        style={{ color: "hsl(var(--hud-text))" }}
      >
        {label}
      </span>

      {description && (
        <span
          className="text-[10px] leading-tight line-clamp-1"
          style={{ color: "hsl(var(--hud-text-dim))" }}
        >
          {description}
        </span>
      )}
    </button>
  );
}
