import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";
import { runArchitectureAudit, type ArchitectureReport } from "@/lib/architecture/architecture-validator";

const GRADE_COLORS: Record<string, string> = {
  A: "text-green-400",
  B: "text-blue-400",
  C: "text-yellow-400",
  D: "text-orange-400",
  F: "text-red-400",
};

const HISTORY_STORAGE_KEY = "el_architecture_audit_history";

interface AuditSnapshot {
  timestamp: string;
  grade: string;
  errors: number;
  warnings: number;
  domains: number;
}

function loadHistory(): AuditSnapshot[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AuditSnapshot[];
  } catch {}
  return [];
}

function saveSnapshot(report: ArchitectureReport): AuditSnapshot[] {
  const history = loadHistory();
  const snapshot: AuditSnapshot = {
    timestamp: report.timestamp,
    grade: report.overall_grade,
    errors: report.violation_summary.errors,
    warnings: report.violation_summary.warnings,
    domains: report.domain_coverage.length,
  };
  history.push(snapshot);
  const trimmed = history.slice(-20);
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
  return trimmed;
}

export default function AdminArchitectureLabPage() {
  useUiEngine("admin-architecture-lab");
  const navigate = useNavigate();
  const [report, setReport] = useState<ArchitectureReport | null>(null);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<"overview" | "violations" | "domains" | "history">("overview");
  const [history, setHistory] = useState<AuditSnapshot[]>(loadHistory);

  const [auditError, setAuditError] = useState<string | null>(null);

  const handleRunAudit = useCallback(() => {
    setRunning(true);
    setAuditError(null);
    setTimeout(() => {
      try {
        const result = runArchitectureAudit();
        setReport(result);
        const updatedHistory = saveSnapshot(result);
        setHistory(updatedHistory);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown audit failure";
        setAuditError(msg);
        setReport(null);
      }
      setRunning(false);
    }, 500);
  }, []);

  const gradeToScore = (grade: string): number => {
    const map: Record<string, number> = { A: 95, B: 80, C: 65, D: 50, F: 30 };
    return map[grade] ?? 0;
  };

  return (
    <SubPageShell>
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/lab-hub")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
          <div>
            <h1 className="text-lg font-bold">Architecture Lab</h1>
            <p className="text-xs text-muted-foreground">Import boundaries, domain ownership, route integrity</p>
          </div>
        </div>

        <button
          onClick={handleRunAudit}
          disabled={running}
          className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-bold disabled:opacity-50"
        >
          {running ? "Running Audit..." : "Run Architecture Audit"}
        </button>

        {auditError && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 space-y-2">
            <div className="text-sm font-bold text-red-400">Audit Failed</div>
            <div className="text-xs text-red-300 font-mono">{auditError}</div>
            <div className="text-xs text-muted-foreground">
              The architecture audit encountered an error. This may indicate a structural issue in the codebase
              that needs to be resolved before the audit can complete.
            </div>
          </div>
        )}

        {report && (
          <>
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-xl bg-card border border-border/20 p-3 text-center">
                <div className={`text-3xl font-bold ${GRADE_COLORS[report.overall_grade]}`}>{report.overall_grade}</div>
                <div className="text-xs text-muted-foreground">Grade</div>
              </div>
              <div className="rounded-xl bg-card border border-border/20 p-3 text-center">
                <div className="text-xl font-bold text-red-400">{report.violation_summary.errors}</div>
                <div className="text-xs text-muted-foreground">Errors</div>
              </div>
              <div className="rounded-xl bg-card border border-border/20 p-3 text-center">
                <div className="text-xl font-bold text-yellow-400">{report.violation_summary.warnings}</div>
                <div className="text-xs text-muted-foreground">Warnings</div>
              </div>
              <div className="rounded-xl bg-card border border-border/20 p-3 text-center">
                <div className="text-xl font-bold text-foreground">{report.domain_coverage.length}</div>
                <div className="text-xs text-muted-foreground">Domains</div>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto">
              {(["overview", "violations", "domains", "history"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {tab === "overview" && (
              <div className="space-y-3">
                <div className="rounded-xl bg-card border border-border/20 p-4">
                  <h3 className="text-sm font-bold mb-3">Route Integrity</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Total Routes</span>
                      <div className="font-bold">{report.route_audit.total_routes}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Unguarded</span>
                      <div className={`font-bold ${report.route_audit.unguarded_routes > 0 ? "text-red-400" : "text-green-400"}`}>
                        {report.route_audit.unguarded_routes}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duplicate Paths</span>
                      <div className={`font-bold ${report.route_audit.duplicate_paths.length > 0 ? "text-yellow-400" : "text-green-400"}`}>
                        {report.route_audit.duplicate_paths.length}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Orphan Routes</span>
                      <div className="font-bold">{report.route_audit.orphan_routes.length}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-card border border-border/20 p-4">
                  <h3 className="text-sm font-bold mb-3">Card Registry Coverage</h3>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Total Cards</span>
                      <div className="font-bold">{report.card_registry_audit.total_cards}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">With Adapter</span>
                      <div className="font-bold text-green-400">{report.card_registry_audit.cards_with_adapters}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Missing</span>
                      <div className={`font-bold ${report.card_registry_audit.cards_without_adapters > 0 ? "text-red-400" : "text-green-400"}`}>
                        {report.card_registry_audit.cards_without_adapters}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === "violations" && (
              <div className="space-y-2">
                {report.violations.length === 0 ? (
                  <div className="text-center text-sm text-green-400 py-8">No violations found</div>
                ) : (
                  report.violations.slice(0, 25).map((v, i) => (
                    <div key={i} className={`rounded-xl border p-3 ${v.severity === "error" ? "bg-red-500/5 border-red-500/20" : "bg-yellow-500/5 border-yellow-500/20"}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold">{v.rule}</span>
                        <span className={`text-xs ${v.severity === "error" ? "text-red-400" : "text-yellow-400"}`}>{v.severity}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{v.message}</div>
                      {v.file && <div className="text-xs text-muted-foreground mt-0.5 font-mono">{v.file}</div>}
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === "domains" && (
              <div className="space-y-2">
                {report.domain_coverage.map((d) => (
                  <div key={d.domain} className="rounded-xl bg-card border border-border/20 p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold">{d.domain}</span>
                      <div className="flex items-center gap-2">
                        {d.has_boundary ? (
                          <span className="text-xs text-green-400">Bounded</span>
                        ) : (
                          <span className="text-xs text-yellow-400">No boundary</span>
                        )}
                        {d.violation_count > 0 && (
                          <span className="text-xs text-red-400">{d.violation_count} violations</span>
                        )}
                      </div>
                    </div>
                    {d.owned_paths.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1 font-mono">
                        {d.owned_paths.slice(0, 3).join(", ")}
                        {d.owned_paths.length > 3 && ` +${d.owned_paths.length - 3} more`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === "history" && (
              <div className="rounded-xl bg-card border border-border/20 p-4">
                <h3 className="text-sm font-bold mb-3">Audit History</h3>
                {history.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No history yet. Run audits to build a trend line.</p>
                ) : (
                  <div className="space-y-2">
                    {history.slice(-10).map((h, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-24 truncate">{new Date(h.timestamp).toLocaleDateString()}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${gradeToScore(h.grade) >= 90 ? "bg-green-500" : gradeToScore(h.grade) >= 70 ? "bg-yellow-500" : "bg-red-500"}`}
                            style={{ width: `${gradeToScore(h.grade)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold ${GRADE_COLORS[h.grade] ?? "text-foreground"}`}>{h.grade}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!report && !running && (
          <div className="text-center text-sm text-muted-foreground py-8">
            Click "Run Architecture Audit" to generate a live report using the architecture-validator
          </div>
        )}
      </div>
    </SubPageShell>
  );
}
