/**
 * Command Center Bootstrap — Wiring all systems through the Command Center
 *
 * This module:
 * 1. Initializes the Central Engine Command Center
 * 2. Registers all engines with their contracts
 * 3. Wires EngineOrchestrator, SentinelEngineRegistry, and OmegaCore through the CC
 * 4. Sets up quarantine expiry processing
 *
 * After this runs, no engine can reach RUNNING state without CC approval.
 */

import { centralEngineCommandCenter } from "./central-engine-command-center";
import { ALL_ENGINE_CONTRACTS, getEngineContract } from "./engine-contracts-registry";
import { validateEngineContract, createDefaultContract } from "./engine-contract";
import { learningGovernance } from "./learning-governance";
import { autoRepairRealityLock } from "./auto-repair-reality-lock";

/**
 * Engines to REMOVE (SAFE-RM): dead code shadows, ungoverned god-layer duplicates,
 * pure orphans, superseded engines with canonical replacements. These are BLOCKED
 * permanently and will not receive run approval under any circumstances.
 *
 * Source: docs/engine-discipline/ENGINE_PURGE_PLAN.md, ENGINE_MASTER_REGISTRY.md
 */
const PURGE_REMOVE_ENGINES: Array<{ id: string; reason: string }> = [];

/**
 * Engines to MERGE: two or more engines collapsed into one canonical implementation.
 * Source engine is BLOCKED; target engine is registered and approved with merged contract.
 *
 * Each entry records:
 * - sourceId: the engine being absorbed (blocked as SAFE-RM)
 * - targetId: the canonical surviving engine (must have a registered contract)
 * - mergedCapabilities: human-readable list of absorbed capabilities
 */
const PURGE_MERGE_ENGINES: Array<{ sourceId: string; targetId: string; mergedCapabilities: string[]; reason: string }> = [];

/**
 * Engines to REBUILD: flagged for refactoring with governance compliance before re-activation.
 * Currently quarantined; will exit quarantine only after REBUILD is verified by code review.
 *
 * Rebuild target: full ARRL proof pipeline + EngineContract declaration + CC registration.
 */
const PURGE_REBUILD_ENGINES: Array<{ id: string; rebuildTarget: string; requiredPillars: string[]; status: "PENDING" | "IN_PROGRESS" | "COMPLETE" }> = [
  {
    id: "omega-adaptive-ux",
    rebuildTarget: "omega-adaptive-ux",
    requiredPillars: ["EngineContract", "ARRL_10_STEP_PROOF", "CC_APPROVAL_GATE", "LEARNING_GOVERNANCE_WRITE"],
    status: "IN_PROGRESS",
  },
  {
    id: "omega-code-evolution",
    rebuildTarget: "omega-code-evolution",
    requiredPillars: ["EngineContract", "ARRL_10_STEP_PROOF", "CC_APPROVAL_GATE", "NO_AUTO_APPLY"],
    status: "IN_PROGRESS",
  },
  {
    id: "omega-decision",
    rebuildTarget: "omega-decision",
    requiredPillars: ["EngineContract", "CC_APPROVAL_GATE", "EVIDENCE_CHAIN_REQUIRED"],
    status: "IN_PROGRESS",
  },
  {
    id: "omega-self-improvement",
    rebuildTarget: "omega-self-improvement",
    requiredPillars: ["EngineContract", "LEARNING_GOVERNANCE_WRITE", "NO_DIRECT_MEMORY_WRITE"],
    status: "IN_PROGRESS",
  },
];

/**
 * Engines to QUARANTINE (QUAR-OBS): too dangerous or uncertain to run.
 * Disabled via CC quarantine for 30-day review period before REMOVE or REBUILD decision.
 *
 * Source: docs/engine-discipline/ENGINE_PURGE_PLAN.md
 */
const PURGE_QUARANTINE_ENGINES: Array<{ id: string; reason: string; durationMs: number }> = [
  { id: "omega-adaptive-ux", reason: "QUAR-OBS: Omega adaptive UX engine — autonomous UI mutations without ARRL gate; quarantined for 30-day review", durationMs: 30 * 24 * 60 * 60 * 1000 },
  { id: "omega-code-evolution", reason: "QUAR-OBS: Omega code evolution — can execute self-modification without contract validation; quarantined for 30-day review", durationMs: 30 * 24 * 60 * 60 * 1000 },
  { id: "omega-decision", reason: "QUAR-OBS: Omega decision engine — autonomous cross-domain decisions without evidence chain; quarantined for 30-day review", durationMs: 30 * 24 * 60 * 60 * 1000 },
  { id: "omega-self-improvement", reason: "QUAR-OBS: Omega self-improvement — direct memory writes bypass LearningGovernance chain; quarantined for 30-day review", durationMs: 30 * 24 * 60 * 60 * 1000 },
  { id: "ai-decision-engine", reason: "QUAR-OBS: AI decision engine without contract or ARRL gate; quarantined for 30-day review", durationMs: 30 * 24 * 60 * 60 * 1000 },
  { id: "auto-acquisition-engine", reason: "QUAR-OBS: Auto acquisition — autonomous acquisition triggers without governance gate; quarantined for 30-day review", durationMs: 30 * 24 * 60 * 60 * 1000 },
  { id: "autonomous-business-engine", reason: "QUAR-OBS: Fully autonomous business decision engine without any governance layer; quarantined for 30-day review", durationMs: 30 * 24 * 60 * 60 * 1000 },
];

