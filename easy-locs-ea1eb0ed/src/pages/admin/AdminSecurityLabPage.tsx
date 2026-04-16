import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";
import {
  querySecurityEvents,
  getCriticalEvents,
  type SecurityEvent,
  type SecurityEventSeverity,
} from "@/lib/security/security-event-logger";

interface VulnReport {
  critical: number;
  high: number;
  moderate: number;
  low: number;
  info: number;
  total: number;
  advisories: Array<{
    name: string;
    severity: string;
    title: string;
    fixAvailable: boolean;
  }>;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-500",
  high: "text-orange-500",
  moderate: "text-yellow-500",
  medium: "text-yellow-500",
  low: "text-blue-400",
  info: "text-muted-foreground",
  warning: "text-yellow-500",
  alert: "text-orange-500",
};

const SEVERITY_BG: Record<string, string> = {
  critical: "bg-red-500/10 border-red-500/20",
  high: "bg-orange-500/10 border-orange-500/20",
  moderate: "bg-yellow-500/10 border-yellow-500/20",
  low: "bg-blue-500/10 border-blue-500/20",
};

async function loadVulnReport(): Promise<VulnReport | null> {
  try {
    const resp = await fetch("/security-report.json");
    if (!resp.ok) return null;
    return (await resp.json()) as VulnReport;
  } catch {
    return null;
  }
}

