/**
 * Admin Dashboard — Unified Global UX/UI/Digital/Lead/Payment Engine
 */
import React, { useMemo } from "react";
import { useUnifiedGlobalEngine } from "@/hooks/useUnifiedGlobalEngine";
import { WORLD_HOLIDAYS } from "@/lib/engines/unified-global-engine";

export default function UnifiedGlobalEnginePage() {
  const tz = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return null; }
  }, []);

  const { report, execute, running } = useUnifiedGlobalEngine({
    enabled: true,
    autoRun: true,
    timezone: tz,
  });

  const scoreEntries = report
    ? Object.entries(report.scores).map(([k, v]) => ({
        label: k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
        value: v,
      }))
    : [];

  return (
    <div className="min-h-screen bg-background text-foreground p-4 space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold">Unified Global Engine</h1>
        <p className="text-sm text-muted-foreground">
          UX · Digital · Lead · Payment · Wallet · Orbit · Marketplace · Events
        </p>
      </div>

      {/* Scores Grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {scoreEntries.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card p-3 text-center"
          >
            <p className="text-[10px] text-muted-foreground truncate">{s.label}</p>
            <p className={`text-xl font-bold ${s.value >= 80 ? "text-emerald-500" : s.value >= 60 ? "text-amber-500" : "text-destructive"}`}>
              {s.value}%
            </p>
          </div>
        ))}
      </div>

      {/* Run Button */}
      <button
        onClick={() => execute()}
        disabled={running}
        className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50"
      >
        {running ? "Running…" : "Run Engine"}
      </button>

      {/* Context */}
      {report && (
        <div className="rounded-xl border border-border bg-card p-3 space-y-1 text-xs">
          <p><span className="text-muted-foreground">Country:</span> {report.country || "—"}</p>
          <p><span className="text-muted-foreground">City:</span> {report.city || "—"}</p>
          <p><span className="text-muted-foreground">Timezone:</span> {report.timezone || "—"}</p>
          <p><span className="text-muted-foreground">Local Hour:</span> {report.localHour ?? "—"}</p>
          <p><span className="text-muted-foreground">Generated:</span> {report.generatedAt}</p>
        </div>
      )}

      {/* Active Events */}
      <div>
        <h2 className="text-lg font-semibold mb-2">🌍 Active Events ({report?.activeEvents.length ?? 0})</h2>
        {report?.activeEvents.length === 0 && <p className="text-sm text-muted-foreground">No country events active right now.</p>}
        {report?.activeEvents.map((ev) => (
          <div key={ev.eventKey} className="rounded-xl border border-border p-3 mb-2" style={{ background: ev.bannerConfig?.gradient }}>
            <p className="text-sm font-bold text-white">{ev.bannerConfig?.emoji} {ev.eventName}</p>
            <p className="text-xs text-white/70">{ev.country} · {ev.startDate} → {ev.endDate}</p>
            <p className="text-[10px] text-white/50 mt-1">Modules: {ev.activatedModules.join(", ")}</p>
          </div>
        ))}
      </div>

      {/* Issues */}
      <div>
        <h2 className="text-lg font-semibold mb-2">⚠️ Issues ({report?.issues.length ?? 0})</h2>
        {report?.issues.length === 0 && <p className="text-sm text-muted-foreground">No issues detected.</p>}
        <div className="space-y-1">
          {report?.issues.slice(0, 25).map((issue) => (
            <div key={issue.id} className="flex items-start gap-2 p-2 rounded-lg border border-border bg-card text-xs">
              <span className={`shrink-0 px-1.5 py-0.5 rounded font-bold text-[9px] uppercase ${
                issue.severity === "critical" ? "bg-destructive/20 text-destructive" :
                issue.severity === "high" ? "bg-amber-500/20 text-amber-500" :
                issue.severity === "medium" ? "bg-yellow-500/20 text-yellow-600" :
                "bg-muted text-muted-foreground"
              }`}>
                {issue.severity}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{issue.message}</p>
                <p className="text-muted-foreground text-[10px]">{issue.module} · {issue.route}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conversion Frictions */}
      <div>
        <h2 className="text-lg font-semibold mb-2">🔻 Conversion Frictions ({report?.frictions.length ?? 0})</h2>
        {report?.frictions.length === 0 && <p className="text-sm text-muted-foreground">No frictions detected.</p>}
        {report?.frictions.map((f) => (
          <div key={f.id} className="p-2 rounded-lg border border-border bg-card text-xs mb-1">
            <p className="font-medium">{f.suggestedFix}</p>
            <p className="text-muted-foreground text-[10px]">{f.module} · {f.stage} · {f.route}</p>
          </div>
        ))}
      </div>

      {/* Automated Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-2">⚡ Automated Actions ({report?.automatedActions.length ?? 0})</h2>
        {report?.automatedActions.map((a) => (
          <div key={a.id} className="p-2 rounded-lg border border-border bg-card text-xs mb-1">
            <p className="font-medium">{a.description}</p>
            <p className="text-muted-foreground text-[10px]">{a.module} · {a.actionType} · {a.executed ? "✅" : "⏳"}</p>
          </div>
        ))}
      </div>

      {/* World Holiday Registry */}
      <div>
        <h2 className="text-lg font-semibold mb-2">📅 Holiday Registry ({WORLD_HOLIDAYS.length})</h2>
        <div className="grid grid-cols-1 gap-1">
          {WORLD_HOLIDAYS.map((h) => (
            <div key={h.key} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card text-xs">
              <span className="text-lg">{h.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{h.name}</p>
                <p className="text-muted-foreground text-[10px]">
                  {h.type} · {typeof h.countries === "string" ? h.countries : h.countries.slice(0, 5).join(", ")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
