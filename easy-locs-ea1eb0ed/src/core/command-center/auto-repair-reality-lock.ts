/**
 * Auto-Repair Reality Lock — 10-Step Pipeline Enforcement
 *
 * Every repair MUST follow the exact 10-step pipeline. No shortcuts.
 * Each repair produces a proof record with root cause, confidence,
 * impacted scope, before/after state, success/failure, rollback record,
 * and proof of correctness.
 *
 * 10-Step Repair Pipeline:
 * 1. DETECT      — Signal detected, signature computed
 * 2. CLASSIFY    — Root cause classification (category + confidence)
 * 3. LOCALIZE    — Scope of impact identified
 * 4. PROPOSE     — Repair action proposed (never blind/silent)
 * 5. SIMULATE    — Repair simulated in safe environment
 * 6. VALIDATE    — Simulation validated against invariants
 * 7. APPLY       — Repair applied to production
 * 8. VERIFY      — Post-apply verification
 * 9. ROLLBACK    — (If verify fails) rollback applied
 * 10. MEMORIZE   — Result memorized (success or failure)
 *
 * FORBIDDEN repairs:
 * - Blind patches (no root cause identified)
 * - Silent patches (no audit trail)
 * - Root-cause-masking patches
 * - Conflict-creating patches
 * - Off-taxonomy patches
 * - Off-version patches
 *
 * Pillar 4 of the Engine Discipline Infrastructure.
 */

export type RepairPipelineStep =
  | "DETECT"
  | "CLASSIFY"
  | "LOCALIZE"
  | "PROPOSE"
  | "SIMULATE"
  | "VALIDATE"
  | "APPLY"
  | "VERIFY"
  | "ROLLBACK"
  | "MEMORIZE";

export type RepairStepStatus = "PENDING" | "RUNNING" | "PASSED" | "FAILED" | "SKIPPED";

export type ForbiddenPatchType =
  | "BLIND_PATCH"
  | "SILENT_PATCH"
  | "ROOT_CAUSE_MASKING"
  | "CONFLICT_CREATING"
  | "OFF_TAXONOMY"
  | "OFF_VERSION";

export type RepairOutcome = "SUCCESS" | "FAILED" | "ROLLED_BACK" | "BLOCKED" | "PARTIAL";

export interface RepairRootCause {
  component: string;
  category: string;
  description: string;
  confidence: number;
  evidenceIds: string[];
}

export interface RepairImpactScope {
  engineIds: string[];
  domains: string[];
  entityTypes: string[];
  entityIds: string[];
  estimatedSeverity: "low" | "medium" | "high" | "critical";
}

export interface RepairBeforeAfterState {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  diff: string[];
}

export interface RepairProofRecord {
  proofId: string;
  repairId: string;
  engineId: string;
  domain: string;
  startedAt: number;
  completedAt: number | null;
  durationMs: number | null;
  outcome: RepairOutcome | null;
  rootCause: RepairRootCause | null;
  impactScope: RepairImpactScope | null;
  beforeAfterState: RepairBeforeAfterState | null;
  rollbackRecord: RollbackRecord | null;
  steps: RepairStepRecord[];
  forbiddenTypesChecked: ForbiddenPatchType[];
  forbiddenTypesDetected: ForbiddenPatchType[];
  blocked: boolean;
  blockedReason: string | null;
  confidence: number | null;
  simulationResult: SimulationResult | null;
  validationChecks: RepairValidationCheck[];
  verificationChecks: RepairValidationCheck[];
  memorized: boolean;
  memorizationId: string | null;
}

export interface RepairStepRecord {
  step: RepairPipelineStep;
  status: RepairStepStatus;
  startedAt: number;
  completedAt: number | null;
  durationMs: number | null;
  detail: string;
  warnings: string[];
}

export interface RollbackRecord {
  triggered: boolean;
  reason: string;
  completedAt: number | null;
  success: boolean;
  stateRestored: boolean;
}

export interface SimulationResult {
  simulationId: string;
  passed: boolean;
  mutationPreview: Record<string, unknown>;
  invariantsChecked: string[];
  invariantsPassed: string[];
  invariantsFailed: string[];
  simulatedAt: number;
}

export interface RepairValidationCheck {
  name: string;
  passed: boolean;
  detail: string;
  checkedAt: number;
}

