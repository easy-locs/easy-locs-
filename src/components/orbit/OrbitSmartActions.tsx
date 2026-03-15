/**
 * OrbitSmartActions — Contextual priority actions widget.
 * Phase 5: Simple rule-based smart actions from existing signals.
 */
import { useNavigate } from "react-router-dom";
import { ChevronRight, Loader2 } from "lucide-react";
import type { SmartAction } from "@/hooks/useOrbitDashboard";

interface Props {
  actions: SmartAction[];
  loading: boolean;
}

const TYPE_STYLES: Record<SmartAction["type"], { bg: string; border: string; dot: string }> = {
  urgent: {
    bg: "hsl(var(--hud-danger) / 0.06)",
    border: "hsl(var(--hud-danger) / 0.18)",
    dot: "hsl(var(--hud-danger))",
  },
  action: {
    bg: "hsl(var(--hud-cyan) / 0.06)",
    border: "hsl(var(--hud-cyan) / 0.18)",
    dot: "hsl(var(--hud-cyan))",
  },
  info: {
    bg: "hsl(var(--hud-surface))",
    border: "hsl(var(--hud-border) / 0.12)",
    dot: "hsl(var(--hud-text-dim))",
  },
};

export default function OrbitSmartActions({ actions, loading }: Props) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="w-full max-w-md">
        <h2
          className="text-[11px] font-bold uppercase tracking-widest mb-2 px-1"
          style={{ color: "hsl(var(--hud-text-dim))" }}
        >
          Actions suggérées
        </h2>
        <div
          className="flex items-center justify-center py-6 rounded-2xl"
          style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.12)" }}
        >
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: "hsl(var(--hud-text-dim))" }} />
        </div>
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="w-full max-w-md">
        <h2
          className="text-[11px] font-bold uppercase tracking-widest mb-2 px-1"
          style={{ color: "hsl(var(--hud-text-dim))" }}
        >
          Actions suggérées
        </h2>
        <div
          className="flex items-center gap-3 px-4 py-4 rounded-2xl"
          style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.12)" }}
        >
          <span className="text-base">✨</span>
          <span className="text-[12px] font-medium" style={{ color: "hsl(var(--hud-text-dim))" }}>
            Aucune action requise — tout est en ordre
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="flex items-center justify-between mb-2 px-1">
        <h2
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: "hsl(var(--hud-text-dim))" }}
        >
          Actions suggérées
        </h2>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{
            background: actions.some((a) => a.type === "urgent")
              ? "hsl(var(--hud-danger) / 0.15)"
              : "hsl(var(--hud-cyan) / 0.1)",
            color: actions.some((a) => a.type === "urgent")
              ? "hsl(var(--hud-danger))"
              : "hsl(var(--hud-cyan))",
          }}
        >
          {actions.length} action{actions.length > 1 ? "s" : ""}
        </span>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "hsl(var(--hud-surface))",
          border: "1px solid hsl(var(--hud-border) / 0.12)",
        }}
      >
        {actions.map((action, i) => {
          const style = TYPE_STYLES[action.type];
          return (
            <button
              key={action.id}
              onClick={() => navigate(action.link)}
              className="w-full flex items-center gap-3 px-4 py-3 transition-all active:scale-[0.98] hover:brightness-105"
              style={{
                background: style.bg,
                borderBottom: i < actions.length - 1 ? `1px solid ${style.border}` : "none",
              }}
            >
              {/* Priority dot */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <span className="text-base">{action.icon}</span>
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: style.dot,
                    boxShadow: action.type === "urgent" ? `0 0 6px ${style.dot}` : "none",
                  }}
                />
              </div>

              <div className="flex-1 min-w-0 text-left">
                <p
                  className="text-[12px] font-semibold leading-tight"
                  style={{ color: "hsl(var(--hud-text))" }}
                >
                  {action.label}
                </p>
                <p
                  className="text-[10px] leading-tight mt-0.5 line-clamp-2 break-words"
                  style={{ color: "hsl(var(--hud-text-dim))" }}
                >
                  {action.description}
                </p>
              </div>

              <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(var(--hud-text-dim))" }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
