import { platformBus } from "@/lib/shared/platform-bus";

export type WorkflowStepStatus = "pending" | "running" | "completed" | "failed" | "skipped" | "waiting_retry";

export interface WorkflowStep<TCtx = Record<string, unknown>> {
  id: string;
  name: string;
  execute: (ctx: TCtx) => Promise<TCtx>;
  rollback?: (ctx: TCtx) => Promise<void>;
  canRetry?: boolean;
  maxRetries?: number;
  timeoutMs?: number;
  condition?: (ctx: TCtx) => boolean;
}

export interface WorkflowStepResult {
  stepId: string;
  status: WorkflowStepStatus;
  startedAt: number;
  completedAt?: number;
  error?: string;
  retryCount: number;
}

export interface WorkflowState<TCtx = Record<string, unknown>> {
  workflowId: string;
  workflowName: string;
  status: "idle" | "running" | "completed" | "failed" | "paused" | "rolled_back";
  currentStepIndex: number;
  context: TCtx;
  stepResults: WorkflowStepResult[];
  startedAt: number;
  completedAt?: number;
  error?: string;
}

export interface WorkflowDefinition<TCtx = Record<string, unknown>> {
  name: string;
  steps: WorkflowStep<TCtx>[];
  onComplete?: (ctx: TCtx) => Promise<void>;
  onError?: (ctx: TCtx, error: Error) => Promise<void>;
  maxDurationMs?: number;
}

const WORKFLOW_STORE_KEY = "easy-locs:workflows";
const activeWorkflows = new Map<string, WorkflowState>();

function generateId(): string {
  return `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function persistWorkflow(state: WorkflowState): void {
  try {
    const stored = JSON.parse(localStorage.getItem(WORKFLOW_STORE_KEY) ?? "{}");
    stored[state.workflowId] = state;
    const keys = Object.keys(stored);
    if (keys.length > 50) {
      const sorted = keys.sort((a, b) => (stored[a].startedAt ?? 0) - (stored[b].startedAt ?? 0));
      for (let i = 0; i < keys.length - 50; i++) delete stored[sorted[i]];
    }
    localStorage.setItem(WORKFLOW_STORE_KEY, JSON.stringify(stored));
  } catch { /* storage unavailable */ }
}

function loadWorkflow(workflowId: string): WorkflowState | null {
  try {
    const stored = JSON.parse(localStorage.getItem(WORKFLOW_STORE_KEY) ?? "{}");
    return stored[workflowId] ?? null;
  } catch {
    return null;
  }
}

async function executeStep<TCtx>(
  step: WorkflowStep<TCtx>,
  ctx: TCtx,
  timeoutMs: number,
): Promise<TCtx> {
  return new Promise<TCtx>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Step "${step.id}" timed out after ${timeoutMs}ms`)), timeoutMs);
    step.execute(ctx)
      .then(result => { clearTimeout(timer); resolve(result); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

export async function startWorkflow<TCtx extends Record<string, unknown>>(
  definition: WorkflowDefinition<TCtx>,
  initialContext: TCtx,
): Promise<WorkflowState<TCtx>> {
  const workflowId = generateId();
  const state: WorkflowState<TCtx> = {
    workflowId,
    workflowName: definition.name,
    status: "running",
    currentStepIndex: 0,
    context: { ...initialContext },
    stepResults: definition.steps.map(s => ({
      stepId: s.id,
      status: "pending" as WorkflowStepStatus,
      startedAt: 0,
      retryCount: 0,
    })),
    startedAt: Date.now(),
  };

  activeWorkflows.set(workflowId, state as WorkflowState);
  persistWorkflow(state as WorkflowState);

  platformBus.emit("workflow.started", { workflowId, name: definition.name });

  try {
    for (let i = 0; i < definition.steps.length; i++) {
      const step = definition.steps[i];
      state.currentStepIndex = i;
      const stepResult = state.stepResults[i];

      if (step.condition && !step.condition(state.context)) {
        stepResult.status = "skipped";
        stepResult.completedAt = Date.now();
        continue;
      }

      stepResult.status = "running";
      stepResult.startedAt = Date.now();

      const maxRetries = step.maxRetries ?? (step.canRetry ? 3 : 0);
      const timeoutMs = step.timeoutMs ?? definition.maxDurationMs ?? 30000;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          state.context = await executeStep(step, state.context, timeoutMs);
          stepResult.status = "completed";
          stepResult.completedAt = Date.now();
          stepResult.retryCount = attempt;
          lastError = null;
          break;
        } catch (e) {
          lastError = e instanceof Error ? e : new Error(String(e));
          stepResult.retryCount = attempt;
          if (attempt < maxRetries) {
            stepResult.status = "waiting_retry";
            await new Promise(r => setTimeout(r, Math.min(1000 * Math.pow(2, attempt), 10000)));
          }
        }
      }

      if (lastError) {
        stepResult.status = "failed";
        stepResult.error = lastError.message;
        throw lastError;
      }

      persistWorkflow(state as WorkflowState);
    }

    state.status = "completed";
    state.completedAt = Date.now();
    persistWorkflow(state as WorkflowState);

    platformBus.emit("workflow.completed", { workflowId, name: definition.name });
    if (definition.onComplete) await definition.onComplete(state.context);

  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    state.status = "failed";
    state.error = err.message;
    state.completedAt = Date.now();
    persistWorkflow(state as WorkflowState);

    platformBus.emit("workflow.failed", { workflowId, name: definition.name, error: err.message });
    if (definition.onError) await definition.onError(state.context, err);

    const completedSteps = definition.steps.slice(0, state.currentStepIndex).reverse();
    for (const step of completedSteps) {
      if (step.rollback) {
        try { await step.rollback(state.context); } catch { /* rollback best-effort */ }
      }
    }
  }

  activeWorkflows.delete(workflowId);
  return state;
}

export function resumeWorkflow<TCtx extends Record<string, unknown>>(
  workflowId: string,
  definition: WorkflowDefinition<TCtx>,
): Promise<WorkflowState<TCtx>> | null {
  const saved = loadWorkflow(workflowId);
  if (!saved || saved.status === "completed") return null;

  const resumeCtx = saved.context as TCtx;
  const remainingSteps = definition.steps.slice(saved.currentStepIndex);
  const resumeDef: WorkflowDefinition<TCtx> = {
    ...definition,
    steps: remainingSteps,
  };

  return startWorkflow(resumeDef, resumeCtx);
}

export function getActiveWorkflows(): WorkflowState[] {
  return Array.from(activeWorkflows.values());
}

export function getWorkflowHistory(): WorkflowState[] {
  try {
    const stored = JSON.parse(localStorage.getItem(WORKFLOW_STORE_KEY) ?? "{}");
    return Object.values(stored);
  } catch {
    return [];
  }
}
