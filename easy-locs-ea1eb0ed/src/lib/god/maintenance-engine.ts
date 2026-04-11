import { BaseEngine, type EngineTickResult } from "@/engines/core/base-engine";

export type FixSafety = "safe" | "unsafe";
export type FixStatus = "pending" | "applied" | "failed" | "skipped" | "review_needed";

export interface MaintenanceFix {
  id: string;
  category: string;
  description: string;
  safety: FixSafety;
  status: FixStatus;
  diff_before: string;
  diff_after: string;
  applied_at?: number;
  error?: string;
  rollback_data?: unknown;
}

export interface MaintenancePolicy {
  max_auto_fixes_per_tick: number;
  dry_run: boolean;
  allow_unsafe: boolean;
  rollback_enabled: boolean;
}

export interface MaintenanceTask {
  id: string;
  category: string;
  description: string;
  safety: FixSafety;
  detect: () => MaintenanceDetection[];
  fix: (detection: MaintenanceDetection) => MaintenanceFix;
}

export interface MaintenanceDetection {
  id: string;
  task_id: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  data: Record<string, unknown>;
}

const SAFE_CATEGORIES = [
  "slug_correction",
  "meta_regeneration",
  "index_rebuild",
  "taxonomy_alias_attach",
  "banner_expiry",
  "thumbnail_regen",
  "cache_key_fix",
  "safe_job_retry",
  "incomplete_record_flag",
  "queue_reorder",
];

const UNSAFE_CATEGORIES = [
  "record_merge",
  "bulk_delete",
  "business_critical_rewrite",
  "payment_modification",
  "source_of_truth_change",
  "permission_change",
];

class MaintenanceEngine extends BaseEngine {
  private policy: MaintenancePolicy = {
    max_auto_fixes_per_tick: 10,
    dry_run: false,
    allow_unsafe: false,
    rollback_enabled: true,
  };

  private tasks: MaintenanceTask[] = [];
  private fixLog: MaintenanceFix[] = [];
  private reviewQueue: MaintenanceFix[] = [];
  private detectionLog: MaintenanceDetection[] = [];

  constructor() {
    super({
      id: "maintenance-engine",
      name: "Maintenance Engine",
      category: "god",
      intervalMs: 10 * 60 * 1000,
    });
    this.registerBuiltinTasks();
  }

  async tick(): Promise<EngineTickResult> {
    const start = performance.now();
    const actions: string[] = [];
    let findings = 0;
    let fixesApplied = 0;

    for (const task of this.tasks) {
      const detections = task.detect();
      findings += detections.length;

      for (const det of detections) {
        this.detectionLog.push(det);

        if (fixesApplied >= this.policy.max_auto_fixes_per_tick) {
          actions.push("Max auto-fixes reached for this tick");
          break;
        }

        if (task.safety === "unsafe" && !this.policy.allow_unsafe) {
          const reviewFix: MaintenanceFix = {
            id: `review-${Date.now()}-${det.id}`,
            category: task.category,
            description: det.description,
            safety: "unsafe",
            status: "review_needed",
            diff_before: JSON.stringify(det.data),
            diff_after: "",
          };
          this.reviewQueue.push(reviewFix);
          actions.push(`[REVIEW NEEDED] ${task.category}: ${det.description}`);
          continue;
        }

        if (this.policy.dry_run) {
          actions.push(`[DRY RUN] Would fix: ${det.description}`);
          continue;
        }

        try {
          const fix = task.fix(det);
          fix.applied_at = Date.now();
          this.fixLog.push(fix);
          fixesApplied++;

          if (fix.status === "applied") {
            actions.push(`[FIXED] ${task.category}: ${det.description}`);
          } else if (fix.status === "failed") {
            actions.push(`[FAILED] ${task.category}: ${fix.error}`);
          }
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          actions.push(`[ERROR] ${task.category}: ${error}`);
        }
      }
    }

    if (this.detectionLog.length > 5000) {
      this.detectionLog = this.detectionLog.slice(-2500);
    }
    if (this.fixLog.length > 2000) {
      this.fixLog = this.fixLog.slice(-1000);
    }

    return {
      level: fixesApplied > 0 ? "act" : findings > 0 ? "detect" : "observe",
      findings,
      actions,
      duration: Math.round(performance.now() - start),
    };
  }

