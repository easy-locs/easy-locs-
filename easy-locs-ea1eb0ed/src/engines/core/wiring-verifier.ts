/**
 * WiringVerifier — Ultra Precise Engine Wiring Verification & Enforcement
 *
 * Validates all 13 phase gates in strict sequential order.
 *
 * GATE SEMANTICS
 * Each phase verifies a set of hard-gate conditions. If any condition in a phase
 * produces a FAIL verdict, firstFailPhase is set and ALL subsequent phases are
 * immediately marked BLOCKED_BY_PREV_PHASE without executing. This enforces true
 * strict sequential gate behavior.
 *
 * ENFORCEMENT MODEL
 * - Phase 1: ENGINE_MASTER_REGISTRY cross-referenced against live orchestrator
 * - Phase 2: VERSION_GATE checks auth/orbit domain health + bus event version patterns
 * - Phase 3: runTaxonomyGuard() + runEntryGuards() actually executed (not metadata checks)
 * - Phase 5: Lifecycle state map verifies REGISTERED→VERIFIED→READY→RUNNING→DEGRADED→QUARANTINED→BLOCKED
 * - Phase 6: 10-stage spec missing stages = FAIL (not WARN)
 * - Phase 9: executePipeline() probes for 6 domains run through full orchestrator→pipeline chain
 *
 * REMEDIATION ENFORCEMENT
 * runWiringRemediationPass() loops up to MAX_REMEDIATION_ROUNDS=3 times.
 * Each round: applies auto-remediations, re-runs full 13-phase verification.
 * Exits early on PASS or when no progress is made.
 */

import { engineOrchestrator } from "./engine-orchestrator";
import { getRepairSafetyReport, isRepairStormActive, sealManifest } from "./repair-safety";
import { getPipelineReport, isPipelineEnabled, executePipeline, enablePipeline } from "./repair-pipeline";
import { getProofStats, getRecentProofs } from "./proof-system";
import { getHardeningReport } from "./repair-hardening";
import { getLearningReport } from "./engine-learning";
import { engineMemory } from "./engine-memory";
import { engineObserver } from "./engine-observer";
import { engineHealthMonitor } from "./engine-health-monitor";
import { engineOptimizer } from "./engine-optimizer";
import { platformBus } from "@/lib/shared/platform-bus";
import { sentinelEngineRegistry } from "@/core/sentinel/registry/module-tracker";
import { sentinelTaxonomyRegistry } from "@/core/sentinel/registry/taxonomy-registry";
import { getAllKillSwitches } from "@/lib/control-plane/kill-switches";
import { getAllDomainHealth } from "@/lib/control-plane/domain-health";
import { runTaxonomyGuard, getTaxonomyViolations } from "@/lib/runtime/taxonomy-guard";
import { runEntryGuards, getGuardMetrics } from "@/lib/runtime/entry-guards";
import { validateEngineContract } from "@/core/command-center/engine-contract";
import { getEngineContract } from "@/core/command-center/engine-contracts-registry";

/**
 * ENGINE_MASTER_REGISTRY
 * ----------------------
 * Authoritative static source-of-truth for all engines that MUST be registered,
 * running, and assigned to the correct domain after bootEngineSystem(). Phase 1
 * cross-checks every entry against the live orchestrator.
 *
 * Fields:
 *   id          — exact engine ID as set in BaseEngineConfig.id
 *   domain      — expected engine.domain value
 *   domainOwner — business domain owner (matches kill-switch / activation-sheet domain)
 *   role        — what category of work this engine performs
 *   version     — current canonical version string
 *   criticality — criticality level for prioritizing contract checks
 *
 * Derived from: engine-registry.ts → registerAllEngines()
 */
export const ENGINE_MASTER_REGISTRY: Array<{
  id: string;
  domain: string;
  domainOwner: string;
  role: "self-healing" | "lifecycle" | "quality" | "infrastructure" | "normalizer" | "taxonomy" | "gate" | "governance";
  version: string;
  criticality: "critical" | "high" | "medium";
}> = [
  { id: "repair-engine",          domain: "platform",    domainOwner: "platform",    role: "self-healing",    version: "v2", criticality: "critical" },
  { id: "learning-engine",        domain: "analytics",   domainOwner: "platform",    role: "infrastructure",  version: "v2", criticality: "high" },
  { id: "taxonomy-engine",        domain: "taxonomy",    domainOwner: "taxonomy",    role: "taxonomy",        version: "v2", criticality: "critical" },
  { id: "ui-correction-engine",   domain: "platform",    domainOwner: "platform",    role: "quality",         version: "v2", criticality: "high" },
  { id: "flow-integrity-engine",  domain: "governance",  domainOwner: "platform",    role: "governance",      version: "v2", criticality: "critical" },
  { id: "fraud-detection-engine", domain: "security",    domainOwner: "platform",    role: "quality",         version: "v2", criticality: "critical" },
];

/**
 * LIFECYCLE_STAGE_MAP
 * -------------------
 * Maps actual engine health monitor statuses to the required 7-stage lifecycle
 * control path: REGISTERED → VERIFIED → READY → RUNNING → DEGRADED → QUARANTINED → BLOCKED
 *
 * Phase 5 verifies that each engine can be assigned to a lifecycle stage and that
 * no engine is stuck in an invalid transition (e.g., running but also quarantined).
 */
const LIFECYCLE_STAGE_MAP: Record<string, string> = {
  "disabled":    "REGISTERED",
  "restarting":  "VERIFIED",
  "safe_mode":   "READY",
  "running":     "RUNNING",
  "frozen":      "DEGRADED",
  "timeout":     "DEGRADED",
  "crashed":     "QUARANTINED",
};

const VALID_LIFECYCLE_TRANSITIONS: Record<string, string[]> = {
  "REGISTERED":  ["VERIFIED", "BLOCKED"],
  "VERIFIED":    ["READY", "BLOCKED"],
  "READY":       ["RUNNING", "BLOCKED"],
  "RUNNING":     ["DEGRADED", "QUARANTINED", "BLOCKED"],
  "DEGRADED":    ["RUNNING", "QUARANTINED", "BLOCKED"],
  "QUARANTINED": ["BLOCKED"],
  "BLOCKED":     [],
};

export type WiringPhase =
  | "phase0_freeze"
  | "phase1_registry"
  | "phase2_version_lock"
  | "phase3_taxonomy_lock"
  | "phase4_contracts"
  | "phase5_orchestrator"
  | "phase6_repair_pipeline"
  | "phase7_proof_system"
  | "phase8_observability"
  | "phase9_e2e_flows"
  | "phase10_learning"
  | "phase11_optimization"
  | "phase12_hardening";

export type WiringVerdict = "PASS" | "FAIL" | "WARN" | "BLOCKED_BY_PREV_PHASE";

export interface WiringEvidence {
  key: string;
  value: string | number | boolean | string[];
}

export interface WiringRemediationAction {
  action: string;
  target: string;
  severity: "critical" | "high" | "medium";
  autoApplied?: boolean;
  autoApplicable?: boolean;
}

export interface WiringPhaseResult {
  phase: WiringPhase;
  label: string;
  verdict: WiringVerdict;
  score: number;
  passed: number;
  failed: number;
  warnings: number;
  blockers: string[];
  evidence: WiringEvidence[];
  remediations: WiringRemediationAction[];
  checkedAt: number;
  blockedBy?: WiringPhase;
}

export interface RemediationRunResult {
  round: number;
  phase: WiringPhase;
  actionsAttempted: number;
  actionsApplied: number;
  phaseRetested: boolean;
  verdictBefore: WiringVerdict;
  verdictAfter: WiringVerdict;
}

export interface WiringReport {
  runId: string;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  overallVerdict: WiringVerdict;
  overallScore: number;
  phases: WiringPhaseResult[];
  totalPass: number;
  totalFail: number;
  totalWarn: number;
  totalBlocked: number;
  criticalBlockers: string[];
  remediationPlan: WiringRemediationAction[];
  remediationRuns?: RemediationRunResult[];
  remediationRounds?: number;
  terminatedEarly?: boolean;
}

const MAX_REMEDIATION_ROUNDS = 3;

let lastReport: WiringReport | null = null;
let runCounter = 0;

const PHASES_IN_ORDER: WiringPhase[] = [
  "phase0_freeze",
  "phase1_registry",
  "phase2_version_lock",
  "phase3_taxonomy_lock",
  "phase4_contracts",
  "phase5_orchestrator",
  "phase6_repair_pipeline",
  "phase7_proof_system",
  "phase8_observability",
  "phase9_e2e_flows",
  "phase10_learning",
  "phase11_optimization",
  "phase12_hardening",
];

const PHASE_LABELS: Record<WiringPhase, string> = {
  phase0_freeze:         "Phase 0: Freeze Gate",
  phase1_registry:       "Phase 1: Engine Registry (ENGINE_MASTER_REGISTRY)",
  phase2_version_lock:   "Phase 2: Version Lock (VERSION_GATE)",
  phase3_taxonomy_lock:  "Phase 3: Taxonomy Lock (Guard Execution)",
  phase4_contracts:      "Phase 4: Engine Contracts",
  phase5_orchestrator:   "Phase 5: Orchestrator Lifecycle Control",
  phase6_repair_pipeline:"Phase 6: Repair Pipeline (10-Stage)",
  phase7_proof_system:   "Phase 7: Proof System (Root Cause + Confidence)",
  phase8_observability:  "Phase 8: Observability",
  phase9_e2e_flows:      "Phase 9: E2E Flow Probes",
  phase10_learning:      "Phase 10: Learning Pipeline",
  phase11_optimization:  "Phase 11: Optimization",
  phase12_hardening:     "Phase 12: System Hardening",
};

function ev(key: string, value: WiringEvidence["value"]): WiringEvidence {
  return { key, value };
}

function rem(
  action: string,
  target: string,
  severity: WiringRemediationAction["severity"],
  autoApplicable = false,
): WiringRemediationAction {
  return { action, target, severity, autoApplicable };
}

function makeResult(
  phase: WiringPhase,
  passed: number,
  failed: number,
  warnings: number,
  blockers: string[],
  evidence: WiringEvidence[],
  remediations: WiringRemediationAction[],
): WiringPhaseResult {
  const total = passed + failed;
  const score = total > 0 ? Math.round((passed / total) * 100) : (warnings > 0 ? 70 : 100);
  const verdict: WiringVerdict = failed > 0 ? "FAIL" : warnings > 0 ? "WARN" : "PASS";
  return {
    phase,
    label: PHASE_LABELS[phase],
    verdict, score, passed, failed, warnings, blockers, evidence, remediations,
    checkedAt: Date.now(),
  };
}

