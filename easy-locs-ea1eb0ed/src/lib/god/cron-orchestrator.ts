import { BaseEngine, type EngineTickResult } from "@/engines/core/base-engine";

export type CronJobStatus = "idle" | "running" | "completed" | "failed" | "timeout" | "disabled" | "locked";

export interface CronJobDeclaration {
  job_id: string;
  engine_owner: string;
  purpose: string;
  schedule_ms: number;
  timeout_ms: number;
  retry_policy: {
    max_retries: number;
    backoff_ms: number;
  };
  resource_locks: string[];
  downstream_events: string[];
  criticality: "low" | "medium" | "high" | "critical";
  health_probe: () => boolean;
  execute: () => Promise<CronJobResult>;
}

export interface CronJobResult {
  success: boolean;
  duration_ms: number;
  findings: number;
  actions: string[];
  error?: string;
}

interface CronJobState {
  declaration: CronJobDeclaration;
  status: CronJobStatus;
  last_run: number;
  next_run: number;
  run_count: number;
  success_count: number;
  failure_count: number;
  timeout_count: number;
  retry_count: number;
  skipped_runs: number;
  conflicts_detected: number;
  last_result: CronJobResult | null;
  last_error: string | null;
  timer: ReturnType<typeof setInterval> | null;
}

interface DeadLetterEntry {
  job_id: string;
  timestamp: number;
  error: string;
  retry_count: number;
  data?: unknown;
}

class CronOrchestrator extends BaseEngine {
  private jobs = new Map<string, CronJobState>();
  private activeLocks = new Set<string>();
  private deadLetterQueue: DeadLetterEntry[] = [];
  private _started = false;