export interface RepairRequest {
  engineId: string;
  domain: string;
  issueSignature: string;
  rawSignal: string;
  severity: "low" | "medium" | "high" | "critical";
  requestedOperation: string;
  targetComponent: string;
  rollbackCapable: boolean;
}

const ORDERED_STEPS: RepairPipelineStep[] = [
  "DETECT",
  "CLASSIFY",
  "LOCALIZE",
  "PROPOSE",
  "SIMULATE",
  "VALIDATE",
  "APPLY",
  "VERIFY",
  "ROLLBACK",
  "MEMORIZE",
];

const FORBIDDEN_PATCH_TYPES: ForbiddenPatchType[] = [
  "BLIND_PATCH",
  "SILENT_PATCH",
  "ROOT_CAUSE_MASKING",
  "CONFLICT_CREATING",
  "OFF_TAXONOMY",
  "OFF_VERSION",
];

let repairCounter = 0;
let proofCounter = 0;

class AutoRepairRealityLock {
  private activeRepairs = new Map<string, RepairProofRecord>();
  private completedProofs: RepairProofRecord[] = [];
  private readonly MAX_COMPLETED = 1_000;

  /**
   * Start a new repair — returns a proof record to be filled through the pipeline.
   * Each step must be explicitly executed in order.
   */
  startRepair(request: RepairRequest): RepairProofRecord {
    const validation = this.validateRepairRequest(request);
    if (!validation.valid) {
      const repairId = `repair_blocked_${Date.now()}_${++repairCounter}`;
      const proofId = `proof_blocked_${Date.now()}_${++proofCounter}`;
      const blockedProof: RepairProofRecord = {
        proofId,
        repairId,
        engineId: request.engineId,
        domain: request.domain,
        startedAt: Date.now(),
        completedAt: Date.now(),
        durationMs: 0,
        outcome: "BLOCKED",
        rootCause: null,
        impactScope: null,
        beforeAfterState: null,
        rollbackRecord: null,
        steps: ORDERED_STEPS.map((step) => ({
          step,
          status: "SKIPPED" as RepairStepStatus,
          startedAt: 0,
          completedAt: null,
          durationMs: null,
          detail: "Blocked at startRepair — invalid request",
          warnings: [],
        })),
        forbiddenTypesChecked: [...FORBIDDEN_PATCH_TYPES],
        forbiddenTypesDetected: [],
        blocked: true,
        blockedReason: validation.blockedReason,
        confidence: null,
        simulationResult: null,
        validationChecks: [],
        verificationChecks: [],
        memorized: false,
        memorizationId: null,
      };
      this.completedProofs.push(blockedProof);
      return blockedProof;
    }

    const repairId = `repair_${Date.now()}_${++repairCounter}`;
    const proofId = `proof_${Date.now()}_${++proofCounter}`;

    const steps: RepairStepRecord[] = ORDERED_STEPS.map((step) => ({
      step,
      status: "PENDING",
      startedAt: 0,
      completedAt: null,
      durationMs: null,
      detail: "",
      warnings: [],
    }));

    const proof: RepairProofRecord = {
      proofId,
      repairId,
      engineId: request.engineId,
      domain: request.domain,
      startedAt: Date.now(),
      completedAt: null,
      durationMs: null,
      outcome: null,
      rootCause: null,
      impactScope: null,
      beforeAfterState: null,
      rollbackRecord: null,
      steps,
      forbiddenTypesChecked: [...FORBIDDEN_PATCH_TYPES],
      forbiddenTypesDetected: [],
      blocked: false,
      blockedReason: null,
      confidence: null,
      simulationResult: null,
      validationChecks: [],
      verificationChecks: [],
      memorized: false,
      memorizationId: null,
    };

    this.activeRepairs.set(repairId, proof);
    return proof;
  }

  /**
   * Step 1: DETECT — record the detection signal.
   */
  stepDetect(repairId: string, issueSignature: string, rawSignal: string, severity: string): boolean {
    const proof = this.activeRepairs.get(repairId);
    if (!proof) return false;
    const orderErr = this.enforceStepOrder(proof, "DETECT");
    if (orderErr) { this.blockRepair(proof, orderErr); return false; }
    this.markStep(proof, "DETECT", "RUNNING");
    proof.steps[0].detail = `Detected: ${issueSignature} | severity: ${severity} | signal: ${rawSignal.slice(0, 200)}`;
    this.markStep(proof, "DETECT", "PASSED");
    return true;
  }

