import { useState, useEffect, useCallback } from "react";
import {
  getPlatformSummary,
  getAllDomainHealth,
  getActiveIncidents,
  getIncidentStats,
  getAllKillSwitches,
  getAllFlags,
  toggleKillSwitch,
  type PlatformHealthSummary,
  type DomainHealthSnapshot,
  type Incident,
  type KillSwitch,
  type FeatureFlag,
} from "@/lib/control-plane";
import { getArchitectureViolations, getViolationCount, type ArchitectureViolation } from "@/lib/architecture/domain-boundaries";
import { runArchitectureAudit, type ArchitectureReport } from "@/lib/architecture/architecture-validator";
import { runFullCardAudit, type CardHealthReport } from "@/domains/cards/card-health-audit";
import { structuredLogger } from "@/lib/observability/structured-logger";

const NAVY = "hsl(220 40% 18%)";
const GOLD = "hsl(38 65% 56%)";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    healthy: "#22c55e",
    degraded: "#f59e0b",
    unhealthy: "#ef4444",
    unknown: "#6b7280",
    active: "#ef4444",
    investigating: "#f59e0b",
    mitigating: "#3b82f6",
    resolved: "#22c55e",
  };
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: colors[status] || "#6b7280" }}
    >
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = { P0: "#ef4444", P1: "#f59e0b", P2: "#3b82f6", P3: "#6b7280" };
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-bold text-white"
      style={{ backgroundColor: colors[priority] || "#6b7280" }}
    >
      {priority}
    </span>
  );
}

export default function ControlPlanePage() {
  const [summary, setSummary] = useState<PlatformHealthSummary | null>(null);
  const [violations, setViolations] = useState<ArchitectureViolation[]>([]);
  const [violationCount, setViolationCount] = useState({ errors: 0, warnings: 0, total: 0 });
  const [activeTab, setActiveTab] = useState<"health" | "incidents" | "switches" | "flags" | "architecture" | "cards">("health");
  const [cardReport, setCardReport] = useState<CardHealthReport | null>(null);
  const [archReport, setArchReport] = useState<ArchitectureReport | null>(null);

  const refresh = useCallback(() => {
    setSummary(getPlatformSummary());
    setViolations(getArchitectureViolations());
    setViolationCount(getViolationCount());
    setCardReport(runFullCardAudit());
    setArchReport(runArchitectureAudit());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10_000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (!summary) return <div className="p-8 text-center">Loading Control Plane...</div>;

  const incidentStats = getIncidentStats();
  const tabs = [
    { key: "health" as const, label: "Domain Health", count: summary.domains.length },
    { key: "incidents" as const, label: "Incidents", count: incidentStats.active },
    { key: "switches" as const, label: "Kill Switches", count: summary.kill_switches.filter((s) => !s.enabled).length },
    { key: "flags" as const, label: "Feature Flags", count: getAllFlags().length },
    { key: "architecture" as const, label: "Architecture", count: violationCount.total },
    { key: "cards" as const, label: "Card Health", count: cardReport?.issues.length ?? 0 },
  ];

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "#f8f9fa" }}>
      <div className="p-4" style={{ backgroundColor: NAVY }}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-white">Control Plane</h1>
          <StatusBadge status={summary.overall_status} />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-lg p-2 text-center" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
            <div className="text-2xl font-bold text-white">{summary.domains.filter((d) => d.status === "healthy").length}</div>
            <div className="text-xs text-white/60">Healthy</div>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
            <div className="text-2xl font-bold" style={{ color: "#f59e0b" }}>{summary.domains.filter((d) => d.status === "degraded").length}</div>
            <div className="text-xs text-white/60">Degraded</div>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
            <div className="text-2xl font-bold" style={{ color: "#ef4444" }}>{incidentStats.active}</div>
            <div className="text-xs text-white/60">Incidents</div>
          </div>
          <div className="rounded-lg p-2 text-center" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
            <div className="text-2xl font-bold" style={{ color: GOLD }}>{violationCount.errors}</div>
            <div className="text-xs text-white/60">Violations</div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 px-2 py-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
            style={{
              backgroundColor: activeTab === tab.key ? NAVY : "white",
              color: activeTab === tab.key ? "white" : NAVY,
              border: `1px solid ${activeTab === tab.key ? NAVY : "#e5e7eb"}`,
            }}
          >
            {tab.label} {tab.count > 0 && <span className="ml-1 opacity-70">({tab.count})</span>}
          </button>
        ))}
      </div>

      <div className="px-3 pb-4">
        {activeTab === "health" && <HealthPanel domains={summary.domains} />}
        {activeTab === "incidents" && <IncidentsPanel incidents={summary.active_incidents} stats={incidentStats} />}
        {activeTab === "switches" && <KillSwitchPanel switches={summary.kill_switches} onRefresh={refresh} />}
        {activeTab === "flags" && <FlagsPanel />}
        {activeTab === "architecture" && <ArchitecturePanel violations={violations} count={violationCount} archReport={archReport} />}
        {activeTab === "cards" && <CardHealthPanel report={cardReport} />}
      </div>
    </div>
  );
}

