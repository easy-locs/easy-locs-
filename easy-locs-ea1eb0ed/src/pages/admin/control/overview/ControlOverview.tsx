/**
 * ControlOverview — ACP Agent 5 (#864). Mission Control landing
 * content rendered inside the unified shell at
 * `/admin/control/overview`. Composes KPIs, sparklines, agent health
 * heatmap, live event stream and active alerts on top of existing
 * read sources, then registers:
 *   - the global kill-switch handler (top bar action), and
 *   - the live system health indicators (top bar dots),
 * with the shell `ControlContext`.
 *
 * All sections degrade gracefully (loading / empty / error) and the
 * snapshot auto-refreshes every 15 s.
 */
import { useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  CONTROL_OVERVIEW_QUERY_KEY,
  fetchControlOverview,
  type OverviewKpis,
} from "@/services/domain/control-overview.service";
import { getAllKillSwitches } from "@/lib/control-plane/kill-switches";
import { toggleKillSwitchServer } from "@/lib/runtime/runtime-rpc-client";
import { useControlContext, type HealthIndicator } from "../ControlContext";
import KpiCards from "./KpiCards";
import AgentHealthHeatmap from "./AgentHealthHeatmap";
import EventStream from "./EventStream";
import ActiveAlertsList from "./ActiveAlertsList";

function relTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  return `${Math.round(ms / 3_600_000)}h ago`;
}

/**
 * Build the four health-pill indicators rendered by the shell top bar
 * from a fresh overview snapshot. Levels intentionally err on the side
 * of "warn" so operators see something other than "unknown" as soon as
 * the first snapshot lands.
 */
function buildHealthIndicators(
  kpis: OverviewKpis,
  agentsHealthCounts: { healthy: number; total: number; down: number },
): HealthIndicator[] {
  const apiLevel: HealthIndicator["level"] =
    kpis.errorRatePct >= 5 ? "down" : kpis.errorRatePct >= 1 ? "warn" : "ok";
  const dbLevel: HealthIndicator["level"] =
    kpis.p95LatencyMs == null
      ? "unknown"
      : kpis.p95LatencyMs > 4000
        ? "down"
        : kpis.p95LatencyMs > 1500
          ? "warn"
          : "ok";
  const queueLevel: HealthIndicator["level"] =
    kpis.dlqPending > 50 ? "down" : kpis.dlqPending > 10 ? "warn" : "ok";
  const agentsLevel: HealthIndicator["level"] =
    agentsHealthCounts.total === 0
      ? "unknown"
      : agentsHealthCounts.down > 0
        ? "down"
        : agentsHealthCounts.healthy < agentsHealthCounts.total
          ? "warn"
          : "ok";
  return [
    {
      id: "api",
      label: "API",
      level: apiLevel,
      hint: `Error rate ${kpis.errorRatePct.toFixed(1)}% over last hour`,
    },
    {
      id: "db",
      label: "DB",
      level: dbLevel,
      hint:
        kpis.p95LatencyMs == null
          ? "No latency samples yet"
          : `p95 ${Math.round(kpis.p95LatencyMs)} ms (last hour)`,
    },
    {
      id: "queue",
      label: "Queue",
      level: queueLevel,
      hint: `DLQ pending: ${kpis.dlqPending}`,
    },
    {
      id: "agents",
      label: "Agents",
      level: agentsLevel,
      hint: `${agentsHealthCounts.healthy}/${agentsHealthCounts.total} healthy`,
    },
  ];
}

export default function ControlOverview() {
  const { user } = useAuth();
  const { registerKillSwitchHandler, setHealth, setKillSwitch } = useControlContext();

  const query = useQuery({
    queryKey: CONTROL_OVERVIEW_QUERY_KEY,
    queryFn: fetchControlOverview,
    refetchInterval: 15_000,
    staleTime: 5_000,
  });

  /**
   * Wire the shell-level Kill Switch button to the existing
   * `runtime-control-plane` endpoint. The shell already shows a
   * confirmation dialog before invoking us, so here we just iterate
   * every currently-enabled feature switch and disable it.
   */
  const killSwitchHandler = useCallback(async () => {
    const switches = getAllKillSwitches().filter((s) => s.enabled);
    if (switches.length === 0) {
      toast.info("All features were already disabled.");
      setKillSwitch({ engaged: true });
      return;
    }
    const actor = user?.email ?? user?.id ?? "control-plane-admin";
    const reason = "Global pause from Mission Control";
    let ok = 0;
    let failed = 0;
    for (const sw of switches) {
      const res = await toggleKillSwitchServer(sw.feature, false, actor, reason);
      if (res && res.ok === false) failed += 1;
      else ok += 1;
    }
    if (failed === 0) {
      toast.success(`Global pause engaged — ${ok} features disabled.`);
      setKillSwitch({ engaged: true });
    } else {
      toast.warning(
        `Global pause partial — ${ok}/${switches.length} disabled, ${failed} failed.`,
      );
      setKillSwitch({ engaged: ok > 0 });
    }
    query.refetch();
  }, [user?.email, user?.id, setKillSwitch, query]);

  useEffect(() => {
    registerKillSwitchHandler(killSwitchHandler);
    return () => registerKillSwitchHandler(null);
  }, [registerKillSwitchHandler, killSwitchHandler]);

  const healthIndicators = useMemo(() => {
    if (!query.data) return null;
    const counts = query.data.agents.reduce(
      (acc, a) => {
        acc.total += 1;
        if (a.health === "healthy") acc.healthy += 1;
        if (a.health === "down" || a.health === "stale") acc.down += 1;
        return acc;
      },
      { healthy: 0, total: 0, down: 0 },
    );
    return buildHealthIndicators(query.data.kpis, counts);
  }, [query.data]);

  useEffect(() => {
    if (healthIndicators) setHealth(healthIndicators);
  }, [healthIndicators, setHealth]);

  return (
    <div className="space-y-4" data-testid="admin-control-overview">
      <header className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[200px]">
          <h2 className="text-base font-semibold text-foreground">Mission Control</h2>
          <p className="text-xs text-muted-foreground">
            Live KPIs · auto-refresh every 15 s ·{" "}
            <span className="tabular-nums">snapshot {relTime(query.data?.generatedAt)}</span>
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          data-testid="control-overview-refresh"
          aria-label="Refresh mission control snapshot"
        >
          {query.isFetching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCcw className="w-4 h-4" />
          )}
        </Button>
      </header>

      {query.isLoading && !query.data && (
        <div
          className="rounded-xl border border-border/40 bg-card p-8 flex items-center justify-center"
          data-testid="control-overview-loading"
        >
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {query.error && (
        <div
          className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2"
          data-testid="control-overview-error"
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{(query.error as Error).message}</span>
        </div>
      )}

      {query.data && (
        <>
          <KpiCards kpis={query.data.kpis} buckets={query.data.buckets} />

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <AgentHealthHeatmap agents={query.data.agents} />
              <EventStream events={query.data.events} />
            </div>
            <div className="space-y-4">
              <ActiveAlertsList alerts={query.data.alerts} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
