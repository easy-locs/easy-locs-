/**
 * ENGINE GOVERNANCE CONSTITUTION — Final Production Lock
 * ═══════════════════════════════════════════════════════
 * This file is the SINGLE SOURCE OF TRUTH for engine governance rules.
 * No engine may operate outside this framework.
 * No bypass. No exceptions. No rollback.
 *
 * Approved: 2026-03-27
 */

import type { BrainOwner, EngineTier } from "./engine-metadata-registry";
import type { PipelineStage, OperationalMode, GovernedEngine } from "./engine-governance-map";
import { GOVERNED_ENGINES, DISABLED_ENGINES } from "./engine-governance-map";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. FULL ENGINE SPECIFICATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface EngineSpecification {
  // Identity
  engineKey: string;
  engineName: string;
  description: string;

  // Ownership
  brainOwner: BrainOwner;
  domain: string;
  pipelineStage: PipelineStage;

  // Classification
  tier: EngineTier;
  mode: OperationalMode;
  enabled: boolean;
  mergedFrom?: string[];

  // Declared I/O
  hasSideEffects: boolean;
  declaredTablesWritten: string[];
  declaredFieldsWritten: string[];

  // Execution policy
  triggerType: "cron" | "event" | "queue" | "manual";
  scheduleIntervalMs: number | null;
  timeoutMs: number;
  retryPolicy: { maxRetries: number; backoffMs: number };
  killSwitch: boolean;
  dryRunSupported: boolean;

  // Governance
  verificationRequired: boolean;
  runtimeProofRequired: boolean;
  firewallCompatible: boolean;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. ALLOWED BRAIN OWNERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const ALLOWED_BRAINS: BrainOwner[] = [
  "arbitration",
  "execution",
  "category",
  "experience",
  "geo",
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. ALLOWED PIPELINE STAGES (execution order)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const PIPELINE_ORDER: PipelineStage[] = [
  "orchestration",
  "ingestion",
  "normalization",
  "classification",
  "validation",
  "gating",
  "execution",
  "enrichment",
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. ENGINE ADMISSION GATE — Hard reject if any check fails
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface AdmissionResult {
  admitted: boolean;
  failures: string[];
}

export function validateEngineAdmission(spec: Partial<EngineSpecification>): AdmissionResult {
  const failures: string[] = [];

  // Identity
  if (!spec.engineKey) failures.push("missing engine_key");
  if (!spec.engineName) failures.push("missing engine_name");
  if (!spec.description) failures.push("missing description");

  // Ownership
  if (!spec.brainOwner || !ALLOWED_BRAINS.includes(spec.brainOwner)) {
    failures.push(`invalid brain_owner: ${spec.brainOwner ?? "undefined"}`);
  }
  if (!spec.domain) failures.push("missing domain");
  if (!spec.pipelineStage || !PIPELINE_ORDER.includes(spec.pipelineStage)) {
    failures.push(`invalid pipeline_stage: ${spec.pipelineStage ?? "undefined"}`);
  }

  // Classification
  if (!spec.tier || !["critical", "priority", "standard"].includes(spec.tier)) {
    failures.push(`invalid tier: ${spec.tier ?? "undefined"}`);
  }
  if (!spec.mode || !["live", "shadow", "safe"].includes(spec.mode)) {
    failures.push(`invalid mode: ${spec.mode ?? "undefined"}`);
  }

  // I/O declarations
  if (spec.hasSideEffects === undefined) failures.push("missing has_side_effects declaration");
  if (spec.hasSideEffects && (!spec.declaredTablesWritten || spec.declaredTablesWritten.length === 0)) {
    failures.push("engine has side effects but no declared_tables_written");
  }

  // Execution policy
  if (!spec.triggerType) failures.push("missing trigger_type");
  if (!spec.timeoutMs || spec.timeoutMs <= 0) failures.push("missing or invalid timeout_ms");
  if (!spec.retryPolicy) failures.push("missing retry_policy");

  // Governance
  if (spec.firewallCompatible === undefined) failures.push("missing firewall_compatible declaration");
  if (spec.runtimeProofRequired === undefined) failures.push("missing runtime_proof_required declaration");

  // Duplicate check
  if (spec.engineKey && GOVERNED_ENGINES[spec.engineKey]) {
    failures.push(`engine_key "${spec.engineKey}" already exists in registry`);
  }

  return { admitted: failures.length === 0, failures };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. RE-ENABLE GATE — Disabled engines require justification
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ReEnableRequest {
  engineKey: string;
  reason: string;
  proofOfUsefulness: string;
  governanceMetadata: Partial<EngineSpecification>;
  testRunProof: { runId: string; status: string; duration: number };
  approvedBy: string;
}

export function validateReEnable(req: ReEnableRequest): AdmissionResult {
  const failures: string[] = [];

  if (!req.reason) failures.push("missing re-enable reason");
  if (!req.proofOfUsefulness) failures.push("missing proof of usefulness");
  if (!req.approvedBy) failures.push("missing approval");
  if (!req.testRunProof?.runId) failures.push("missing test run proof");
  if (req.testRunProof?.status !== "ok") failures.push("test run did not pass");

  // Check it was actually disabled
  if (!DISABLED_ENGINES[req.engineKey]) {
    failures.push(`engine "${req.engineKey}" is not in the disabled registry`);
  }

  // Validate governance metadata
  const admResult = validateEngineAdmission({
    ...req.governanceMetadata,
    engineKey: `reenable_${req.engineKey}`, // bypass duplicate check
  });
  if (!admResult.admitted) {
    failures.push(...admResult.failures.filter(f => !f.includes("already exists")));
  }

  return { admitted: failures.length === 0, failures };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. MODE LIFECYCLE ENFORCEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MODE_TRANSITIONS: Record<OperationalMode, OperationalMode[]> = {
  safe: ["shadow"],
  shadow: ["live", "safe"],
  live: ["shadow", "safe"],
};

export function isValidModeTransition(from: OperationalMode, to: OperationalMode): boolean {
  return MODE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canPromoteToLive(engineKey: string, hasProof: boolean, firewallOk: boolean): boolean {
  const engine = GOVERNED_ENGINES[engineKey];
  if (!engine) return false;
  if (engine.tier === "critical" && (!hasProof || !firewallOk)) return false;
  return hasProof;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. RUNTIME PROOF SCHEMA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface EngineRunProof {
  runId: string;
  engineName: string;
  triggerSource: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  status: "ok" | "error" | "blocked" | "skipped";
  effectSummary: string;
  rowsRead: number;
  dbRowsAffected: number;
  sideEffectCount: number;
  verificationPassed: boolean;
  mode: OperationalMode;
  errorMessage: string | null;
  metadataJson: Record<string, unknown> | null;
}

export function isValidRunProof(proof: Partial<EngineRunProof>): boolean {
  return !!(
    proof.runId &&
    proof.engineName &&
    proof.triggerSource &&
    proof.startedAt &&
    proof.finishedAt &&
    proof.durationMs !== undefined &&
    proof.status &&
    proof.mode
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 8. FAILURE AUTO-DISABLE RULES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const FAILURE_THRESHOLDS = {
  consecutiveFailuresBeforeDisable: 5,
  firewallBlocksBeforeReview: 3,
  zeroSideEffectRunsBeforeWarning: 10,
  errorRateThresholdPercent: 15,
} as const;

export function shouldAutoDisable(
  consecutiveFailures: number,
  firewallBlocks: number,
  errorRate: number
): { disable: boolean; reason: string } {
  if (consecutiveFailures >= FAILURE_THRESHOLDS.consecutiveFailuresBeforeDisable) {
    return { disable: true, reason: `${consecutiveFailures} consecutive failures` };
  }
  if (firewallBlocks >= FAILURE_THRESHOLDS.firewallBlocksBeforeReview) {
    return { disable: true, reason: `${firewallBlocks} firewall blocks — review required` };
  }
  if (errorRate >= FAILURE_THRESHOLDS.errorRateThresholdPercent) {
    return { disable: true, reason: `${errorRate}% error rate exceeds ${FAILURE_THRESHOLDS.errorRateThresholdPercent}% threshold` };
  }
  return { disable: false, reason: "" };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 9. GOVERNANCE REVIEW CHECKLIST
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const GOVERNANCE_REVIEW_CHECKLIST = [
  "engines with no recent proof (>7 days)",
  "engines with zero side effects across all runs",
  "engines with repeated warnings",
  "engines with repeated firewall blocks",
  "duplicate candidates (overlapping tables/fields)",
  "stale safe/shadow engines never promoted",
  "live engines that should be downgraded",
  "critical engines missing synthetic verification",
] as const;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 10. FORBIDDEN ACTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const FORBIDDEN_ACTIONS = [
  "Adding engines without registry metadata",
  "Adding engines without brain owner",
  "Adding engines without pipeline stage",
  "Adding engines without mode",
  "Adding engines without proof path",
  "Bypassing the Brain Firewall",
  "Leaving duplicates active",
  "Enabling heartbeat-only engines as production engines",
  "Enabling engines without cockpit visibility",
  "Production writes from ungoverned engines",
  "Direct safe→live mode jump for critical engines",
  "Re-enabling disabled engines without justification",
] as const;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 11. CONSISTENCY CHECK — Registry ↔ DB alignment
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function checkRegistryConsistency(
  dbEngines: Array<{ engine_name: string; enabled: boolean }>
): { consistent: boolean; issues: string[] } {
  const issues: string[] = [];

  for (const dbEngine of dbEngines) {
    const inGoverned = GOVERNED_ENGINES[dbEngine.engine_name];
    const inDisabled = DISABLED_ENGINES[dbEngine.engine_name];

    if (dbEngine.enabled && !inGoverned) {
      issues.push(`DB engine "${dbEngine.engine_name}" is enabled but NOT in governance registry`);
    }
    if (!dbEngine.enabled && !inDisabled && !inGoverned) {
      issues.push(`DB engine "${dbEngine.engine_name}" is disabled but NOT tracked in any registry`);
    }
    if (dbEngine.enabled && inDisabled) {
      issues.push(`DB engine "${dbEngine.engine_name}" is enabled but marked disabled in registry`);
    }
  }

  // Check governed engines exist in DB
  for (const key of Object.keys(GOVERNED_ENGINES)) {
    if (!dbEngines.find(e => e.engine_name === key)) {
      issues.push(`Governed engine "${key}" not found in DB`);
    }
  }

  return { consistent: issues.length === 0, issues };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 12. SUMMARY — Current state
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function getConstitutionSummary() {
  const governed = Object.entries(GOVERNED_ENGINES);
  const disabled = Object.entries(DISABLED_ENGINES);

  return {
    totalGoverned: governed.length,
    totalDisabled: disabled.length,
    totalSystem: governed.length + disabled.length,
    duplicatesMerged: disabled.filter(([, v]) => v.reason === "duplicate").length,
    heartbeatArchived: disabled.filter(([, v]) => v.reason === "heartbeat-only").length,
    unstableDisabled: disabled.filter(([, v]) => v.reason === "unstable").length,
    criticalEngines: governed.filter(([, v]) => v.tier === "critical").length,
    liveEngines: governed.filter(([, v]) => v.mode === "live").length,
    shadowEngines: governed.filter(([, v]) => v.mode === "shadow").length,
    safeEngines: governed.filter(([, v]) => v.mode === "safe").length,
    admissionGateActive: true,
    firewallMandatory: true,
    runtimeProofMandatory: true,
    constitutionVersion: "1.0-final",
    lockedAt: "2026-03-27T00:00:00Z",
  };
}
