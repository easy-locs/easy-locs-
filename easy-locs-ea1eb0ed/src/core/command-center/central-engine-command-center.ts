/**
 * Central Engine Command Center — Military-Grade Single Chain of Command
 *
 * ALL engines must pass through this Command Center before reaching RUNNING state.
 * No engine runs without registration, contract verification, and explicit approval.
 *
 * Lifecycle states (mandatory, no shortcuts):
 * DISCOVERED → REGISTERED → VERIFIED → APPROVED → READY → RUNNING →
 *   DEGRADED → QUARANTINED → BLOCKED → RETIRED
 *
 * Pillar 1 of the Engine Discipline Infrastructure.
 */

import {
  type EngineContract,
  type EngineLifecycleState,
  type ContractValidationResult,
  validateEngineContract,
} from "./engine-contract";

export interface EngineRegistration {
  engineId: string;
  engineName: string;
  contract: EngineContract | null;
  lifecycleState: EngineLifecycleState;
  contractValidation: ContractValidationResult;
  registeredAt: number;
  approvedAt: number | null;
  lastStateChange: number;
  stateHistory: LifecycleStateTransition[];
  runCount: number;
  errorCount: number;
  lastRunAt: number;
  lastErrorAt: number;
  blockedReason: string | null;
  quarantineReason: string | null;
  quarantineExpiresAt: number | null;
  budgetRemaining: number;
  budgetWindowStartAt: number;
  budgetConfig: BudgetConfig;
}

export interface LifecycleStateTransition {
  from: EngineLifecycleState;
  to: EngineLifecycleState;
  reason: string;
  timestamp: number;
  authorizedBy: string;
}

export interface CommandCenterStats {
  total: number;
  byState: Record<EngineLifecycleState, number>;
  blocked: number;
  quarantined: number;
  running: number;
  approved: number;
  registered: number;
  retired: number;
}

export interface EngineRunApproval {
  approved: boolean;
  engineId: string;
  currentState: EngineLifecycleState;
  reason: string;
}

export interface BudgetConfig {
  maxRunsPerWindow: number;
  windowMs: number;
}

const VALID_TRANSITIONS: Record<EngineLifecycleState, EngineLifecycleState[]> = {
  DISCOVERED: ["REGISTERED", "BLOCKED"],
  REGISTERED: ["VERIFIED", "BLOCKED"],
  VERIFIED: ["APPROVED", "BLOCKED", "QUARANTINED"],
  APPROVED: ["READY", "BLOCKED", "QUARANTINED"],
  READY: ["RUNNING", "BLOCKED", "QUARANTINED"],
  RUNNING: ["DEGRADED", "QUARANTINED", "BLOCKED", "RETIRED"],
  DEGRADED: ["RUNNING", "QUARANTINED", "BLOCKED", "RETIRED"],
  QUARANTINED: ["BLOCKED", "RETIRED"],
  BLOCKED: ["RETIRED"],
  RETIRED: [],
};

const STATES_ELIGIBLE_TO_RUN = new Set<EngineLifecycleState>(["RUNNING"]);

const DEFAULT_BUDGET: BudgetConfig = {
  maxRunsPerWindow: 1000,
  windowMs: 60_000,
};

class CentralEngineCommandCenter {
  private registrations = new Map<string, EngineRegistration>();
  private loopDetector = new Map<string, number[]>();
  private stormDetector = new Map<string, number[]>();
  private readonly STORM_WINDOW_MS = 10_000;
  private readonly STORM_THRESHOLD = 50;
  private readonly LOOP_THRESHOLD = 5;
  private readonly LOOP_WINDOW_MS = 5_000;
  private _initialized = false;
  private _initAt = 0;

  initialize(): void {
    if (this._initialized) return;
    this._initialized = true;
    this._initAt = Date.now();
  }

  /**
   * STEP 1: Discover an engine — it enters the lifecycle at DISCOVERED state.
   * No contract required yet at this stage.
   */
  discover(engineId: string, engineName: string): void {
    if (this.registrations.has(engineId)) return;

    const placeholder: EngineRegistration = {
      engineId,
      engineName,
      contract: null,
      lifecycleState: "DISCOVERED",
      contractValidation: { valid: false, engineId, errors: ["Not yet registered"], warnings: [], blockedReason: null },
      registeredAt: Date.now(),
      approvedAt: null,
      lastStateChange: Date.now(),
      stateHistory: [],
      runCount: 0,
      errorCount: 0,
      lastRunAt: 0,
      lastErrorAt: 0,
      blockedReason: null,
      quarantineReason: null,
      quarantineExpiresAt: null,
      budgetRemaining: DEFAULT_BUDGET.maxRunsPerWindow,
      budgetWindowStartAt: Date.now(),
      budgetConfig: DEFAULT_BUDGET,
    };

    this.registrations.set(engineId, placeholder);
  }