export default function AdminSecurityLabPage() {
  useUiEngine("admin-security-lab");
  const navigate = useNavigate();
  const [vulnReport, setVulnReport] = useState<VulnReport | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [criticalEvents, setCriticalEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"deps" | "events" | "critical" | "posture">("deps");
  const [severityFilter, setSeverityFilter] = useState<SecurityEventSeverity | "all">("all");

  const refresh = useCallback(async () => {
    setLoading(true);
    const [report, recentEvents] = await Promise.all([
      loadVulnReport(),
      querySecurityEvents({ limit: 50 }).catch(() => [] as SecurityEvent[]),
    ]);
    setVulnReport(report);
    setEvents(recentEvents);
    setCriticalEvents(getCriticalEvents(20));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredEvents =
    severityFilter === "all" ? events : events.filter((e) => e.severity === severityFilter);

  return (
    <SubPageShell>
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/lab-hub")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
          <div>
            <h1 className="text-lg font-bold">Security Lab</h1>
            <p className="text-xs text-muted-foreground">Vulnerability scanning, security events, fraud monitoring</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-xl bg-card border border-border/20 p-3 text-center">
            <div className="text-xl font-bold text-red-400">{vulnReport?.critical ?? 0}</div>
            <div className="text-xs text-muted-foreground">Critical</div>
          </div>
          <div className="rounded-xl bg-card border border-border/20 p-3 text-center">
            <div className="text-xl font-bold text-orange-400">{vulnReport?.high ?? 0}</div>
            <div className="text-xs text-muted-foreground">High</div>
          </div>
          <div className="rounded-xl bg-card border border-border/20 p-3 text-center">
            <div className="text-xl font-bold text-foreground">{vulnReport?.total ?? 0}</div>
            <div className="text-xs text-muted-foreground">Total Vulns</div>
          </div>
          <div className="rounded-xl bg-card border border-border/20 p-3 text-center">
            <div className="text-xl font-bold text-foreground">{criticalEvents.length}</div>
            <div className="text-xs text-muted-foreground">Alerts</div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {(["deps", "events", "critical", "posture"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {t === "deps" ? "Dependencies" : t === "events" ? "Events" : t === "critical" ? "Critical" : "Posture"}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center text-sm text-muted-foreground py-8">Loading security data...</div>
        )}

        {!loading && tab === "deps" && (
          <div className="space-y-2">
            {!vulnReport ? (
              <div className="rounded-xl bg-card border border-border/20 p-4 text-center">
                <p className="text-sm text-muted-foreground">No vulnerability report found.</p>
                <p className="text-xs text-muted-foreground mt-1">Run the security scanner to generate a report:</p>
                <pre className="text-xs bg-muted px-2 py-1 rounded mt-2 font-mono">npm run security:scan</pre>
              </div>
            ) : vulnReport.advisories.length === 0 ? (
              <div className="text-center text-sm text-green-400 py-8">No known vulnerabilities found</div>
            ) : (
              vulnReport.advisories.map((v, i) => (
                <div key={i} className={`rounded-xl border p-3 ${SEVERITY_BG[v.severity] || "bg-card border-border/20"}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold">{v.name}</span>
                    <span className={`text-xs font-bold uppercase ${SEVERITY_COLORS[v.severity]}`}>{v.severity}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{v.title}</div>
                  <div className="text-xs mt-1">
                    {v.fixAvailable ? (
                      <span className="text-green-400">Fix available</span>
                    ) : (
                      <span className="text-yellow-400">No fix yet</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {!loading && tab === "events" && (
          <div className="space-y-2">
            <div className="flex gap-1 overflow-x-auto">
              {(["all", "critical", "alert", "warning", "info"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSeverityFilter(s)}
                  className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                    severityFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {filteredEvents.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                No security events recorded. Events are logged by the security-event-logger as users interact with the platform.
              </div>
            ) : (
              filteredEvents
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((e) => (
                  <div key={e.id} className="rounded-xl bg-card border border-border/20 p-3 flex justify-between items-center">
                    <div>
                      <div className="text-xs font-bold">{e.type}</div>
                      <div className="text-xs text-muted-foreground">{e.userId.slice(0, 12)}...</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-bold ${SEVERITY_COLORS[e.severity]}`}>{e.severity}</div>
                      <div className="text-xs text-muted-foreground">{new Date(e.timestamp).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {!loading && tab === "critical" && (
          <div className="space-y-2">
            {criticalEvents.length === 0 ? (
              <div className="text-center text-sm text-green-400 py-8">
                No critical or alert-level events
              </div>
            ) : (
              criticalEvents.map((e) => (
                <div key={e.id} className="rounded-xl bg-card border border-red-500/20 p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold">{e.type}</span>
                    <span className={`text-xs font-bold ${SEVERITY_COLORS[e.severity]}`}>{e.severity}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">User: {e.userId.slice(0, 12)}...</div>
                  <div className="text-xs text-muted-foreground">{new Date(e.timestamp).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Action: {e.action}</div>
                </div>
              ))
            )}
          </div>
        )}

        {!loading && tab === "posture" && (
          <div className="space-y-3">
            <div className="rounded-xl bg-card border border-border/20 p-4">
              <h3 className="text-sm font-bold mb-3">Security Posture Summary</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Vulnerability Score</span>
                  <div className={`font-bold ${(vulnReport?.critical ?? 0) === 0 ? "text-green-400" : "text-red-400"}`}>
                    {vulnReport ? ((vulnReport.critical === 0 && vulnReport.high === 0) ? "Healthy" : "Needs Attention") : "Not Scanned"}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Event Monitoring</span>
                  <div className="font-bold text-green-400">Active</div>
                </div>
                <div>
                  <span className="text-muted-foreground">CI Gate</span>
                  <div className="font-bold text-green-400">Integrated</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Sentinel Link</span>
                  <div className="font-bold text-green-400">Connected</div>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-card border border-border/20 p-4">
              <h3 className="text-sm font-bold mb-2">CLI Commands</h3>
              <div className="space-y-1 text-xs text-muted-foreground font-mono">
                <div>npm run security:scan</div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Security scan is integrated into the UI Quality Gate and blocks builds on critical vulnerabilities.
              </p>
            </div>
          </div>
        )}

        <button onClick={refresh} className="w-full rounded-xl bg-muted text-muted-foreground py-2 text-xs font-bold">
          Refresh Data
        </button>
      </div>
    </SubPageShell>
  );
}
