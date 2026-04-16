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
import { validateEngineContract } from "./engine-contract";
import { learningGovernance } from "./learning-governance";
import { autoRepairRealityLock } from "./auto-repair-reality-lock";

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

  _booted = true;
  _bootReport = report;

  _quarantineProcessingInterval = setInterval(() => {
    centralEngineCommandCenter.processExpiredQuarantines();
  }, 60_000);

  return report;
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