  /**
   * STEP 2: Register an engine with its full contract.
   * Contract is validated. Invalid contracts → BLOCKED.
   */
  register(
    engineId: string,
    engineName: string,
    contract: EngineContract,
    budgetConfig?: BudgetConfig,
  ): ContractValidationResult {
    const existing = this.registrations.get(engineId);
    if (existing && (existing.lifecycleState === "BLOCKED" || existing.lifecycleState === "QUARANTINED" || existing.lifecycleState === "RETIRED")) {
      return {
        valid: false,
        engineId,
        errors: [`Engine ${engineId} is in terminal state ${existing.lifecycleState} — re-registration denied. Reason: ${existing.blockedReason ?? existing.quarantineReason ?? "purge plan enforcement"}`],
        warnings: [],
        blockedReason: `Re-registration of ${existing.lifecycleState} engine is permanently denied`,
      };
    }

    const validation = validateEngineContract(contract);

    let currentState = existing?.lifecycleState ?? "DISCOVERED";

    if (!validation.valid) {
      const registration: EngineRegistration = {
        engineId,
        engineName,
        contract,
        lifecycleState: "BLOCKED",
        contractValidation: validation,
        registeredAt: Date.now(),
        approvedAt: null,
        lastStateChange: Date.now(),
        stateHistory: [
          { from: currentState, to: "BLOCKED", reason: `Invalid contract: ${validation.blockedReason}`, timestamp: Date.now(), authorizedBy: "CentralEngineCommandCenter" },
        ],
        runCount: 0,
        errorCount: 0,
        lastRunAt: 0,
        lastErrorAt: 0,
        blockedReason: validation.blockedReason,
        quarantineReason: null,
        quarantineExpiresAt: null,
        budgetRemaining: (budgetConfig ?? DEFAULT_BUDGET).maxRunsPerWindow,
        budgetWindowStartAt: Date.now(),
        budgetConfig: budgetConfig ?? DEFAULT_BUDGET,
      };
      this.registrations.set(engineId, registration);
      return validation;
    }

    const budget = budgetConfig ?? DEFAULT_BUDGET;
    const registration: EngineRegistration = {
      engineId,
      engineName,
      contract: { ...contract, registeredAt: Date.now() },
      lifecycleState: "REGISTERED",
      contractValidation: validation,
      registeredAt: Date.now(),
      approvedAt: null,
      lastStateChange: Date.now(),
      stateHistory: [
        { from: currentState, to: "REGISTERED", reason: "Contract validated and registered", timestamp: Date.now(), authorizedBy: "CentralEngineCommandCenter" },
      ],
      runCount: 0,
      errorCount: 0,
      lastRunAt: 0,
      lastErrorAt: 0,
      blockedReason: null,
      quarantineReason: null,
      quarantineExpiresAt: null,
      budgetRemaining: budget.maxRunsPerWindow,
      budgetWindowStartAt: Date.now(),
      budgetConfig: budget,
    };

    this.registrations.set(engineId, registration);
    return validation;
  }

  /**
   * STEP 3: Verify an engine (contract + dependencies checked).
   * Moves from REGISTERED → VERIFIED.
   */
  verify(engineId: string): { success: boolean; reason: string } {
    const reg = this.registrations.get(engineId);
    if (!reg) return { success: false, reason: "Engine not registered" };
    if (!this.canTransition(reg.lifecycleState, "VERIFIED")) {
      return { success: false, reason: `Cannot transition from ${reg.lifecycleState} to VERIFIED` };
    }

    const depErrors: string[] = [];
    for (const dep of reg.contract?.dependencies ?? []) {
      const depReg = this.registrations.get(dep);
      if (!depReg) {
        depErrors.push(`Dependency not found: ${dep}`);
      } else if (depReg.lifecycleState === "BLOCKED" || depReg.lifecycleState === "RETIRED") {
        depErrors.push(`Dependency ${dep} is in ${depReg.lifecycleState} state`);
      }
    }

    if (depErrors.length > 0) {
      this.transitionState(reg, "BLOCKED", `Dependency verification failed: ${depErrors.join("; ")}`, "CentralEngineCommandCenter");
      return { success: false, reason: `Dependency verification failed: ${depErrors.join("; ")}` };
    }

    this.transitionState(reg, "VERIFIED", "All dependencies verified", "CentralEngineCommandCenter");
    return { success: true, reason: "Verified" };
  }

