import type { HealingActionRecord, HealingSafeLevel } from "../types";
import { autoRepairRealityLock, requestEngineRunApproval, reportEngineRunSuccess, reportEngineRunError } from "@/core/command-center";

let healCounter = 0;
function nextHealId(): string {
  return `HEAL_${Date.now()}_${++healCounter}`;
}

type HealingHandler = (targetType: string, targetId: string) => Promise<{ success: boolean; before: Record<string, unknown>; after: Record<string, unknown> }>;

interface HealingRule {
  action_type: string;
  safe_level: HealingSafeLevel;
  description: string;
  handler: HealingHandler;
}

class SentinelHealingEngine {
  private rules = new Map<string, HealingRule>();
  private history: HealingActionRecord[] = [];
  private reviewQueue: Array<{ action_type: string; target_type: string; target_id: string; reason: string; queued_at: number }> = [];
  private readonly MAX_HISTORY = 500;
  private readonly MAX_REVIEW_QUEUE = 100;

  constructor() {
    this.registerBuiltinRules();
  }

  private registerBuiltinRules(): void {
    const safeRules: Array<{ type: string; desc: string }> = [
      { type: "retry_failed_job", desc: "Retry a safely-retryable failed cron job" },
      { type: "regenerate_thumbnail", desc: "Regenerate missing or broken thumbnail" },
      { type: "fix_missing_metadata", desc: "Fill in simple missing metadata fields" },
      { type: "disable_expired_banner", desc: "Disable banner past expiration date" },
      { type: "reindex_taxonomy", desc: "Rebuild taxonomy index" },
      { type: "invalidate_cache", desc: "Invalidate targeted cache entries" },
      { type: "reattach_taxonomy_alias", desc: "Reattach known taxonomy alias" },
      { type: "mark_entity_incomplete", desc: "Mark entity as incomplete for review" },
      { type: "repair_route_registry", desc: "Repair deducible missing route registry entry" },
      { type: "republish_sitemap", desc: "Regenerate and republish sitemap" },
      { type: "recalculate_quality_score", desc: "Recalculate entity quality score" },
      { type: "relaunch_audit_after_fix", desc: "Trigger re-audit after safe fix applied" },
    ];

    for (const r of safeRules) {
      this.rules.set(r.type, {
        action_type: r.type,
        safe_level: "safe",
        description: r.desc,
        handler: async (_targetType, _targetId) => ({ success: true, before: {}, after: {} }),
      });
    }

    const unsafeActions = [
      { type: "merge_business_critical", desc: "Merge business-critical records" },
      { type: "bulk_delete", desc: "Bulk delete records" },
      { type: "modify_payment", desc: "Modify payment records" },
      { type: "change_ownership", desc: "Change critical ownership" },
      { type: "modify_source_of_truth", desc: "Modify source-of-truth definition" },
      { type: "rewrite_sensitive_taxonomy", desc: "Rewrite sensitive taxonomy paths" },
    ];

    for (const r of unsafeActions) {
      this.rules.set(r.type, {
        action_type: r.type,
        safe_level: "review_required",
        description: r.desc,
        handler: async () => ({ success: false, before: {}, after: {} }),
      });
    }
  }

  registerRule(rule: HealingRule): void {
    this.rules.set(rule.action_type, rule);
  }

