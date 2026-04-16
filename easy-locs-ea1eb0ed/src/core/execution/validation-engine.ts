/**
 * ValidationEngine — phase-1 governance gate.
 *
 * Verifies a candidate execution task before it is allowed to leave PENDING.
 * Reuses repair-safety guardrails (storm/quarantine state) and the engine-contract
 * deny-by-default discipline.
 *
 * CRITICAL tasks lacking `approved_by` are immediately BLOCKED.
 */

import {
  classifyTaskType,
  isKnownTaskType,
  mediumRequiresApproval,
  type RiskLevel,
} from "./risk-classification";
import { isAllowedDispatchDomain } from "./allowed-domains";
import type {
  DispatchTaskRequest,
  ValidationOutcome,
} from "./types";
import {
  isQuarantined,
  isRepairStormActive,
} from "@/engines/core/repair-safety";
import {
  validateEngineContract,
  createDefaultContract,
  type EngineContract,
} from "@/core/command-center/engine-contract";

/**
 * The execution pipeline itself is governed by an engine contract — the same
 * contract discipline used by the rest of the platform. Every dispatch round
 * re-validates this contract via `validateEngineContract`, so the pipeline
 * cannot operate if its own contract drifts out of compliance.
 */
const EXECUTION_PIPELINE_CONTRACT: EngineContract = createDefaultContract(
  "execution-pipeline",
  "platform-governance",
  "Phase-1 autonomous execution layer: classify, validate, log, and dispatch tasks under strict CRITICAL gating.",
  {
    trustLevel: "GOLD",
    executionMode: "EVENT_DRIVEN",
    forbiddenActions: [
      "SILENT_PATCH",
      "BLIND_PATCH",
      "ROOT_CAUSE_MASKING",
      "CONFLICT_CREATING_PATCH",
      "OFF_TAXONOMY_PATCH",
      "OFF_VERSION_PATCH",
      "DIRECT_DB_WRITE_WITHOUT_VALIDATION",
      "BYPASS_COMMAND_CENTER",
      "AUTONOMOUS_CRITICAL_EXECUTION",
    ],
    allowedInputs: ["execution-task-request"],
    allowedOutputs: ["execution-task-row", "engine-run-log"],
    allowedEvents: ["execution:task:dispatched", "execution:task:blocked"],
    maxConcurrentRuns: 32,
    timeoutMs: 60_000,
  },
);

export interface ValidationInput {
  request: DispatchTaskRequest;
  riskLevel: RiskLevel;
}

export class ValidationEngine {
  validate(input: ValidationInput): ValidationOutcome {
    const { request, riskLevel } = input;
    const warnings: string[] = [];

    // 0. Engine-contract governance reuse: the pipeline's own contract must be
    //    valid every dispatch. If the platform's contract discipline rejects it,
    //    refuse to dispatch (fail closed).
    const contractCheck = validateEngineContract(EXECUTION_PIPELINE_CONTRACT);
    if (!contractCheck.valid) {
      return blocked(
        `EXECUTION_PIPELINE_CONTRACT_INVALID: ${contractCheck.blockedReason ?? contractCheck.errors.join("; ")}`,
      );
    }

    // 1. Required fields.
    if (!request.type || typeof request.type !== "string") {
      return blocked("MISSING_TYPE: task.type is required");
    }
    if (!request.domain || typeof request.domain !== "string") {
      return blocked("MISSING_DOMAIN: task.domain is required");
    }
    // Soft check against the central registry: if a domain is outside the
    // known set, surface a warning so admins can spot drift, but do NOT
    // block — existing call sites use dynamic domains (e.g. entity types)
    // and would regress under a hard gate. Hardening to a hard gate is
    // tracked separately.
    if (!isAllowedDispatchDomain(request.domain)) {
      warnings.push(
        `UNKNOWN_DOMAIN: '${request.domain}' is not in ALLOWED_DISPATCH_DOMAINS — verify the central registry`,
      );
    }
    if (request.payload && typeof request.payload !== "object") {
      return blocked("INVALID_PAYLOAD: payload must be a JSON object");
    }

    // 2. Deny-by-default: unknown task types are auto-CRITICAL — surface why.
    if (!isKnownTaskType(request.type)) {
      warnings.push(
        `UNKNOWN_TASK_TYPE: '${request.type}' not in classification table — auto-classified CRITICAL`,
      );
    }

    // 3. Phase-1 storm guard. If the global repair storm is active, hold MEDIUM/CRITICAL.
    if (isRepairStormActive() && riskLevel !== "SAFE") {
      return blocked("REPAIR_STORM_ACTIVE: non-SAFE tasks suppressed during storm cooldown");
    }

    // 4. Domain quarantine.
    if (isQuarantined(`domain:${request.domain}`)) {
      return blocked(`DOMAIN_QUARANTINED: '${request.domain}' is currently quarantined`);
    }

    // 5. MEDIUM per-type approval policy. Some MEDIUM task types (e.g.
    //    NOTIFICATION_DISPATCH, NON_SENSITIVE_BULK_UPDATE) require an explicit
    //    non-system approver per the SAFE/MEDIUM/CRITICAL governance contract;
    //    others may run without approval. The policy map is the single source
    //    of truth — do not inline the rule here.
    if (riskLevel === "MEDIUM" && mediumRequiresApproval(request.type)) {
      const approver = (request.approvedBy ?? "").trim();
      if (!approver || approver === "system") {
        return blocked(
          `MEDIUM_REQUIRES_APPROVAL: task type '${request.type}' is approval-gated and cannot run without a non-system approver`,
        );
      }
    }

    // 6. CRITICAL gate — must have explicit approver.
    if (riskLevel === "CRITICAL") {
      const approver = (request.approvedBy ?? "").trim();
      if (!approver) {
        return blocked(
          `CRITICAL_REQUIRES_APPROVAL: task type '${request.type}' is CRITICAL and cannot run without approved_by`,
        );
      }
      if (approver === "system") {
        return blocked(
          "CRITICAL_REQUIRES_HUMAN_APPROVAL: 'system' is not an acceptable approver for CRITICAL tasks",
        );
      }
    }

    return {
      valid: true,
      blocked: false,
      blockedReason: null,
      warnings,
    };
  }
}

function blocked(reason: string): ValidationOutcome {
  return {
    valid: false,
    blocked: true,
    blockedReason: reason,
    warnings: [],
  };
}

export const validationEngine = new ValidationEngine();