function blockedResult(phase: WiringPhase, blockedBy: WiringPhase): WiringPhaseResult {
  return {
    phase,
    label: PHASE_LABELS[phase],
    verdict: "BLOCKED_BY_PREV_PHASE",
    score: 0, passed: 0, failed: 0, warnings: 0,
    blockers: [`Blocked by prior gate failure in ${PHASE_LABELS[blockedBy]}`],
    evidence: [],
    remediations: [rem(`Fix all failures in ${PHASE_LABELS[blockedBy]} before this phase can execute`, blockedBy, "critical")],
    checkedAt: Date.now(),
    blockedBy,
  };
}

function buildReport(
  phases: WiringPhaseResult[],
  startedAt: number,
  remRuns?: RemediationRunResult[],
  remRounds?: number,
  terminatedEarly?: boolean,
): WiringReport {
  ++runCounter;
  const runId = `WIRING_RUN_${startedAt}_${runCounter}`;
  const totalPass = phases.filter(p => p.verdict === "PASS").length;
  const totalFail = phases.filter(p => p.verdict === "FAIL").length;
  const totalWarn = phases.filter(p => p.verdict === "WARN").length;
  const totalBlocked = phases.filter(p => p.verdict === "BLOCKED_BY_PREV_PHASE").length;
  const overallVerdict: WiringVerdict = (totalFail > 0 || totalBlocked > 0) ? "FAIL" : totalWarn > 0 ? "WARN" : "PASS";
  const scoringPhases = phases.filter(p => p.verdict !== "BLOCKED_BY_PREV_PHASE");
  const overallScore = scoringPhases.length > 0
    ? Math.round(scoringPhases.reduce((a, p) => a + p.score, 0) / scoringPhases.length) : 0;
  const criticalBlockers = phases.flatMap(p => p.blockers.map(b => `[${p.label}] ${b}`));
  const remediationPlan = phases.flatMap(p => p.remediations)
    .sort((a, b) => ({ critical: 0, high: 1, medium: 2 }[a.severity] - { critical: 0, high: 1, medium: 2 }[b.severity]));
  const completedAt = Date.now();

  return {
    runId, startedAt, completedAt, durationMs: completedAt - startedAt,
    overallVerdict, overallScore, phases,
    totalPass, totalFail, totalWarn, totalBlocked,
    criticalBlockers, remediationPlan,
    ...(remRuns ? { remediationRuns: remRuns } : {}),
    ...(remRounds !== undefined ? { remediationRounds: remRounds } : {}),
    ...(terminatedEarly ? { terminatedEarly } : {}),
  };
}

async function executeAllPhases(): Promise<WiringPhaseResult[]> {
  const phases: WiringPhaseResult[] = [];
  let firstFailPhase: WiringPhase | null = null;

  for (const phaseId of PHASES_IN_ORDER) {
    if (firstFailPhase !== null) {
      phases.push(blockedResult(phaseId, firstFailPhase));
      continue;
    }
    let result: WiringPhaseResult;
    try {
      result = await dispatchPhase(phaseId);
    } catch (e) {
      result = makeResult(phaseId, 0, 1, 0,
        [`Phase threw exception: ${e instanceof Error ? e.message : String(e)}`], [], []);
    }
    phases.push(result);
    if (result.verdict === "FAIL") firstFailPhase = phaseId;
  }
  return phases;
}

async function dispatchPhase(phaseId: WiringPhase): Promise<WiringPhaseResult> {
  switch (phaseId) {
    case "phase0_freeze":          return verifyPhase0Freeze();
    case "phase1_registry":        return verifyPhase1Registry();
    case "phase2_version_lock":    return verifyPhase2VersionLock();
    case "phase3_taxonomy_lock":   return await verifyPhase3TaxonomyLock();
    case "phase4_contracts":       return verifyPhase4Contracts();
    case "phase5_orchestrator":    return verifyPhase5Orchestrator();
    case "phase6_repair_pipeline": return verifyPhase6RepairPipeline();
    case "phase7_proof_system":    return verifyPhase7ProofSystem();
    case "phase8_observability":   return verifyPhase8Observability();
    case "phase9_e2e_flows":       return await verifyPhase9E2EFlows();
    case "phase10_learning":       return verifyPhase10Learning();
    case "phase11_optimization":   return verifyPhase11Optimization();
    case "phase12_hardening":      return verifyPhase12Hardening();
    default:
      return makeResult(phaseId, 0, 1, 0, [`Unknown phase: ${phaseId}`], [], []);
  }
}

async function applyAutoRemediation(action: WiringRemediationAction): Promise<boolean> {
  if (!action.autoApplicable) return false;
  switch (action.target) {
    case "repair-safety.sealManifest":
      try { sealManifest(); return true; } catch { return false; }
    case "repair-pipeline.enablePipeline":
      try { enablePipeline(); return true; } catch { return false; }
    default:
      return false;
  }
}

export async function runWiringVerification(): Promise<WiringReport> {
  const startedAt = Date.now();
  engineObserver.log("wiring-verifier", "wiring", "info",
    `WiringVerifier started: 13-phase strict sequential gate check`);

  const phases = await executeAllPhases();
  const report = buildReport(phases, startedAt);
  lastReport = report;

  engineObserver.log("wiring-verifier", "wiring",
    report.overallVerdict === "PASS" ? "info" : report.overallVerdict === "WARN" ? "warn" : "error",
    `WiringVerifier ${report.runId} ${report.overallVerdict}: score=${report.overallScore} | ${report.totalPass}P ${report.totalFail}F ${report.totalWarn}W ${report.totalBlocked}B`,
  );

  platformBus.emit("engine:wiring_report_generated", {
    runId: report.runId,
    verdict: report.overallVerdict,
    score: report.overallScore,
    totalFail: report.totalFail,
    totalWarn: report.totalWarn,
    totalBlocked: report.totalBlocked,
    blockers: report.criticalBlockers.length,
  }, "wiring-verifier");

  return report;
}

export async function runWiringRemediationPass(): Promise<WiringReport> {
  const allRemRuns: RemediationRunResult[] = [];
  let currentReport = lastReport ?? await runWiringVerification();
  let terminatedEarly = false;

  for (let round = 1; round <= MAX_REMEDIATION_ROUNDS; round++) {
    if (currentReport.overallVerdict === "PASS") break;

    let anyApplied = false;

    for (const phase of currentReport.phases) {
      if (phase.verdict === "PASS" || phase.verdict === "BLOCKED_BY_PREV_PHASE") continue;

      const autoRems = phase.remediations.filter(r => r.autoApplicable);
      let actionsApplied = 0;
      const verdictBefore = phase.verdict;

      for (const action of autoRems) {
        const applied = await applyAutoRemediation(action);
        if (applied) { actionsApplied++; anyApplied = true; }
      }

      allRemRuns.push({
        round,
        phase: phase.phase,
        actionsAttempted: autoRems.length,
        actionsApplied,
        phaseRetested: actionsApplied > 0,
        verdictBefore,
        verdictAfter: verdictBefore,
      });
    }

    if (!anyApplied) {
      terminatedEarly = true;
      break;
    }

    const freshReport = await runWiringVerification();
    for (const run of allRemRuns) {
      if (run.round === round && run.phaseRetested) {
        const updated = freshReport.phases.find(p => p.phase === run.phase);
        if (updated) run.verdictAfter = updated.verdict;
      }
    }
    currentReport = freshReport;
  }

  const finalReport: WiringReport = {
    ...currentReport,
    remediationRuns: allRemRuns,
    remediationRounds: MAX_REMEDIATION_ROUNDS,
    terminatedEarly,
  };

  lastReport = finalReport;
  return finalReport;
}

export function getWiringReport(): WiringReport | null {
  return lastReport;
}

let _continuousTimer: ReturnType<typeof setInterval> | null = null;
let _continuousEnabled = false;

const _registeredEventTypes = new Set<string>();
const _emittedWithoutListeners: string[] = [];
const MAX_ORPHAN_LOG = 50;

function onBusRegistration(type: string, action: "on" | "off"): void {
  if (action === "on") {
    _registeredEventTypes.add(type);
  } else if (action === "off") {
    const stats = platformBus.getListenerStats();
    if ((stats.byEvent[type] ?? 0) === 0) {
      _registeredEventTypes.delete(type);
    }
  }
}

const _orphanIncidentsSent = new Set<string>();
const MAX_ORPHAN_INCIDENTS = 20;

let _sentinelIncidentEngine: { open: (severity: string, category: string, entityId: string, title: string, details: string) => void } | null = null;
let _sentinelLoadAttempted = false;

function ensureSentinelIncidentEngine(): void {
  if (_sentinelIncidentEngine || _sentinelLoadAttempted) return;
  _sentinelLoadAttempted = true;
  import("@/core/sentinel").then(({ sentinelIncidentEngine }) => {
    _sentinelIncidentEngine = sentinelIncidentEngine;
  }).catch(() => {});
}

function onBusEmit(type: string): void {
  const stats = platformBus.getListenerStats();
  const currentListenerCount = stats.byEvent[type] ?? 0;
  if (currentListenerCount === 0) {
    _emittedWithoutListeners.push(type);
    if (_emittedWithoutListeners.length > MAX_ORPHAN_LOG) _emittedWithoutListeners.shift();
    console.warn(`[wiring-verifier] Orphan emit: "${type}" has no registered listeners`);

    if (!_orphanIncidentsSent.has(type) && _orphanIncidentsSent.size < MAX_ORPHAN_INCIDENTS) {
      _orphanIncidentsSent.add(type);
      platformBus.emit("engine:wiring_degraded", {
        runId: `orphan-${Date.now()}`,
        verdict: "FAIL",
        score: 0,
        totalFail: 1,
        blockers: [`Orphan emit detected: "${type}" emitted with zero active listeners`],
      }, "wiring-verifier");

      ensureSentinelIncidentEngine();
      _sentinelIncidentEngine?.open(
        "medium",
        "wiring",
        `orphan-emit:${type}`,
        `Orphan emit: ${type}`,
        `Event "${type}" was emitted with zero active listeners. This indicates a wiring gap — either a listener was never registered or was removed prematurely.`,
      );
    }
  }
}

