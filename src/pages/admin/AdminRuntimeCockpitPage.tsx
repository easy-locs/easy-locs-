/**
 * AdminRuntimeCockpitPage — Debug cockpit for runtime supervision.
 * Displays: module health, flow traces, anomalies, realtime channels, event audit, cache state.
 */
import { useRuntimeSupervisor } from "@/hooks/useRuntimeSupervisor";
import { useNavigate } from "react-router-dom";
import { clearTraces } from "@/lib/runtime/flow-tracer";
import { clearAnomalies, resolveAnomaly } from "@/lib/runtime/anomaly-detector";
import { useState } from "react";

const statusColor = (s: string) => {
  if (s === "ok" || s === "success" || s === "active") return "text-green-500";
  if (s === "degraded" || s === "retrying" || s === "stale") return "text-yellow-500";
  if (s === "down" || s === "failed" || s === "dead" || s === "critical") return "text-red-500";
  return "text-muted-foreground";
};

const badge = (label: string, value: number | string, color?: string) => (
  <div className="rounded-xl bg-muted/50 px-3 py-2 text-center">
    <div className={`text-lg font-bold ${color || "text-foreground"}`}>{value}</div>
    <div className="text-[10px] text-muted-foreground">{label}</div>
  </div>
);

export default function AdminRuntimeCockpitPage() {
  const navigate = useNavigate();
  const snap = useRuntimeSupervisor(3000);
  const [tab, setTab] = useState<"health" | "flows" | "anomalies" | "realtime" | "events">("health");

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted text-muted-foreground font-bold">←</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Runtime Cockpit</h1>
          <p className="text-xs text-muted-foreground">Live supervision · {snap.timestamp.slice(11, 19)}</p>
        </div>
        <div className={`w-3 h-3 rounded-full ${snap.globalStatus === "ok" ? "bg-green-500" : snap.globalStatus === "degraded" ? "bg-yellow-500" : "bg-red-500"}`} />
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-2">
        {badge("Modules", snap.modules.filter(m => m.status === "ok").length + "/" + snap.modules.length, statusColor(snap.globalStatus))}
        {badge("Flows", snap.flows.running + " running")}
        {badge("Anomalies", snap.anomalies.unresolved, snap.anomalies.critical > 0 ? "text-red-500" : undefined)}
        {badge("RT Channels", snap.realtime.channels)}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-muted/30 rounded-xl p-1">
        {(["health", "flows", "anomalies", "realtime", "events"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-bold capitalize transition-colors ${tab === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Health Tab */}
      {tab === "health" && (
        <div className="space-y-2">
          {snap.modules.map(m => (
            <div key={m.module} className="rounded-xl border border-border/20 bg-card p-3 flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${statusColor(m.status).replace("text-", "bg-")}`} />
              <div className="flex-1">
                <p className="text-sm font-bold capitalize">{m.module}</p>
                <p className="text-[10px] text-muted-foreground">
                  {m.avgLatencyMs > 0 ? `${m.avgLatencyMs}ms avg` : "no data"} · {m.failureCount} failures
                </p>
              </div>
              <span className={`text-xs font-bold ${statusColor(m.status)}`}>{m.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Flows Tab */}
      {tab === "flows" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">{snap.flows.total} traces · {snap.flows.failed} failed</p>
            <button onClick={clearTraces} className="text-xs bg-muted px-2 py-1 rounded-lg font-bold">Clear</button>
          </div>
          {snap.flows.slowest && (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-3">
              <p className="text-xs font-bold text-yellow-600">Slowest: {snap.flows.slowest.flowName}</p>
              <p className="text-[10px] text-muted-foreground">{snap.flows.slowest.totalLatencyMs}ms · {snap.flows.slowest.domain} · {snap.flows.slowest.steps.length} steps</p>
            </div>
          )}
        </div>
      )}

      {/* Anomalies Tab */}
      {tab === "anomalies" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">{snap.anomalies.unresolved} unresolved ({snap.anomalies.critical} critical)</p>
            <button onClick={clearAnomalies} className="text-xs bg-muted px-2 py-1 rounded-lg font-bold">Clear All</button>
          </div>
          {snap.anomalies.items.map(a => (
            <div key={a.id} className="rounded-xl border border-border/20 bg-card p-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${statusColor(a.severity)}`}>{a.severity}</span>
                <span className="text-xs text-muted-foreground">{a.type}</span>
                <span className="text-xs text-muted-foreground">· {a.module}</span>
                <button onClick={() => resolveAnomaly(a.id)} className="ml-auto text-[10px] bg-muted px-2 py-0.5 rounded font-bold">Resolve</button>
              </div>
              <p className="text-sm mt-1">{a.message}</p>
              <p className="text-[10px] text-muted-foreground">{a.detectedAt.slice(11, 19)}</p>
            </div>
          ))}
          {snap.anomalies.items.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No anomalies detected ✓</p>}
        </div>
      )}

      {/* Realtime Tab */}
      {tab === "realtime" && (
        <div className="space-y-2">
          <p className="text-sm font-bold">{snap.realtime.channels} channels · {snap.realtime.stale} stale · {snap.realtime.dead} dead</p>
          {snap.realtime.items.map(ch => (
            <div key={ch.channelName} className="rounded-xl border border-border/20 bg-card p-3 flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${statusColor(ch.status).replace("text-", "bg-")}`} />
              <div className="flex-1">
                <p className="text-xs font-bold">{ch.channelName}</p>
                <p className="text-[10px] text-muted-foreground">{ch.module} · {ch.eventCount} events</p>
              </div>
              <span className={`text-[10px] font-bold ${statusColor(ch.status)}`}>{ch.status}</span>
            </div>
          ))}
          {snap.realtime.items.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No realtime channels active</p>}
        </div>
      )}

      {/* Events Tab */}
      {tab === "events" && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {badge("Dead Events", snap.events.dead, snap.events.dead > 0 ? "text-red-500" : undefined)}
            {badge("Mismatched", snap.events.mismatched, snap.events.mismatched > 0 ? "text-yellow-500" : undefined)}
            {badge("Total Tracked", snap.events.total)}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {badge("Stale Cache", snap.cache.stale, snap.cache.stale > 0 ? "text-yellow-500" : undefined)}
            {badge("Cache Entries", snap.cache.total)}
          </div>
        </div>
      )}
    </div>
  );
}