  /**
   * Step 2: CLASSIFY — identify root cause and validate it's not a masked patch.
   */
  stepClassify(repairId: string, rootCause: RepairRootCause): { success: boolean; blockedReason: string | null } {
    const proof = this.activeRepairs.get(repairId);
    if (!proof) return { success: false, blockedReason: "Repair not found" };
    const orderErr = this.enforceStepOrder(proof, "CLASSIFY");
    if (orderErr) { this.blockRepair(proof, orderErr); return { success: false, blockedReason: orderErr }; }

    this.markStep(proof, "CLASSIFY", "RUNNING");

    if (!rootCause.description || rootCause.description.trim() === "") {
      proof.forbiddenTypesDetected.push("BLIND_PATCH");
      this.blockRepair(proof, "BLIND_PATCH: No root cause description provided");
      return { success: false, blockedReason: proof.blockedReason };
    }

    if (rootCause.confidence < 0.3) {
      proof.forbiddenTypesDetected.push("BLIND_PATCH");
      this.blockRepair(proof, `BLIND_PATCH: Root cause confidence too low (${rootCause.confidence.toFixed(2)} < 0.3)`);
      return { success: false, blockedReason: proof.blockedReason };
    }

    proof.rootCause = rootCause;
    proof.confidence = rootCause.confidence;
    const step = proof.steps.find((s) => s.step === "CLASSIFY")!;
    step.detail = `Root cause: ${rootCause.category} | ${rootCause.description} | confidence: ${rootCause.confidence}`;
    this.markStep(proof, "CLASSIFY", "PASSED");
    return { success: true, blockedReason: null };
  }

  /**
   * Step 3: LOCALIZE — identify exact scope of impact.
   */
  stepLocalize(repairId: string, scope: RepairImpactScope): boolean {
    const proof = this.activeRepairs.get(repairId);
    if (!proof) return false;
    const orderErr = this.enforceStepOrder(proof, "LOCALIZE");
    if (orderErr) { this.blockRepair(proof, orderErr); return false; }
    this.markStep(proof, "LOCALIZE", "RUNNING");
    proof.impactScope = scope;
    const step = proof.steps.find((s) => s.step === "LOCALIZE")!;
    step.detail = `Impact: ${scope.domains.join(",")} | engines: ${scope.engineIds.length} | severity: ${scope.estimatedSeverity}`;
    this.markStep(proof, "LOCALIZE", "PASSED");
    return true;
  }

  /**
   * Step 4: PROPOSE — propose the repair action. Checks for forbidden patch types.
   */
  stepPropose(repairId: string, proposedOperation: string, flags: {
    isOffTaxonomy?: boolean;
    isOffVersion?: boolean;
    createsConflict?: boolean;
    maskesRootCause?: boolean;
  }): { success: boolean; blockedReason: string | null } {
    const proof = this.activeRepairs.get(repairId);
    if (!proof) return { success: false, blockedReason: "Repair not found" };
    const orderErr = this.enforceStepOrder(proof, "PROPOSE");
    if (orderErr) { this.blockRepair(proof, orderErr); return { success: false, blockedReason: orderErr }; }
    this.markStep(proof, "PROPOSE", "RUNNING");

    const detected: ForbiddenPatchType[] = [];
    if (flags.isOffTaxonomy) detected.push("OFF_TAXONOMY");
    if (flags.isOffVersion) detected.push("OFF_VERSION");
    if (flags.createsConflict) detected.push("CONFLICT_CREATING");
    if (flags.maskesRootCause) detected.push("ROOT_CAUSE_MASKING");
    if (!proposedOperation || proposedOperation.trim() === "") detected.push("SILENT_PATCH");

    if (detected.length > 0) {
      for (const type of detected) {
        if (!proof.forbiddenTypesDetected.includes(type)) {
          proof.forbiddenTypesDetected.push(type);
        }
      }
      this.blockRepair(proof, `Forbidden patch types detected: ${detected.join(", ")}`);
      return { success: false, blockedReason: proof.blockedReason };
    }

    const step = proof.steps.find((s) => s.step === "PROPOSE")!;
    step.detail = `Proposed: ${proposedOperation}`;
    this.markStep(proof, "PROPOSE", "PASSED");
    return { success: true, blockedReason: null };
  }