export function getOrphanEmits(): readonly string[] {
  return _emittedWithoutListeners;
}

export function getRegisteredEventTypes(): ReadonlySet<string> {
  return _registeredEventTypes;
}

export function installContinuousWiringVerification(intervalMs = 60_000): () => void {
  if (_continuousEnabled) return () => {};
  _continuousEnabled = true;

  platformBus.setOnRegistrationCallback(onBusRegistration);
  platformBus.setOnEmitCallback(onBusEmit);

  const run = async () => {
    try {
      if ((globalThis as any).__E2E_RUNNING__) return;
      const report = await runWiringVerification();
      if (report.overallVerdict === "FAIL" && report.totalFail > 0) {
        platformBus.emit("engine:wiring_degraded", {
          runId: report.runId,
          verdict: report.overallVerdict,
          score: report.overallScore,
          totalFail: report.totalFail,
          blockers: report.criticalBlockers,
        }, "wiring-verifier");
        await runWiringRemediationPass();
      }
    } catch (e) {
      console.warn("[wiring-verifier] continuous check failed", e);
    }
  };

  void run();
  _continuousTimer = setInterval(run, intervalMs);

  return () => {
    _continuousEnabled = false;
    platformBus.setOnRegistrationCallback(null);
    platformBus.setOnEmitCallback(null);
    if (_continuousTimer) {
      clearInterval(_continuousTimer);
      _continuousTimer = null;
    }
  };
}

export const wiringVerifier = {
  runFullVerification: runWiringVerification,
  runRemediationPass: runWiringRemediationPass,
  getLastReport: getWiringReport,
  installContinuous: installContinuousWiringVerification,
};

function verifyPhase0Freeze(): WiringPhaseResult {
  let passed = 0, failed = 0, warnings = 0;
  const blockers: string[] = [], evidence: WiringEvidence[] = [], remediations: WiringRemediationAction[] = [];

  const safetyReport = getRepairSafetyReport();
  const busStats = platformBus.getListenerStats();

  evidence.push(ev("repair_storm_active", safetyReport.stormActive));
  if (!safetyReport.stormActive) { passed++; }
  else {
    failed++;
    blockers.push("Repair storm ACTIVE — uncontrolled auto-remediation running, Phase 0 gate cannot pass");
    remediations.push(rem("Halt all repair engines and allow storm cooldown before proceeding", "repair-safety", "critical"));
  }

  evidence.push(ev("manifest_sealed", safetyReport.manifestSealed));
  if (safetyReport.manifestSealed) { passed++; }
  else {
    failed++;
    blockers.push("Engine manifest NOT sealed — ghost engines can be injected at runtime");
    remediations.push(rem("Call sealManifest() after all engines are registered at boot", "repair-safety.sealManifest", "critical", true));
  }

  evidence.push(ev("manifest_size", safetyReport.manifestSize));
  if (safetyReport.manifestSize > 0) { passed++; }
  else {
    failed++;
    blockers.push("Engine manifest is empty — no engines enrolled in safety manifest");
    remediations.push(rem("Call registerInManifest(engineId) for all engines during boot", "repair-safety", "critical"));
  }

  const highMultiplicity: string[] = [];
  for (const [type, count] of Object.entries(busStats.byEvent)) {
    if (count > 3) highMultiplicity.push(`${type}(${count})`);
  }
  evidence.push(ev("bus_total_listeners", busStats.totalTyped));
  evidence.push(ev("bus_high_multiplicity_types", highMultiplicity));
  if (highMultiplicity.length === 0) { passed++; }
  else {
    failed++;
    blockers.push(`Duplicate bus listeners (>3 on same event type): ${highMultiplicity.slice(0, 5).join(", ")} — duplicate subscriptions cause phantom redundant side-effects`);
    remediations.push(rem(`Remove duplicate bus subscriptions: ${highMultiplicity.slice(0, 5).join(", ")}`, "platform-bus", "critical"));
  }

  evidence.push(ev("active_quarantines", safetyReport.activeQuarantines.length));
  evidence.push(ev("quarantined_ids", safetyReport.activeQuarantines.map(q => q.id)));
  if (safetyReport.activeQuarantines.length === 0) { passed++; }
  else {
    warnings++;
    remediations.push(rem(`Investigate ${safetyReport.activeQuarantines.length} active quarantine(s)`, "repair-safety", "high"));
  }

  const killSwitches = getAllKillSwitches();
  evidence.push(ev("kill_switches_total", killSwitches.length));
  if (killSwitches.length > 0) { passed++; }
  else {
    failed++;
    blockers.push("No kill switches configured — no emergency circuit-breaker exists for any domain");
    remediations.push(rem("Register kill switches for all major domains via initDefaults()", "control-plane/kill-switches", "critical"));
  }

  const proofStats = getProofStats();
  const totalRepairs = proofStats.total;
  const acceptedRepairs = proofStats.outcomes.accepted;
  const unprovenRepairs = totalRepairs > 0
    ? totalRepairs - (acceptedRepairs + (proofStats.outcomes.rolled_back ?? 0) + (proofStats.outcomes.rejected ?? 0) + (proofStats.outcomes.failed_validation ?? 0) + (proofStats.outcomes.failed_regression ?? 0) + (proofStats.outcomes.blocked ?? 0) + (proofStats.outcomes.timed_out ?? 0))
    : 0;
  evidence.push(ev("freeze_total_repairs", totalRepairs));
  evidence.push(ev("freeze_unaccounted_repairs", unprovenRepairs));
  if (unprovenRepairs <= 0) { passed++; }
  else {
    failed++;
    blockers.push(`${unprovenRepairs} repair run(s) have no proof outcome — auto-remediation without proof violates freeze discipline`);
    remediations.push(rem("Ensure every executePipeline() run produces a proof record with a terminal outcome", "repair-pipeline.ts", "critical"));
  }

  const pipelineReport = getPipelineReport();
  evidence.push(ev("freeze_pipeline_total_blocked", pipelineReport.totalBlocked ?? 0));
  const blockedRatio = (pipelineReport.totalRuns ?? 0) > 0
    ? (pipelineReport.totalBlocked ?? 0) / (pipelineReport.totalRuns ?? 1) : 0;
  evidence.push(ev("freeze_pipeline_blocked_ratio_pct", Math.round(blockedRatio * 100)));
  if (blockedRatio < 0.9) { passed++; }
  else {
    failed++;
    blockers.push(`${Math.round(blockedRatio * 100)}% of pipeline runs are blocked — freeze gate not allowing controlled remediations through`);
    remediations.push(rem("Unblock pipeline — check domain activation sheets and kill switch configuration", "repair-pipeline.ts", "critical"));
  }

  return makeResult("phase0_freeze", passed, failed, warnings, blockers, evidence, remediations);
}

function verifyPhase1Registry(): WiringPhaseResult {
  let passed = 0, failed = 0, warnings = 0;
  const blockers: string[] = [], evidence: WiringEvidence[] = [], remediations: WiringRemediationAction[] = [];

  const orchestratorStats = engineOrchestrator.getAllStats();
  const orchestratorMap = new Map(orchestratorStats.map(e => [e.id, e]));

  evidence.push(ev("engine_master_registry_entries", ENGINE_MASTER_REGISTRY.length));
  evidence.push(ev("orchestrator_live_engines", orchestratorStats.length));

  if (orchestratorStats.length === 0) {
    failed++;
    blockers.push("Orchestrator has ZERO engines — registerAllEngines() was never called");
    remediations.push(rem("Call registerAllEngines() then startAll() before WiringVerifier runs", "engine-registry.ts", "critical"));
  } else { passed++; }

  const missingFromOrchestrator: string[] = [];
  const wrongDomain: string[] = [];
  const wrongVersion: string[] = [];

  for (const master of ENGINE_MASTER_REGISTRY) {
    const live = orchestratorMap.get(master.id);
    if (!live) {
      missingFromOrchestrator.push(master.id);
    } else {
      if (live.domain !== master.domain) {
        wrongDomain.push(`${master.id}(expected:${master.domain},got:${live.domain})`);
      }
    }
  }

  const sentinelEngines = sentinelEngineRegistry.getAll();
  const sentinelMap = new Map(sentinelEngines.map(e => [e.engine_id, e]));
  for (const master of ENGINE_MASTER_REGISTRY) {
    const sentinel = sentinelMap.get(master.id);
    if (sentinel && sentinel.version !== master.version) {
      wrongVersion.push(`${master.id}(expected:${master.version},got:${sentinel.version})`);
    }
  }

  evidence.push(ev("master_registry_missing", missingFromOrchestrator));
  evidence.push(ev("master_registry_wrong_domain", wrongDomain));
  evidence.push(ev("master_registry_wrong_version", wrongVersion));

  if (missingFromOrchestrator.length === 0) { passed++; }
  else {
    failed++;
    blockers.push(`ENGINE_MASTER_REGISTRY: ${missingFromOrchestrator.length} required engine(s) missing from orchestrator: ${missingFromOrchestrator.join(", ")}`);
    remediations.push(rem(`Register missing engines: ${missingFromOrchestrator.slice(0, 5).join(", ")}`, "engine-registry.ts", "critical"));
  }

  if (wrongDomain.length === 0) { passed++; }
  else {
    failed++;
    blockers.push(`${wrongDomain.length} engine(s) on wrong domain: ${wrongDomain.join("; ")}`);
    remediations.push(rem("Fix domain assignment for engines listed in ENGINE_MASTER_REGISTRY", "base-engine", "critical"));
  }

  if (wrongVersion.length === 0) { passed++; }
  else {
    warnings++;
    remediations.push(rem(`${wrongVersion.length} version mismatches vs ENGINE_MASTER_REGISTRY: ${wrongVersion.join("; ")}`, "sentinel/registry/engine-registry", "high"));
  }

  const seenIds = new Set<string>();
  const duplicateIds: string[] = [];
  for (const e of orchestratorStats) {
    if (seenIds.has(e.id)) duplicateIds.push(e.id);
    seenIds.add(e.id);
  }
  evidence.push(ev("duplicate_engine_ids", duplicateIds));
  if (duplicateIds.length === 0) { passed++; }
  else {
    failed++;
    blockers.push(`Duplicate engine IDs: ${duplicateIds.join(", ")} — IDs must be unique across the system`);
    remediations.push(rem("Remove duplicate engine registrations", "engine-registry.ts", "critical"));
  }

  const orphanInOrchestrator = orchestratorStats.filter(e => !sentinelMap.has(e.id)).map(e => e.id);
  const phantomInSentinel = sentinelEngines.filter(e => !orchestratorMap.has(e.engine_id)).map(e => e.engine_id);

  evidence.push(ev("orchestrator_orphans_not_in_sentinel", orphanInOrchestrator.slice(0, 10)));
  evidence.push(ev("sentinel_phantoms_not_in_orchestrator", phantomInSentinel.slice(0, 10)));

  if (orphanInOrchestrator.length === 0) { passed++; }
  else {
    failed++;
    blockers.push(`${orphanInOrchestrator.length} orphan engine(s) in orchestrator but NOT in sentinel registry — sentinel blind spot: ${orphanInOrchestrator.slice(0, 5).join(", ")}`);
    remediations.push(rem(`Register orphan engines in sentinel registry: ${orphanInOrchestrator.slice(0, 5).join(", ")}`, "sentinel/registry/engine-registry", "critical"));
  }

  if (phantomInSentinel.length === 0) { passed++; }
  else {
    failed++;
    blockers.push(`${phantomInSentinel.length} phantom engine(s) in sentinel registry but NOT in orchestrator — ghost references: ${phantomInSentinel.slice(0, 5).join(", ")}`);
    remediations.push(rem(`Remove phantom sentinel entries: ${phantomInSentinel.slice(0, 5).join(", ")}`, "sentinel/registry/engine-registry", "critical"));
  }

  return makeResult("phase1_registry", passed, failed, warnings, blockers, evidence, remediations);
}