export interface PurgePlanMergeRecord {
  sourceId: string;
  targetId: string;
  mergedCapabilities: string[];
  reason: string;
  executed: boolean;
}

export interface PurgePlanRebuildRecord {
  engineId: string;
  rebuildTarget: string;
  requiredPillars: string[];
  status: "PENDING" | "IN_PROGRESS" | "COMPLETE";
  recorded: boolean;
}

export interface PurgePlanReport {
  blocked: Array<{ engineId: string; success: boolean }>;
  quarantined: Array<{ engineId: string; success: boolean }>;
  merged: PurgePlanMergeRecord[];
  rebuilding: PurgePlanRebuildRecord[];
  durabilityVerified: boolean;
  durabilityFailures: string[];
  timestamp: number;
}

export interface CommandCenterBootReport {
  registeredCount: number;
  approvedCount: number;
  blockedCount: number;
  errors: string[];
  warnings: string[];
  timestamp: number;
}

let _booted = false;
let _bootReport: CommandCenterBootReport | null = null;
let _quarantineProcessingInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Boot the Central Engine Command Center and register all known engine contracts.
 * Must be called before any engine is allowed to run.
 */
export function bootCommandCenter(): CommandCenterBootReport {
  if (_booted) {
    return _bootReport!;
  }

  centralEngineCommandCenter.initialize();

  const report: CommandCenterBootReport = {
    registeredCount: 0,
    approvedCount: 0,
    blockedCount: 0,
    errors: [],
    warnings: [],
    timestamp: Date.now(),
  };

  for (const [engineId, contract] of Object.entries(ALL_ENGINE_CONTRACTS)) {
    try {
      const result = centralEngineCommandCenter.registerAndApprove(
        engineId,
        contract.engineId,
        contract,
        "command-center-bootstrap",
      );

      if (result.success) {
        report.registeredCount++;
        report.approvedCount++;
      } else {
        report.blockedCount++;
        report.errors.push(`Failed to register ${engineId}: ${result.blockedReason}`);
      }

      if (result.validation.warnings.length > 0) {
        for (const w of result.validation.warnings) {
          report.warnings.push(`[${engineId}] ${w}`);
        }
      }
    } catch (err) {
      report.errors.push(`Exception registering ${engineId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  executePurgePlan();

  _booted = true;
  _bootReport = report;

  _quarantineProcessingInterval = setInterval(() => {
    centralEngineCommandCenter.processExpiredQuarantines();
  }, 60_000);

  return report;
}

/**
 * Execute the Engine Purge Plan — concrete governance enforcement against
 * REMOVE and QUARANTINE engines identified in ENGINE_PURGE_PLAN.md.
 *
 * REMOVE engines are permanently BLOCKED: no run approval will ever be granted.
 * QUARANTINE engines are locked for 30 days pending REMOVE or REBUILD decision.
 *
 * This is called once during bootCommandCenter() and is the concrete implementation
 * of the purge plan's REMOVE/MERGE/QUARANTINE/REBUILD actions.
 */
export function executePurgePlan(): PurgePlanReport {
  const purgePlanReport: PurgePlanReport = {
    blocked: [],
    quarantined: [],
    merged: [],
    rebuilding: [],
    durabilityVerified: false,
    durabilityFailures: [],
    timestamp: Date.now(),
  };

  for (const engine of PURGE_REMOVE_ENGINES) {
    try {
      centralEngineCommandCenter.forceBlock(engine.id, engine.reason);
      purgePlanReport.blocked.push({ engineId: engine.id, success: true });
    } catch {
      purgePlanReport.blocked.push({ engineId: engine.id, success: false });
    }
  }

  for (const engine of PURGE_QUARANTINE_ENGINES) {
    try {
      centralEngineCommandCenter.forceQuarantine(engine.id, engine.reason, engine.durationMs);
      purgePlanReport.quarantined.push({ engineId: engine.id, success: true });
    } catch {
      purgePlanReport.quarantined.push({ engineId: engine.id, success: false });
    }
  }

  for (const merge of PURGE_MERGE_ENGINES) {
    try {
      centralEngineCommandCenter.forceBlock(
        merge.sourceId,
        `MERGE→${merge.targetId}: ${merge.reason}`,
      );
      purgePlanReport.merged.push({
        sourceId: merge.sourceId,
        targetId: merge.targetId,
        mergedCapabilities: merge.mergedCapabilities,
        reason: merge.reason,
        executed: true,
      });
    } catch {
      purgePlanReport.merged.push({
        sourceId: merge.sourceId,
        targetId: merge.targetId,
        mergedCapabilities: merge.mergedCapabilities,
        reason: merge.reason,
        executed: false,
      });
    }
  }

  for (const rebuild of PURGE_REBUILD_ENGINES) {
    purgePlanReport.rebuilding.push({
      engineId: rebuild.id,
      rebuildTarget: rebuild.rebuildTarget,
      requiredPillars: rebuild.requiredPillars,
      status: rebuild.status,
      recorded: true,
    });
  }

  const durabilityFailures: string[] = [];

  const allBlocked = [
    ...PURGE_REMOVE_ENGINES.map((e) => e.id),
    ...PURGE_MERGE_ENGINES.map((e) => e.sourceId),
  ];
  for (const id of allBlocked) {
    const reg = centralEngineCommandCenter.getRegistration(id);
    if (!reg || reg.lifecycleState !== "BLOCKED") {
      durabilityFailures.push(`BLOCKED durability FAIL: ${id} is ${reg?.lifecycleState ?? "unregistered"} (expected BLOCKED)`);
    } else {
      const reRegResult = centralEngineCommandCenter.register(id, id, createDefaultContract(id, "test", "Durability re-registration probe"));
      if (reRegResult.valid) {
        durabilityFailures.push(`BLOCKED durability FAIL: ${id} accepted re-registration after BLOCKED — isolation broken`);
      }
    }
  }

  const allQuarantined = PURGE_QUARANTINE_ENGINES.map((e) => e.id);
  for (const id of allQuarantined) {
    const reg = centralEngineCommandCenter.getRegistration(id);
    if (!reg || reg.lifecycleState !== "QUARANTINED") {
      durabilityFailures.push(`QUARANTINE durability FAIL: ${id} is ${reg?.lifecycleState ?? "unregistered"} (expected QUARANTINED)`);
    } else {
      const runApproval = centralEngineCommandCenter.requestRunApproval(id);
      if (runApproval.approved) {
        durabilityFailures.push(`QUARANTINE durability FAIL: ${id} was approved to run while QUARANTINED — isolation broken`);
      }
    }
  }

  purgePlanReport.durabilityVerified = durabilityFailures.length === 0;
  purgePlanReport.durabilityFailures = durabilityFailures;

  return purgePlanReport;
}

/**
 * Stop the Command Center (clears intervals).
 */
export function shutdownCommandCenter(): void {
  if (_quarantineProcessingInterval) {
    clearInterval(_quarantineProcessingInterval);
    _quarantineProcessingInterval = null;
  }
  _booted = false;
  _bootReport = null;
}

/**
 * Gate function: checks if an engine is approved to run.
 * Use this at the start of every engine execution cycle.
 */
export function requestEngineRunApproval(engineId: string): { approved: boolean; reason: string } {
  if (!_booted) {
    return { approved: false, reason: "Command Center not booted — call bootCommandCenter() first" };
  }

  const approval = centralEngineCommandCenter.requestRunApproval(engineId);
  return { approved: approval.approved, reason: approval.reason };
}

/**
 * Report a successful engine run back to the Command Center.
 */
export function reportEngineRunSuccess(engineId: string): void {
  centralEngineCommandCenter.reportRunSuccess(engineId);
}

/**
 * Report an engine run error back to the Command Center.
 */
export function reportEngineRunError(engineId: string, error: string): void {
  centralEngineCommandCenter.reportRunError(engineId, error);
}

/**
 * Dynamically register a new engine with the Command Center at runtime.
 * Used by EngineOrchestrator when new engines are added.
 */
export function registerNewEngine(
  engineId: string,
  engineName: string,
  contractOrId: string,
): { success: boolean; blockedReason: string | null } {
  const contract = getEngineContract(contractOrId) ?? getEngineContract(engineId);

  if (!contract) {
    centralEngineCommandCenter.forceBlock(
      engineId,
      `NO_CONTRACT: Engine '${engineId}' has no declared contract in engine-contracts-registry. All engines must have an audited contract before they can run.`,
    );
    return { success: false, blockedReason: `No contract declared for engine '${engineId}' — blocked. Add to engine-contracts-registry.ts.` };
  }

  const result = centralEngineCommandCenter.registerAndApprove(engineId, engineName, contract, "runtime-registration");
  return { success: result.success, blockedReason: result.blockedReason };
}

/**
 * Get the current Command Center status report.
 */
export function getCommandCenterStatus() {
  return {
    booted: _booted,
    bootReport: _bootReport,
    stats: centralEngineCommandCenter.getStats(),
    blocked: centralEngineCommandCenter.getBlocked().map((r) => ({
      engineId: r.engineId,
      reason: r.blockedReason,
      blockedAt: r.lastStateChange,
    })),
    quarantined: centralEngineCommandCenter.getQuarantined().map((r) => ({
      engineId: r.engineId,
      reason: r.quarantineReason,
      expiresAt: r.quarantineExpiresAt,
    })),
    learningGovernance: learningGovernance.getStats(),
    repairLock: autoRepairRealityLock.getStats(),
  };
}

/**
 * Validate a contract definition independently (for testing/development).
 */
export function validateContract(contract: unknown) {
  return validateEngineContract(contract);
}
