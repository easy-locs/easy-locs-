/**
 * Engine Contract Spec — Military-Grade Governance
 *
 * Every engine MUST declare a contract with all mandatory fields.
 * Engines without valid contracts are BLOCKED from reaching RUNNING state.
 *
 * Pillar 2 of the Engine Discipline Infrastructure.
 */

export type EngineLifecycleState =
  | "DISCOVERED"
  | "REGISTERED"
  | "VERIFIED"
  | "APPROVED"
  | "READY"
  | "RUNNING"
  | "DEGRADED"
  | "QUARANTINED"
  | "BLOCKED"
  | "RETIRED";

export type EngineTrustLevel = "PLATINUM" | "GOLD" | "SILVER" | "BRONZE" | "UNTRUSTED";
export type EngineExecutionMode = "SYNC" | "ASYNC" | "SCHEDULED" | "EVENT_DRIVEN" | "MANUAL" | "CONTINUOUS";
export type EngineInputType = string;
export type EngineOutputType = string;
export type EngineEventType = string;
export type ForbiddenAction = string;

export interface EngineRetryPolicy {
  max_retries: number;
  backoff_ms: number;
  exponential: boolean;
  max_backoff_ms: number;
}

export interface EngineRollbackPolicy {
  enabled: boolean;
  auto_rollback_on_failure: boolean;
  rollback_timeout_ms: number;
  rollback_validator?: string;
}

export interface EngineQuarantinePolicy {
  auto_quarantine_on_error_rate: number;
  error_window_ms: number;
  min_errors_to_quarantine: number;
  quarantine_duration_ms: number;
  require_manual_release: boolean;
}

export interface EngineHealthCheckConfig {
  method: "heartbeat" | "ping" | "status_check" | "custom";
  interval_ms: number;
  timeout_ms: number;
  failure_threshold: number;
  success_threshold: number;
}

/**
 * Full mandatory contract every engine must declare before registration.
 * Missing or invalid contracts result in BLOCKED state.
 */
export interface EngineContract {
  engineId: string;
  version: string;
  domainOwner: string;
  purpose: string;
  allowedInputs: EngineInputType[];
  allowedOutputs: EngineOutputType[];
  allowedEvents: EngineEventType[];
  forbiddenActions: ForbiddenAction[];
  priority: number;
  executionMode: EngineExecutionMode;
  retryPolicy: EngineRetryPolicy;
  rollbackPolicy: EngineRollbackPolicy;
  quarantinePolicy: EngineQuarantinePolicy;
  trustLevel: EngineTrustLevel;
  learningEligibility: boolean;
  healthCheckMethod: EngineHealthCheckConfig;
  dependencies: string[];
  maxConcurrentRuns: number;
  timeoutMs: number;
  registeredAt?: number;
  approvedAt?: number;
  approvedBy?: string;
}

export interface ContractValidationResult {
  valid: boolean;
  engineId: string;
  errors: string[];
  warnings: string[];
  blockedReason: string | null;
}

const REQUIRED_STRING_FIELDS: Array<keyof EngineContract> = [
  "engineId",
  "version",
  "domainOwner",
  "purpose",
];

const DEFAULT_FORBIDDEN_ACTIONS: ForbiddenAction[] = [
  "SILENT_PATCH",
  "BLIND_PATCH",
  "ROOT_CAUSE_MASKING",
  "CONFLICT_CREATING_PATCH",
  "OFF_TAXONOMY_PATCH",
  "OFF_VERSION_PATCH",
  "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
  "BYPASS_COMMAND_CENTER",
];

/**
 * Validates an engine contract for completeness and correctness.
 * Returns a detailed validation result with all errors and warnings.
 */