  /**
   * STEP 4: Approve an engine for operation.
   * Moves from VERIFIED → APPROVED.
   */
  approve(engineId: string, approvedBy = "system"): { success: boolean; reason: string } {
    const reg = this.registrations.get(engineId);
    if (!reg) return { success: false, reason: "Engine not registered" };
    if (!this.canTransition(reg.lifecycleState, "APPROVED")) {
      return { success: false, reason: `Cannot transition from ${reg.lifecycleState} to APPROVED` };
    }

    this.transitionState(reg, "APPROVED", "Approved for operation", approvedBy);
    reg.approvedAt = Date.now();
    if (reg.contract) {
      reg.contract.approvedAt = Date.now();
      reg.contract.approvedBy = approvedBy;
    }
    return { success: true, reason: "Approved" };
  }

  /**
   * STEP 5: Mark an engine as READY to run.
   * Moves from APPROVED → READY.
   */
  makeReady(engineId: string): { success: boolean; reason: string } {
    const reg = this.registrations.get(engineId);
    if (!reg) return { success: false, reason: "Engine not registered" };
    if (!this.canTransition(reg.lifecycleState, "READY")) {
      return { success: false, reason: `Cannot transition from ${reg.lifecycleState} to READY` };
    }
    this.transitionState(reg, "READY", "Engine ready to run", "CentralEngineCommandCenter");
    return { success: true, reason: "Ready" };
  }

  /**
   * Request approval to run an engine.
   * Enforces all protections: anti-loop, anti-storm, budget, state checks.
   */
  requestRunApproval(engineId: string): EngineRunApproval {
    const reg = this.registrations.get(engineId);
    if (!reg) {
      return { approved: false, engineId, currentState: "BLOCKED", reason: "Engine not registered in Command Center" };
    }

    if (!STATES_ELIGIBLE_TO_RUN.has(reg.lifecycleState)) {
      if (reg.lifecycleState === "READY") {
        this.transitionState(reg, "RUNNING", "First run approved", "CentralEngineCommandCenter");
      } else if (reg.lifecycleState === "DEGRADED") {
        // Allow DEGRADED engines to attempt recovery runs (bounded/guarded).
        // On success, reportRunSuccess() will transition back to RUNNING.
        // On continued error, reportRunError() may quarantine.
      } else {
        return {
          approved: false,
          engineId,
          currentState: reg.lifecycleState,
          reason: `Engine in ${reg.lifecycleState} state — must be RUNNING or DEGRADED to execute. Complete full lifecycle first.`,
        };
      }
    }

    if (this.detectLoop(engineId)) {
      this.transitionState(reg, "QUARANTINED", "Anti-loop protection triggered", "CentralEngineCommandCenter");
      reg.quarantineReason = "LOOP_DETECTED";
      reg.quarantineExpiresAt = Date.now() + (reg.contract?.quarantinePolicy.quarantine_duration_ms ?? 300_000);
      return {
        approved: false,
        engineId,
        currentState: "QUARANTINED",
        reason: "ANTI-LOOP: Too many rapid invocations detected. Engine quarantined.",
      };
    }

    if (this.detectStorm(engineId)) {
      return {
        approved: false,
        engineId,
        currentState: reg.lifecycleState,
        reason: "ANTI-STORM: System-wide storm threshold exceeded. Execution suppressed.",
      };
    }

    if (this.detectDuplication(engineId)) {
      return {
        approved: false,
        engineId,
        currentState: reg.lifecycleState,
        reason: "ANTI-DUPLICATION: Concurrent run already in flight.",
      };
    }

    if (!this.checkBudget(reg)) {
      return {
        approved: false,
        engineId,
        currentState: reg.lifecycleState,
        reason: "BUDGET_EXCEEDED: Run budget depleted for current window.",
      };
    }

    this.consumeBudget(reg);
    this.recordInvocation(engineId);
    reg.lastRunAt = Date.now();
    return { approved: true, engineId, currentState: reg.lifecycleState, reason: "Approved" };
  }

