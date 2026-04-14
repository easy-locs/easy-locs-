import { reportAnomaly } from "./anomaly-detector";
import { reportHealth } from "./health-aggregator";
import { runCssUxScan, getLastCssUxReport, type CssUxReport } from "./css-ux-conflict-detector";
import { runI18nOverflowScan, getLastI18nOverflowReport, type I18nOverflowReport } from "./i18n-overflow-guard";
import { runHookHealthScan, getLastHookHealthReport, type HookHealthReport } from "./hook-health-monitor";
import { runFluxAudit, getLastFluxAuditReport, type FluxAuditReport } from "./flux-pipeline-auditor";
import { getLastCycleReport, type ImprovementCycleReport } from "./continuous-improvement-loop";

export interface EvolutionSnapshot {
  timestamp: string;
  cycleNumber: number;
  overallScore: number;
  overallStatus: "evolving" | "stable" | "degraded" | "critical";
  subsystems: {
    cssUx: { score: number; status: string; issues: number };
    i18n: { score: number; status: string; issues: number };
    hooks: { score: number; status: string; memoryMB: number };
    flux: { score: number; status: string; activePipelines: number; throughput: number };
    improvement: { status: string; archGuard: string; cardHealth: string; repairs: number };
  };
  trend: "improving" | "stable" | "declining";
  recommendations: string[];
}

const EVOLUTION_INTERVAL_MS = 60_000;
let intervalId: ReturnType<typeof setInterval> | null = null;
let cycleNumber = 0;
let snapshots: EvolutionSnapshot[] = [];
const MAX_SNAPSHOTS = 100;

function computeTrend(): EvolutionSnapshot["trend"] {
  if (snapshots.length < 3) return "stable";
  const recent = snapshots.slice(-3);
  const scores = recent.map(s => s.overallScore);
  if (scores[2] > scores[0] + 5) return "improving";
  if (scores[2] < scores[0] - 5) return "declining";
  return "stable";
}

function generateRecommendations(
  cssUx: CssUxReport | null,
  i18n: I18nOverflowReport | null,
  hooks: HookHealthReport | null,
  flux: FluxAuditReport | null,
  improvement: ImprovementCycleReport | null,
): string[] {
  const recs: string[] = [];

  if (cssUx && cssUx.score < 70) {
    recs.push(`CSS/UX score ${cssUx.score}/100 — ${cssUx.issues.length} issues need attention`);
  }
  if (i18n && i18n.issues.filter(i => i.type === "missing_translation").length > 0) {
    recs.push(`Raw i18n keys visible in UI — add missing translations`);
  }
  if (i18n && i18n.overflowingElements > 5) {
    recs.push(`${i18n.overflowingElements} text elements overflow — check long translations (DE, AR, RU)`);
  }
  if (hooks && hooks.memoryMB > 200) {
    recs.push(`Memory at ${hooks.memoryMB}MB — investigate possible leaks`);
  }
  if (hooks && hooks.status === "degraded") {
    recs.push(`Hook health degraded — check for orphan subscriptions and DOM explosion`);
  }
  if (flux && flux.status === "critical") {
    recs.push(`Event bus storm or dead pipeline detected — check flux audit`);
  }
  if (flux && flux.activePipelines < 5) {
    recs.push(`Only ${flux.activePipelines} active pipelines — some engines may be offline`);
  }
  if (improvement && improvement.overallStatus === "critical") {
    recs.push(`Architecture violations detected — run full audit`);
  }

  if (recs.length === 0) {
    recs.push("All systems nominal — evolution engine monitoring");
  }

  return recs;
}