  /**
   * Step 5: SIMULATE — run repair in safe environment and record result.
   */
  stepSimulate(repairId: string, simulationResult: SimulationResult): { success: boolean; blockedReason: string | null } {
    const proof = this.activeRepairs.get(repairId);
    if (!proof) return { success: false, blockedReason: "Repair not found" };
    const orderErr = this.enforceStepOrder(proof, "SIMULATE");
    if (orderErr) { this.blockRepair(proof, orderErr); return { success: false, blockedReason: orderErr }; }
    this.markStep(proof, "SIMULATE", "RUNNING");
    proof.simulationResult = simulationResult;

    if (!simulationResult.passed) {
      const step = proof.steps.find((s) => s.step === "SIMULATE")!;
      step.detail = `Simulation FAILED | failed invariants: ${simulationResult.invariantsFailed.join(", ")}`;
      this.markStep(proof, "SIMULATE", "FAILED");
      this.markRepairOutcome(proof, "BLOCKED");
      return { success: false, blockedReason: `Simulation failed: ${simulationResult.invariantsFailed.join(", ")}` };
    }

    const step = proof.steps.find((s) => s.step === "SIMULATE")!;
    step.detail = `Simulation PASSED | invariants checked: ${simulationResult.invariantsChecked.length}`;
    this.markStep(proof, "SIMULATE", "PASSED");
    return { success: true, blockedReason: null };
  }

  /**
   * Step 6: VALIDATE — validate against all system invariants before applying.
   */
  stepValidate(repairId: string, checks: RepairValidationCheck[]): { success: boolean; failedChecks: string[] } {
    const proof = this.activeRepairs.get(repairId);
    if (!proof) return { success: false, failedChecks: ["Repair not found"] };
    const orderErr = this.enforceStepOrder(proof, "VALIDATE");
    if (orderErr) { this.blockRepair(proof, orderErr); return { success: false, failedChecks: [orderErr] }; }
    this.markStep(proof, "VALIDATE", "RUNNING");
    proof.validationChecks = checks;

    const failed = checks.filter((c) => !c.passed);
    if (failed.length > 0) {
      const step = proof.steps.find((s) => s.step === "VALIDATE")!;
      step.detail = `Validation FAILED | ${failed.length} checks failed: ${failed.map((c) => c.name).join(", ")}`;
      this.markStep(proof, "VALIDATE", "FAILED");
      this.markRepairOutcome(proof, "BLOCKED");
      return { success: false, failedChecks: failed.map((c) => c.name) };
    }

    const step = proof.steps.find((s) => s.step === "VALIDATE")!;
    step.detail = `Validation PASSED | ${checks.length} checks passed`;
    this.markStep(proof, "VALIDATE", "PASSED");
    return { success: true, failedChecks: [] };
  }

  /**
   * Step 7: APPLY — apply the repair and record before/after state.
   */
  stepApply(repairId: string, beforeAfterState: RepairBeforeAfterState): boolean {
    const proof = this.activeRepairs.get(repairId);
    if (!proof) return false;
    const orderErr = this.enforceStepOrder(proof, "APPLY");
    if (orderErr) { this.blockRepair(proof, orderErr); return false; }
    this.markStep(proof, "APPLY", "RUNNING");
    proof.beforeAfterState = beforeAfterState;

    if (beforeAfterState.diff.length === 0) {
      const step = proof.steps.find((s) => s.step === "APPLY")!;
      step.detail = "Applied — no state changes (no-op)";
      step.warnings.push("No diff detected — possible SILENT_PATCH");
    } else {
      const step = proof.steps.find((s) => s.step === "APPLY")!;
      step.detail = `Applied | ${beforeAfterState.diff.length} changes`;
    }

    this.markStep(proof, "APPLY", "PASSED");
    return true;
  }

  /**
   * Step 8: VERIFY — verify the repair succeeded in production.
   */
  stepVerify(repairId: string, checks: RepairValidationCheck[]): { success: boolean; triggerRollback: boolean } {
    const proof = this.activeRepairs.get(repairId);
    if (!proof) return { success: false, triggerRollback: false };
    const orderErr = this.enforceStepOrder(proof, "VERIFY");
    if (orderErr) { this.blockRepair(proof, orderErr); return { success: false, triggerRollback: false }; }
    this.markStep(proof, "VERIFY", "RUNNING");
    proof.verificationChecks = checks;

    const failed = checks.filter((c) => !c.passed);
    if (failed.length > 0) {
      const step = proof.steps.find((s) => s.step === "VERIFY")!;
      step.detail = `Verification FAILED | ${failed.length} checks failed — triggering rollback`;
      this.markStep(proof, "VERIFY", "FAILED");
      return { success: false, triggerRollback: true };
    }

    const step = proof.steps.find((s) => s.step === "VERIFY")!;
    step.detail = `Verification PASSED | ${checks.length} checks passed`;
    this.markStep(proof, "VERIFY", "PASSED");
    return { success: true, triggerRollback: false };
  }

