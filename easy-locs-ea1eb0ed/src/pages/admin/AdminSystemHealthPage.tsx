import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchSystemHealthData } from "@/repositories/admin-ops.repository";
import { useUiEngine } from "@/hooks/useUiEngine";
import { getSystemHealthSnapshot, type SystemHealthSnapshot } from "@/lib/infrastructure/system-health-snapshot";

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

function getStatusDot(status: string): string {
  if (status === "ok") return "bg-emerald-500";
  if (status === "degraded") return "bg-amber-500";
  if (status === "down") return "bg-red-500";
  return "bg-gray-500";
}

export default function AdminSystemHealthPage() {
  useUiEngine("admin-adminsystemhealthpage");
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({ queryKey: ["admin-system-health"], queryFn: fetchSystemHealthData, staleTime: 10000 });

  const [snapshot, setSnapshot] = useState<SystemHealthSnapshot | null>(null);

  const refreshSnapshot = useCallback(() => {
    try {
      setSnapshot(getSystemHealthSnapshot());
    } catch (err) {
      console.error("[admin-health] Failed to capture system health snapshot:", err);
    }
  }, []);

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">&#x2190;</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">System Health</h1>
          <p className="text-xs text-muted-foreground">Global platform monitor</p>
        </div>
      </div>

      {isLoading ? (
        <>{[1, 2, 3].map((i) => <div key={i} className="mx-4 mb-3 h-16 rounded-2xl bg-muted animate-pulse" />)}</>
      ) : data ? (
        <div className="grid grid-cols-2 gap-3 px-4 mb-4">
          <Metric title="Users" value={String(data.users)} />
          <Metric title="Orders" value={String(data.orders)} />
          <Metric title="Tickets" value={String(data.tickets)} />
          <Metric title="Wallets" value={String(data.wallets)} />
          <Metric title="Notifications" value={String(data.notifications)} />
        </div>
      ) : null}

      <div className="px-4 mb-4">
        <button
          onClick={refreshSnapshot}
          className="w-full rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium py-2.5"
        >
          Load Infrastructure Health Snapshot
        </button>
      </div>

      {snapshot && (
        <div className="px-4 space-y-3">
          <div className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-foreground">Overall Score</p>
              <p className={`text-2xl font-bold ${getScoreColor(snapshot.scores.overall)}`}>
                {snapshot.scores.overall}/100
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <ScoreRow label="Event Bus" score={snapshot.scores.eventBusHealth} />
              <ScoreRow label="Flow Health" score={snapshot.scores.flowHealth} />
              <ScoreRow label="Circuit Health" score={snapshot.scores.circuitHealth} />
              <ScoreRow label="SLA Compliance" score={snapshot.scores.slaCompliance} />
            </div>
          </div>

          <div className="rounded-2xl border border-border/20 bg-card p-4">
            <p className="text-sm font-semibold text-foreground mb-2">Module Health</p>
            <div className="space-y-1">
              {snapshot.modules.map((m) => (
                <div key={m.module} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusDot(m.status)}`} />
                    <span className="text-muted-foreground">{m.module}</span>
                  </div>
                  <span className="text-muted-foreground">{m.avgLatencyMs}ms</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/20 bg-card p-4">
            <p className="text-sm font-semibold text-foreground mb-2">Flows</p>
            <div className="grid grid-cols-3 gap-2 text-xs text-center">
              <div>
                <p className="text-emerald-400 font-bold">{snapshot.flows.healthyFlows}</p>
                <p className="text-muted-foreground">Healthy</p>
              </div>
              <div>
                <p className="text-amber-400 font-bold">{snapshot.flows.incompleteFlows}</p>
                <p className="text-muted-foreground">Incomplete</p>
              </div>
              <div>
                <p className="text-red-400 font-bold">{snapshot.flows.brokenFlows}</p>
                <p className="text-muted-foreground">Broken</p>
              </div>
            </div>
          </div>

          {snapshot.circuitBreakers.openCircuits.length > 0 && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-sm font-semibold text-red-400 mb-1">Open Circuit Breakers</p>
              <p className="text-xs text-muted-foreground">{snapshot.circuitBreakers.openCircuits.join(", ")}</p>
            </div>
          )}

          {snapshot.sla.quarantinedEngines.length > 0 && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-semibold text-amber-400 mb-1">SLA Quarantined Engines</p>
              <p className="text-xs text-muted-foreground">{snapshot.sla.quarantinedEngines.join(", ")}</p>
            </div>
          )}

          <div className="rounded-2xl border border-border/20 bg-card p-4">
            <p className="text-sm font-semibold text-foreground mb-2">Infrastructure</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Backpressure Queue</span>
                <span className="text-foreground">{snapshot.backpressure.totalQueueDepth}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dead Letters</span>
                <span className="text-foreground">{snapshot.circuitBreakers.totalDeadLetters}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Storm Alerts</span>
                <span className="text-foreground">{snapshot.stormGuard.totalAlerts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SLA Violations</span>
                <span className="text-foreground">{snapshot.sla.totalViolations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Event Traces</span>
                <span className="text-foreground">{snapshot.eventBus.totalEventTraces}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cycles Detected</span>
                <span className="text-foreground">{snapshot.cycles.cycleCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Retry Load Factor</span>
                <span className="text-foreground">{snapshot.retry.currentLoadFactor}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dead Events (Active)</span>
                <span className="text-foreground">{snapshot.deadEvents.activeDeadEvents}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dead Events Cleaned</span>
                <span className="text-foreground">{snapshot.deadEvents.cleanedEvents}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 text-center">
      <p className="text-[11px] text-muted-foreground">{title}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function ScoreRow({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${getScoreColor(score)}`}>{score}%</span>
    </div>
  );
}
