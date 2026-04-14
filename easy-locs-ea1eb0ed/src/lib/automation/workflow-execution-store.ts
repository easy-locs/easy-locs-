/**
 * Workflow Execution Store
 * In-memory + localStorage persistence for workflow execution logs.
 * Used by the WorkflowExecutor and visible in the Admin Control Room.
 */

export type WfExecStatus = "running" | "completed" | "failed" | "retrying" | "dead";

export interface WorkflowExecutionLog {
  executionId: string;
  workflowId: string;
  workflowName: string;
  status: WfExecStatus;
  startedAt: number;
  completedAt: number | null;
  currentStepId: string | null;
  stepLogs: WorkflowStepLog[];
  triggerEvent: string;
  triggerPayload: Record<string, unknown>;
  error: string | null;
  retryCount: number;
}

export interface WorkflowStepLog {
  stepId: string;
  stepName: string;
  status: "running" | "completed" | "failed" | "skipped";
  startedAt: number;
  completedAt: number | null;
  error: string | null;
  attempt: number;
}

const STORE_KEY = "easy-locs:workflow-executions";
const MAX_STORED = 100;

const _executions = new Map<string, WorkflowExecutionLog>();
const _listeners = new Set<() => void>();

function notifyListeners(): void {
  _listeners.forEach((fn) => { try { fn(); } catch { } });
}

function persist(): void {
  try {
    const arr = Array.from(_executions.values())
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, MAX_STORED);
    const map: Record<string, WorkflowExecutionLog> = {};
    arr.forEach((e) => { map[e.executionId] = e; });
    localStorage.setItem(STORE_KEY, JSON.stringify(map));
  } catch { }
}

function hydrate(): void {
  try {
    const stored = JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}") as Record<string, WorkflowExecutionLog>;
    Object.values(stored).forEach((e) => {
      if (e.status === "running" || e.status === "retrying") {
        e.status = "failed";
        e.error = e.error ?? "Interrupted — app restarted";
        e.completedAt = e.completedAt ?? Date.now();
      }
      _executions.set(e.executionId, e);
    });
  } catch { }
}

hydrate();

export const workflowExecutionStore = {
  subscribe(fn: () => void): () => void {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },

  startExecution(log: Omit<WorkflowExecutionLog, "stepLogs" | "completedAt" | "error" | "retryCount">): WorkflowExecutionLog {
    const entry: WorkflowExecutionLog = {
      ...log,
      stepLogs: [],
      completedAt: null,
      error: null,
      retryCount: 0,
    };
    _executions.set(entry.executionId, entry);
    persist();
    notifyListeners();
    return entry;
  },

  startStep(executionId: string, step: Omit<WorkflowStepLog, "completedAt" | "error">): void {
    const exec = _executions.get(executionId);
    if (!exec) return;
    for (const prior of exec.stepLogs) {
      if (prior.stepId === step.stepId && prior.status === "running") {
        prior.status = "failed";
        prior.completedAt = Date.now();
        prior.error = "Superseded by retry attempt";
      }
    }
    exec.currentStepId = step.stepId;
    exec.stepLogs.push({ ...step, completedAt: null, error: null });
    persist();
    notifyListeners();
  },

  completeStep(executionId: string, stepId: string, status: "completed" | "failed" | "skipped", error?: string): void {
    const exec = _executions.get(executionId);
    if (!exec) return;
    const step = exec.stepLogs.slice().reverse().find((s) => s.stepId === stepId);
    if (!step) return;
    step.status = status;
    step.completedAt = Date.now();
    step.error = error ?? null;
    persist();
    notifyListeners();
  },

  completeExecution(executionId: string, status: "completed" | "failed", error?: string): void {
    const exec = _executions.get(executionId);
    if (!exec) return;
    exec.status = status;
    exec.completedAt = Date.now();
    exec.error = error ?? null;
    exec.currentStepId = null;
    persist();
    notifyListeners();
  },

  markDead(executionId: string): void {
    const exec = _executions.get(executionId);
    if (!exec) return;
    exec.status = "dead";
    exec.completedAt = Date.now();
    persist();
    notifyListeners();
  },

  incrementRetry(executionId: string): void {
    const exec = _executions.get(executionId);
    if (!exec) return;
    exec.status = "retrying";
    exec.retryCount += 1;
    persist();
    notifyListeners();
  },

  getAll(): WorkflowExecutionLog[] {
    return Array.from(_executions.values()).sort((a, b) => b.startedAt - a.startedAt);
  },

  getByWorkflow(workflowId: string): WorkflowExecutionLog[] {
    return this.getAll().filter((e) => e.workflowId === workflowId);
  },

  getRecent(limit = 50): WorkflowExecutionLog[] {
    return this.getAll().slice(0, limit);
  },

  getStats(): { total: number; running: number; completed: number; failed: number; dead: number } {
    const all = this.getAll();
    return {
      total: all.length,
      running: all.filter((e) => e.status === "running" || e.status === "retrying").length,
      completed: all.filter((e) => e.status === "completed").length,
      failed: all.filter((e) => e.status === "failed").length,
      dead: all.filter((e) => e.status === "dead").length,
    };
  },
};
