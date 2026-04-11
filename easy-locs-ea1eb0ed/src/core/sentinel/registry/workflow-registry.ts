import type { WorkflowRegistryEntry, WorkflowRunRecord, WorkflowRunStatus } from "../types";

class SentinelWorkflowRegistry {
  private workflows = new Map<string, WorkflowRegistryEntry>();
  private runs = new Map<string, WorkflowRunRecord>();
  private readonly MAX_RUNS = 500;

  registerWorkflow(entry: WorkflowRegistryEntry): void {
    this.workflows.set(entry.workflow_id, entry);
  }

  getWorkflow(workflowId: string): WorkflowRegistryEntry | undefined {
    return this.workflows.get(workflowId);
  }

  getAllWorkflows(): WorkflowRegistryEntry[] {
    return Array.from(this.workflows.values());
  }

  getByDomain(domain: string): WorkflowRegistryEntry[] {
    return this.getAllWorkflows().filter((w) => w.domain === domain);
  }

  startRun(run: WorkflowRunRecord): void {
    this.runs.set(run.workflow_run_id, run);
    if (this.runs.size > this.MAX_RUNS) {
      const oldest = Array.from(this.runs.entries())
        .sort(([, a], [, b]) => a.started_at - b.started_at)
        .slice(0, this.runs.size - this.MAX_RUNS);
      for (const [key] of oldest) this.runs.delete(key);
    }
  }

  updateRunState(runId: string, state: string, status?: WorkflowRunStatus): void {
    const run = this.runs.get(runId);
    if (run) {
      run.current_state = state;
      if (status) run.status = status;
      run.updated_at = Date.now();
    }
  }

  failRun(runId: string, reason: string): void {
    const run = this.runs.get(runId);
    if (run) {
      run.status = "failed";
      run.failed_reason = reason;
      run.updated_at = Date.now();
    }
  }

  completeRun(runId: string): void {
    const run = this.runs.get(runId);
    if (run) {
      run.status = "completed";
      run.updated_at = Date.now();
    }
  }

  getRun(runId: string): WorkflowRunRecord | undefined {
    return this.runs.get(runId);
  }

  getActiveRuns(): WorkflowRunRecord[] {
    return Array.from(this.runs.values()).filter((r) => r.status === "running" || r.status === "pending");
  }

  getFailedRuns(since?: number): WorkflowRunRecord[] {
    const cutoff = since || 0;
    return Array.from(this.runs.values()).filter((r) => r.status === "failed" && r.started_at >= cutoff);
  }

  getRunsByWorkflow(workflowId: string): WorkflowRunRecord[] {
    return Array.from(this.runs.values()).filter((r) => r.workflow_id === workflowId);
  }

  getRunsByEntity(entityType: string, entityId: string): WorkflowRunRecord[] {
    return Array.from(this.runs.values()).filter((r) => r.entity_type === entityType && r.entity_id === entityId);
  }

  getSummary(): { workflows: number; active_runs: number; failed_runs: number; completed_runs: number } {
    const runs = Array.from(this.runs.values());
    return {
      workflows: this.workflows.size,
      active_runs: runs.filter((r) => r.status === "running" || r.status === "pending").length,
      failed_runs: runs.filter((r) => r.status === "failed").length,
      completed_runs: runs.filter((r) => r.status === "completed").length,
    };
  }
}

export const sentinelWorkflowRegistry = new SentinelWorkflowRegistry();
