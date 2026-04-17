/**
 * AgentHealthHeatmap — ACP Agent 5 (#864). Compact grid that renders
 * one cell per registered agent, color-coded by `health_status`. Click
 * a cell to navigate to the agent in the cockpit.
 */
import { useNavigate } from "react-router-dom";
import type { AgentHeatCell } from "@/services/domain/control-overview.service";

interface Props {
  agents: AgentHeatCell[];
}

const HEALTH_COLORS: Record<string, string> = {
  healthy: "bg-emerald-500/80 hover:bg-emerald-400",
  degraded: "bg-amber-500/80 hover:bg-amber-400",
  stale: "bg-orange-500/80 hover:bg-orange-400",
  down: "bg-red-500/80 hover:bg-red-400",
  unknown: "bg-zinc-600/60 hover:bg-zinc-500",
};

export default function AgentHealthHeatmap({ agents }: Props) {
  const navigate = useNavigate();
  if (agents.length === 0) {
    return (
      <div className="rounded-xl border border-border/40 bg-card p-4 text-xs text-muted-foreground">
        No agents registered.
      </div>
    );
  }
  const counts = agents.reduce<Record<string, number>>((acc, a) => {
    acc[a.health] = (acc[a.health] ?? 0) + 1;
    return acc;
  }, {});
  return (
    <div
      className="rounded-xl border border-border/40 bg-card p-3 space-y-3"
      data-testid="control-overview-heatmap"
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Agent health heatmap
        </h3>
        <div className="flex items-center gap-2 text-[0.625rem] text-muted-foreground">
          {Object.entries(HEALTH_COLORS).map(([key, cls]) => (
            <span key={key} className="inline-flex items-center gap-1">
              <span className={`inline-block w-2 h-2 rounded-sm ${cls.split(" ")[0]}`} />
              {key} {counts[key] ?? 0}
            </span>
          ))}
        </div>
      </div>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(28px, 1fr))" }}
      >
        {agents.map((a) => {
          const cls = HEALTH_COLORS[a.health] ?? HEALTH_COLORS.unknown;
          const tooltip = `${a.display_name}\n${a.health}${a.inFlight ? ` · ${a.inFlight} in-flight` : ""}${a.lagMs != null ? ` · lag ${a.lagMs}ms` : ""}`;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => navigate(`/admin/control/agents?agent=${encodeURIComponent(a.slug)}`)}
              title={tooltip}
              aria-label={tooltip}
              data-testid={`control-overview-heatmap-cell-${a.slug}`}
              className={`aspect-square rounded-sm transition-colors ${cls} focus:outline-none focus:ring-2 focus:ring-foreground/40`}
            />
          );
        })}
      </div>
    </div>
  );
}