function verifyPhase2VersionLock(): WiringPhaseResult {
  let passed = 0, failed = 0, warnings = 0;
  const blockers: string[] = [], evidence: WiringEvidence[] = [], remediations: WiringRemediationAction[] = [];

  const sentinelEngines = sentinelEngineRegistry.getAll();
  const domainVersionMap = new Map<string, Set<string>>();
  for (const e of sentinelEngines) {
    if (!domainVersionMap.has(e.owner_domain)) domainVersionMap.set(e.owner_domain, new Set());
    domainVersionMap.get(e.owner_domain)!.add(e.version ?? "v1");
  }

  const conflictingDomains: string[] = [];
  for (const [domain, versions] of domainVersionMap) {
    if (versions.size > 1) conflictingDomains.push(`${domain}[${Array.from(versions).join(",")}]`);
  }
  evidence.push(ev("version_conflicting_domains", conflictingDomains));
  evidence.push(ev("version_domains_checked", domainVersionMap.size));

  if (conflictingDomains.length === 0) { passed++; }
  else {
    failed++;
    blockers.push(`VERSION_GATE FAIL: v1/v2 coexistence in: ${conflictingDomains.join(", ")} — single version per domain required`);
    remediations.push(rem("Retire old version engines per domain — keep only canonical version", "sentinel/registry/engine-registry", "critical"));
  }

  const busEvents = platformBus.getRegisteredEvents();
  const versionedEvents = busEvents.filter(e =>
    /[:._]v[12][:._]/.test(e) || e.endsWith(":v1") || e.endsWith(":v2") || e.endsWith(".v1") || e.endsWith(".v2"),
  );
  evidence.push(ev("bus_versioned_event_names", versionedEvents));
  if (versionedEvents.length === 0) { passed++; }
  else {
    failed++;
    blockers.push(`VERSION_GATE FAIL: Versioned event names on bus: ${versionedEvents.join(", ")} — canonical schema required`);
    remediations.push(rem("Replace all versioned bus event names with canonical schema", "platform-bus", "critical"));
  }

  const domainHealth = getAllDomainHealth();
  const AUTH_ORBIT_DOMAINS = ["auth", "orbit", "messaging", "session"];
  const criticalDomainsDegraded = domainHealth
    .filter(d => AUTH_ORBIT_DOMAINS.some(ad => String(d.domain).toLowerCase().includes(ad)) && d.status === "degraded")
    .map(d => d.domain);
  evidence.push(ev("auth_orbit_domains_degraded", criticalDomainsDegraded as string[]));
  evidence.push(ev("all_domains_checked", domainHealth.length));

  if (criticalDomainsDegraded.length === 0) { passed++; }
  else {
    failed++;
    blockers.push(`VERSION_GATE: Critical domains degraded (auth/orbit stores may be serving stale version): ${criticalDomainsDegraded.join(", ")}`);
    remediations.push(rem(`Restore degraded auth/orbit domains — version consistency cannot be guaranteed while degraded`, "control-plane/domain-health", "critical"));
  }

  const allDomainsDegraded = domainHealth.filter(d => d.status === "degraded").map(d => d.domain as string);
  evidence.push(ev("all_domains_degraded", allDomainsDegraded));
  if (allDomainsDegraded.length > 0) {
    warnings++;
    remediations.push(rem(`${allDomainsDegraded.length} degraded domain(s): ${allDomainsDegraded.join(", ")}`, "control-plane/domain-health", "high"));
  } else { passed++; }

  const healthReport = engineHealthMonitor.getReport();
  evidence.push(ev("version_gate_crashed_engines", healthReport.crashed ?? 0));
  if ((healthReport.crashed ?? 0) === 0) { passed++; }
  else {
    warnings++;
    remediations.push(rem(`${healthReport.crashed} crashed engines — version consistency cannot be verified while engines are crashing`, "engine-health-monitor", "high"));
  }

  return makeResult("phase2_version_lock", passed, failed, warnings, blockers, evidence, remediations);
}

async function verifyPhase3TaxonomyLock(): Promise<WiringPhaseResult> {
  let passed = 0, failed = 0, warnings = 0;
  const blockers: string[] = [], evidence: WiringEvidence[] = [], remediations: WiringRemediationAction[] = [];

  let taxGuardExecuted = false;
  let taxResult: { total: number; clean: number; violations: number; critical: number } =
    { total: 0, clean: 0, violations: 0, critical: 0 };
  try {
    taxResult = runTaxonomyGuard();
    taxGuardExecuted = true;
  } catch (e) {
    failed++;
    blockers.push(`runTaxonomyGuard() threw an exception — taxonomy lock cannot be verified: ${e instanceof Error ? e.message : String(e)}`);
    remediations.push(rem("Fix taxonomy guard startup — must not throw during Phase 3 gate check", "taxonomy-guard", "critical"));
  }

  evidence.push(ev("taxonomy_guard_executed", taxGuardExecuted));
  evidence.push(ev("taxonomy_guard_total", taxResult.total));
  evidence.push(ev("taxonomy_guard_clean", taxResult.clean));
  evidence.push(ev("taxonomy_guard_violations", taxResult.violations));
  evidence.push(ev("taxonomy_guard_critical", taxResult.critical));

  if (taxGuardExecuted) {
    if (taxResult.critical === 0) { passed++; }
    else {
      failed++;
      blockers.push(`Taxonomy guard execution: ${taxResult.critical} CRITICAL violation(s) — taxonomy enforcement broken`);
      remediations.push(rem("Fix critical taxonomy violations — all entities must use canonical verticals from RADAR_CATEGORIES", "taxonomy-guard", "critical"));
    }

    if (taxResult.violations === 0) { passed++; }
    else {
      warnings++;
      remediations.push(rem(`${taxResult.violations} taxonomy violations in guard execution — audit entity type/vertical mappings`, "taxonomy-guard", "high"));
    }
  }

  const storedViolations = getTaxonomyViolations();
  evidence.push(ev("taxonomy_stored_violations", storedViolations.length));
  const critStored = storedViolations.filter(v => v.severity === "critical").length;
  if (critStored === 0 && storedViolations.length === 0) { passed++; }
  else if (critStored > 0) {
    failed++;
    blockers.push(`${critStored} stored CRITICAL taxonomy violations not cleared — system state is dirty`);
    remediations.push(rem("Resolve critical taxonomy violations before proceeding — call clearTaxonomyViolations() after fixing root causes", "taxonomy-guard", "critical"));
  } else {
    warnings++;
    remediations.push(rem(`${storedViolations.length} stored taxonomy violations need review`, "taxonomy-guard", "medium"));
  }

  let entryGuardExecuted = false;
  let entryGuardResult: { status: string; guardCount: number; totalCalls: number; totalRejections: number } =
    { status: "error", guardCount: 0, totalCalls: 0, totalRejections: 0 };
  try {
    entryGuardResult = runEntryGuards();
    entryGuardExecuted = true;
  } catch (e) {
    failed++;
    blockers.push(`runEntryGuards() threw an exception — entry guard enforcement cannot be verified: ${e instanceof Error ? e.message : String(e)}`);
    remediations.push(rem("Fix entry guard startup — must not throw during Phase 3 gate check", "entry-guards.ts", "critical"));
  }

  evidence.push(ev("entry_guards_executed", entryGuardExecuted));
  evidence.push(ev("entry_guards_count", entryGuardResult.guardCount));
  evidence.push(ev("entry_guards_total_calls", entryGuardResult.totalCalls));
  evidence.push(ev("entry_guards_total_rejections", entryGuardResult.totalRejections));

  if (entryGuardExecuted) {
    if (entryGuardResult.guardCount > 0) { passed++; }
    else {
      failed++;
      blockers.push("Entry guards NOT active — no enforcement on create/update/publish/pay flows");
      remediations.push(rem("Wire entry-guards.ts at app boot — guardProviderCreate/guardListingPublish/guardPaymentCreate must be active", "entry-guards.ts", "critical"));
    }
  }

  const guardMetrics = getGuardMetrics();
  const guardCallCount = guardMetrics.totalGuardCalls;
  const rejectionRate = guardCallCount > 0 ? guardMetrics.totalRejections / guardCallCount : 0;
  evidence.push(ev("entry_guard_total_guard_calls", guardCallCount));
  evidence.push(ev("entry_guard_rejection_rate_pct", Math.round(rejectionRate * 100)));
  if (rejectionRate > 0.5) {
    warnings++;
    remediations.push(rem(`${Math.round(rejectionRate * 100)}% entry guard rejection rate — validate input shapes at call sites`, "entry-guards.ts", "medium"));
  } else { passed++; }

  const allTaxonomy = sentinelTaxonomyRegistry.getAll();
  const conflictingAliases = sentinelTaxonomyRegistry.detectConflictingAliases();
  const orphanTaxonomy = sentinelTaxonomyRegistry.detectOrphans();
  evidence.push(ev("taxonomy_registry_total", allTaxonomy.length));
  evidence.push(ev("taxonomy_alias_conflicts", conflictingAliases.length));
  evidence.push(ev("taxonomy_orphans", orphanTaxonomy.length));

  if (conflictingAliases.length === 0) { passed++; }
  else {
    failed++;
    blockers.push(`${conflictingAliases.length} conflicting taxonomy alias(es) — same text maps to different canonical paths`);
    remediations.push(rem(`Resolve conflicting aliases: ${conflictingAliases.slice(0, 3).map(c => c.alias_text).join(", ")}`, "sentinel/registry/taxonomy-registry", "critical"));
  }

  if (orphanTaxonomy.length === 0) { passed++; }
  else {
    warnings++;
    remediations.push(rem(`${orphanTaxonomy.length} orphaned taxonomy entries — fix missing parent paths`, "sentinel/registry/taxonomy-registry", "medium"));
  }

  return makeResult("phase3_taxonomy_lock", passed, failed, warnings, blockers, evidence, remediations);
}

