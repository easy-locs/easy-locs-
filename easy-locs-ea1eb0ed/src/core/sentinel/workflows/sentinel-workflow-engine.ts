import type { WorkflowRunRecord, WorkflowRunStatus } from "../types";
import { sentinelWorkflowRegistry } from "../registry/workflow-registry";

let runCounter = 0;
function nextRunId(): string {
  return `WFRUN_${Date.now()}_${++runCounter}`;
}

interface WorkflowStepDef {
  name: string;
  execute: (ctx: WorkflowStepContext) => Promise<WorkflowStepResult>;
  compensate?: (ctx: WorkflowStepContext) => Promise<void>;
  timeout_ms?: number;
}

interface WorkflowStepContext {
  run_id: string;
  workflow_id: string;
  entity_type: string;
  entity_id: string;
  state: Record<string, unknown>;
  step_index: number;
}

interface WorkflowStepResult {
  success: boolean;
  output: Record<string, unknown>;
  next_state?: string;
}

interface WorkflowDefinition {
  workflow_id: string;
  steps: WorkflowStepDef[];
  retry_policy: { max_retries: number; backoff_ms: number };
  timeout_ms: number;
  idempotency_key_fn?: (entityType: string, entityId: string) => string;
}

class SentinelWorkflowEngine {
  private definitions = new Map<string, WorkflowDefinition>();
  private activeRuns = new Map<string, { run: WorkflowRunRecord; step_index: number; state: Record<string, unknown>; retries: number }>();
  private idempotencyKeys = new Map<string, string>();
  private readonly MAX_ACTIVE = 100;
  private readonly MAX_IDEMPOTENCY_KEYS = 500;

  registerDefinition(def: WorkflowDefinition): void {
    this.definitions.set(def.workflow_id, def);
  }

  async startWorkflow(workflowId: string, entityType: string, entityId: string, initialState: Record<string, unknown> = {}): Promise<WorkflowRunRecord | null> {
    const def = this.definitions.get(workflowId);
    if (!def) return null;

    if (def.idempotency_key_fn) {
      const key = def.idempotency_key_fn(entityType, entityId);
      const existingRunId = this.idempotencyKeys.get(key);
      if (existingRunId && this.activeRuns.has(existingRunId)) {
        return this.activeRuns.get(existingRunId)!.run;
      }
      if (this.idempotencyKeys.size >= this.MAX_IDEMPOTENCY_KEYS) {
        const oldest = Array.from(this.idempotencyKeys.keys()).slice(0, Math.floor(this.MAX_IDEMPOTENCY_KEYS / 2));
        for (const k of oldest) this.idempotencyKeys.delete(k);
      }
      const runId = nextRunId();
      this.idempotencyKeys.set(key, runId);
    }

    if (this.activeRuns.size >= this.MAX_ACTIVE) {
      return null;
    }

    const run: WorkflowRunRecord = {
      workflow_run_id: nextRunId(),
      workflow_id: workflowId,
      entity_type: entityType,
      entity_id: entityId,
      current_state: "started",
      status: "running",
      started_at: Date.now(),
      updated_at: Date.now(),
      failed_reason: null,
    };

    sentinelWorkflowRegistry.startRun(run);
    this.activeRuns.set(run.workflow_run_id, { run, step_index: 0, state: { ...initialState }, retries: 0 });

    this.executeSteps(run.workflow_run_id, def).catch(() => {});

    return run;
  }

  private async executeSteps(runId: string, def: WorkflowDefinition): Promise<void> {
    const active = this.activeRuns.get(runId);
    if (!active) return;

    const completedSteps: WorkflowStepDef[] = [];

    for (let i = active.step_index; i < def.steps.length; i++) {
      const step = def.steps[i];
      active.step_index = i;
      active.run.current_state = step.name;
      active.run.updated_at = Date.now();
      sentinelWorkflowRegistry.updateRunState(runId, step.name, "running");

      const ctx: WorkflowStepContext = {
        run_id: runId,
        workflow_id: def.workflow_id,
        entity_type: active.run.entity_type,
        entity_id: active.run.entity_id,
        state: active.state,
        step_index: i,
      };

      let success = false;
      let lastError: unknown;

      for (let retry = 0; retry <= def.retry_policy.max_retries; retry++) {
        try {
          const result = await this.executeWithTimeout(step.execute(ctx), step.timeout_ms || def.timeout_ms);
          if (result.success) {
            Object.assign(active.state, result.output);
            if (result.next_state) {
              active.run.current_state = result.next_state;
            }
            completedSteps.push(step);
            success = true;
            break;
          }
          lastError = new Error("Step returned failure");
        } catch (err) {
          lastError = err;
        }
        if (retry < def.retry_policy.max_retries) {
          await this.sleep(def.retry_policy.backoff_ms * Math.pow(2, retry));
        }
      }

      if (!success) {
        active.run.status = "compensating";
        sentinelWorkflowRegistry.updateRunState(runId, "compensating", "compensating");

        for (let j = completedSteps.length - 1; j >= 0; j--) {
          const compensateStep = completedSteps[j];
          if (compensateStep.compensate) {
            try {
              await compensateStep.compensate(ctx);
            } catch {}
          }
        }

        active.run.status = "failed";
        active.run.failed_reason = lastError instanceof Error ? lastError.message : String(lastError);
        active.run.updated_at = Date.now();
        sentinelWorkflowRegistry.failRun(runId, active.run.failed_reason!);
        this.activeRuns.delete(runId);
        return;
      }
    }

    active.run.status = "completed";
    active.run.current_state = "completed";
    active.run.updated_at = Date.now();
    sentinelWorkflowRegistry.completeRun(runId);
    this.activeRuns.delete(runId);
  }

  private executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Step timed out")), timeoutMs);
      promise
        .then((result) => { clearTimeout(timer); resolve(result); })
        .catch((err) => { clearTimeout(timer); reject(err); });
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getActiveRuns(): WorkflowRunRecord[] {
    return Array.from(this.activeRuns.values()).map((a) => a.run);
  }

  getRunStatus(runId: string): WorkflowRunRecord | undefined {
    const active = this.activeRuns.get(runId);
    if (active) return active.run;
    return sentinelWorkflowRegistry.getRun(runId);
  }

  getStats(): { definitions: number; active_runs: number; completed: number; failed: number } {
    const summary = sentinelWorkflowRegistry.getSummary();
    return {
      definitions: this.definitions.size,
      active_runs: this.activeRuns.size,
      completed: summary.completed_runs,
      failed: summary.failed_runs,
    };
  }
}

export const sentinelWorkflowEngine = new SentinelWorkflowEngine();