  /**
   * Step 9: ROLLBACK — execute rollback if verification failed.
   */
  stepRollback(repairId: string, rollbackRecord: RollbackRecord): boolean {
    const proof = this.activeRepairs.get(repairId);
    if (!proof) return false;
    const orderErr = this.enforceStepOrder(proof, "ROLLBACK");
    if (orderErr) { this.blockRepair(proof, orderErr); return false; }
    this.markStep(proof, "ROLLBACK", "RUNNING");
    proof.rollbackRecord = rollbackRecord;

    const step = proof.steps.find((s) => s.step === "ROLLBACK")!;
    step.detail = `Rollback: triggered=${rollbackRecord.triggered} | success=${rollbackRecord.success} | reason: ${rollbackRecord.reason}`;
    this.markStep(proof, "ROLLBACK", rollbackRecord.success ? "PASSED" : "FAILED");

    if (rollbackRecord.triggered) {
      this.markRepairOutcome(proof, "ROLLED_BACK");
    }

    return rollbackRecord.success;
  }

  /**
   * Step 10: MEMORIZE — the single terminal point of every repair lifecycle.
   * After MEMORIZE, the proof is archived (moved from activeRepairs to completedProofs).
   * This is the ONLY place where a repair is removed from activeRepairs, ensuring
   * all 10 steps can always be reached regardless of earlier step failures.
   */
  stepMemorize(repairId: string, memorizationId: string, success: boolean): boolean {
    const proof = this.activeRepairs.get(repairId);
    if (!proof) return false;
    const orderErr = this.enforceStepOrder(proof, "MEMORIZE");
    if (orderErr) { this.blockRepair(proof, orderErr); return false; }
    this.markStep(proof, "MEMORIZE", "RUNNING");
    proof.memorized = true;
    proof.memorizationId = memorizationId;

    const step = proof.steps.find((s) => s.step === "MEMORIZE")!;
    step.detail = `Memorized | id: ${memorizationId} | outcome: ${success ? "success" : "failure"} | prior outcome: ${proof.outcome ?? "none"}`;
    this.markStep(proof, "MEMORIZE", "PASSED");

    if (!proof.outcome) {
      proof.outcome = success ? "SUCCESS" : "FAILED";
    }
    if (!proof.completedAt) {
      proof.completedAt = Date.now();
      proof.durationMs = Date.now() - proof.startedAt;
    }

    this.archiveRepair(proof);
    return true;
  }

  /**
   * Validate a repair request before starting the pipeline.
   * Blocks requests that violate the forbidden patch rules upfront.
   */
  validateRepairRequest(request: RepairRequest): { valid: boolean; blockedReason: string | null } {
    if (!request.engineId || !request.domain) {
      return { valid: false, blockedReason: "engineId and domain are required" };
    }
    if (!request.issueSignature || request.issueSignature.trim() === "") {
      return { valid: false, blockedReason: "issueSignature is required (SILENT_PATCH prevention)" };
    }
    if (!request.rawSignal || request.rawSignal.trim() === "") {
      return { valid: false, blockedReason: "rawSignal is required (BLIND_PATCH prevention)" };
    }
    if (!request.rollbackCapable) {
      return { valid: false, blockedReason: "rollbackCapable must be true — all repairs must support rollback" };
    }
    return { valid: true, blockedReason: null };
  }

  getActiveRepair(repairId: string): RepairProofRecord | undefined {
    return this.activeRepairs.get(repairId);
  }

  getCompletedProofs(limit = 50): RepairProofRecord[] {
    return this.completedProofs.slice(-limit);
  }

  getProofsByEngine(engineId: string): RepairProofRecord[] {
    return this.completedProofs.filter((p) => p.engineId === engineId);
  }

  getProofsByDomain(domain: string): RepairProofRecord[] {
    return this.completedProofs.filter((p) => p.domain === domain);
  }