  constructor() {
    super({
      id: "cron-orchestrator",
      name: "Cron Orchestrator",
      category: "god",
      intervalMs: 60 * 1000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const start = performance.now();
    const actions: string[] = [];
    let findings = 0;

    for (const [, state] of this.jobs) {
      if (state.status === "disabled") continue;

      if (!state.declaration.health_probe()) {
        findings++;
        actions.push(`${state.declaration.job_id}: health probe failed`);
      }

      if (state.status === "failed" && state.retry_count < state.declaration.retry_policy.max_retries) {
        findings++;
        actions.push(`${state.declaration.job_id}: scheduling retry ${state.retry_count + 1}`);
      }
    }

    if (this.deadLetterQueue.length > 0) {
      findings += this.deadLetterQueue.length;
      actions.push(`${this.deadLetterQueue.length} entries in dead letter queue`);
    }

    return {
      level: findings > 0 ? "detect" : "observe",
      findings,
      actions,
      duration: Math.round(performance.now() - start),
    };
  }

  registerJob(declaration: CronJobDeclaration): boolean {
    if (this.jobs.has(declaration.job_id)) {
      this.log("warn", `Job "${declaration.job_id}" already registered`);
      return false;
    }

    for (const [existingId, existingState] of this.jobs) {
      const lockOverlap = declaration.resource_locks.some((l) =>
        existingState.declaration.resource_locks.includes(l)
      );
      if (lockOverlap && existingState.declaration.schedule_ms === declaration.schedule_ms) {
        this.log("warn", `Job "${declaration.job_id}" conflicts with "${existingId}" on resource locks`);
      }
    }

    const state: CronJobState = {
      declaration,
      status: "idle",
      last_run: 0,
      next_run: Date.now() + declaration.schedule_ms,
      run_count: 0,
      success_count: 0,
      failure_count: 0,
      timeout_count: 0,
      retry_count: 0,
      skipped_runs: 0,
      conflicts_detected: 0,
      last_result: null,
      last_error: null,
      timer: null,
    };

    this.jobs.set(declaration.job_id, state);
    this.log("info", `Registered cron job: ${declaration.job_id} (every ${declaration.schedule_ms}ms)`);

    if (this._started) {
      this.startJob(state);
    }

    return true;
  }

  unregisterJob(jobId: string): boolean {
    const state = this.jobs.get(jobId);
    if (!state) return false;
    if (state.timer) clearInterval(state.timer);
    this.jobs.delete(jobId);
    return true;
  }

  startAll(): void {
    this._started = true;
    for (const state of this.jobs.values()) {
      this.startJob(state);
    }
    this.log("info", `Started ${this.jobs.size} cron jobs`);
  }

  stopAll(): void {
    this._started = false;
    for (const state of this.jobs.values()) {
      if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
      }
    }
    this.log("info", "Stopped all cron jobs");
  }

  private startJob(state: CronJobState): void {
    if (state.timer) return;
    if (state.status === "disabled") return;

    const jitter = Math.random() * 5000;

    state.timer = setInterval(() => {
      this.executeJob(state);
    }, state.declaration.schedule_ms);

    setTimeout(() => {
      this.executeJob(state);
    }, 3000 + jitter);
  }

  private async executeJob(state: CronJobState): Promise<void> {
    if (state.status === "running" || state.status === "disabled") {
      state.skipped_runs++;
      return;
    }

    const locks = state.declaration.resource_locks;
    for (const lock of locks) {
      if (this.activeLocks.has(lock)) {
        state.skipped_runs++;
        state.conflicts_detected++;
        return;
      }
    }

    for (const lock of locks) {
      this.activeLocks.add(lock);
    }

    state.status = "running";
    state.last_run = Date.now();

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    try {
      const result = await Promise.race([
        state.declaration.execute(),
        new Promise<CronJobResult>((_, reject) => {
          timeoutHandle = setTimeout(
            () => reject(new Error("Job timeout")),
            state.declaration.timeout_ms
          );
        }),
      ]);

      if (timeoutHandle) clearTimeout(timeoutHandle);

      state.run_count++;
      state.last_result = result;

      if (result.success) {
        state.success_count++;
        state.retry_count = 0;
        state.status = "completed";
      } else {
        state.failure_count++;
        state.status = "failed";
        state.last_error = result.error || "Unknown error";
        this.handleJobFailure(state);
      }
    } catch (err) {
      if (timeoutHandle) clearTimeout(timeoutHandle);

      const message = err instanceof Error ? err.message : String(err);

      if (message === "Job timeout") {
        state.timeout_count++;
        state.status = "timeout";
      } else {
        state.failure_count++;
        state.status = "failed";
      }

      state.run_count++;
      state.last_error = message;
      this.handleJobFailure(state);
    } finally {
      for (const lock of locks) {
        this.activeLocks.delete(lock);
      }

      state.next_run = Date.now() + state.declaration.schedule_ms;

      if (state.status === "completed" || state.status === "timeout") {
        state.status = "idle";
      }
    }
  }

  private handleJobFailure(state: CronJobState): void {
    state.retry_count++;

    if (state.retry_count >= state.declaration.retry_policy.max_retries) {
      this.deadLetterQueue.push({
        job_id: state.declaration.job_id,
        timestamp: Date.now(),
        error: state.last_error || "Max retries exceeded",
        retry_count: state.retry_count,
      });

      if (this.deadLetterQueue.length > 500) {
        this.deadLetterQueue = this.deadLetterQueue.slice(-250);
      }

      state.retry_count = 0;
      state.status = "idle";
    } else {
      const backoff = state.declaration.retry_policy.backoff_ms * Math.pow(2, state.retry_count - 1);
      setTimeout(() => {
        state.status = "idle";
        this.executeJob(state);
      }, backoff);
    }
  }

  disableJob(jobId: string): boolean {
    const state = this.jobs.get(jobId);
    if (!state) return false;
    state.status = "disabled";
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
    return true;
  }

  enableJob(jobId: string): boolean {
    const state = this.jobs.get(jobId);
    if (!state) return false;
    state.status = "idle";
    if (this._started) this.startJob(state);
    return true;
  }

  getJobStatus(jobId: string) {
    const state = this.jobs.get(jobId);
    if (!state) return null;
    return {
      job_id: state.declaration.job_id,
      engine_owner: state.declaration.engine_owner,
      purpose: state.declaration.purpose,
      criticality: state.declaration.criticality,
      status: state.status,
      last_run: state.last_run,
      next_run: state.next_run,
      run_count: state.run_count,
      success_count: state.success_count,
      failure_count: state.failure_count,
      timeout_count: state.timeout_count,
      skipped_runs: state.skipped_runs,
      conflicts_detected: state.conflicts_detected,
      retry_count: state.retry_count,
      last_error: state.last_error,
    };
  }

  getAllJobStatuses() {
    const statuses: ReturnType<typeof this.getJobStatus>[] = [];
    for (const jobId of this.jobs.keys()) {
      statuses.push(this.getJobStatus(jobId));
    }
    return statuses;
  }

  getDeadLetterQueue() {
    return [...this.deadLetterQueue];
  }

  clearDeadLetterQueue(): number {
    const count = this.deadLetterQueue.length;
    this.deadLetterQueue = [];
    return count;
  }

  getStats() {
    let totalRuns = 0;
    let totalSuccess = 0;
    let totalFailure = 0;
    let totalTimeout = 0;
    let totalSkipped = 0;

    for (const state of this.jobs.values()) {
      totalRuns += state.run_count;
      totalSuccess += state.success_count;
      totalFailure += state.failure_count;
      totalTimeout += state.timeout_count;
      totalSkipped += state.skipped_runs;
    }

    return {
      registeredJobs: this.jobs.size,
      runningJobs: Array.from(this.jobs.values()).filter((s) => s.status === "running").length,
      disabledJobs: Array.from(this.jobs.values()).filter((s) => s.status === "disabled").length,
      activeLocks: this.activeLocks.size,
      deadLetterSize: this.deadLetterQueue.length,
      totalRuns,
      totalSuccess,
      totalFailure,
      totalTimeout,
      totalSkipped,
    };
  }
}

export const cronOrchestrator = new CronOrchestrator();
