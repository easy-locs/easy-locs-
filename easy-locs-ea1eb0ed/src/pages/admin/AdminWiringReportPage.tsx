import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { runWiringVerification, runWiringRemediationPass, getWiringReport } from "@/engines/core/wiring-verifier";
import type { WiringReport, WiringPhaseResult, WiringVerdict, RemediationRunResult } from "@/engines/core/wiring-verifier";

function VerdictBadge({ verdict }: { verdict: WiringVerdict }) {
  const color =
    verdict === "PASS"
      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
      : verdict === "WARN"
        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
        : verdict === "BLOCKED_BY_PREV_PHASE"
          ? "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30"
          : "bg-red-500/20 text-red-400 border border-red-500/30";
  const label = verdict === "BLOCKED_BY_PREV_PHASE" ? "BLOCKED" : verdict;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>
      {label}
    </span>
  );
}

function ScoreBar({ score, blocked }: { score: number; blocked?: boolean }) {
  const color = blocked
    ? "bg-zinc-600"
    : score >= 80
      ? "bg-emerald-500"
      : score >= 50
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: blocked ? "100%" : `${score}%`, opacity: blocked ? 0.3 : 1 }} />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
        {blocked ? "—" : `${score}%`}
      </span>
    </div>
  );
}

function PhaseCard({ phase, expanded, onToggle }: { phase: WiringPhaseResult; expanded: boolean; onToggle: () => void }) {
  const isBlocked = phase.verdict === "BLOCKED_BY_PREV_PHASE";
  return (
    <div className={`rounded-2xl border bg-card overflow-hidden ${isBlocked ? "border-zinc-700/30 opacity-60" : "border-border/20"}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <VerdictBadge verdict={phase.verdict} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{phase.label}</p>
          <ScoreBar score={phase.score} blocked={isBlocked} />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
          {phase.passed > 0 && (
            <span className="text-emerald-400">{phase.passed} pass</span>
          )}
          {phase.failed > 0 && (
            <span className="text-red-400">{phase.failed} fail</span>
          )}
          {phase.warnings > 0 && (
            <span className="text-amber-400">{phase.warnings} warn</span>
          )}
          <span>{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/10 pt-3">
          {phase.blockedBy && (
            <div className="text-xs text-zinc-400 bg-zinc-800/30 rounded-lg px-3 py-1.5">
              Blocked by: <span className="font-mono">{phase.blockedBy}</span>
            </div>
          )}

          {phase.blockers.length > 0 && !isBlocked && (
            <div>
              <p className="text-xs font-bold text-red-400 mb-1">Blockers</p>
              <ul className="space-y-1">
                {phase.blockers.map((b, i) => (
                  <li key={i} className="text-xs text-red-300 bg-red-500/10 rounded-lg px-3 py-1.5">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {phase.remediations.length > 0 && (
            <div>
              <p className="text-xs font-bold text-amber-400 mb-1">Remediations</p>
              <ul className="space-y-1">
                {phase.remediations.map((r, i) => (
                  <li key={i} className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-1.5">
                    <span className={`font-semibold ${r.severity === "critical" ? "text-red-400" : r.severity === "high" ? "text-amber-400" : "text-blue-400"}`}>
                      [{r.severity.toUpperCase()}]
                    </span>
                    {r.autoApplied && (
                      <span className="ml-1 px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">AUTO</span>
                    )}
                    {" "}{r.action}
                    <span className="text-muted-foreground/60 ml-1">→ {r.target}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {phase.evidence.length > 0 && (
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-1">Evidence</p>
              <div className="grid grid-cols-2 gap-1">
                {phase.evidence.map((ev, i) => (
                  <div key={i} className="text-xs bg-muted/20 rounded-lg px-2.5 py-1.5">
                    <span className="text-muted-foreground/70">{ev.key}: </span>
                    <span className="text-foreground font-mono break-words">
                      {Array.isArray(ev.value)
                        ? ev.value.length === 0
                          ? "[]"
                          : ev.value.length <= 3
                            ? `[${ev.value.join(", ")}]`
                            : `[${ev.value.slice(0, 3).join(", ")}... +${ev.value.length - 3}]`
                        : String(ev.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminWiringReportPage() {
  const navigate = useNavigate();
  const [report, setReport] = useState<WiringReport | null>(() => getWiringReport());
  const [running, setRunning] = useState(false);
  const [remediating, setRemediating] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

  const handleRun = useCallback(async () => {
    setRunning(true);
    try {
      const result = await runWiringVerification();
      setReport(result);
      if (result.overallVerdict === "PASS") {
        setExpandedPhases(new Set());
      } else {
        const failSet = new Set(
          result.phases
            .filter(p => p.verdict === "FAIL" || p.verdict === "BLOCKED_BY_PREV_PHASE")
            .map(p => p.phase),
        );
        setExpandedPhases(failSet);
      }
    } finally {
      setRunning(false);
    }
  }, []);

  const handleRemediation = useCallback(async () => {
    setRemediating(true);
    try {
      const result = await runWiringRemediationPass();
      setReport(result);
      const failSet = new Set(
        result.phases
          .filter(p => p.verdict === "FAIL" || p.verdict === "BLOCKED_BY_PREV_PHASE")
          .map(p => p.phase),
      );
      setExpandedPhases(failSet);
    } finally {
      setRemediating(false);
    }
  }, []);

  const togglePhase = useCallback((phase: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phase)) next.delete(phase);
      else next.add(phase);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    if (report) setExpandedPhases(new Set(report.phases.map(p => p.phase)));
  }, [report]);

  const collapseAll = useCallback(() => setExpandedPhases(new Set()), []);

  const hasFailures = report && (report.totalFail > 0 || report.totalBlocked > 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 pb-24">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/admin")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-foreground"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Engine Wiring Report</h1>
          <p className="text-xs text-muted-foreground">13-phase strict sequential gate verification</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-4 flex items-center gap-3 flex-wrap">
        <button
          onClick={handleRun}
          disabled={running || remediating}
          className="rounded-2xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-bold disabled:opacity-50 shrink-0"
        >
          {running ? "Running..." : "Run Verification"}
        </button>
        {hasFailures && (
          <button
            onClick={handleRemediation}
            disabled={running || remediating}
            className="rounded-2xl bg-amber-600/80 text-white px-5 py-2.5 text-sm font-bold disabled:opacity-50 shrink-0"
          >
            {remediating ? "Remediating..." : "Run Auto-Remediation"}
          </button>
        )}
        {report && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <VerdictBadge verdict={report.overallVerdict} />
              <span className="text-sm font-semibold text-foreground">Score: {report.overallScore}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {report.totalPass}P · {report.totalFail}F · {report.totalWarn}W · {report.totalBlocked}B ·{" "}
              {report.durationMs}ms
            </p>
          </div>
        )}
      </div>

      {report && report.remediationRuns && report.remediationRuns.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-sm font-bold text-amber-400 mb-2">
            Auto-Remediation Results
            {report.remediationRounds !== undefined && ` (up to ${report.remediationRounds} rounds)`}
            {report.terminatedEarly && " — terminated early: no further auto-fix progress possible"}
          </p>
          <div className="space-y-1">
            {(report.remediationRuns as RemediationRunResult[]).map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-muted-foreground/50 w-14 shrink-0">Round {r.round}</span>
                  <span className="text-muted-foreground font-mono truncate">{r.phase}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-muted-foreground">{r.actionsApplied}/{r.actionsAttempted} applied</span>
                  {r.phaseRetested && (
                    <>
                      <VerdictBadge verdict={r.verdictBefore} />
                      <span className="text-muted-foreground/40">→</span>
                      <VerdictBadge verdict={r.verdictAfter} />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {report && (
        <>
          {report.criticalBlockers.length > 0 && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm font-bold text-red-400 mb-2">
                {report.criticalBlockers.length} Critical Blocker(s) — Strict Sequential Gates Failed
              </p>
              <ul className="space-y-1">
                {report.criticalBlockers.map((b, i) => (
                  <li key={i} className="text-xs text-red-300">{b}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Run: <span className="font-mono text-foreground/60">{report.runId}</span>
            </p>
            <div className="flex gap-2">
              <button onClick={expandAll} className="text-xs text-muted-foreground hover:text-foreground">
                Expand all
              </button>
              <span className="text-muted-foreground/40">·</span>
              <button onClick={collapseAll} className="text-xs text-muted-foreground hover:text-foreground">
                Collapse all
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {report.phases.map(phase => (
              <PhaseCard
                key={phase.phase}
                phase={phase}
                expanded={expandedPhases.has(phase.phase)}
                onToggle={() => togglePhase(phase.phase)}
              />
            ))}
          </div>

          {report.remediationPlan.length > 0 && (
            <div className="rounded-2xl border border-border/20 bg-card p-4">
              <p className="text-sm font-bold text-foreground mb-3">
                Prioritized Remediation Plan ({report.remediationPlan.length} actions)
              </p>
              <div className="space-y-2">
                {report.remediationPlan.slice(0, 20).map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-muted-foreground/50 tabular-nums w-5 shrink-0">{i + 1}.</span>
                    <div>
                      <span
                        className={`font-semibold ${r.severity === "critical" ? "text-red-400" : r.severity === "high" ? "text-amber-400" : "text-blue-400"}`}
                      >
                        [{r.severity.toUpperCase()}]
                      </span>
                      {r.autoApplied && (
                        <span className="ml-1 px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">AUTO</span>
                      )}
                      {" "}
                      <span className="text-foreground">{r.action}</span>
                      <span className="text-muted-foreground/60 ml-1">→ {r.target}</span>
                    </div>
                  </div>
                ))}
                {report.remediationPlan.length > 20 && (
                  <p className="text-xs text-muted-foreground/60 pl-7">
                    +{report.remediationPlan.length - 20} more actions...
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {!report && !running && (
        <div className="rounded-2xl border border-border/20 bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Click "Run Verification" to validate all 13 engine wiring phases in strict sequential order.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Each gate that fails blocks all subsequent phases (BLOCKED_BY_PREV_PHASE).
          </p>
        </div>
      )}
    </div>
  );
}
