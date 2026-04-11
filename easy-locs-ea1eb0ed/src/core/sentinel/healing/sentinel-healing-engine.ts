import type { HealingActionRecord, HealingSafeLevel } from "../types";

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
    } catch (err) {
      record.ended_at = Date.now();
      record.status = "failed";
      record.after_snapshot = { error: err instanceof Error ? err.message : String(err) };
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