  private registerBuiltinTasks(): void {
    this.tasks.push({
      id: "detect_incomplete_taxonomy",
      category: "taxonomy_alias_attach",
      description: "Detect entities missing canonical taxonomy path",
      safety: "safe",
      detect: () => [],
      fix: (det) => ({
        id: `fix-tax-${det.id}`,
        category: "taxonomy_alias_attach",
        description: det.description,
        safety: "safe",
        status: "applied",
        diff_before: JSON.stringify(det.data),
        diff_after: "taxonomy_path attached",
      }),
    });

    this.tasks.push({
      id: "detect_expired_banners",
      category: "banner_expiry",
      description: "Detect and disable expired banners/promos",
      safety: "safe",
      detect: () => [],
      fix: (det) => ({
        id: `fix-banner-${det.id}`,
        category: "banner_expiry",
        description: det.description,
        safety: "safe",
        status: "applied",
        diff_before: "active",
        diff_after: "expired",
      }),
    });

    this.tasks.push({
      id: "detect_orphan_media",
      category: "meta_regeneration",
      description: "Detect media without valid references",
      safety: "safe",
      detect: () => [],
      fix: (det) => ({
        id: `fix-media-${det.id}`,
        category: "meta_regeneration",
        description: det.description,
        safety: "safe",
        status: "applied",
        diff_before: "orphan",
        diff_after: "flagged",
      }),
    });
  }

  registerTask(task: MaintenanceTask): void {
    if (this.tasks.find((t) => t.id === task.id)) return;
    this.tasks.push(task);
  }

  setPolicy(policy: Partial<MaintenancePolicy>): void {
    this.policy = { ...this.policy, ...policy };
  }

  getPolicy(): MaintenancePolicy {
    return { ...this.policy };
  }

  getReviewQueue(): MaintenanceFix[] {
    return [...this.reviewQueue];
  }

  approveReview(fixId: string): boolean {
    const idx = this.reviewQueue.findIndex((f) => f.id === fixId);
    if (idx === -1) return false;
    const fix = this.reviewQueue[idx];
    fix.status = "applied";
    fix.applied_at = Date.now();
    this.fixLog.push(fix);
    this.reviewQueue.splice(idx, 1);
    return true;
  }

  rejectReview(fixId: string): boolean {
    const idx = this.reviewQueue.findIndex((f) => f.id === fixId);
    if (idx === -1) return false;
    const fix = this.reviewQueue[idx];
    fix.status = "skipped";
    this.fixLog.push(fix);
    this.reviewQueue.splice(idx, 1);
    return true;
  }

  getFixLog(limit = 100): MaintenanceFix[] {
    return this.fixLog.slice(-limit);
  }

  getDetectionLog(limit = 100): MaintenanceDetection[] {
    return this.detectionLog.slice(-limit);
  }

  getStats() {
    return {
      policy: this.policy,
      registeredTasks: this.tasks.length,
      safeTasks: this.tasks.filter((t) => t.safety === "safe").length,
      unsafeTasks: this.tasks.filter((t) => t.safety === "unsafe").length,
      totalFixes: this.fixLog.length,
      appliedFixes: this.fixLog.filter((f) => f.status === "applied").length,
      failedFixes: this.fixLog.filter((f) => f.status === "failed").length,
      pendingReviews: this.reviewQueue.length,
      totalDetections: this.detectionLog.length,
      safeCategories: SAFE_CATEGORIES,
      unsafeCategories: UNSAFE_CATEGORIES,
    };
  }
}

export const maintenanceEngine = new MaintenanceEngine();