  /**
   * Report a successful run completion.
   */
  reportRunSuccess(engineId: string): void {
    const reg = this.registrations.get(engineId);
    if (!reg) return;
    reg.runCount++;
    reg.lastRunAt = Date.now();

    if (reg.lifecycleState === "DEGRADED") {
      this.transitionState(reg, "RUNNING", "Recovered from DEGRADED after successful run", "CentralEngineCommandCenter");
    }
  }

  /**
   * Report a run error and evaluate quarantine thresholds.
   */
  reportRunError(engineId: string, error: string): void {
    const reg = this.registrations.get(engineId);
    if (!reg) return;
    reg.errorCount++;
    reg.lastErrorAt = Date.now();

    const defaultPolicy = { error_window_ms: 60_000, min_errors_to_quarantine: 5, auto_quarantine_on_error_rate: 0.8, quarantine_duration_ms: 300_000, require_manual_release: false };
    const policy = reg.contract?.quarantinePolicy ?? defaultPolicy;
    const recentWindow = reg.lastRunAt > 0 ? Date.now() - reg.lastRunAt : 0;
    const windowedErrors = recentWindow < policy.error_window_ms ? reg.errorCount : 0;

    if (windowedErrors >= policy.min_errors_to_quarantine) {
      const errorRate = reg.runCount > 0 ? reg.errorCount / reg.runCount : 1;
      if (errorRate >= policy.auto_quarantine_on_error_rate) {
        this.quarantine(engineId, `Auto-quarantine: error_rate=${errorRate.toFixed(2)}, errors=${reg.errorCount}. Last error: ${error}`);
        return;
      }
    }

    if (reg.lifecycleState === "RUNNING") {
      this.transitionState(reg, "DEGRADED", `Error reported: ${error}`, "CentralEngineCommandCenter");
    }
  }

  /**
   * Manually quarantine an engine.
   */
  quarantine(engineId: string, reason: string, durationMs?: number): boolean {
    const reg = this.registrations.get(engineId);
    if (!reg) return false;
    if (!this.canTransition(reg.lifecycleState, "QUARANTINED")) return false;

    this.transitionState(reg, "QUARANTINED", reason, "CentralEngineCommandCenter");
    reg.quarantineReason = reason;
    reg.quarantineExpiresAt = Date.now() + (durationMs ?? reg.contract?.quarantinePolicy.quarantine_duration_ms ?? 300_000);
    return true;
  }

  /**
   * Release an engine from quarantine (back to VERIFIED for re-approval cycle).
   */
  releaseFromQuarantine(engineId: string, authorizedBy: string): boolean {
    const reg = this.registrations.get(engineId);
    if (!reg || reg.lifecycleState !== "QUARANTINED") return false;

    if (reg.contract?.quarantinePolicy.require_manual_release && authorizedBy === "system") {
      return false;
    }

    this.transitionState(reg, "VERIFIED", "Released from quarantine", authorizedBy);
    reg.quarantineReason = null;
    reg.quarantineExpiresAt = null;
    return true;
  }

  /**
   * Block an engine permanently (manual intervention required to unblock).
   */
  block(engineId: string, reason: string, authorizedBy: string): boolean {
    const reg = this.registrations.get(engineId);
    if (!reg) return false;
    if (!this.canTransition(reg.lifecycleState, "BLOCKED")) return false;

    this.transitionState(reg, "BLOCKED", reason, authorizedBy);
    reg.blockedReason = reason;
    return true;
  }