function verifyPhase4Contracts(): WiringPhaseResult {
  let passed = 0, failed = 0, warnings = 0;
  const blockers: string[] = [], evidence: WiringEvidence[] = [], remediations: WiringRemediationAction[] = [];

  const orchestratorStats = engineOrchestrator.getAllStats();
  evidence.push(ev("phase4_engines_to_verify", orchestratorStats.length));

  const noContract: string[] = [];
  const contractErrors: string[] = [];
  const contractWarnings: string[] = [];

  for (const engine of orchestratorStats) {
    const contract = getEngineContract(engine.id);
    if (!contract) {
      noContract.push(engine.id);
      continue;
    }
    const validation = validateEngineContract(contract);
    if (!validation.valid) {
      for (const err of validation.errors) {
        contractErrors.push(`${engine.id}: ${err}`);
      }
    }
    for (const warn of validation.warnings) {
      contractWarnings.push(`${engine.id}: ${warn}`);
    }
    if (validation.blockedReason) {
      contractErrors.push(`${engine.id}: BLOCKED — ${validation.blockedReason}`);
    }
  }

  evidence.push(ev("contract_missing_ids", noContract));
  evidence.push(ev("contract_errors", contractErrors.slice(0, 20)));
  evidence.push(ev("contract_warnings_count", contractWarnings.length));

  if (orchestratorStats.length > 0) {
    const covPct = Math.round(((orchestratorStats.length - noContract.length) / orchestratorStats.length) * 100);
    evidence.push(ev("contract_coverage_pct", covPct));
    if (noContract.length === 0) { passed++; }
    else {
      failed++;
      blockers.push(`${noContract.length}/${orchestratorStats.length} engines have no EngineContract (${covPct}% coverage) — allowedInputs/allowedOutputs/forbiddenActions/dependencies cannot be verified`);
      remediations.push(rem(`Add EngineContract entries for: ${noContract.slice(0, 5).join(", ")}`, "core/command-center/engine-contracts-registry.ts", "critical"));
    }
  } else {
    warnings++;
    remediations.push(rem("No orchestrator engines found — register engines before Phase 4 can run", "engine-registry.ts", "high"));
  }

  if (contractErrors.length === 0) { passed++; }
  else {
    failed++;
    blockers.push(`${contractErrors.length} contract validation error(s): ${contractErrors.slice(0, 3).join("; ")}`);
    remediations.push(rem(`Fix contract field errors (allowedInputs/allowedOutputs/forbiddenActions/dependencies/retryPolicy/rollbackPolicy/quarantinePolicy)`, "core/command-center/engine-contracts-registry.ts", "critical"));
  }

  if (contractWarnings.length === 0) { passed++; }
  else {
    warnings++;
    remediations.push(rem(`${contractWarnings.length} contract warning(s) — review optional fields`, "core/command-center/engine-contracts-registry.ts", "medium"));
  }

  const criticalEngines = ENGINE_MASTER_REGISTRY.filter(e => e.criticality === "critical").map(e => e.id);
  const criticalWithNoContract = criticalEngines.filter(id => !getEngineContract(id));
  evidence.push(ev("critical_engines_no_contract", criticalWithNoContract));
  if (criticalWithNoContract.length === 0) { passed++; }
  else {
    failed++;
    blockers.push(`${criticalWithNoContract.length} CRITICAL ENGINE(S) have no contract: ${criticalWithNoContract.join(", ")} — hardening cannot proceed`);
    remediations.push(rem(`Immediately add EngineContract for critical engines: ${criticalWithNoContract.join(", ")}`, "core/command-center/engine-contracts-registry.ts", "critical"));
  }

  return makeResult("phase4_contracts", passed, failed, warnings, blockers, evidence, remediations);
}

function verifyPhase5Orchestrator(): WiringPhaseResult {
  let passed = 0, failed = 0, warnings = 0;
  const blockers: string[] = [], evidence: WiringEvidence[] = [], remediations: WiringRemediationAction[] = [];

  const report = engineOrchestrator.getReport();
  const orchestratorBooted = report.orchestrator?.booted ?? false;
  evidence.push(ev("orchestrator_booted", orchestratorBooted));

  if (!orchestratorBooted) {
    failed++;
    blockers.push("EngineOrchestrator NOT booted — lifecycle control path REGISTERED→RUNNING cannot be verified");
    remediations.push(rem("Call engineOrchestrator.startAll() during bootEngineSystem()", "engine-orchestrator", "critical"));
  } else { passed++; }

  const totalEngines = report.orchestrator?.totalEngines ?? 0;
  const runningEngines = report.orchestrator?.runningEngines ?? 0;
  evidence.push(ev("orchestrator_total_engines", totalEngines));
  evidence.push(ev("orchestrator_running_engines", runningEngines));

  if (totalEngines === 0) {
    failed++;
    blockers.push("Orchestrator has no engines — lifecycle control path is empty");
    remediations.push(rem("Register all engines before startAll()", "engine-registry.ts", "critical"));
  } else {
    const runRate = runningEngines / totalEngines;
    if (runRate < 0.8) {
      failed++;
      blockers.push(`${Math.round(runRate * 100)}% engines in RUNNING state — ≥80% required for lifecycle gate to pass`);
      remediations.push(rem(`Restart ${totalEngines - runningEngines} engines stuck in DEGRADED/QUARANTINED/BLOCKED states`, "engine-orchestrator", "critical"));
    } else { passed++; }
  }

  const healthStatuses = engineHealthMonitor.getReport();
  const allStatuses = (healthStatuses.engines ?? []) as Array<{ status: string; engineId?: string }>;

  const safetyReport = getRepairSafetyReport();

  const lifecycleViolations: string[] = [];
  const lifecycleStageCount: Record<string, number> = {
    REGISTERED: 0, VERIFIED: 0, READY: 0, RUNNING: 0, DEGRADED: 0, QUARANTINED: 0, BLOCKED: 0,
  };

  const quarantineSet = new Set(safetyReport.activeQuarantines.map(q => q.id));
  const quarantinedDomains = new Set(safetyReport.activeQuarantines.map(q => `domain:${q.id}`));

  for (const e of allStatuses) {
    const stage = LIFECYCLE_STAGE_MAP[e.status] ?? "BLOCKED";
    lifecycleStageCount[stage] = (lifecycleStageCount[stage] ?? 0) + 1;
    const engineId = e.engineId ?? "";

    const isQuarantinedInSafety = quarantineSet.has(engineId) || quarantinedDomains.has(engineId);
    if (isQuarantinedInSafety && e.status === "running") {
      lifecycleViolations.push(`${engineId}: engine is RUNNING but safety system has it quarantined — bypass of QUARANTINED→BLOCKED path`);
    }
    const allowedNextStages = VALID_LIFECYCLE_TRANSITIONS[stage] ?? [];
    if (e.status === "crashed" && isQuarantinedInSafety) {
      if (!allowedNextStages.includes("BLOCKED")) {
        lifecycleViolations.push(`${engineId}: QUARANTINED engine has no path to BLOCKED — lifecycle is stuck`);
      }
    }
    if (e.status === "running" && isQuarantinedInSafety) {
      lifecycleViolations.push(`${engineId}: should not be RUNNING while quarantine is active — lifecycle gate bypass detected`);
    }
  }

  evidence.push(ev("lifecycle_stage_distribution", Object.entries(lifecycleStageCount).map(([k, v]) => `${k}:${v}`)));
  evidence.push(ev("lifecycle_RUNNING_count", lifecycleStageCount["RUNNING"] ?? 0));
  evidence.push(ev("lifecycle_DEGRADED_count", lifecycleStageCount["DEGRADED"] ?? 0));
  evidence.push(ev("lifecycle_QUARANTINED_count", lifecycleStageCount["QUARANTINED"] ?? 0));
  evidence.push(ev("lifecycle_violations", lifecycleViolations));

  if (lifecycleViolations.length === 0) { passed++; }
  else {
    failed++;
    blockers.push(`${lifecycleViolations.length} lifecycle transition violation(s) — engines bypassing required state machine`);
    remediations.push(rem(`Fix lifecycle violations: ${lifecycleViolations.slice(0, 3).join("; ")}`, "engine-orchestrator", "critical"));
  }

  const quarantinedCount = lifecycleStageCount["QUARANTINED"] ?? 0;
  if (quarantinedCount === 0) { passed++; }
  else {
    warnings++;
    remediations.push(rem(`${quarantinedCount} engines in QUARANTINED state — investigate crashes and restore RUNNING state`, "engine-health-monitor", "high"));
  }

  const circularLoops = safetyReport.activeChains.filter(c => c.isLoop);
  evidence.push(ev("circular_repair_loops", circularLoops.map(c => c.chainId)));
  if (circularLoops.length === 0) { passed++; }
  else {
    failed++;
    blockers.push(`${circularLoops.length} circular repair loop(s) — RUNNING→DEGRADED→RUNNING cycle is stuck in a loop`);
    remediations.push(rem(`Break circular loops: ${circularLoops.map(c => c.chainId).join(", ")}`, "repair-safety", "critical"));
  }

  if (!isRepairStormActive()) { passed++; }
  else {
    failed++;
    blockers.push("Repair storm ACTIVE — orchestrator lifecycle transitions are unsafe");
    remediations.push(rem("Resolve repair storm", "engine-orchestrator", "critical"));
  }

  return makeResult("phase5_orchestrator", passed, failed, warnings, blockers, evidence, remediations);
}

