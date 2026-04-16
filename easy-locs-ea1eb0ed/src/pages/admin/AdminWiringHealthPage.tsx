import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Shield, Activity, Zap } from "lucide-react";
import SubPageShell from "@/components/layout/SubPageShell";
import { wiringVerifier, getWiringReport } from "@/engines/core/wiring-verifier";
import { getRegisteredInvariants, checkAllInvariants, getRepairHistory, getRepairSuccessRate } from "@/engines/core/learning-loop";
import { getRegisteredScenarios, runAllQAScenarios, type QAResult } from "@/engines/core/runtime-qa-scenarios";
import { getE2EPauseState } from "@/engines/core/e2e-engine-pause";
import { getRecentE2EFailures } from "@/engines/core/e2e-auto-repair-wire";
import { platformBus } from "@/lib/shared/platform-bus";

type WiringReport = ReturnType<typeof getWiringReport>;

const VERDICT_STYLE: Record<string, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  PASS: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  WARN: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
  FAIL: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
  BLOCKED_BY_PREV_PHASE: { icon: Shield, color: "text-zinc-500", bg: "bg-zinc-500/10" },
};

export default function AdminWiringHealthPage() {
  const navigate = useNavigate();
  const [report, setReport] = useState<WiringReport>(getWiringReport());
  const [loading, setLoading] = useState(false);
  const [qaResults, setQaResults] = useState<QAResult[]>([]);
  const [qaLoading, setQaLoading] = useState(false);

  const busStats = platformBus.getListenerStats();
  const e2eState = getE2EPauseState();
  const repairHistory = getRepairHistory();
  const successRate = getRepairSuccessRate();
  const invariants = getRegisteredInvariants();
  const scenarios = getRegisteredScenarios();
  const e2eFailures = getRecentE2EFailures();

  const runVerification = useCallback(async () => {
    setLoading(true);
    try {
      const r = await wiringVerifier.runFullVerification();
      setReport(r);
    } catch (e) {
      console.error("[wiring-health] verification failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const runQA = useCallback(async () => {
    setQaLoading(true);
    try {
      const results = await runAllQAScenarios();
      setQaResults(results);
    } catch (e) {
      console.error("[wiring-health] QA run failed", e);
    } finally {
      setQaLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!report) void runVerification();
  }, []);

  return (
    <SubPageShell title="Wiring Health Dashboard" onBack={() => navigate(-1)}>
      <div className="space-y-6 p-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Wiring Health
          </h1>
          <div className="flex gap-2">
            <button
              onClick={runVerification}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Running..." : "Run Verification"}
            </button>
            <button
              onClick={runQA}
              disabled={qaLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${qaLoading ? "animate-spin" : ""}`} />
              {qaLoading ? "Testing..." : "Run QA"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Bus Listeners" value={busStats.totalTyped} />
          <StatCard label="Event Types" value={Object.keys(busStats.byEvent).length} />
          <StatCard label="Repair Rate" value={`${(successRate * 100).toFixed(0)}%`} />
          <StatCard label="E2E Paused" value={e2eState.paused ? "Yes" : "No"} warn={e2eState.paused} />
        </div>

        {report && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">Wiring Report</h2>
              <VerdictBadge verdict={report.overallVerdict} />
            </div>
            <div className="text-xs text-muted-foreground">
              Score: {report.overallScore} | Pass: {report.totalPass} | Fail: {report.totalFail} | Warn: {report.totalWarn} | Blocked: {report.totalBlocked}
            </div>
            {report.criticalBlockers.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-red-400">Critical Blockers:</p>
                {report.criticalBlockers.map((b, i) => (
                  <p key={i} className="text-xs text-red-300 pl-2">• {b}</p>
                ))}
              </div>
            )}
            <div className="space-y-2">
              {report.phases.map((phase) => {
                const style = VERDICT_STYLE[phase.verdict] ?? VERDICT_STYLE.FAIL;
                const Icon = style.icon;
                return (
                  <div key={phase.phase} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${style.bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${style.color}`} />
                    <span className="text-xs font-medium text-foreground flex-1">{phase.phase}</span>
                    <span className={`text-xs font-semibold ${style.color}`}>{phase.verdict}</span>
                    <span className="text-[0.6rem] text-muted-foreground">{phase.passed}P {phase.failed}F {phase.warnings}W</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {invariants.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-bold text-foreground">Registered Invariants ({invariants.length})</h2>
            <div className="space-y-1">
              {invariants.map((inv) => (
                <div key={inv.id} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{inv.domain}</span>
                  <span className="text-foreground flex-1">{inv.description}</span>
                  <span className={`text-[0.6rem] px-1.5 py-0.5 rounded ${inv.severity === "critical" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}`}>
                    {inv.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {qaResults.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-bold text-foreground">QA Scenarios ({qaResults.filter(r => r.passed).length}/{qaResults.length} passed)</h2>
            <div className="space-y-1">
              {qaResults.map((r) => (
                <div key={r.scenarioId} className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${r.passed ? "bg-emerald-500/5" : "bg-red-500/10"}`}>
                  {r.passed ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                  <span className="text-foreground flex-1">{r.scenarioId}</span>
                  <span className="text-muted-foreground">{r.durationMs}ms</span>
                  {r.error && <span className="text-red-300 text-[0.6rem] truncate max-w-[200px]">{r.error}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {repairHistory.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-bold text-foreground">Recent Repairs ({repairHistory.length})</h2>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {repairHistory.slice(-20).reverse().map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full ${r.outcome === "success" ? "bg-emerald-500" : r.outcome === "partial" ? "bg-amber-500" : "bg-red-500"}`} />
                  <span className="text-foreground flex-1 truncate">{r.issueId}</span>
                  <span className="text-muted-foreground">{r.outcome}</span>
                  <span className="text-muted-foreground">{r.durationMs}ms</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {e2eFailures.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-bold text-foreground text-red-400">E2E Failures ({e2eFailures.length})</h2>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {e2eFailures.slice(-10).reverse().map((f, i) => (
                <div key={i} className="text-xs text-red-300">
                  <span className="font-medium">{f.suiteName}/{f.testName}</span>: {f.error}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-bold text-foreground">Bus Event Distribution</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
            {Object.entries(busStats.byEvent)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 30)
              .map(([event, count]) => (
                <div key={event} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-muted/30">
                  <span className="text-foreground truncate flex-1 mr-2">{event}</span>
                  <span className="text-muted-foreground font-mono">{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </SubPageShell>
  );
}

function StatCard({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${warn ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card"}`}>
      <div className="text-[0.65rem] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={`text-lg font-bold mt-0.5 ${warn ? "text-amber-400" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const style = VERDICT_STYLE[verdict] ?? VERDICT_STYLE.FAIL;
  const Icon = style.icon;
  return (
    <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${style.bg} ${style.color}`}>
      <Icon className="w-3 h-3" />
      {verdict}
    </span>
  );
}