  /**
   * Force-block an engine by ID — creates a BLOCKED registration record even if
   * the engine is not already registered in the CC. Used by the purge plan to
   * enforce SAFE-RM verdicts on engines identified as dangerous or superseded.
   * If the engine is already registered, transitions it to BLOCKED.
   */
  forceBlock(engineId: string, reason: string): void {
    const existing = this.registrations.get(engineId);
    if (existing) {
      if (existing.lifecycleState !== "BLOCKED" && existing.lifecycleState !== "RETIRED") {
        const fromState = existing.lifecycleState;
        existing.lifecycleState = "BLOCKED";
        existing.blockedReason = reason;
        existing.lastStateChange = Date.now();
        existing.stateHistory.push({ from: fromState, to: "BLOCKED", reason, timestamp: Date.now(), authorizedBy: "purge-plan" });
      }
      return;
    }
    const validation: ContractValidationResult = { valid: true, blockedReason: null, warnings: [], errors: [] };
    const reg: EngineRegistration = {
      engineId, engineName: engineId, contract: null,
      lifecycleState: "BLOCKED",
      contractValidation: validation,
      registeredAt: Date.now(), approvedAt: null, lastStateChange: Date.now(),
      stateHistory: [{ from: "DISCOVERED", to: "BLOCKED", reason, timestamp: Date.now(), authorizedBy: "purge-plan" }],
      runCount: 0, errorCount: 0, lastRunAt: 0, lastErrorAt: 0,
      blockedReason: reason, quarantineReason: null, quarantineExpiresAt: null,
      budgetRemaining: 0, budgetWindowStartAt: Date.now(),
      budgetConfig: DEFAULT_BUDGET,
    };
    this.registrations.set(engineId, reg);
  }

  /**
   * Force-quarantine an engine by ID — creates a QUARANTINED registration record
   * even if the engine is not already registered. Used by the purge plan to enforce
   * QUAR-OBS verdicts on engines classified as dangerous, uncertain, or autonomous
   * without governance gates.
   * If the engine is already registered, transitions it to QUARANTINED.
   */
  forceQuarantine(engineId: string, reason: string, durationMs: number): void {
    const existing = this.registrations.get(engineId);
    if (existing) {
      if (existing.lifecycleState !== "QUARANTINED" && existing.lifecycleState !== "BLOCKED" && existing.lifecycleState !== "RETIRED") {
        const fromState = existing.lifecycleState;
        existing.lifecycleState = "QUARANTINED";
        existing.quarantineReason = reason;
        existing.quarantineExpiresAt = Date.now() + durationMs;
        existing.lastStateChange = Date.now();
        existing.stateHistory.push({ from: fromState, to: "QUARANTINED", reason, timestamp: Date.now(), authorizedBy: "purge-plan" });
      }
      return;
    }
    const validation: ContractValidationResult = { valid: true, blockedReason: null, warnings: [], errors: [] };
    const reg: EngineRegistration = {
      engineId, engineName: engineId, contract: null,
      lifecycleState: "QUARANTINED",
      contractValidation: validation,
      registeredAt: Date.now(), approvedAt: null, lastStateChange: Date.now(),
      stateHistory: [{ from: "DISCOVERED", to: "QUARANTINED", reason, timestamp: Date.now(), authorizedBy: "purge-plan" }],
      runCount: 0, errorCount: 0, lastRunAt: 0, lastErrorAt: 0,
      blockedReason: null, quarantineReason: reason, quarantineExpiresAt: Date.now() + durationMs,
      budgetRemaining: 0, budgetWindowStartAt: Date.now(),
      budgetConfig: DEFAULT_BUDGET,
    };
    this.registrations.set(engineId, reg);
  }

  /**
   * Retire an engine permanently.
   */
  retire(engineId: string, reason: string, authorizedBy: string): boolean {
    const reg = this.registrations.get(engineId);
    if (!reg) return false;
    if (!this.canTransition(reg.lifecycleState, "RETIRED")) return false;

    this.transitionState(reg, "RETIRED", reason, authorizedBy);
    return true;
  }

  /**
   * Run the full registration+approval pipeline for a new engine in one step.
   * Useful for engines that are pre-approved at boot time.
   */
  registerAndApprove(
    engineId: string,
    engineName: string,
    contract: EngineContract,
    approvedBy = "system",
  ): { success: boolean; blockedReason: string | null; validation: ContractValidationResult } {
    const validation = this.register(engineId, engineName, contract);
    if (!validation.valid) {
      return { success: false, blockedReason: validation.blockedReason, validation };
    }
    const verifyResult = this.verify(engineId);
    if (!verifyResult.success) {
      return { success: false, blockedReason: verifyResult.reason, validation };
    }
    const approveResult = this.approve(engineId, approvedBy);
    if (!approveResult.success) {
      return { success: false, blockedReason: approveResult.reason, validation };
    }
    const readyResult = this.makeReady(engineId);
    if (!readyResult.success) {
      return { success: false, blockedReason: readyResult.reason, validation };
    }
    return { success: true, blockedReason: null, validation };
  }

  getRegistration(engineId: string): EngineRegistration | undefined {
    return this.registrations.get(engineId);
  }

