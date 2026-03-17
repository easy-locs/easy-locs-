/**
 * OrbitSmartActions — Contextual priority actions widget.
 * PASS 157-163: i18n, accessibility, line-clamp-2 for descriptions.
 */
import { useNavigate } from "react-router-dom";
import { ChevronRight, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { SmartAction } from "@/hooks/useOrbitDashboard";

interface Props {
  actions: SmartAction[];
  loading: boolean;
}

const TYPE_STYLES: Record<SmartAction["type"], { bg: string; accent: string }> = {
  urgent: {
    bg: "hsl(var(--hud-danger) / 0.05)",
    accent: "hsl(var(--hud-danger))",
  },
  action: {
    bg: "hsl(var(--hud-cyan) / 0.04)",
    accent: "hsl(var(--hud-cyan))",
  },
  info: {
    bg: "transparent",
    accent: "hsl(var(--hud-text-dim))",
  },
};

export default function OrbitSmartActions({ actions, loading }: Props) {
  const navigate = useNavigate();
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="w-full">
        <SectionHead count={0} hasUrgent={false} />
        <div
          className="flex items-center justify-center py-8 rounded-2xl"
          style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}
          role="status"
          aria-label={t("common.loading")}
        >
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }} />
        </div>
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="w-full">
        <SectionHead count={0} hasUrgent={false} />
        <div
          className="flex items-center gap-3 px-4 py-4 rounded-2xl"
          style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}
        >
          <span className="text-base">✨</span>
          <span className="text-[12px] font-medium" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>
            {t("orbit.home.no_actions")}
          </span>
        </div>
      </div>
    );
  }

  const hasUrgent = actions.some((a) => a.type === "urgent");

  return (
    <div className="w-full">
      <SectionHead count={actions.length} hasUrgent={hasUrgent} />
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "hsl(var(--hud-surface))",
          border: `1px solid ${hasUrgent ? "hsl(var(--hud-danger) / 0.12)" : "hsl(var(--hud-border) / 0.08)"}`,
        }}
      >
        {actions.map((action, i) => {
          const style = TYPE_STYLES[action.type];
          return (
            <button
              key={action.id}
              onClick={() => navigate(action.link)}
              aria-label={`${action.label} — ${action.description}`}
              className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors active:scale-[0.98] min-h-[44px]"
              style={{
                background: style.bg,
                borderBottom: i < actions.length - 1 ? "1px solid hsl(var(--hud-border) / 0.06)" : "none",
              }}
            >
              <div className="flex flex-col items-center gap-1 shrink-0">
                <span className="text-lg">{action.icon}</span>
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: style.accent,
                    boxShadow: action.type === "urgent" ? `0 0 8px ${style.accent}` : "none",
                  }}
                />
              </div>

              <div className="flex-1 min-w-0 text-left">
                <p className="text-[12px] font-semibold leading-snug" style={{ color: "hsl(var(--hud-text))" }}>
                  {action.label}
                </p>
                <p className="text-[10px] leading-snug mt-0.5 line-clamp-2" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>
                  {action.description}
                </p>
              </div>

              <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SectionHead({ count, hasUrgent }: { count: number; hasUrgent: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between mb-2.5 px-0.5">
      <h2
        className="text-[11px] font-bold uppercase tracking-[0.12em]"
        style={{ color: "hsl(var(--hud-text-dim) / 0.7)" }}
      >
        {t("orbit.home.section_actions")}
      </h2>
      {count > 0 && (
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{
            background: hasUrgent ? "hsl(var(--hud-danger) / 0.12)" : "hsl(var(--hud-cyan) / 0.08)",
            color: hasUrgent ? "hsl(var(--hud-danger))" : "hsl(var(--hud-cyan))",
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
}