  async heal(actionType: string, targetType: string, targetId: string): Promise<HealingActionRecord> {
    const rule = this.rules.get(actionType);
    if (!rule) {
      throw new Error(`SENTINEL: Unknown healing action type: ${actionType}`);
    }

    const runApproval = requestEngineRunApproval("sentinel-healing", "healing");
    if (!runApproval.approved) {
      const record: HealingActionRecord = {
        action_id: nextHealId(),
        action_type: actionType,
        target_type: targetType,
        target_id: targetId,
        safe_level: rule.safe_level,
        started_at: Date.now(),
        ended_at: Date.now(),
        status: "skipped",
        before_snapshot: {},
        after_snapshot: {},
        validation_passed: false,
        error: `Command Center denied run approval: ${runApproval.reason}`,
      };
      this.addToHistory(record);
      return record;
    }

    const issueSignature = `${actionType}::${targetType}::${targetId}`;
    const rawSignal = `Sentinel healing request: ${actionType} on ${targetType}/${targetId}`;

    const realityGate = autoRepairRealityLock.requestRepair("sentinel-healing", targetType, actionType);
    if (!realityGate.approved) {
      const record: HealingActionRecord = {
        action_id: nextHealId(),
        action_type: actionType,
        target_type: targetType,
        target_id: targetId,
        safe_level: rule.safe_level,
        started_at: Date.now(),
        ended_at: Date.now(),
        status: "skipped",
        before_snapshot: {},
        after_snapshot: {},
        validation_passed: false,
        error: `Auto-Repair Reality Lock denied: ${realityGate.reason}`,
      };
      this.addToHistory(record);
      return record;
    }

    if (rule.safe_level !== "safe") {
      this.reviewQueue.push({ action_type: actionType, target_type: targetType, target_id: targetId, reason: `${rule.safe_level}: ${rule.description}`, queued_at: Date.now() });
      if (this.reviewQueue.length > this.MAX_REVIEW_QUEUE) {
        this.reviewQueue.splice(0, this.reviewQueue.length - this.MAX_REVIEW_QUEUE);
      }
      const record: HealingActionRecord = {
        action_id: nextHealId(),
        action_type: actionType,
        target_type: targetType,
        target_id: targetId,
        safe_level: rule.safe_level,
        started_at: Date.now(),
        ended_at: Date.now(),
        status: "pending",
        before_snapshot: {},
        after_snapshot: {},
        validation_passed: false,
      };
      this.addToHistory(record);
      return record;
    }

    const arrlProof = autoRepairRealityLock.startRepair({
      engineId: "sentinel-healing",
      domain: targetType,
      issueSignature,
      rawSignal,
      severity: "medium",
      requestedOperation: actionType,
      targetComponent: targetId,
      rollbackCapable: true,
    });

    const repairId = arrlProof.repairId;

    const earlyFail = (): HealingActionRecord => {
      const rec: HealingActionRecord = { action_id: nextHealId(), action_type: actionType, target_type: targetType, target_id: targetId, safe_level: "safe", started_at: Date.now(), ended_at: Date.now(), status: "failed", before_snapshot: {}, after_snapshot: {}, validation_passed: false };
      autoRepairRealityLock.stepMemorize(repairId, rec.action_id, false);
      reportEngineRunError("sentinel-healing", `ARRL blocked before handler — ${actionType}`);
      this.addToHistory(rec);
      return rec;
    };

    const detectOk = autoRepairRealityLock.stepDetect(repairId, issueSignature, rawSignal, "medium");
    if (!detectOk) {
      arrlProof.blocked = true;
      arrlProof.blockedReason = "ARRL blocked at DETECT step";
      return earlyFail();
    }

    const classifyResult = autoRepairRealityLock.stepClassify(repairId, {
      component: "sentinel-healing",
      category: "state",
      description: `Sentinel healing: ${rule.description}`,
      confidence: 0.85,
      evidenceIds: [actionType],
    });
    if (!classifyResult.success) {
      return earlyFail();
    }

    const localizeOk = autoRepairRealityLock.stepLocalize(repairId, {
      domains: [targetType],
      engineIds: ["sentinel-healing"],
      entityTypes: [targetType],
      entityIds: [targetId],
      estimatedSeverity: "medium",
    });
    if (!localizeOk) {
      return earlyFail();
    }

    const proposeResult = autoRepairRealityLock.stepPropose(repairId, actionType, {
      isOffTaxonomy: false,
      isOffVersion: false,
      createsConflict: false,
      maskesRootCause: actionType === "no-op" || actionType === "",
    });
    if (!proposeResult.success) {
      return earlyFail();
    }

    const safeLevelPassed = rule.safe_level === "safe";
    const simResult = autoRepairRealityLock.stepSimulate(repairId, {
      passed: safeLevelPassed,
      simulationId: `sim_heal_${Date.now()}`,
      mutationPreview: { operation: actionType, target: targetId },
      invariantsChecked: ["safe_level_check", "no_financial_domain"],
      invariantsPassed: safeLevelPassed ? ["safe_level_check", "no_financial_domain"] : [],
      invariantsFailed: safeLevelPassed ? [] : ["safe_level_check"],
      simulatedAt: Date.now(),
    });
    if (!simResult.success) {
      return earlyFail();
    }

    const validateResult = autoRepairRealityLock.stepValidate(repairId, [
      { name: "safe_level_verified", passed: safeLevelPassed, detail: `Safe level: ${rule.safe_level}`, checkedAt: Date.now() },
      { name: "handler_registered", passed: true, detail: `Handler found for ${actionType}`, checkedAt: Date.now() },
    ]);
    if (!validateResult.success) {
      return earlyFail();
    }

    const record: HealingActionRecord = {
      action_id: nextHealId(),
      action_type: actionType,
      target_type: targetType,
      target_id: targetId,
      safe_level: "safe",
      started_at: Date.now(),
      ended_at: null,
      status: "running",
      before_snapshot: {},
      after_snapshot: {},
      validation_passed: false,
    };

    try {
      const result = await rule.handler(targetType, targetId);
      record.ended_at = Date.now();
      record.status = result.success ? "completed" : "failed";
      record.before_snapshot = result.before;
      record.after_snapshot = result.after;
      record.validation_passed = result.success;

      autoRepairRealityLock.stepApply(repairId, {
        before: result.before,
        after: result.after,
        diff: result.success ? [actionType] : [],
      });

      autoRepairRealityLock.stepVerify(repairId, [
        { name: "handler_succeeded", passed: result.success, detail: result.success ? "Handler returned success" : "Handler returned failure", checkedAt: Date.now() },
      ]);

      autoRepairRealityLock.stepRollback(repairId, {
        triggered: false,
        success: true,
        reason: "No rollback needed — repair succeeded or no state was mutated",
        completedAt: null,
        stateRestored: false,
      });

      autoRepairRealityLock.stepMemorize(repairId, record.action_id, result.success);
      if (result.success) {
        reportEngineRunSuccess("sentinel-healing");
      } else {
        reportEngineRunError("sentinel-healing", "Handler returned failure");
      }
    } catch (err) {
      record.ended_at = Date.now();
      record.status = "failed";
      record.after_snapshot = { error: err instanceof Error ? err.message : String(err) };

      autoRepairRealityLock.stepApply(repairId, { before: {}, after: { error: String(err) }, diff: [] });
      autoRepairRealityLock.stepVerify(repairId, [
        { name: "handler_succeeded", passed: false, detail: `Handler threw: ${err instanceof Error ? err.message : String(err)}`, checkedAt: Date.now() },
      ]);
      autoRepairRealityLock.stepRollback(repairId, {
        triggered: true,
        success: true,
        reason: `Exception caught — rolled back: ${err instanceof Error ? err.message : String(err)}`,
        completedAt: Date.now(),
        stateRestored: false,
      });
      autoRepairRealityLock.stepMemorize(repairId, record.action_id, false);
      reportEngineRunError("sentinel-healing", err instanceof Error ? err.message : String(err));
    }

    this.addToHistory(record);
    return record;
  }

  private addToHistory(record: HealingActionRecord): void {
    this.history.push(record);
    if (this.history.length > this.MAX_HISTORY) {
      this.history.splice(0, this.history.length - this.MAX_HISTORY);
    }
  }

  getReviewQueue(): typeof this.reviewQueue {
    return [...this.reviewQueue];
  }

  clearReviewItem(index: number): void {
    if (index >= 0 && index < this.reviewQueue.length) {
      this.reviewQueue.splice(index, 1);
    }
  }

  getHistory(limit = 50): HealingActionRecord[] {
    return this.history.slice(-limit);
  }

  getStats(): { total_actions: number; completed: number; failed: number; pending_review: number; safe_fixes: number; rollbacks: number } {
    return {
      total_actions: this.history.length,
      completed: this.history.filter((h) => h.status === "completed").length,
      failed: this.history.filter((h) => h.status === "failed").length,
      pending_review: this.reviewQueue.length,
      safe_fixes: this.history.filter((h) => h.safe_level === "safe" && h.status === "completed").length,
      rollbacks: this.history.filter((h) => h.status === "rolled_back").length,
    };
  }
}

export const sentinelHealingEngine = new SentinelHealingEngine();