function verifyPhase6RepairPipeline(): WiringPhaseResult {
  let passed = 0, failed = 0, warnings = 0;
  const blockers: string[] = [], evidence: WiringEvidence[] = [], remediations: WiringRemediationAction[] = [];

  const pipelineReport = getPipelineReport();
  const pipelineEnabled = isPipelineEnabled();
  evidence.push(ev("pipeline_enabled", pipelineEnabled));

  if (!pipelineEnabled) {
    failed++;
    blockers.push("Repair pipeline DISABLED — all repairs blocked at gate");
    remediations.push(rem("Call enablePipeline() during bootEngineSystem()", "repair-pipeline.ts", "critical", true));
  } else { passed++; }

  const REQUIRED_STAGES = ["detect", "classify", "localize", "repair", "validate", "regress", "accept_or_rollback"];
  const presentStages = (pipelineReport.stages ?? []) as string[];
  const missingActualStages = REQUIRED_STAGES.filter(s => !presentStages.includes(s));
  evidence.push(ev("pipeline_stages_present", presentStages));
  evidence.push(ev("pipeline_missing_stages", missingActualStages));

  if (missingActualStages.length === 0) { passed++; }
  else {
    failed++;
    blockers.push(`Pipeline missing ${missingActualStages.length} required stage(s): ${missingActualStages.join(", ")}`);
    remediations.push(rem(`Add missing stages to PIPELINE_STAGES: ${missingActualStages.join(", ")}`, "repair-pipeline.ts", "critical"));
  }

  const SPEC_STAGE_MAP: Record<string, string[]> = {
    detect: ["detect"], classify: ["classify"], localize: ["localize"],
    repair: ["propose", "simulate", "apply"],
    validate: ["validate"], regress: ["verify"],
    accept_or_rollback: ["rollback", "proof"],
  };
  const coveredSpecStages = presentStages.flatMap(s => SPEC_STAGE_MAP[s] ?? []);
  const specStages = ["detect", "classify", "localize", "propose", "simulate", "validate", "apply", "verify", "rollback", "proof"];
  const uncoveredSpecStages = specStages.filter(s => !coveredSpecStages.includes(s));
  evidence.push(ev("spec_10_uncovered_stages", uncoveredSpecStages));

  if (uncoveredSpecStages.length === 0) { passed++; }
  else {
    failed++;
    blockers.push(`10-stage repair spec NOT fully covered — missing: ${uncoveredSpecStages.join(", ")} — all spec stages are required (propose/simulate/apply not in pipeline)`);
    remediations.push(rem(`Expand pipeline to cover all 10 spec stages: ${uncoveredSpecStages.join(", ")}`, "repair-pipeline.ts", "critical"));
  }

  const safetyReport = getRepairSafetyReport();
  evidence.push(ev("repairs_in_window", safetyReport.repairsInWindow));
  evidence.push(ev("storm_threshold", safetyReport.stormThreshold));

  if (safetyReport.repairsInWindow > safetyReport.stormThreshold) {
    failed++;
    blockers.push(`Storm threshold exceeded: ${safetyReport.repairsInWindow}/${safetyReport.stormThreshold}`);
    remediations.push(rem("Halt pipeline — investigate engine repair loops immediately", "repair-safety", "critical"));
  } else if (safetyReport.repairsInWindow > safetyReport.stormThreshold * 0.8) {
    warnings++;
    remediations.push(rem("Repair rate approaching storm threshold", "repair-safety", "high"));
  } else { passed++; }

  const proofStats = getProofStats();
  const total = proofStats.total;
  const rejectedCount = proofStats.outcomes.rejected ?? 0;
  evidence.push(ev("pipeline_total_runs", total));
  evidence.push(ev("pipeline_rejected_runs", rejectedCount));
  const fakeRate = total > 0 ? rejectedCount / total : 0;
  evidence.push(ev("fake_auto_remediated_rate_pct", Math.round(fakeRate * 100)));
  if (fakeRate > 0.5) {
    failed++;
    blockers.push(`${Math.round(fakeRate * 100)}% pipeline runs rejected — fake auto-remediated flags detected`);
    remediations.push(rem("Audit engines emitting auto-remediated signals without valid proof chain", "repair-pipeline.ts", "critical"));
  } else { passed++; }

  return makeResult("phase6_repair_pipeline", passed, failed, warnings, blockers, evidence, remediations);
}

function verifyPhase7ProofSystem(): WiringPhaseResult {
  let passed = 0, failed = 0, warnings = 0;
  const blockers: string[] = [], evidence: WiringEvidence[] = [], remediations: WiringRemediationAction[] = [];

  const proofStats = getProofStats();
  const recentProofs = getRecentProofs(20);

  evidence.push(ev("proof_total", proofStats.total));
  evidence.push(ev("proof_accepted", proofStats.outcomes.accepted));
  evidence.push(ev("proof_rolled_back", proofStats.outcomes.rolled_back));
  evidence.push(ev("proof_rejected", proofStats.outcomes.rejected));
  evidence.push(ev("proof_failed_validation", proofStats.outcomes.failed_validation));
  evidence.push(ev("proof_failed_regression", proofStats.outcomes.failed_regression));
  evidence.push(ev("proof_rollback_rate_pct", Math.round(proofStats.rollbackRate * 100)));
  evidence.push(ev("proof_avg_duration_ms", proofStats.averageDurationMs));

  if (proofStats.total === 0) {
    warnings++;
    remediations.push(rem("No proofs generated — trigger a detection cycle to produce proof records", "proof-system", "medium"));
  } else { passed++; }

  if (recentProofs.length > 0) {
    const withRootCause = recentProofs.filter(p => p.rootCause !== null).length;
    const withConfidence = recentProofs.filter(p => p.confidence !== null && p.confidence > 0).length;
    const withMutation = recentProofs.filter(p => p.mutation !== null).length;

    evidence.push(ev("recent_proofs_total", recentProofs.length));
    evidence.push(ev("recent_proofs_with_root_cause", withRootCause));
    evidence.push(ev("recent_proofs_with_confidence", withConfidence));
    evidence.push(ev("recent_proofs_with_mutation", withMutation));

    const rootCauseCov = withRootCause / recentProofs.length;
    if (rootCauseCov < 0.7) {
      failed++;
      blockers.push(`Only ${Math.round(rootCauseCov * 100)}% of proofs have root cause — every fix MUST have before/after/root-cause/confidence`);
      remediations.push(rem("Populate rootCause in classify+localize stages for every proof record", "repair-pipeline.ts", "critical"));
    } else { passed++; }

    const confCov = withConfidence / recentProofs.length;
    if (confCov < 0.7) {
      failed++;
      blockers.push(`${Math.round((1 - confCov) * 100)}% of proofs have no confidence score`);
      remediations.push(rem("Call evaluateConfidence() in every pipeline run", "repair-hardening", "critical"));
    } else { passed++; }
  }

  if (proofStats.rollbackRate > 0.3) {
    failed++;
    blockers.push(`Rollback rate ${(proofStats.rollbackRate * 100).toFixed(1)}% exceeds ≤30% threshold`);
    remediations.push(rem("Audit recurring repair failures causing high rollback rate", "proof-system", "critical"));
  } else { passed++; }

  const invalidRate = proofStats.total > 0
    ? (proofStats.outcomes.failed_validation + proofStats.outcomes.failed_regression) / proofStats.total : 0;
  evidence.push(ev("proof_invalid_rate_pct", Math.round(invalidRate * 100)));
  if (invalidRate > 0.4) {
    failed++;
    blockers.push(`${Math.round(invalidRate * 100)}% proofs failed validation/regression`);
    remediations.push(rem("Fix proof validation/regression failures in pipeline stages", "repair-pipeline.ts", "critical"));
  } else { passed++; }

  return makeResult("phase7_proof_system", passed, failed, warnings, blockers, evidence, remediations);
}

function verifyPhase8Observability(): WiringPhaseResult {
  let passed = 0, failed = 0, warnings = 0;
  const blockers: string[] = [], evidence: WiringEvidence[] = [], remediations: WiringRemediationAction[] = [];

  const runtimeStats = engineOrchestrator.getEngineRuntimeStats();
  evidence.push(ev("runtime_total_engines", runtimeStats.totalEngines));
  evidence.push(ev("runtime_running_engines", runtimeStats.runningEngines));

  if (runtimeStats.totalEngines === 0) {
    failed++;
    blockers.push("Control Room has no engines — observability completely blind");
    remediations.push(rem("Boot engine system before observability checks", "engine-registry.ts", "critical"));
  } else { passed++; }

  const zeroTickRunning = runtimeStats.engines.filter(e => e.tickCount === 0 && e.running).map(e => e.id);
  evidence.push(ev("running_zero_tick_engines", zeroTickRunning));
  if (zeroTickRunning.length === 0) { passed++; }
  else {
    warnings++;
    remediations.push(rem(`${zeroTickRunning.length} running engines with zero ticks — check for startup blocks`, "engine-orchestrator", "high"));
  }

  const observerReport = engineObserver.getReport();
  const observedCount = (observerReport.engines as Array<unknown> | undefined)?.length ?? 0;
  evidence.push(ev("observer_tracked_engines", observedCount));
  if (observedCount > 0) { passed++; }
  else {
    failed++;
    blockers.push("Engine observer has no tracked engines — all engine activity is invisible");
    remediations.push(rem("Verify engineObserver.recordTick() is called from BaseEngine.executeTick()", "engine-observer", "critical"));
  }

  const healthReport = engineHealthMonitor.getReport();
  evidence.push(ev("health_monitor_total", healthReport.totalEngines ?? 0));
  evidence.push(ev("health_monitor_crashed", healthReport.crashed ?? 0));
  if ((healthReport.totalEngines ?? 0) > 0) { passed++; }
  else {
    warnings++;
    remediations.push(rem("Wire engineHealthMonitor to all engines at boot", "engine-health-monitor", "high"));
  }

  const safetyReport = getRepairSafetyReport();
  evidence.push(ev("activation_sheets_registered", safetyReport.activationSheets));
  if (safetyReport.activationSheets.length > 0) { passed++; }
  else {
    warnings++;
    remediations.push(rem("No domain activation sheets — repair is unguided per domain", "repair-safety", "high"));
  }

  const proofStats = getProofStats();
  evidence.push(ev("proof_domain_coverage", Object.keys(proofStats.byDomain).length));
  if (Object.keys(proofStats.byDomain).length > 0) { passed++; }
  else {
    warnings++;
    remediations.push(rem("No domains covered in proof system — trigger repair cycles", "proof-system", "medium"));
  }

  return makeResult("phase8_observability", passed, failed, warnings, blockers, evidence, remediations);
}