  getAll(): EngineRegistration[] {
    return Array.from(this.registrations.values());
  }

  getByState(state: EngineLifecycleState): EngineRegistration[] {
    return this.getAll().filter((r) => r.lifecycleState === state);
  }

  getBlocked(): EngineRegistration[] {
    return this.getByState("BLOCKED");
  }

  getQuarantined(): EngineRegistration[] {
    return this.getByState("QUARANTINED");
  }

  getRunning(): EngineRegistration[] {
    return this.getByState("RUNNING");
  }

  getStats(): CommandCenterStats {
    const all = this.getAll();
    const byState: Record<string, number> = {};
    for (const reg of all) {
      byState[reg.lifecycleState] = (byState[reg.lifecycleState] ?? 0) + 1;
    }
    return {
      total: all.length,
      byState: byState as Record<EngineLifecycleState, number>,
      blocked: byState["BLOCKED"] ?? 0,
      quarantined: byState["QUARANTINED"] ?? 0,
      running: byState["RUNNING"] ?? 0,
      approved: byState["APPROVED"] ?? 0,
      registered: byState["REGISTERED"] ?? 0,
      retired: byState["RETIRED"] ?? 0,
    };
  }

  /**
   * Check and auto-release engines whose quarantine has expired.
   */
  processExpiredQuarantines(): number {
    const now = Date.now();
    let released = 0;
    for (const reg of this.registrations.values()) {
      if (
        reg.lifecycleState === "QUARANTINED" &&
        reg.quarantineExpiresAt !== null &&
        now > reg.quarantineExpiresAt &&
        !reg.contract?.quarantinePolicy.require_manual_release
      ) {
        this.releaseFromQuarantine(reg.engineId, "system-auto-release");
        released++;
      }
    }
    return released;
  }

  private canTransition(from: EngineLifecycleState, to: EngineLifecycleState): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  private transitionState(
    reg: EngineRegistration,
    to: EngineLifecycleState,
    reason: string,
    authorizedBy: string,
  ): void {
    const transition: LifecycleStateTransition = {
      from: reg.lifecycleState,
      to,
      reason,
      timestamp: Date.now(),
      authorizedBy,
    };
    reg.stateHistory.push(transition);
    if (reg.stateHistory.length > 100) {
      reg.stateHistory.splice(0, reg.stateHistory.length - 100);
    }
    reg.lifecycleState = to;
    reg.lastStateChange = Date.now();
  }

  private detectLoop(engineId: string): boolean {
    const now = Date.now();
    const history = this.loopDetector.get(engineId) ?? [];
    const recentHistory = history.filter((t) => now - t < this.LOOP_WINDOW_MS);
    return recentHistory.length >= this.LOOP_THRESHOLD;
  }

  private detectStorm(engineId: string): boolean {
    const now = Date.now();
    const history = this.stormDetector.get("__global__") ?? [];
    const recentHistory = history.filter((t) => now - t < this.STORM_WINDOW_MS);
    if (recentHistory.length >= this.STORM_THRESHOLD) return true;
    return false;
  }

  private detectDuplication(engineId: string): boolean {
    const reg = this.registrations.get(engineId);
    if (!reg) return false;
    const runAge = reg.lastRunAt > 0 ? Date.now() - reg.lastRunAt : Infinity;
    return reg.lifecycleState === "RUNNING" && runAge < 100;
  }

  private recordInvocation(engineId: string): void {
    const now = Date.now();
    const global = this.stormDetector.get("__global__") ?? [];
    global.push(now);
    if (global.length > 1000) global.splice(0, global.length - 1000);
    this.stormDetector.set("__global__", global);

    const local = this.loopDetector.get(engineId) ?? [];
    local.push(now);
    if (local.length > 50) local.splice(0, local.length - 50);
    this.loopDetector.set(engineId, local);
  }

  private checkBudget(reg: EngineRegistration): boolean {
    const now = Date.now();
    const budget = reg.budgetConfig;
    if (now - reg.budgetWindowStartAt > budget.windowMs) {
      reg.budgetRemaining = budget.maxRunsPerWindow;
      reg.budgetWindowStartAt = now;
    }
    return reg.budgetRemaining > 0;
  }

  private consumeBudget(reg: EngineRegistration): void {
    reg.budgetRemaining = Math.max(0, reg.budgetRemaining - 1);
  }
}

export const centralEngineCommandCenter = new CentralEngineCommandCenter();