export function runEvolutionCycle(): EvolutionSnapshot {
  cycleNumber++;

  let cssUx: CssUxReport | null = null;
  let i18n: I18nOverflowReport | null = null;
  let hooks: HookHealthReport | null = null;
  let flux: FluxAuditReport | null = null;

  try { cssUx = runCssUxScan(); } catch {}
  try { i18n = runI18nOverflowScan(); } catch {}
  try { hooks = runHookHealthScan(); } catch {}
  try { flux = runFluxAudit(); } catch {}

  const improvement = getLastCycleReport();

  const cssScore = cssUx?.score ?? 100;
  const i18nScore = i18n?.score ?? 100;
  const hookScore = hooks?.score ?? 100;
  const fluxScore = flux?.score ?? 100;

  const overallScore = Math.round(
    cssScore * 0.2 + i18nScore * 0.2 + hookScore * 0.25 + fluxScore * 0.2 +
    (improvement?.overallStatus === "clean" ? 100 : improvement?.overallStatus === "warnings" ? 70 : 40) * 0.15
  );

  let overallStatus: EvolutionSnapshot["overallStatus"] = "stable";
  if (overallScore >= 90) overallStatus = "evolving";
  else if (overallScore >= 60) overallStatus = "stable";
  else if (overallScore >= 30) overallStatus = "degraded";
  else overallStatus = "critical";

  const recommendations = generateRecommendations(cssUx, i18n, hooks, flux, improvement);

  const snapshot: EvolutionSnapshot = {
    timestamp: new Date().toISOString(),
    cycleNumber,
    overallScore,
    overallStatus,
    subsystems: {
      cssUx: { score: cssScore, status: cssUx?.status ?? "unknown", issues: cssUx?.issues.length ?? 0 },
      i18n: { score: i18nScore, status: i18n?.status ?? "unknown", issues: i18n?.issues.length ?? 0 },
      hooks: { score: hookScore, status: hooks?.status ?? "unknown", memoryMB: hooks?.memoryMB ?? 0 },
      flux: { score: fluxScore, status: flux?.status ?? "unknown", activePipelines: flux?.activePipelines ?? 0, throughput: flux?.eventThroughput ?? 0 },
      improvement: {
        status: improvement?.overallStatus ?? "unknown",
        archGuard: improvement ? `${improvement.archGuard.passed}p/${improvement.archGuard.failed}f` : "—",
        cardHealth: improvement ? `${improvement.cardHealth.healthy}/${improvement.cardHealth.total}` : "—",
        repairs: improvement?.repairActions ?? 0,
      },
    },
    trend: computeTrend(),
    recommendations,
  };

  snapshots.push(snapshot);
  if (snapshots.length > MAX_SNAPSHOTS) snapshots = snapshots.slice(-MAX_SNAPSHOTS);

  reportHealth("evolution-engine",
    overallStatus === "critical" ? "degraded" : "ok",
    undefined,
    `Cycle #${cycleNumber}: score ${overallScore}/100, status ${overallStatus}, trend ${snapshot.trend}`
  );

  if (overallStatus === "critical") {
    reportAnomaly("architecture_violation", "evolution-engine",
      `System evolution critical — score ${overallScore}/100, ${recommendations.length} recommendations`, "critical");
  }

  if (import.meta.env.DEV && cycleNumber <= 3) {
    console.log(`[evolution-engine] Cycle #${cycleNumber}: score ${overallScore}/100, status ${overallStatus}, trend ${snapshot.trend}`);
  }

  return snapshot;
}

export function startEvolutionEngine(intervalMs = EVOLUTION_INTERVAL_MS): () => void {
  if (intervalId) return () => {};

  const initialTimer = setTimeout(() => {
    try { runEvolutionCycle(); } catch {}
  }, 15_000);

  intervalId = setInterval(() => {
    try { runEvolutionCycle(); } catch {}
  }, intervalMs);

  console.log(`[evolution-engine] Started — monitoring every ${intervalMs / 1000}s`);

  return () => {
    clearTimeout(initialTimer);
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

export function getLatestSnapshot(): EvolutionSnapshot | null {
  return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
}

export function getEvolutionHistory(): EvolutionSnapshot[] {
  return [...snapshots];
}

export function getEvolutionCycleCount(): number {
  return cycleNumber;
}