  getStats() {
    const completed = this.completedProofs;
    return {
      active_repairs: this.activeRepairs.size,
      total_completed: completed.length,
      outcomes: {
        success: completed.filter((p) => p.outcome === "SUCCESS").length,
        failed: completed.filter((p) => p.outcome === "FAILED").length,
        rolled_back: completed.filter((p) => p.outcome === "ROLLED_BACK").length,
        blocked: completed.filter((p) => p.outcome === "BLOCKED").length,
      },
      forbidden_detections: completed.reduce((sum, p) => sum + p.forbiddenTypesDetected.length, 0),
      memorized: completed.filter((p) => p.memorized).length,
    };
  }

  /**
   * Return the step that must be called next for this proof record.
   * Returns null if all steps are complete.
   * Used to enforce strict in-order execution of the 10-step pipeline.
   */
  private getExpectedNextStep(proof: RepairProofRecord): RepairPipelineStep | null {
    for (const stepRecord of proof.steps) {
      if (stepRecord.status === "PENDING") return stepRecord.step;
    }
    return null;
  }

  /**
   * Enforce step ordering: the requested step must be the next PENDING step.
   * Returns an error string if out-of-order, null if allowed.
   */
  private enforceStepOrder(proof: RepairProofRecord, requestedStep: RepairPipelineStep): string | null {
    const expected = this.getExpectedNextStep(proof);
    if (expected === null) {
      return `All steps already completed for repair ${proof.repairId}`;
    }
    if (expected !== requestedStep) {
      return `Step order violation: expected ${expected} but received ${requestedStep} for repair ${proof.repairId}`;
    }
    return null;
  }

  private markStep(proof: RepairProofRecord, step: RepairPipelineStep, status: RepairStepStatus): void {
    const stepRecord = proof.steps.find((s) => s.step === step);
    if (!stepRecord) return;

    if (status === "RUNNING") {
      stepRecord.startedAt = Date.now();
    } else {
      stepRecord.completedAt = Date.now();
      stepRecord.durationMs = stepRecord.startedAt > 0 ? Date.now() - stepRecord.startedAt : 0;
    }
    stepRecord.status = status;
  }

  private blockRepair(proof: RepairProofRecord, reason: string): void {
    proof.blocked = true;
    proof.blockedReason = reason;
    this.markRepairOutcome(proof, "BLOCKED");
  }

  /**
   * Lightweight gate check — used by callsites that only need to know if
   * repair is currently allowed (storm guard, forbidden-domain check, etc.)
   * without initiating a full proof-record pipeline.
   * Returns { approved, reason } — matches the pattern of requestEngineRunApproval.
   */
  requestRepair(engineId: string, domain: string, repairType: string): { approved: boolean; reason: string } {
    if (FORBIDDEN_PATCH_TYPES.includes(repairType as ForbiddenPatchType)) {
      return { approved: false, reason: `Forbidden repair type: ${repairType}` };
    }
    const activeCount = this.activeRepairs.size;
    if (activeCount >= 50) {
      return { approved: false, reason: `Repair storm: ${activeCount} concurrent repairs active` };
    }
    return { approved: true, reason: "OK" };
  }

  /**
   * Mark the repair outcome and timestamps without removing it from activeRepairs.
   * The repair stays active until stepMemorize() archives it, ensuring the full
   * 10-step pipeline can always complete with an auditable proof record.
   * All PENDING steps except MEMORIZE are auto-SKIPPED so MEMORIZE can proceed.
   */
  private markRepairOutcome(proof: RepairProofRecord, outcome: RepairOutcome): void {
    if (!proof.outcome) {
      proof.outcome = outcome;
    }
    for (const stepRecord of proof.steps) {
      if (stepRecord.status === "PENDING" && stepRecord.step !== "MEMORIZE") {
        stepRecord.status = "SKIPPED";
      }
    }
  }

  /**
   * Archive the repair proof: move from activeRepairs to completedProofs.
   * Called ONLY from stepMemorize() to guarantee step 10 is always the
   * terminal point of every repair lifecycle.
   */
  private archiveRepair(proof: RepairProofRecord): void {
    this.activeRepairs.delete(proof.repairId);
    this.completedProofs.push(proof);
    if (this.completedProofs.length > this.MAX_COMPLETED) {
      this.completedProofs.splice(0, this.completedProofs.length - this.MAX_COMPLETED);
    }
  }
}

export const autoRepairRealityLock = new AutoRepairRealityLock();