export function validateEngineContract(contract: unknown): ContractValidationResult {
  const result: ContractValidationResult = {
    valid: false,
    engineId: "unknown",
    errors: [],
    warnings: [],
    blockedReason: null,
  };

  if (!contract || typeof contract !== "object") {
    result.errors.push("Contract must be a non-null object");
    result.blockedReason = "NULL_OR_INVALID_CONTRACT";
    return result;
  }

  const c = contract as Partial<EngineContract>;
  result.engineId = typeof c.engineId === "string" ? c.engineId : "unknown";

  for (const field of REQUIRED_STRING_FIELDS) {
    const value = c[field];
    if (!value || typeof value !== "string" || value.trim() === "") {
      result.errors.push(`Missing or empty required field: ${field}`);
    }
  }

  if (!c.version || !/^\d+\.\d+\.\d+/.test(c.version)) {
    result.errors.push("version must be a valid semver string (e.g. '1.0.0')");
  }

  if (typeof c.priority !== "number" || c.priority < 1 || c.priority > 100) {
    result.errors.push("priority must be a number between 1 and 100");
  }

  const validModes: EngineExecutionMode[] = ["SYNC", "ASYNC", "SCHEDULED", "EVENT_DRIVEN", "MANUAL", "CONTINUOUS"];
  if (!c.executionMode || !validModes.includes(c.executionMode)) {
    result.errors.push(`executionMode must be one of: ${validModes.join(", ")}`);
  }

  const validTrustLevels: EngineTrustLevel[] = ["PLATINUM", "GOLD", "SILVER", "BRONZE", "UNTRUSTED"];
  if (!c.trustLevel || !validTrustLevels.includes(c.trustLevel)) {
    result.errors.push(`trustLevel must be one of: ${validTrustLevels.join(", ")}`);
  }

  if (!Array.isArray(c.allowedInputs)) {
    result.errors.push("allowedInputs must be an array");
  }
  if (!Array.isArray(c.allowedOutputs)) {
    result.errors.push("allowedOutputs must be an array");
  }
  if (!Array.isArray(c.allowedEvents)) {
    result.errors.push("allowedEvents must be an array");
  }
  if (!Array.isArray(c.forbiddenActions)) {
    result.errors.push("forbiddenActions must be an array");
  }
  if (!Array.isArray(c.dependencies)) {
    result.errors.push("dependencies must be an array");
  }

  if (!c.retryPolicy || typeof c.retryPolicy !== "object") {
    result.errors.push("retryPolicy is required");
  } else {
    const rp = c.retryPolicy;
    if (typeof rp.max_retries !== "number") result.errors.push("retryPolicy.max_retries must be a number");
    if (typeof rp.backoff_ms !== "number") result.errors.push("retryPolicy.backoff_ms must be a number");
    if (typeof rp.exponential !== "boolean") result.errors.push("retryPolicy.exponential must be a boolean");
  }

  if (!c.rollbackPolicy || typeof c.rollbackPolicy !== "object") {
    result.errors.push("rollbackPolicy is required");
  } else {
    const rbp = c.rollbackPolicy;
    if (typeof rbp.enabled !== "boolean") result.errors.push("rollbackPolicy.enabled must be a boolean");
    if (typeof rbp.auto_rollback_on_failure !== "boolean") result.errors.push("rollbackPolicy.auto_rollback_on_failure must be a boolean");
  }

  if (!c.quarantinePolicy || typeof c.quarantinePolicy !== "object") {
    result.errors.push("quarantinePolicy is required");
  } else {
    const qp = c.quarantinePolicy;
    if (typeof qp.auto_quarantine_on_error_rate !== "number") result.errors.push("quarantinePolicy.auto_quarantine_on_error_rate must be a number");
    if (typeof qp.require_manual_release !== "boolean") result.errors.push("quarantinePolicy.require_manual_release must be a boolean");
  }

  if (!c.healthCheckMethod || typeof c.healthCheckMethod !== "object") {
    result.errors.push("healthCheckMethod is required");
  } else {
    const hc = c.healthCheckMethod;
    const validMethods = ["heartbeat", "ping", "status_check", "custom"];
    if (!validMethods.includes(hc.method)) result.errors.push(`healthCheckMethod.method must be one of: ${validMethods.join(", ")}`);
    if (typeof hc.interval_ms !== "number") result.errors.push("healthCheckMethod.interval_ms must be a number");
    if (typeof hc.timeout_ms !== "number") result.errors.push("healthCheckMethod.timeout_ms must be a number");
  }

  if (typeof c.learningEligibility !== "boolean") {
    result.errors.push("learningEligibility must be a boolean");
  }

  if (typeof c.maxConcurrentRuns !== "number" || c.maxConcurrentRuns < 1) {
    result.errors.push("maxConcurrentRuns must be a positive number");
  }

  if (typeof c.timeoutMs !== "number" || c.timeoutMs < 100) {
    result.errors.push("timeoutMs must be at least 100ms");
  }

  if (Array.isArray(c.forbiddenActions)) {
    const missingDefaults = DEFAULT_FORBIDDEN_ACTIONS.filter(
      (action) => !c.forbiddenActions!.includes(action),
    );
    if (missingDefaults.length > 0) {
      result.warnings.push(`Missing default forbidden actions: ${missingDefaults.join(", ")}`);
    }
  }

  if (c.trustLevel === "UNTRUSTED") {
    result.warnings.push("Engine has UNTRUSTED trust level — may be blocked from sensitive operations");
  }

  if (result.errors.length > 0) {
    result.blockedReason = `CONTRACT_VALIDATION_FAILED: ${result.errors.length} error(s)`;
  } else {
    result.valid = true;
  }

  return result;
}

/**
 * Creates a minimal valid contract with sensible defaults.
 * Use this as a template — fill in domain-specific fields.
 */
export function createDefaultContract(
  engineId: string,
  domainOwner: string,
  purpose: string,
  overrides: Partial<EngineContract> = {},
): EngineContract {
  return {
    engineId,
    version: "1.0.0",
    domainOwner,
    purpose,
    allowedInputs: [],
    allowedOutputs: [],
    allowedEvents: [],
    forbiddenActions: [...DEFAULT_FORBIDDEN_ACTIONS],
    priority: 50,
    executionMode: "SCHEDULED",
    retryPolicy: {
      max_retries: 3,
      backoff_ms: 1000,
      exponential: true,
      max_backoff_ms: 30_000,
    },
    rollbackPolicy: {
      enabled: true,
      auto_rollback_on_failure: true,
      rollback_timeout_ms: 10_000,
    },
    quarantinePolicy: {
      auto_quarantine_on_error_rate: 0.5,
      error_window_ms: 60_000,
      min_errors_to_quarantine: 5,
      quarantine_duration_ms: 300_000,
      require_manual_release: false,
    },
    trustLevel: "SILVER",
    learningEligibility: false,
    healthCheckMethod: {
      method: "heartbeat",
      interval_ms: 60_000,
      timeout_ms: 5_000,
      failure_threshold: 3,
      success_threshold: 1,
    },
    dependencies: [],
    maxConcurrentRuns: 1,
    timeoutMs: 30_000,
    registeredAt: Date.now(),
    ...overrides,
  };
}
