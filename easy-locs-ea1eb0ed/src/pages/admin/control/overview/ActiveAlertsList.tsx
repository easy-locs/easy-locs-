/**
 * ActiveAlertsList — ACP Agent 5 (#864). Renders open admin alerts.
 * Each item is clickable and routes to the most relevant admin section
 * based on the alert source/category.
 */
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Bell, Flame, ShieldAlert } from "lucide-react";
import type { ActiveAlert } from "@/services/domain/control-overview.service";

interface Props {
  alerts: ActiveAlert[];
}

const SEVERITY_TONE: Record<string, { tone: string; Icon: typeof Bell }> = {
  critical: { tone: "text-red-400 border-red-500/30 bg-red-500/10", Icon: Flame },
  high: { tone: "text-orange-400 border-orange-500/30 bg-orange-500/10", Icon: ShieldAlert },
  warning: { tone: "text-amber-400 border-amber-500/30 bg-amber-500/10", Icon: AlertTriangle },
  medium: { tone: "text-amber-400 border-amber-500/30 bg-amber-500/10", Icon: AlertTriangle },
  info: { tone: "text-sky-400 border-sky-500/30 bg-sky-500/10", Icon: Bell },
  low: { tone: "text-sky-400 border-sky-500/30 bg-sky-500/10", Icon: Bell },
};

function routeForAlert(alert: ActiveAlert): string {
  const cat = (alert.category ?? "").toLowerCase();
  if (cat.includes("agent")) return "/admin/control/agents";
  if (cat.includes("approval")) return "/admin/control/approvals";
  if (cat.includes("engine") || cat.includes("worker")) return "/admin/control/engines";
  if (cat.includes("run") || cat.includes("task")) return "/admin/control/runs";
  return "/admin/control/master";
}

export default function ActiveAlertsList({ alerts }: Props) {
  const navigate = useNavigate();
  if (alerts.length === 0) {
    return (
      <div
        className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-emerald-400"
        data-testid="control-overview-alerts"
      >
        No active alerts. System nominal.
      </div>
    );
  }
  return (
    <div
      className="rounded-xl border border-border/40 bg-card overflow-hidden"
      data-testid="control-overview-alerts"
    >
      <div className="px-3 py-2 border-b border-border/40 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Active alerts
        </h3>
        <span className="text-[0.625rem] text-muted-foreground">{alerts.length}</span>
      </div>
      <ul className="divide-y divide-border/30 max-h-[320px] overflow-y-auto">
        {alerts.map((a) => {
          const cfg = SEVERITY_TONE[a.severity] ?? SEVERITY_TONE.info;
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => navigate(routeForAlert(a))}
                className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-muted/40 transition-colors"
                data-testid={`control-overview-alert-${a.id}`}
              >
                <span
                  className={`mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-md border ${cfg.tone}`}
                >
                  <cfg.Icon className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground truncate">{a.title}</span>
                    <span className={`text-[0.625rem] uppercase ${cfg.tone.split(" ")[0]}`}>
                      {a.severity}
                    </span>
                  </div>
                  {a.detail && (
                    <p className="text-[0.625rem] text-muted-foreground truncate mt-0.5">
                      {a.detail}
                    </p>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
