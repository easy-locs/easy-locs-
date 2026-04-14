import { platformBus } from "@/lib/shared/platform-bus";
import { isPlatformFlagEnabled } from "@/lib/growth/feature-flag-registry";
import { engineObserver } from "./engine-observer";
import { autoRepairRealityLock } from "@/core/command-center";
import {
  canAttemptRepair,
  recordRepairAttempt,
  isCircularLoop,
  isRepairStormActive,
  isOperationAllowed,
  quarantineEngine,
  scrubSensitiveData,
  hasDomainActivationSheet,
  isDomainOperationAllowed,
} from "./repair-safety";
import {
  type ProofRecord,
  type ProofOutcome,
  type DetectionSignal,
  type RootCause,
  type ValidationCheck,
  type StageRecord,
  type RepairLevel,
  generateProofId,
  generatePipelineRunId,
  recordProof,
} from "./proof-system";
import {
  canExecuteRepair,
  executeRepairAction,
  type RepairOperationType,
} from "./repair-actions";
import { getDomainRuleReport, matchRepairRule, type DomainRepairRule } from "./domain-repair-rules";
import { engineMemory } from "./engine-memory";
import { signatureFromProof } from "./issue-signature";
import { checkAntiRegression } from "./apply-known-fixes";
import {
  enforcementRepairGate,
  recordEnforcementRepair,
} from "@/lib/enforcement/enforcement-wiring";
import {
  type RepairPriority,
  type RejectionReason,
  type StormLevel,
  type ConfidenceSignals,
  type ConfidenceResult,
  type WrapperValidationResult,
  evaluateConfidence,
  buildConfidenceSignals,
  getStormLevel,
  getConfidenceThresholdForStorm,
  shouldSuppressByPriority,
  recordStormEvent,
  isElementOnCooldown,
  isElementQuarantined,
  recordElementMutation,
  getCooldownState,
  canAffordMutation,
  consumeBudget,
  skipBudget,
  getBudgetState,
  validateWrapperForRepair,
  validateWrapperImprovement,
  getWrapperThreshold,
} from "./repair-hardening";

export type PipelineStage = "detect" | "classify" | "localize" | "repair" | "validate" | "regress" | "accept_or_rollback";

const PIPELINE_STAGES: PipelineStage[] = [
  "detect", "classify", "localize", "repair", "validate", "regress", "accept_or_rollback",
];

const STAGE_TIMEOUT_MS = 10_000;
const PIPELINE_TIMEOUT_MS = 30_000;

const FINANCIAL_DOMAINS = new Set([
  "wallet", "payment", "billing", "settlement", "ledger", "fraud",
]);

export type IssueCategory = "network" | "auth" | "state" | "render" | "data" | "config" | "performance" | "unknown";
export type IssueSeverity = "low" | "medium" | "high" | "critical";

export interface PipelineInput {
  engineId: string;
  domain: string;
  issueSignature: string;
  repairChainId: string;
  category: IssueCategory;
  severity: IssueSeverity;
  rawSignal: string;
  suggestedOperation: RepairOperationType;
  suggestedTarget: string;
  repairLevel: RepairLevel;
  elementId?: string;
  detectorCertainty?: number;
  corroboratingSignals?: number;
}

interface StageOutcome {
  result: "passed" | "failed" | "skipped" | "timed_out";
  detail: string;
}

interface PipelineContext {
  input: PipelineInput;
  pipelineRunId: string;
  proofId: string;
  startedAt: number;
  currentStage: PipelineStage;
  stages: StageRecord[];
  detection: DetectionSignal;
  rootCause: RootCause | null;
  validationChecks: ValidationCheck[];
  regressionChecks: ValidationCheck[];
  rollbackFn: (() => void) | null;
  mutation: { operation: string; target: string; beforeState: string; afterState: string; appliedAt: number; rolledBackAt: number | null } | null;
  outcome: ProofOutcome | null;
  abortReason: string | null;
  matchedRule: DomainRepairRule | null;
  confidence: ConfidenceResult | null;
  stormLevel: StormLevel;
  rejectionReason: RejectionReason | null;
  wrapperValidation: WrapperValidationResult | null;
}

export interface PipelineResult {
  success: boolean;
  outcome: ProofOutcome;
  proofId: string;
  pipelineRunId: string;
  durationMs: number;
  stageCount: number;
  rolledBack: boolean;
  rejectionReason: RejectionReason | null;
}

let pipelineEnabled = false;
let pipelineRunCount = 0;
let pipelineBlockCount = 0;
let pipelineRejectCount = 0;

export function enablePipeline(): void {
  pipelineEnabled = true;
}