async function verifyPhase9E2EFlows(): Promise<WiringPhaseResult> {
  let passed = 0, failed = 0, warnings = 0;
  const blockers: string[] = [], evidence: WiringEvidence[] = [], remediations: WiringRemediationAction[] = [];

  const pipelineEnabled = isPipelineEnabled();
  const orchestratorBooted = engineOrchestrator.isBooted;
  evidence.push(ev("pipeline_enabled_for_probes", pipelineEnabled));
  evidence.push(ev("orchestrator_booted_for_probes", orchestratorBooted));

  if (!orchestratorBooted || !pipelineEnabled) {
    failed++;
    blockers.push(!orchestratorBooted ? "Orchestrator not booted — E2E probes cannot run" : "Pipeline disabled — E2E probes cannot run");
    remediations.push(rem("Boot orchestrator and enable pipeline", "engine-orchestrator", "critical"));
    return makeResult("phase9_e2e_flows", passed, failed, warnings, blockers, evidence, remediations);
  }

  const PROBES: Array<{ name: string; domain: string; engineId: string; category: "auth" | "state" | "data" | "network" }> = [
    { name: "auth_session",        domain: "self-healing",  engineId: "sh-auto-fix",          category: "auth" },
    { name: "flow_integrity",      domain: "governance",    engineId: "flow-integrity",        category: "state" },
    { name: "listing_publish",     domain: "visibility",    engineId: "publish-gate-food",     category: "data" },
    { name: "infra_connectivity",  domain: "infrastructure",engineId: "backend-reconnect",     category: "network" },
    { name: "taxonomy_check",      domain: "taxonomy",      engineId: "adaptive-taxonomy",     category: "data" },
    { name: "governance_audit",    domain: "governance",    engineId: "governance-audit",      category: "state" },
  ];

  const probeResults: string[] = [];
  let probesPassed = 0, probesFailed = 0;
  const proofsBefore = getProofStats().total;

  for (const probe of PROBES) {
    try {
      const result = await executePipeline({
        engineId: probe.engineId,
        domain: probe.domain,
        issueSignature: `wiring_probe_${probe.name}_${Date.now()}`,
        repairChainId: `probe_chain_${probe.name}`,
        category: probe.category,
        severity: "low",
        rawSignal: `WiringVerifier Phase 9 E2E probe: ${probe.name}`,
        suggestedOperation: "refresh",
        suggestedTarget: `${probe.domain}:probe`,
        repairLevel: "L1",
        detectorCertainty: 0.5,
        corroboratingSignals: 1,
      });
      const ok = result.outcome === "accepted";
      probeResults.push(`${probe.name}:${result.outcome}${result.proofId ? `:proof=${result.proofId.slice(-6)}` : ":no-proof"}`);
      if (ok) probesPassed++;
      else probesFailed++;
    } catch (e) {
      probeResults.push(`${probe.name}:error(${e instanceof Error ? e.message.slice(0, 40) : "unknown"})`);
      probesFailed++;
    }
  }

  const proofsAfter = getProofStats().total;
  const proofsEmitted = proofsAfter - proofsBefore;

  evidence.push(ev("e2e_probes_total", PROBES.length));
  evidence.push(ev("e2e_probes_passed", probesPassed));
  evidence.push(ev("e2e_probes_failed", probesFailed));
  evidence.push(ev("e2e_probe_outcomes", probeResults));
  evidence.push(ev("e2e_proof_records_emitted", proofsEmitted));

  if (probesFailed === 0) {
    passed++;
  } else if (probesFailed <= 1) {
    warnings++;
    remediations.push(rem(`${probesFailed} E2E probe(s) not accepted — check activation sheets for those domains`, "repair-pipeline.ts", "high"));
  } else {
    failed++;
    blockers.push(`${probesFailed}/${PROBES.length} E2E flow probes did not produce "accepted" outcome through orchestrator→pipeline→proof chain`);
    remediations.push(rem("Check domain activation sheets and engine-domain wiring for failing probe domains", "engine-registry.ts", "critical"));
  }

  if (proofsEmitted > 0) {
    passed++;
  } else {
    warnings++;
    remediations.push(rem("No proof records emitted during E2E probes — proof-system chain may be broken", "proof-system", "high"));
  }

  const METADATA_FLOWS = [
    { name: "session_restore", domain: "auth",         busEvents: ["auth:session_restored"] },
    { name: "open_chat",       domain: "orbit",        busEvents: ["orbit:thread_created"] },
    { name: "send_message",    domain: "orbit",        busEvents: ["orbit:message_received"] },
    { name: "media_send",      domain: "media",        busEvents: ["media:upload_complete"] },
    { name: "call_audio",      domain: "orbit",        busEvents: ["orbit:call_started"] },
    { name: "call_video",      domain: "orbit",        busEvents: ["orbit:call_started", "orbit:call_ended"] },
    { name: "wallet_payment",  domain: "wallet",       busEvents: ["wallet:payment_completed"] },
    { name: "onboarding_shop", domain: "listing",      busEvents: ["marketplace:listing_published"] },
    { name: "notifications",   domain: "notification", busEvents: ["notification:push_sent"] },
  ];

  const registeredBusEvents = new Set(platformBus.getRegisteredEvents());
  const orchestratorStats = engineOrchestrator.getAllStats();
  const domainEngineMap = new Map<string, number>();
  for (const e of orchestratorStats) {
    domainEngineMap.set(e.domain, (domainEngineMap.get(e.domain) ?? 0) + 1);
  }

  const coveredFlows: string[] = [], missingFlows: string[] = [];
  for (const flow of METADATA_FLOWS) {
    const hasDomainEngines = (domainEngineMap.get(flow.domain) ?? 0) > 0;
    const busEventsCovered = flow.busEvents.some(e => registeredBusEvents.has(e));
    if (hasDomainEngines && busEventsCovered) coveredFlows.push(flow.name);
    else missingFlows.push(flow.name);
  }

  evidence.push(ev("metadata_flows_covered", coveredFlows));
  evidence.push(ev("metadata_flows_missing", missingFlows));

  if (missingFlows.length === 0) { passed++; }
  else if (missingFlows.length <= 2) {
    warnings++;
    remediations.push(rem(`Wire engine+bus coverage for: ${missingFlows.join(", ")}`, "engine-registry.ts", "high"));
  } else {
    failed++;
    blockers.push(`${missingFlows.length} core E2E flows lack engine+bus coverage: ${missingFlows.join(", ")}`);
    remediations.push(rem(`Wire engines+bus events for domains: ${[...new Set(METADATA_FLOWS.filter(f => missingFlows.includes(f.name)).map(f => f.domain))].join(", ")}`, "engine-registry.ts", "critical"));
  }

  return makeResult("phase9_e2e_flows", passed, failed, warnings, blockers, evidence, remediations);
}

function verifyPhase10Learning(): WiringPhaseResult {
  let passed = 0, failed = 0, warnings = 0;
  const blockers: string[] = [], evidence: WiringEvidence[] = [], remediations: WiringRemediationAction[] = [];

  const learningReport = getLearningReport();
  const memoryStats = engineMemory.getStats();
  const proofStats = getProofStats();

  evidence.push(ev("learning_run_count", learningReport.runCount));
  evidence.push(ev("learning_total_fixes", learningReport.totalFixes));
  evidence.push(ev("learning_high_performers", learningReport.highPerformers));
  evidence.push(ev("learning_low_performers", learningReport.lowPerformers));
  evidence.push(ev("learning_disabled_fixes", learningReport.disabledFixes));
  evidence.push(ev("memory_total_fixes", memoryStats.totalFixes ?? 0));
  evidence.push(ev("memory_domain_count", Object.keys(memoryStats.byDomain ?? {}).length));

  const stormActive = isRepairStormActive();
  evidence.push(ev("learning_blocked_by_storm", stormActive));
  if (!stormActive) { passed++; }
  else {
    failed++;
    blockers.push("Learning running during repair storm — storm sources are dirty and must not contaminate learning memory");
    remediations.push(rem("Gate startLearningCycle() behind isRepairStormActive() check", "engine-learning", "critical"));
  }

  const rejectedByConf = proofStats.rejectedByConfidence ?? 0;
  evidence.push(ev("proofs_rejected_by_confidence", rejectedByConf));
  if (learningReport.runCount > 0) {
    if (rejectedByConf > 0) { passed++; }
    else {
      warnings++;
      remediations.push(rem("Learning never rejects by confidence — enforce confidence thresholds", "engine-learning", "medium"));
    }
  } else { passed++; }

  if (learningReport.totalFixes > 5 && learningReport.lowPerformers > learningReport.highPerformers) {
    failed++;
    blockers.push(`Dirty learning: ${learningReport.lowPerformers} low-performers > ${learningReport.highPerformers} high-performers — memory contamination detected`);
    remediations.push(rem("Run learning consolidation to purge low-performing fixes before they corrupt memory", "engine-learning", "critical"));
  } else { passed++; }

  const disabledRatio = learningReport.totalFixes > 5 ? learningReport.disabledFixes / learningReport.totalFixes : 0;
  evidence.push(ev("learning_disabled_ratio_pct", Math.round(disabledRatio * 100)));
  if (disabledRatio > 0.7) {
    warnings++;
    remediations.push(rem("Over 70% of learning fixes disabled — audit memory hygiene", "engine-learning", "medium"));
  } else { passed++; }

  const blockedProofs = proofStats.outcomes.blocked ?? 0;
  evidence.push(ev("proofs_blocked", blockedProofs));
  if (proofStats.total > 0 && blockedProofs > proofStats.total * 0.3) {
    warnings++;
    remediations.push(rem(`${blockedProofs} repairs blocked — TASK→EXECUTION→EVIDENCE chain may be broken`, "repair-pipeline.ts", "high"));
  } else { passed++; }

  const recentProofs = getRecentProofs(10);
  const chainCompleteProofs = recentProofs.filter(p =>
    p.rootCause !== null &&
    p.confidence !== null &&
    p.mutation !== null &&
    p.outcome !== null
  ).length;
  const chainCompletePct = recentProofs.length > 0 ? chainCompleteProofs / recentProofs.length : 1;
  evidence.push(ev("learning_chain_complete_proofs", chainCompleteProofs));
  evidence.push(ev("learning_chain_complete_pct", Math.round(chainCompletePct * 100)));
  evidence.push(ev("learning_chain_total_recent", recentProofs.length));

  if (chainCompletePct >= 0.7 || recentProofs.length === 0) { passed++; }
  else {
    failed++;
    blockers.push(`TASK→EXECUTION→EVIDENCE chain incomplete: only ${Math.round(chainCompletePct * 100)}% of recent proofs have rootCause+confidence+mutation+outcome — learning memory is ingesting incomplete evidence`);
    remediations.push(rem("Fix pipeline classify/localize/validate stages to populate rootCause, confidence, and mutation in every proof record", "repair-pipeline.ts", "critical"));
  }

  const memoryDomains = Object.keys(memoryStats.byDomain ?? {});
  const proofDomains = Object.keys(proofStats.byDomain);
  const memoryOrphanDomains = memoryDomains.filter(d => !proofDomains.includes(d));
  evidence.push(ev("learning_memory_domains", memoryDomains));
  evidence.push(ev("learning_memory_orphan_domains", memoryOrphanDomains));
  if (memoryOrphanDomains.length === 0) { passed++; }
  else {
    warnings++;
    remediations.push(rem(`${memoryOrphanDomains.length} domain(s) in learning memory with no matching proof records: ${memoryOrphanDomains.join(", ")} — possible stale/dirty learning sources`, "engine-learning", "high"));
  }

  return makeResult("phase10_learning", passed, failed, warnings, blockers, evidence, remediations);
}