function HealthPanel({ domains }: { domains: DomainHealthSnapshot[] }) {
  const sorted = [...domains].sort((a, b) => {
    const order = { unhealthy: 0, degraded: 1, healthy: 2, unknown: 3 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });
  return (
    <div className="space-y-2">
      {sorted.map((d) => (
        <div key={d.domain} className="bg-white rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-sm" style={{ color: NAVY }}>{d.domain}</span>
            <StatusBadge status={d.status} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
            <div>Success: <span className="font-medium text-gray-700">{(d.success_rate * 100).toFixed(1)}%</span></div>
            <div>P95: <span className="font-medium text-gray-700">{d.latency_p95_ms}ms</span></div>
            <div>Errors: <span className="font-medium text-gray-700">{(d.error_rate * 100).toFixed(2)}%</span></div>
          </div>
          {d.top_failing_actions.length > 0 && (
            <div className="mt-1 text-xs text-red-500">
              Failing: {d.top_failing_actions.join(", ")}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function IncidentsPanel({ incidents, stats }: { incidents: Incident[]; stats: ReturnType<typeof getIncidentStats> }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {(["P0", "P1", "P2", "P3"] as const).map((p) => (
          <div key={p} className="bg-white rounded-xl p-2 text-center shadow-sm">
            <PriorityBadge priority={p} />
            <div className="text-xl font-bold mt-1" style={{ color: NAVY }}>{stats.by_priority[p]}</div>
          </div>
        ))}
      </div>
      {incidents.length === 0 ? (
        <div className="bg-white rounded-xl p-6 text-center shadow-sm">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-sm text-gray-500">No active incidents</p>
        </div>
      ) : (
        incidents.map((inc) => (
          <div key={inc.id} className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <PriorityBadge priority={inc.priority} />
              <StatusBadge status={inc.status} />
              <span className="text-xs text-gray-400">{inc.domain}</span>
            </div>
            <p className="text-sm font-medium" style={{ color: NAVY }}>{inc.title}</p>
            <p className="text-xs text-gray-500 mt-1">{inc.description}</p>
            <div className="text-xs text-gray-400 mt-1">
              Detected: {new Date(inc.detected_at).toLocaleString()}
              {inc.auto_mitigated && <span className="ml-2 text-green-600">Auto-mitigated</span>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function KillSwitchPanel({ switches, onRefresh }: { switches: KillSwitch[]; onRefresh: () => void }) {
  const handleToggle = (feature: string, currentState: boolean) => {
    toggleKillSwitch(feature, !currentState, currentState ? "Manual disable via Control Plane" : "Manual re-enable via Control Plane", "admin");
    onRefresh();
  };

  return (
    <div className="space-y-2">
      {switches.map((sw) => (
        <div key={sw.id} className="bg-white rounded-xl p-3 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: NAVY }}>{sw.feature}</p>
            <p className="text-xs text-gray-400">{sw.domain} · {sw.reason || "No reason"}</p>
          </div>
          <button
            onClick={() => handleToggle(sw.feature, sw.enabled)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
            style={{
              backgroundColor: sw.enabled ? "#22c55e" : "#ef4444",
              color: "white",
            }}
          >
            {sw.enabled ? "ON" : "OFF"}
          </button>
        </div>
      ))}
    </div>
  );
}

function FlagsPanel() {
  const flags = getAllFlags();
  return (
    <div className="space-y-2">
      {flags.map((flag) => (
        <div key={flag.id} className="bg-white rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: NAVY }}>{flag.name}</p>
              <p className="text-xs text-gray-400">{flag.domain} · {flag.rollout_percentage}% rollout</p>
            </div>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: flag.enabled ? "#22c55e" : "#6b7280" }}
            >
              {flag.enabled ? "ON" : "OFF"}
            </span>
          </div>
          <div className="mt-1 flex gap-1">
            {flag.environments.map((env) => (
              <span key={env} className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-500">{env}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ArchitecturePanel({ violations, count, archReport }: { violations: ArchitectureViolation[]; count: { errors: number; warnings: number; total: number }; archReport: ArchitectureReport | null }) {
  const gradeColors: Record<string, string> = { A: "#22c55e", B: "#3b82f6", C: "#f59e0b", D: "#f97316", F: "#ef4444" };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {archReport && (
          <div className="bg-white rounded-xl p-3 text-center shadow-sm">
            <div className="text-2xl font-bold" style={{ color: gradeColors[archReport.overall_grade] || NAVY }}>{archReport.overall_grade}</div>
            <div className="text-xs text-gray-500">Grade</div>
          </div>
        )}
        <div className="bg-white rounded-xl p-3 text-center shadow-sm">
          <div className="text-2xl font-bold" style={{ color: "#ef4444" }}>{count.errors}</div>
          <div className="text-xs text-gray-500">Errors</div>
        </div>
        <div className="bg-white rounded-xl p-3 text-center shadow-sm">
          <div className="text-2xl font-bold" style={{ color: "#f59e0b" }}>{count.warnings}</div>
          <div className="text-xs text-gray-500">Warnings</div>
        </div>
        <div className="bg-white rounded-xl p-3 text-center shadow-sm">
          <div className="text-2xl font-bold" style={{ color: NAVY }}>{count.total}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
      </div>

      {archReport && (
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <p className="text-sm font-semibold mb-2" style={{ color: NAVY }}>Domain Coverage</p>
          <div className="grid grid-cols-2 gap-1">
            {archReport.domain_coverage.map((dc) => (
              <div key={dc.domain} className="flex items-center gap-1 text-xs">
                <span className={`w-2 h-2 rounded-full ${dc.has_boundary ? "bg-green-500" : "bg-gray-300"}`} />
                <span className="text-gray-600">{dc.domain}</span>
                {dc.violation_count > 0 && <span className="text-red-500">({dc.violation_count})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {archReport && archReport.card_registry_audit.missing_adapters.length > 0 && (
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <p className="text-sm font-semibold mb-1" style={{ color: NAVY }}>Missing Card Adapters</p>
          <div className="flex flex-wrap gap-1">
            {archReport.card_registry_audit.missing_adapters.map((key) => (
              <span key={key} className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-[10px] font-mono">{key}</span>
            ))}
          </div>
        </div>
      )}

      {violations.map((v, i) => (
        <div key={i} className="bg-white rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="px-2 py-0.5 rounded text-xs font-medium text-white"
              style={{ backgroundColor: v.severity === "error" ? "#ef4444" : "#f59e0b" }}
            >
              {v.severity}
            </span>
            <span className="text-xs text-gray-400">{v.domain}</span>
          </div>
          <p className="text-xs font-mono text-gray-600">{v.file}</p>
          <p className="text-xs text-gray-500 mt-1">{v.description}</p>
          <p className="text-[10px] text-gray-400 mt-1">Rule: {v.rule}</p>
        </div>
      ))}
    </div>
  );
}

function CardHealthPanel({ report }: { report: CardHealthReport | null }) {
  if (!report) return <div className="text-center text-gray-400 py-8">Running card audit...</div>;

  const healthColors: Record<string, string> = { healthy: "#22c55e", degraded: "#f59e0b", unhealthy: "#ef4444" };
  const statusColors: Record<string, string> = { connected: "#22c55e", partial: "#f59e0b", orphan: "#ef4444", broken: "#dc2626", mocked: "#6b7280" };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl p-3 text-center shadow-sm">
          <div className="text-2xl font-bold" style={{ color: healthColors[report.overall_health] }}>{report.overall_health}</div>
          <div className="text-xs text-gray-500">Overall</div>
        </div>
        <div className="bg-white rounded-xl p-3 text-center shadow-sm">
          <div className="text-2xl font-bold" style={{ color: "#22c55e" }}>{report.connected}</div>
          <div className="text-xs text-gray-500">Connected</div>
        </div>
        <div className="bg-white rounded-xl p-3 text-center shadow-sm">
          <div className="text-2xl font-bold" style={{ color: NAVY }}>{report.total_cards}</div>
          <div className="text-xs text-gray-500">Total Cards</div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-3 shadow-sm">
        <p className="text-sm font-semibold mb-2" style={{ color: NAVY }}>Connection Status</p>
        <div className="grid grid-cols-5 gap-2 text-center">
          {([["Connected", report.connected, "#22c55e"], ["Partial", report.partial, "#f59e0b"], ["Orphan", report.orphan, "#ef4444"], ["Broken", report.broken, "#dc2626"], ["Mocked", report.mocked, "#6b7280"]] as const).map(([label, count, color]) => (
            <div key={label}>
              <div className="text-lg font-bold" style={{ color: color as string }}>{count}</div>
              <div className="text-[10px] text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {report.issues.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold px-1" style={{ color: NAVY }}>Card Issues ({report.issues.length})</p>
          {report.issues.map((issue) => (
            <div key={issue.key} className="bg-white rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium" style={{ color: NAVY }}>{issue.key}</span>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: statusColors[issue.connectionStatus || ""] || "#6b7280" }}
                >
                  {issue.connectionStatus || "uncomputed"}
                </span>
              </div>
              <div className="text-xs text-gray-400 mb-1">{issue.domain} · {issue.surface}</div>
              {issue.issues.map((msg, idx) => (
                <p key={idx} className="text-xs text-red-500">• {msg}</p>
              ))}
            </div>
          ))}
        </div>
      )}

      {report.issues.length === 0 && (
        <div className="bg-white rounded-xl p-6 text-center shadow-sm">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-sm text-gray-500">All cards are healthy</p>
        </div>
      )}
    </div>
  );
}