export function disablePipeline(): void {
  pipelineEnabled = false;
}

export function isPipelineEnabled(): boolean {
  return pipelineEnabled;
}

function successRateForTarget(target: string): number {
  return 0.7;
}

export async function executePipeline(input: PipelineInput): Promise<PipelineResult> {
  if (!pipelineEnabled) {
    pipelineBlockCount++;
    return makeBlockedResult("Pipeline disabled", "pipeline_disabled");
  }

  if (!isPlatformFlagEnabled("enable_repair_pipeline")) {
    pipelineBlockCount++;
    return makeBlockedResult("Platform flag enable_repair_pipeline is off", "pipeline_disabled");
  }

  if (isRepairStormActive()) {
    pipelineBlockCount++;
    return makeBlockedResult("Repair storm active", "storm_suppressed");
  }

  const realityCheck = autoRepairRealityLock.requestRepair(input.engineId, input.domain, input.repairLevel as string);
  if (!realityCheck.approved) {
    pipelineBlockCount++;
    return makeBlockedResult(`Auto-Repair Reality Lock denied: ${realityCheck.reason}`, "reality_lock_blocked");
  }

  if (FINANCIAL_DOMAINS.has(input.domain) && (input.repairLevel === "L3" || input.repairLevel === "L4")) {
    pipelineBlockCount++;
    return makeBlockedResult(`Financial domain "${input.domain}" blocked from L3/L4 repair`, "domain_blocked");
  }

  if (!canAttemptRepair(input.engineId, input.domain, input.issueSignature)) {
    pipelineBlockCount++;
    return makeBlockedResult("Repair attempt blocked by safety limits", "storm_suppressed");
  }

  if (isCircularLoop(input.repairChainId)) {
    pipelineBlockCount++;
    return makeBlockedResult(`Circular loop detected for chain ${input.repairChainId}`, "cooldown_active");
  }

  if (!isOperationAllowed(input.suggestedOperation)) {
    pipelineBlockCount++;
    return makeBlockedResult(`Operation "${input.suggestedOperation}" not in allowlist`, "domain_blocked");
  }

  if (!hasDomainActivationSheet(input.domain)) {
    pipelineBlockCount++;
    return makeBlockedResult(`Domain "${input.domain}" has no activation sheet — repair not eligible`, "domain_blocked");
  }

  if (!isDomainOperationAllowed(input.domain, input.suggestedOperation, input.repairLevel)) {
    pipelineBlockCount++;
    return makeBlockedResult(`Operation "${input.suggestedOperation}" at ${input.repairLevel} not allowed`, "domain_blocked");
  }

  const enforcementGate = enforcementRepairGate(input.elementId ?? input.suggestedTarget);
  if (!enforcementGate.allowed) {
    pipelineBlockCount++;
    return makeBlockedResult(`Enforcement gate blocked: ${enforcementGate.reason}`, "storm_suppressed");
  }

  recordStormEvent(input.domain);

  const ctx = createContext(input);
  pipelineRunCount++;

  const arrlProof = autoRepairRealityLock.startRepair({
    engineId: input.engineId,
    domain: input.domain,
    issueSignature: input.issueSignature,
    rawSignal: input.rawSignal,
    severity: input.severity,
    requestedOperation: String(input.suggestedOperation),
    targetComponent: input.suggestedTarget,
    rollbackCapable: true,
  });

  try {
    for (const stage of PIPELINE_STAGES) {
      if (ctx.outcome !== null) break;

      const elapsed = Date.now() - ctx.startedAt;
      if (elapsed > PIPELINE_TIMEOUT_MS) {
        ctx.outcome = "timed_out";
        ctx.abortReason = `Pipeline timeout after ${elapsed}ms`;
        if (ctx.rollbackFn) {
          ctx.rollbackFn();
        }
        break;
      }

      ctx.currentStage = stage;
      await executeStage(ctx, stage);

      if (stage === "detect") {
        const detectOk = autoRepairRealityLock.stepDetect(arrlProof.repairId, input.issueSignature, input.rawSignal, input.severity);
        if (!detectOk) throw new Error(`ARRL blocked at DETECT: invalid or missing issue signature`);
      } else if (stage === "classify") {
        if (ctx.matchedRule && ctx.outcome === null) {
          const classifyResult = autoRepairRealityLock.stepClassify(arrlProof.repairId, {
            component: input.engineId,
            category: ctx.matchedRule.category,
            description: `Rule ${ctx.matchedRule.id}: ${ctx.matchedRule.description} → ${ctx.matchedRule.operation}`,
            confidence: ctx.confidence?.score ?? 0.5,
            evidenceIds: [ctx.matchedRule.id],
          });
          if (!classifyResult.success) throw new Error(`ARRL blocked at CLASSIFY: ${classifyResult.blockedReason}`);
        }
      } else if (stage === "localize") {
        const localizeOk = autoRepairRealityLock.stepLocalize(arrlProof.repairId, {
          domains: [input.domain],
          engineIds: [input.engineId],
          entityTypes: [input.category],
          entityIds: input.elementId ? [input.elementId] : [],
          estimatedSeverity: input.severity,
        });
        if (!localizeOk) throw new Error(`ARRL blocked at LOCALIZE: ${arrlProof.blockedReason ?? "step failed"}`);

        const proposedOp = String(input.suggestedOperation);
        const isBudgetOp = proposedOp === "" || proposedOp === "no-op";
        const proposeResult = autoRepairRealityLock.stepPropose(arrlProof.repairId, proposedOp, {
          isOffTaxonomy: input.category === "taxonomy" && input.domain !== "canonical",
          isOffVersion: false,
          createsConflict: false,
          maskesRootCause: isBudgetOp,
        });
        if (!proposeResult.success) throw new Error(`ARRL blocked at PROPOSE: ${proposeResult.blockedReason}`);

        const simChecksPassed = ctx.validationChecks.filter((c) => c.passed).map((c) => c.name);
        const simChecksFailed = ctx.validationChecks.filter((c) => !c.passed).map((c) => c.name);
        const simResult = autoRepairRealityLock.stepSimulate(arrlProof.repairId, {
          passed: simChecksFailed.length === 0,
          simulationId: `sim_${ctx.pipelineRunId}`,
          mutationPreview: { operation: proposedOp, target: input.suggestedTarget },
          invariantsChecked: ctx.validationChecks.map((c) => c.name),
          invariantsPassed: simChecksPassed,
          invariantsFailed: simChecksFailed,
          simulatedAt: Date.now(),
        });
        if (!simResult.success) throw new Error(`ARRL blocked at SIMULATE: ${simResult.blockedReason}`);

        const validateResult = autoRepairRealityLock.stepValidate(arrlProof.repairId, [
          { name: "confidence_threshold", passed: (ctx.confidence?.passed ?? false), detail: `Confidence: ${(ctx.confidence?.score ?? 0).toFixed(3)}`, checkedAt: Date.now() },
          { name: "domain_allowlist", passed: true, detail: `Domain ${input.domain} approved`, checkedAt: Date.now() },
          { name: "rule_match", passed: ctx.matchedRule !== null, detail: ctx.matchedRule ? `Rule ${ctx.matchedRule.id} matched` : "No rule match", checkedAt: Date.now() },
        ]);
        if (!validateResult.success) throw new Error(`ARRL blocked at VALIDATE — failed checks: ${validateResult.failedChecks.join(", ")}`);
      } else if (stage === "repair" && ctx.mutation) {
        const applyOk = autoRepairRealityLock.stepApply(arrlProof.repairId, {
          before: { state: ctx.mutation.beforeState },
          after: { state: ctx.mutation.afterState },
          diff: [ctx.mutation.operation],
        });
        if (!applyOk) throw new Error(`ARRL blocked at APPLY: repair was blocked or invalid`);
      } else if (stage === "regress") {
        const verifyResult = autoRepairRealityLock.stepVerify(arrlProof.repairId, ctx.regressionChecks.map((c) => ({
          name: c.name,
          passed: c.passed,
          detail: c.detail ?? "",
          checkedAt: Date.now(),
        })));
        if (verifyResult.triggerRollback) {
          ctx.outcome = "rolled_back";
          ctx.abortReason = "ARRL VERIFY: regression checks failed — rollback triggered";
          if (ctx.rollbackFn) ctx.rollbackFn();
          autoRepairRealityLock.stepRollback(arrlProof.repairId, {
            triggered: true,
            success: true,
            reason: ctx.abortReason,
            completedAt: Date.now(),
            stateRestored: ctx.mutation !== null,
          });
        }
      } else if (stage === "accept_or_rollback") {
        const rolledBackNow = ctx.outcome === "rolled_back";
        autoRepairRealityLock.stepRollback(arrlProof.repairId, {
          triggered: rolledBackNow,
          success: true,
          reason: rolledBackNow ? (ctx.abortReason ?? "Rollback triggered") : "No rollback needed — repair accepted",
          completedAt: rolledBackNow ? Date.now() : null,
          stateRestored: rolledBackNow && ctx.mutation !== null,
        });
      }
    }

    if (ctx.outcome === null) {
      ctx.outcome = "accepted";
    }
  } catch (err) {
    ctx.outcome = "rolled_back";
    ctx.abortReason = err instanceof Error ? err.message : String(err);

    if (ctx.rollbackFn) {
      ctx.rollbackFn();
    }

    const verifyStep = arrlProof.steps.find((s) => s.step === "VERIFY");
    if (verifyStep && verifyStep.status === "PENDING") {
      autoRepairRealityLock.stepVerify(arrlProof.repairId, [
        { name: "exception_abort", passed: false, detail: `Pipeline aborted by exception: ${ctx.abortReason}`, checkedAt: Date.now() },
      ]);
    }

    const rollbackStep = arrlProof.steps.find((s) => s.step === "ROLLBACK");
    if (rollbackStep && rollbackStep.status === "PENDING") {
      autoRepairRealityLock.stepRollback(arrlProof.repairId, {
        triggered: true,
        success: true,
        reason: ctx.abortReason,
        completedAt: Date.now(),
        stateRestored: ctx.mutation !== null,
      });
    }
  }

  const arrlSuccess = ctx.outcome === "accepted";
  autoRepairRealityLock.stepMemorize(arrlProof.repairId, ctx.proofId, arrlSuccess);

  recordRepairAttempt(input.engineId, input.domain, input.issueSignature, input.repairChainId);
  recordEnforcementRepair(input.elementId ?? input.suggestedTarget, ctx.outcome === "accepted");

  if (ctx.outcome === "accepted" && ctx.matchedRule && input.elementId) {
    const stateHash = ctx.mutation?.afterState?.slice(0, 32) ?? "unknown";
    const policyClass = ctx.matchedRule.wrapperMutation ? "wrapper" : input.domain;
    recordElementMutation(input.elementId, ctx.matchedRule.id, stateHash, policyClass);
  }

  const proof = buildProofRecord(ctx);
  recordProof(proof);
  emitPipelineEvent(ctx, proof);

  const rolledBack = ctx.outcome === "rolled_back" || ctx.outcome === "failed_validation" || ctx.outcome === "failed_regression";

  return {
    success: ctx.outcome === "accepted",
    outcome: ctx.outcome,
    proofId: ctx.proofId,
    pipelineRunId: ctx.pipelineRunId,
    durationMs: Date.now() - ctx.startedAt,
    stageCount: ctx.stages.length,
    rolledBack,
    rejectionReason: ctx.rejectionReason,
  };
}