function verifyPhase11Optimization(): WiringPhaseResult {
  let passed = 0, failed = 0, warnings = 0;
  const blockers: string[] = [], evidence: WiringEvidence[] = [], remediations: WiringRemediationAction[] = [];

  const optimizerReport = engineOptimizer.getReport();
  const recentActions = optimizerReport.recentActions ?? [];

  evidence.push(ev("optimizer_last_run_ms_ago", optimizerReport.lastRunAt > 0 ? Date.now() - optimizerReport.lastRunAt : -1));
  evidence.push(ev("optimizer_total_actions", optimizerReport.totalActions));

  if (optimizerReport.lastRunAt > 0) { passed++; }
  else {
    warnings++;
    remediations.push(rem("Engine optimizer has not run — start it to detect redundant/inactive engines", "engine-optimizer", "medium"));
  }

  const duplicateFlags = recentActions.filter(a => a.action === "flag_duplicate");
  const inactiveFlags = recentActions.filter(a => a.action === "flag_inactive");

  evidence.push(ev("flagged_duplicates", duplicateFlags.map(a => a.engineId)));
  evidence.push(ev("flagged_inactive", inactiveFlags.map(a => a.engineId)));

  if (duplicateFlags.length === 0) { passed++; }
  else {
    warnings++;
    remediations.push(rem(`Merge ${duplicateFlags.length} flagged duplicate engine(s): ${duplicateFlags.map(a => a.engineId).join(", ")}`, "engine-optimizer", "high"));
  }

  if (inactiveFlags.length === 0) { passed++; }
  else {
    warnings++;
    remediations.push(rem(`Remove ${inactiveFlags.length} inactive engine(s): ${inactiveFlags.map(a => a.engineId).join(", ")}`, "engine-optimizer", "medium"));
  }

  const orchestratorStats = engineOrchestrator.getAllStats();
  const domainCounts = new Map<string, number>();
  for (const e of orchestratorStats) domainCounts.set(e.domain, (domainCounts.get(e.domain) ?? 0) + 1);
  const excessDomains = [...domainCounts.entries()].filter(([, c]) => c > 4).map(([d]) => d);
  evidence.push(ev("domains_with_excess_engines", excessDomains));
  if (excessDomains.length === 0) { passed++; }
  else {
    warnings++;
    remediations.push(rem(`Domains with excess engines (>4): ${excessDomains.join(", ")}`, "engine-optimizer", "medium"));
  }

  return makeResult("phase11_optimization", passed, failed, warnings, blockers, evidence, remediations);
}

function verifyPhase12Hardening(): WiringPhaseResult {
  let passed = 0, failed = 0, warnings = 0;
  const blockers: string[] = [], evidence: WiringEvidence[] = [], remediations: WiringRemediationAction[] = [];

  const safetyReport = getRepairSafetyReport();
  const proofStats = getProofStats();
  const orchestratorStats = engineOrchestrator.getAllStats();
  const healthReport = engineHealthMonitor.getReport();
  const learningReport = getLearningReport();

  evidence.push(ev("hardening_storm_active", safetyReport.stormActive));
  if (!safetyReport.stormActive) { passed++; }
  else {
    failed++;
    blockers.push("Repair storm ACTIVE — hardening gate FAILED");
    remediations.push(rem("Resolve repair storm", "repair-safety", "critical"));
  }

  const circularLoops = safetyReport.activeChains.filter(c => c.isLoop);
  evidence.push(ev("hardening_circular_loops", circularLoops.length));
  if (circularLoops.length === 0) { passed++; }
  else {
    failed++;
    blockers.push(`${circularLoops.length} circular repair loop(s) — hardening FAILED`);
    remediations.push(rem("Break all circular loops in repair chains", "repair-safety", "critical"));
  }

  const seenIds = new Set<string>();
  const duplicateIds: string[] = [];
  for (const e of orchestratorStats) {
    if (seenIds.has(e.id)) duplicateIds.push(e.id);
    seenIds.add(e.id);
  }
  evidence.push(ev("hardening_duplicate_ids", duplicateIds));
  if (duplicateIds.length === 0) { passed++; }
  else {
    failed++;
    blockers.push(`Duplicate engines: ${duplicateIds.join(", ")} — hardening FAILED`);
    remediations.push(rem("Remove duplicate engine registrations", "engine-registry.ts", "critical"));
  }

  evidence.push(ev("hardening_rollback_rate_pct", Math.round(proofStats.rollbackRate * 100)));
  if (proofStats.rollbackRate <= 0.2) { passed++; }
  else {
    warnings++;
    remediations.push(rem(`High rollback rate (${(proofStats.rollbackRate * 100).toFixed(1)}%) — target ≤20%`, "proof-system", "high"));
  }

  const invalidRate = proofStats.total > 0
    ? (proofStats.outcomes.failed_validation + proofStats.outcomes.failed_regression) / proofStats.total : 0;
  evidence.push(ev("hardening_invalid_proof_rate_pct", Math.round(invalidRate * 100)));
  if (invalidRate <= 0.3) { passed++; }
  else {
    failed++;
    blockers.push(`${Math.round(invalidRate * 100)}% invalid proofs — hardening requires ≤30%`);
    remediations.push(rem("Fix proof validation/regression failures", "repair-pipeline.ts", "critical"));
  }

  evidence.push(ev("hardening_crashed", healthReport.crashed ?? 0));
  evidence.push(ev("hardening_frozen", healthReport.frozen ?? 0));
  if ((healthReport.crashed ?? 0) === 0 && (healthReport.frozen ?? 0) === 0) { passed++; }
  else {
    warnings++;
    remediations.push(rem(`${healthReport.crashed ?? 0} crashed + ${healthReport.frozen ?? 0} frozen engines`, "engine-health-monitor", "high"));
  }

  evidence.push(ev("hardening_active_quarantines", safetyReport.activeQuarantines.length));
  if (safetyReport.activeQuarantines.length === 0) { passed++; }
  else {
    warnings++;
    remediations.push(rem(`${safetyReport.activeQuarantines.length} active quarantine(s): ${safetyReport.activeQuarantines.map(q => q.id).join(", ")}`, "repair-safety", "high"));
  }

  const hpRatio = learningReport.totalFixes > 0 ? learningReport.highPerformers / learningReport.totalFixes : 1;
  evidence.push(ev("hardening_learning_quality_pct", Math.round(hpRatio * 100)));
  if (hpRatio >= 0.3 || learningReport.totalFixes === 0) { passed++; }
  else {
    warnings++;
    remediations.push(rem("Learning quality low — purge low-performers", "engine-learning", "medium"));
  }

  const hardeningReport = getHardeningReport();
  evidence.push(ev("hardening_suite_storm_level", hardeningReport.storm.level));
  evidence.push(ev("hardening_suite_budget_remaining", hardeningReport.budget.remaining));
  evidence.push(ev("hardening_suite_cooldown_entries", hardeningReport.cooldownEntries));
  evidence.push(ev("hardening_suite_oscillation_quarantines", hardeningReport.oscillationQuarantines));

  if (hardeningReport.storm.level === "normal") { passed++; }
  else if (hardeningReport.storm.level === "degraded") {
    warnings++;
    remediations.push(rem(`Hardening storm is "${hardeningReport.storm.level}" — DOM repair operating in degraded mode`, "repair-hardening", "high"));
  } else {
    failed++;
    blockers.push(`Hardening storm level "${hardeningReport.storm.level}" — DOM repair is in storm/quarantine state, hardening suite cannot pass`);
    remediations.push(rem(`Resolve hardening storm (currently: ${hardeningReport.storm.level})`, "repair-hardening", "critical"));
  }

  if (hardeningReport.budget.remaining > 0) { passed++; }
  else {
    warnings++;
    remediations.push(rem("Hardening budget exhausted — no mutations can be applied until next resetBudget() cycle", "repair-hardening", "high"));
  }

  if (hardeningReport.oscillationQuarantines === 0) { passed++; }
  else {
    warnings++;
    remediations.push(rem(`${hardeningReport.oscillationQuarantines} oscillation quarantine(s) active — elements are toggling mutations repeatedly`, "repair-hardening", "medium"));
  }

  return makeResult("phase12_hardening", passed, failed, warnings, blockers, evidence, remediations);
}