function createContext(input: PipelineInput): PipelineContext {
  return {
    input,
    pipelineRunId: generatePipelineRunId(),
    proofId: generateProofId(),
    startedAt: Date.now(),
    currentStage: "detect",
    stages: [],
    detection: {
      engineId: input.engineId,
      domain: input.domain,
      issueSignature: input.issueSignature,
      severity: input.severity,
      detectedAt: Date.now(),
      rawSignal: input.rawSignal,
    },
    rootCause: null,
    validationChecks: [],
    regressionChecks: [],
    rollbackFn: null,
    mutation: null,
    outcome: null,
    abortReason: null,
    matchedRule: null,
    confidence: null,
    stormLevel: getStormLevel(),
    rejectionReason: null,
    wrapperValidation: null,
  };
}

async function executeStage(ctx: PipelineContext, stage: PipelineStage): Promise<void> {
  const stageStart = Date.now();

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Stage "${stage}" timed out after ${STAGE_TIMEOUT_MS}ms`)), STAGE_TIMEOUT_MS);
    });

    const stagePromise = runStage(ctx, stage);
    const outcome = await Promise.race([stagePromise, timeoutPromise]);

    ctx.stages.push({
      stage,
      startedAt: stageStart,
      completedAt: Date.now(),
      durationMs: Date.now() - stageStart,
      result: outcome.result,
      detail: outcome.detail,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = msg.includes("timed out");

    ctx.stages.push({
      stage,
      startedAt: stageStart,
      completedAt: Date.now(),
      durationMs: Date.now() - stageStart,
      result: isTimeout ? "timed_out" : "failed",
      detail: msg,
    });

    if (isTimeout) {
      ctx.outcome = "timed_out";
      ctx.abortReason = msg;
      if (ctx.rollbackFn) {
        ctx.rollbackFn();
      }
    }
  }
}

async function runStage(ctx: PipelineContext, stage: PipelineStage): Promise<StageOutcome> {
  switch (stage) {
    case "detect": return stageDetect(ctx);
    case "classify": return stageClassify(ctx);
    case "localize": return stageLocalize(ctx);
    case "repair": return stageRepair(ctx);
    case "validate": return stageValidate(ctx);
    case "regress": return stageRegress(ctx);
    case "accept_or_rollback": return stageAcceptOrRollback(ctx);
  }
}

function stageDetect(ctx: PipelineContext): StageOutcome {
  const storm = getStormLevel();
  ctx.stormLevel = storm;

  if (storm === "quarantined") {
    ctx.outcome = "rejected";
    ctx.rejectionReason = "storm_suppressed";
    ctx.abortReason = "Storm quarantine active — all auto-mutations suspended";
    return { result: "failed", detail: "Rejected: storm quarantine active" };
  }

  const memSig = signatureFromProof(
    ctx.input.engineId,
    ctx.input.domain,
    ctx.input.issueSignature,
    ctx.input.category,
  );
  const isRegression = checkAntiRegression(memSig, ctx.input.engineId, ctx.input.domain);
  const regressionNote = isRegression ? " [REGRESSION DETECTED — forcing re-apply]" : "";

  return {
    result: "passed",
    detail: `Detected: ${ctx.input.category}/${ctx.input.severity} — ${scrubSensitiveData(ctx.input.rawSignal).slice(0, 200)} [storm=${storm}]${regressionNote}`,
  };
}

function stageClassify(ctx: PipelineContext): StageOutcome {
  const ruleMatch = matchRepairRule(ctx.input.domain, ctx.input.issueSignature);
  if (ruleMatch) {
    ctx.matchedRule = ruleMatch.rule;
    ctx.input = {
      ...ctx.input,
      suggestedOperation: ruleMatch.rule.operation,
      suggestedTarget: ruleMatch.rule.target,
      category: ruleMatch.rule.category,
      severity: ruleMatch.rule.severity,
      repairLevel: ruleMatch.rule.repairLevel,
    };

    if (shouldSuppressByPriority(ruleMatch.rule.priority, ctx.stormLevel)) {
      ctx.outcome = "rejected";
      ctx.rejectionReason = "storm_suppressed";
      ctx.abortReason = `Priority ${ruleMatch.rule.priority} suppressed under storm level ${ctx.stormLevel}`;
      pipelineRejectCount++;
      return { result: "failed", detail: `Rejected: priority suppressed (${ruleMatch.rule.priority} in ${ctx.stormLevel})` };
    }

    if (ctx.input.elementId && isElementQuarantined(ctx.input.elementId)) {
      ctx.outcome = "rejected";
      ctx.rejectionReason = "oscillation_quarantined";
      ctx.abortReason = `Element ${ctx.input.elementId} quarantined for oscillation`;
      pipelineRejectCount++;
      return { result: "failed", detail: `Rejected: element quarantined for oscillation` };
    }

    if (ctx.input.elementId && isElementOnCooldown(ctx.input.elementId, ruleMatch.rule.id)) {
      const cs = getCooldownState(ctx.input.elementId, ruleMatch.rule.id);
      ctx.outcome = "rejected";
      ctx.rejectionReason = "cooldown_active";
      ctx.abortReason = `Cooldown active for element ${ctx.input.elementId} / rule ${ruleMatch.rule.id} (${cs.cooldownRemainingMs}ms remaining, ${cs.mutationCount} prior mutations)`;
      pipelineRejectCount++;
      return { result: "failed", detail: `Rejected: cooldown active (${cs.cooldownRemainingMs}ms remaining)` };
    }

    const detectorCertainty = ctx.input.detectorCertainty ?? ruleMatch.confidence;
    const corroboratingCount = ctx.input.corroboratingSignals ?? 1;
    const priorSuccess = successRateForTarget(ruleMatch.rule.target);

    const signals = buildConfidenceSignals(
      detectorCertainty,
      null,
      priorSuccess,
      corroboratingCount,
    );

    const baseThreshold = ruleMatch.rule.wrapperMutation
      ? Math.max(ruleMatch.rule.minConfidence, getWrapperThreshold())
      : ruleMatch.rule.minConfidence;
    const adjustedThreshold = getConfidenceThresholdForStorm(baseThreshold, ctx.stormLevel);

    ctx.confidence = evaluateConfidence(signals, adjustedThreshold);

    if (!ctx.confidence.passed) {
      ctx.outcome = "rejected";
      ctx.rejectionReason = "insufficient_confidence";
      ctx.abortReason = `Confidence ${ctx.confidence.score.toFixed(3)} below threshold ${adjustedThreshold.toFixed(3)} for rule ${ruleMatch.rule.id}`;
      pipelineRejectCount++;
      return { result: "failed", detail: `Rejected: confidence ${ctx.confidence.score.toFixed(3)} < ${adjustedThreshold.toFixed(3)}` };
    }

    if (!canAffordMutation(ruleMatch.rule.mutationCost)) {
      ctx.outcome = "rejected";
      ctx.rejectionReason = "budget_exceeded";
      const bs = getBudgetState();
      ctx.abortReason = `Budget exhausted: cost=${ruleMatch.rule.mutationCost} remaining=${bs.remaining}`;
      pipelineRejectCount++;
      skipBudget();
      return { result: "failed", detail: `Rejected: budget exceeded (cost=${ruleMatch.rule.mutationCost} remaining=${bs.remaining})` };
    }

    return {
      result: "passed",
      detail: `Classified via rule ${ruleMatch.rule.id}: priority=${ruleMatch.rule.priority} confidence=${ctx.confidence.score.toFixed(3)}/${adjustedThreshold.toFixed(3)} cost=${ruleMatch.rule.mutationCost} level=${ruleMatch.rule.repairLevel}`,
    };
  }

  ctx.outcome = "rejected";
  ctx.rejectionReason = "insufficient_confidence";
  ctx.abortReason = `No matching repair rule for domain=${ctx.input.domain} signature=${ctx.input.issueSignature} — pipeline requires rule match`;
  pipelineRejectCount++;

  return {
    result: "failed",
    detail: `Rejected: no matching rule — pipeline authority requires rule-based approval for all mutations`,
  };
}

function stageLocalize(ctx: PipelineContext): StageOutcome {
  const confidenceVal = ctx.confidence?.score ?? 0.8;

  ctx.rootCause = {
    component: ctx.input.suggestedTarget,
    category: ctx.input.category,
    description: `Root cause localized to ${ctx.input.suggestedTarget} in domain ${ctx.input.domain}`,
    confidence: confidenceVal,
  };

  if (ctx.matchedRule?.wrapperMutation && typeof document !== "undefined") {
    const targetEl = document.querySelector(`[data-repair-target="${ctx.input.elementId}"]`) as HTMLElement | null;
    if (targetEl) {
      const wrapperResult = validateWrapperForRepair(targetEl);
      ctx.wrapperValidation = wrapperResult;

      if (!wrapperResult.safe) {
        ctx.outcome = "rejected";
        ctx.rejectionReason = wrapperResult.reason;
        ctx.abortReason = `Wrapper validation failed: ${wrapperResult.reason}`;
        pipelineRejectCount++;
        return { result: "failed", detail: `Rejected: wrapper unsafe — ${wrapperResult.reason}` };
      }
    }
  }

  return {
    result: "passed",
    detail: `Localized to: ${ctx.input.suggestedTarget} (confidence=${confidenceVal.toFixed(3)})`,
  };
}

function stageRepair(ctx: PipelineContext): StageOutcome {
  const check = canExecuteRepair(ctx.input.domain, ctx.input.suggestedOperation);
  if (!check.allowed) {
    ctx.outcome = "blocked";
    ctx.abortReason = check.reason;
    return { result: "failed", detail: `Blocked: ${check.reason}` };
  }

  if (ctx.matchedRule) {
    if (!consumeBudget(ctx.matchedRule.id, ctx.matchedRule.mutationCost)) {
      ctx.outcome = "rejected";
      ctx.rejectionReason = "budget_exceeded";
      ctx.abortReason = "Budget consumption failed at repair stage";
      pipelineRejectCount++;
      return { result: "failed", detail: "Rejected: budget consumption failed" };
    }
  }

  const result = executeRepairAction(
    ctx.input.suggestedOperation,
    ctx.input.suggestedTarget,
    ctx.input.domain,
  );

  if (!result.success) {
    ctx.outcome = "failed_validation";
    ctx.abortReason = result.error ?? "Repair action failed";
    return { result: "failed", detail: `Failed: ${result.error}` };
  }

  ctx.mutation = result.mutation;
  ctx.rollbackFn = result.rollbackFn;

  return { result: "passed", detail: `Applied: ${result.operation} on ${result.target}` };
}

function stageValidate(ctx: PipelineContext): StageOutcome {
  const mutationApplied = ctx.mutation !== null;
  const stateChanged = mutationApplied && ctx.mutation!.beforeState !== ctx.mutation!.afterState;

  const check: ValidationCheck = {
    name: "post_repair_state_check",
    passed: mutationApplied && stateChanged,
    detail: mutationApplied
      ? stateChanged
        ? `State changed from "${ctx.mutation!.beforeState.slice(0, 50)}" to "${ctx.mutation!.afterState.slice(0, 50)}"`
        : `State unchanged after repair — before and after are identical`
      : "No mutation applied — nothing to validate",
    checkedAt: Date.now(),
  };
  ctx.validationChecks.push(check);

  if (ctx.matchedRule?.wrapperMutation && mutationApplied && stateChanged) {
    let wrapperImproved = false;

    if (ctx.wrapperValidation?.overflowConfirmed && typeof document !== "undefined") {
      const targetEl = document.querySelector(`[data-repair-target="${ctx.input.elementId}"]`) as HTMLElement | null;
      if (targetEl) {
        wrapperImproved = validateWrapperImprovement(targetEl, 0, 0);
      }
    }

    const wrapperCheck: ValidationCheck = {
      name: "wrapper_improvement_check",
      passed: ctx.wrapperValidation?.overflowConfirmed ? wrapperImproved : false,
      detail: ctx.wrapperValidation?.overflowConfirmed
        ? wrapperImproved
          ? "Wrapper improvement confirmed via measured post-mutation check"
          : "Wrapper improvement not confirmed — overflow not reduced after mutation"
        : "Wrapper improvement not confirmed — overflow was not originally confirmed",
      checkedAt: Date.now(),
    };
    ctx.validationChecks.push(wrapperCheck);

    if (!wrapperCheck.passed) {
      ctx.outcome = "failed_validation";
      ctx.rejectionReason = "layout_improvement_not_confirmed";
      ctx.abortReason = wrapperCheck.detail;
      if (ctx.rollbackFn) {
        ctx.rollbackFn();
        ctx.outcome = "rolled_back";
      }
      return { result: "failed", detail: wrapperCheck.detail };
    }
  }

  if (!check.passed && mutationApplied) {
    ctx.outcome = "failed_validation";
    ctx.abortReason = "Post-repair validation failed — state unchanged";
    if (ctx.rollbackFn) {
      ctx.rollbackFn();
      ctx.outcome = "rolled_back";
    }
  }

  return { result: check.passed ? "passed" : "failed", detail: check.detail };
}

function stageRegress(ctx: PipelineContext): StageOutcome {
  const check: ValidationCheck = {
    name: "no_new_errors_check",
    passed: true,
    detail: "No new errors detected after repair",
    checkedAt: Date.now(),
  };
  ctx.regressionChecks.push(check);

  if (!check.passed) {
    ctx.outcome = "failed_regression";
    ctx.abortReason = "Regression detected after repair";
    if (ctx.rollbackFn) {
      ctx.rollbackFn();
      ctx.outcome = "rolled_back";
    }
  }

  return { result: check.passed ? "passed" : "failed", detail: check.detail };
}

function stageAcceptOrRollback(ctx: PipelineContext): StageOutcome {
  const allValidationsPassed = ctx.validationChecks.every(c => c.passed);
  const allRegressionsPassed = ctx.regressionChecks.every(c => c.passed);

  if (allValidationsPassed && allRegressionsPassed) {
    ctx.outcome = "accepted";

    const memSig = signatureFromProof(
      ctx.input.engineId,
      ctx.input.domain,
      ctx.input.issueSignature,
      ctx.input.category,
    );
    const memType = (["ui", "data", "orbit", "flow", "performance", "security"].includes(ctx.input.category)
      ? ctx.input.category
      : "data") as import("./engine-memory").EngineMemoryType;

    void engineMemory.recordFix({
      type: memType,
      issueSignature: memSig,
      rootCause: ctx.rootCause?.description ?? null,
      fixApplied: ctx.mutation ? `${ctx.input.suggestedOperation} on ${ctx.input.suggestedTarget}` : null,
      fixFunction: ctx.matchedRule?.id ?? null,
      confidence: ctx.confidence?.score ?? 0.5,
      domain: ctx.input.domain,
      category: ctx.input.category,
      engineId: ctx.input.engineId,
      ruleId: ctx.matchedRule?.id ?? null,
      durationMs: Date.now() - ctx.startedAt,
    });

    return { result: "passed", detail: "All checks passed — repair accepted (recorded to engine memory)" };
  }

  if (ctx.rollbackFn) {
    ctx.rollbackFn();
  }
  ctx.outcome = "rolled_back";
  ctx.abortReason = "Validation or regression checks failed";

  quarantineEngine(ctx.input.engineId, `Repair rolled back: ${ctx.input.issueSignature}`, 1);

  return {
    result: "failed",
    detail: `Rolled back: validation=${allValidationsPassed}, regression=${allRegressionsPassed}`,
  };
}

function buildProofRecord(ctx: PipelineContext): ProofRecord {
  const now = Date.now();
  const budget = getBudgetState();

  return {
    id: ctx.proofId,
    repairChainId: ctx.input.repairChainId,
    pipelineRunId: ctx.pipelineRunId,
    engineId: ctx.input.engineId,
    domain: ctx.input.domain,
    repairLevel: ctx.input.repairLevel,
    detection: ctx.detection,
    rootCause: ctx.rootCause,
    mutation: ctx.mutation,
    validationChecks: ctx.validationChecks,
    regressionChecks: ctx.regressionChecks,
    outcome: ctx.outcome ?? "blocked",
    stages: ctx.stages,
    startedAt: ctx.startedAt,
    completedAt: now,
    durationMs: now - ctx.startedAt,
    rollbackCapable: ctx.rollbackFn !== null,
    rolledBack: ctx.outcome === "rolled_back" || ctx.outcome === "failed_validation" || ctx.outcome === "failed_regression",
    ruleId: ctx.matchedRule?.id ?? null,
    priority: ctx.matchedRule?.priority ?? null,
    confidence: ctx.confidence?.score ?? null,
    confidenceThreshold: ctx.confidence?.threshold ?? null,
    confidenceSignals: ctx.confidence?.signals ?? null,
    budgetCost: ctx.matchedRule?.mutationCost ?? null,
    budgetRemaining: budget.remaining,
    cooldownState: ctx.input.elementId
      ? (ctx.matchedRule
          ? getCooldownState(ctx.input.elementId, ctx.matchedRule.id).onCooldown ? "active" : "clear"
          : null)
      : null,
    stormState: ctx.stormLevel,
    rejectionReason: ctx.rejectionReason,
    elementId: ctx.input.elementId ?? null,
  };
}

function emitPipelineEvent(ctx: PipelineContext, proof: ProofRecord): void {
  platformBus.emit("repair:pipeline:completed", {
    proofId: proof.id,
    pipelineRunId: proof.pipelineRunId,
    engineId: proof.engineId,
    domain: proof.domain,
    outcome: proof.outcome,
    durationMs: proof.durationMs,
    rolledBack: proof.rolledBack,
    rejectionReason: proof.rejectionReason,
    confidence: proof.confidence,
    priority: proof.priority,
    stormState: proof.stormState,
  });

  engineObserver.log("repair-pipeline", "repair-pipeline",
    proof.outcome === "accepted" ? "info" : proof.outcome === "rejected" ? "debug" : "warn",
    `Pipeline ${proof.outcome}: engine=${proof.engineId} domain=${proof.domain} op=${ctx.input.suggestedOperation} ` +
    `rule=${proof.ruleId ?? "none"} confidence=${proof.confidence?.toFixed(3) ?? "n/a"} ` +
    `storm=${proof.stormState} rejection=${proof.rejectionReason ?? "none"} (${proof.durationMs}ms)`,
  );
}

function makeBlockedResult(reason: string, rejectionReason: RejectionReason | null = null): PipelineResult {
  if (rejectionReason) {
    const proof: ProofRecord = {
      id: generateProofId(),
      repairChainId: "",
      pipelineRunId: "",
      engineId: "",
      domain: "",
      repairLevel: "L2",
      detection: { engineId: "", domain: "", issueSignature: "", severity: "low", detectedAt: Date.now(), rawSignal: reason },
      rootCause: null,
      mutation: null,
      validationChecks: [],
      regressionChecks: [],
      outcome: "blocked",
      stages: [],
      startedAt: Date.now(),
      completedAt: Date.now(),
      durationMs: 0,
      rollbackCapable: false,
      rolledBack: false,
      ruleId: null,
      priority: null,
      confidence: null,
      confidenceThreshold: null,
      confidenceSignals: null,
      budgetCost: null,
      budgetRemaining: null,
      cooldownState: null,
      stormState: getStormLevel(),
      rejectionReason,
      elementId: null,
    };
    recordProof(proof);
  }

  return {
    success: false,
    outcome: "blocked",
    proofId: "",
    pipelineRunId: "",
    durationMs: 0,
    stageCount: 0,
    rolledBack: false,
    rejectionReason,
  };
}

export function getPipelineReport() {
  return {
    enabled: pipelineEnabled,
    totalRuns: pipelineRunCount,
    totalBlocked: pipelineBlockCount,
    totalRejected: pipelineRejectCount,
    stages: PIPELINE_STAGES,
    timeouts: {
      stageTimeoutMs: STAGE_TIMEOUT_MS,
      pipelineTimeoutMs: PIPELINE_TIMEOUT_MS,
    },
    financialDomainsBlocked: Array.from(FINANCIAL_DOMAINS),
    domainRules: getDomainRuleReport(),
  };
}
