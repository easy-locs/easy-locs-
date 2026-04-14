/**
 * Workflow Executor — Central Automation Worker
 *
 * Consumes BUILT_IN_WORKFLOWS + EXTRA_WORKFLOWS, registers platformBus triggers,
 * and executes step sequences with retry, timeout, rollback, and DLQ integration.
 *
 * Action handlers: send_notification, update_status, create_record, call_api,
 *                  emit_event, delay, condition_branch, assign, escalate
 *
 * Features:
 *  - Event-triggered workflows via platformBus listeners
 *  - Schedule-triggered workflows via internal cron polling (every 60s)
 *  - Per-step retry with exponential backoff + step timeout
 *  - Per-step rollback (compensating emit) on workflow failure
 *  - Workflow-level retry queue (up to MAX_WORKFLOW_RETRIES) with backoff
 *  - Dead-letter after all workflow retries exhausted → DLQ + markDead
 *
 * Boot via: workflowExecutor.start() in AppInit.
 */
import { platformBus, type PlatformEvent } from "@/lib/shared/platform-bus";
import {
  getBuiltInWorkflows,
  getNextStep,
  evaluateTriggerConditions,
  emitWorkflowStarted,
  emitWorkflowCompleted,
  emitWorkflowFailed,
  type WorkflowDefinition,
  type WorkflowStep,
  type ActionType,
} from "@/lib/systems/automation-engine";
import { EXTRA_WORKFLOWS } from "./extra-workflows";
import { workflowExecutionStore } from "./workflow-execution-store";
import { insertIntoDlq } from "@/lib/dlq/dlq-client";
import { db } from "@/services/db";

type WorkflowDef = Omit<WorkflowDefinition, "createdBy" | "createdAt" | "updatedAt" | "executionCount" | "lastExecutedAt">;

const MAX_WORKFLOW_RETRIES = 3;

type ApiHandlerResult = { ok: boolean; data?: unknown; error?: string };

type ApiEndpointHandler = (payload: Record<string, unknown>) => Promise<ApiHandlerResult>;

const API_ENDPOINT_REGISTRY: Record<string, ApiEndpointHandler> = {
  payout_calculator: async (payload) => {
    const orderId = payload.orderId ?? payload.order_id;
    if (!orderId) return { ok: true, data: { calculated: true, amount: 0 } };
    const { data, error } = await db("orders")
      .select("total_amount, commission_rate")
      .eq("id", orderId)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    const payout = data ? (data.total_amount ?? 0) * (1 - (data.commission_rate ?? 0.1)) : 0;
    return { ok: true, data: { calculated: true, payout } };
  },

  payout_reconciliation_fetch: async (_payload) => {
    const { data, error } = await db("wallet_transactions")
      .select("id, amount, status, created_at")
      .eq("status", "pending")
      .limit(100);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { pendingPayouts: data ?? [], count: (data ?? []).length } };
  },

  payout_verification: async (_payload) => {
    const { count, error } = await db("wallet_transactions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { verified: true, pendingCount: count ?? 0 } };
  },

  support_ticket_status: async (payload) => {
    const ticketId = payload.ticketId ?? payload.ticket_id;
    if (!ticketId) return { ok: true, data: { status: "open" } };
    const { data, error } = await db("support_tickets")
      .select("status")
      .eq("id", ticketId)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { status: data?.status ?? "open", shouldEscalate: data?.status === "open" } };
  },

  delivery_tracking_register: async (payload) => {
    const orderId = payload.orderId ?? payload.order_id;
    platformBus.emit("tracking:register_requested", {
      orderId,
      timestamp: Date.now(),
    }, "automation-engine");
    return { ok: true, data: { registered: true, orderId } };
  },
};

function generateId(): string {
  return `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`[workflow-executor] timeout: ${label} exceeded ${ms}ms`)),
      ms
    );
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

async function stepExponentialBackoff(attempt: number): Promise<void> {
  await sleep(Math.min(1000 * Math.pow(2, attempt), 30_000));
}

async function workflowExponentialBackoff(attempt: number): Promise<void> {
  await sleep(Math.min(5000 * Math.pow(2, attempt), 120_000));
}

function sendToDlq(workflowId: string, executionId: string, error: string, payload: Record<string, unknown>): void {
  platformBus.emit("dlq:workflow_failed", {
    source_system: `workflow-executor:${workflowId}`,
    operation_type: "workflow_execution",
    payload: { workflowId, executionId, ...payload },
    error,
    timestamp: Date.now(),
  }, "automation-engine");

  void insertIntoDlq(
    `workflow-executor:${workflowId}`,
    "workflow_execution",
    { workflowId, executionId, triggerPayload: payload },
    error,
    5
  );
}

async function executeAction(
  step: WorkflowStep,
  payload: Record<string, unknown>,
  workflowId: string,
): Promise<void> {
  const action = step.action as ActionType;
  const config = step.config;

  switch (action) {
    case "send_notification": {
      const recipientId =
        (config.recipientId as string | undefined) ??
        (config.recipientField ? (payload[config.recipientField as string] as string | undefined) : undefined) ??
        (payload.userId as string | undefined) ??
        "system";
      platformBus.emit("notification:created", {
        recipientId,
        type: config.templateId ?? "workflow_notification",
        title: `Workflow: ${workflowId}`,
        body: `Step completed: ${step.name}`,
        data: { templateId: config.templateId, workflowId, stepId: step.stepId, ...payload },
        route: "/admin/workflows",
      }, "automation-engine");
      break;
    }

    case "update_status": {
      platformBus.emit("automation:status_updated", {
        entity: config.entity ?? "record",
        status: config.status,
        workflowId,
        stepId: step.stepId,
        ...payload,
      }, "automation-engine");
      break;
    }

    case "create_record": {
      platformBus.emit("automation:record_created", {
        recordType: config.recordType ?? "generic",
        workflowId,
        stepId: step.stepId,
        ...payload,
        ...config,
      }, "automation-engine");
      break;
    }

    case "call_api": {
      const endpoint = config.endpoint as string | undefined;
      if (!endpoint) throw new Error(`call_api step "${step.stepId}" missing config.endpoint`);
      const handler = API_ENDPOINT_REGISTRY[endpoint];
      if (handler) {
        const result = await handler(payload);
        if (!result.ok) {
          throw new Error(`call_api endpoint "${endpoint}" failed: ${result.error ?? "unknown error"}`);
        }
        platformBus.emit("automation:api_called", {
          endpoint,
          workflowId,
          stepId: step.stepId,
          params: payload,
          result: result.data,
        }, "automation-engine");
      } else {
        platformBus.emit("automation:api_called", {
          endpoint,
          workflowId,
          stepId: step.stepId,
          params: payload,
          handlerFound: false,
        }, "automation-engine");
        console.warn(`[workflow-executor] no handler for endpoint "${endpoint}" — event emitted only`);
      }
      break;
    }

    case "emit_event": {
      const eventName = config.eventName as string | undefined;
      if (!eventName) throw new Error(`emit_event step "${step.stepId}" missing config.eventName`);
      platformBus.emit(eventName, {
        ...payload,
        workflowId,
        stepId: step.stepId,
        _source: "workflow-executor",
      }, "automation-engine");
      break;
    }

    case "delay": {
      const ms = (config.delayMs as number | undefined) ?? 1000;
      if (ms <= 60_000) {
        await sleep(ms);
      } else {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, ms);
        });
      }
      break;
    }

    case "condition_branch": {
      const field = config.field as string | undefined;
      const value = config.value;
      const result = field ? payload[field] === value : false;
      platformBus.emit("automation:condition_evaluated", {
        stepId: step.stepId,
        workflowId,
        field,
        expected: value,
        actual: field ? payload[field] : undefined,
        result,
      }, "automation-engine");
      break;
    }

    case "assign": {
      platformBus.emit("automation:assigned", {
        role: config.role,
        entity: config.entity ?? "task",
        workflowId,
        stepId: step.stepId,
        ...payload,
      }, "automation-engine");
      break;
    }

    case "escalate": {
      platformBus.emit("automation:escalated", {
        team: config.team ?? "ops",
        reason: config.reason ?? "workflow_step_escalation",
        workflowId,
        stepId: step.stepId,
        ...payload,
      }, "automation-engine");
      platformBus.emit("notification:created", {
        recipientId: "admin",
        type: "workflow_escalation",
        title: `Escalation: ${workflowId}`,
        body: `Step "${step.name}" escalated to ${config.team ?? "ops"} — ${config.reason ?? ""}`,
        data: { workflowId, stepId: step.stepId, team: config.team, ...payload },
        route: "/admin/workflows",
      }, "automation-engine");
      break;
    }

    case "webhook": {
      const url = config.url as string | undefined;
      const method = (config.method as string | undefined) ?? "POST";
      const headers = (config.headers as Record<string, string> | undefined) ?? { "Content-Type": "application/json" };
      if (!url) throw new Error(`webhook step "${step.stepId}" missing config.url`);
      const payloadFields = config.payloadFields as string[] | undefined;
      const webhookBody = payloadFields
        ? Object.fromEntries(payloadFields.map((f) => [f, payload[f]]))
        : payload;
      const resp = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({ ...webhookBody, workflowId, stepId: step.stepId }),
      });
      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        throw new Error(`webhook "${url}" returned ${resp.status}: ${body.slice(0, 200)}`);
      }
      platformBus.emit("automation:webhook_fired", {
        url,
        method,
        workflowId,
        stepId: step.stepId,
        status: resp.status,
      }, "automation-engine");
      break;
    }

    default: {
      const exhaustive: never = action;
      console.warn(`[workflow-executor] unknown action "${exhaustive}" in step "${step.stepId}"`);
    }
  }
}

function rollbackCompletedSteps(
  workflow: WorkflowDef,
  completedStepIds: string[],
  payload: Record<string, unknown>,
): void {
  const reversed = [...completedStepIds].reverse();
  for (const stepId of reversed) {
    const step = workflow.steps.find((s) => s.stepId === stepId);
    if (!step) continue;
    try {
      platformBus.emit("automation:step_rollback", {
        workflowId: workflow.workflowId,
        stepId: step.stepId,
        stepName: step.name,
        action: step.action,
        triggerPayload: payload,
        timestamp: Date.now(),
      }, "automation-engine");
    } catch (e) {
      console.warn(`[workflow-executor] rollback emit failed for step "${stepId}":`, e);
    }
  }
}

async function attemptWorkflow(
  workflow: WorkflowDef,
  triggerPayload: Record<string, unknown>,
  triggerEvent: string,
  executionId: string,
): Promise<{ ok: boolean; error: string | null }> {
  let currentStepId: string | null = workflow.steps[0]?.stepId ?? null;
  const completedStepIds: string[] = [];
  let executionFailed = false;
  let executionError: string | null = null;

  while (currentStepId) {
    const step = workflow.steps.find((s) => s.stepId === currentStepId);
    if (!step) {
      executionError = `Step "${currentStepId}" not found in workflow "${workflow.workflowId}"`;
      executionFailed = true;
      break;
    }

    workflowExecutionStore.startStep(executionId, {
      stepId: step.stepId,
      stepName: step.name,
      status: "running",
      startedAt: Date.now(),
      attempt: 1,
    });

    let stepSucceeded = false;
    let stepError: string | null = null;

    for (let attempt = 0; attempt <= step.retries; attempt++) {
      if (attempt > 0) {
        await stepExponentialBackoff(attempt - 1);
        workflowExecutionStore.startStep(executionId, {
          stepId: step.stepId,
          stepName: step.name,
          status: "running",
          startedAt: Date.now(),
          attempt: attempt + 1,
        });
      }

      try {
        await withTimeout(
          executeAction(step, triggerPayload, workflow.workflowId),
          step.timeout,
          `${workflow.workflowId}/${step.stepId}`
        );
        stepSucceeded = true;
        stepError = null;
        break;
      } catch (e) {
        stepError = e instanceof Error ? e.message : String(e);
        console.error(
          `[workflow-executor] "${workflow.workflowId}" step "${step.stepId}" attempt ${attempt + 1} failed:`,
          stepError
        );
      }
    }

    if (stepSucceeded) {
      workflowExecutionStore.completeStep(executionId, step.stepId, "completed");
      completedStepIds.push(step.stepId);
      const nextStep = getNextStep(workflow, currentStepId, true);
      currentStepId = nextStep?.stepId ?? null;
    } else {
      workflowExecutionStore.completeStep(executionId, step.stepId, "failed", stepError ?? undefined);
      const nextStep = getNextStep(workflow, currentStepId, false);
      if (nextStep) {
        currentStepId = nextStep.stepId;
      } else {
        executionFailed = true;
        executionError = stepError;
        break;
      }
    }
  }

  if (executionFailed) {
    rollbackCompletedSteps(workflow, completedStepIds, triggerPayload);
    return { ok: false, error: executionError };
  }

  return { ok: true, error: null };
}

async function runWorkflow(
  workflow: WorkflowDef,
  triggerPayload: Record<string, unknown>,
  triggerEvent: string,
): Promise<void> {
  if (workflow.status !== "active") return;

  const executionId = generateId();
  const startedAt = Date.now();

  workflowExecutionStore.startExecution({
    executionId,
    workflowId: workflow.workflowId,
    workflowName: workflow.name,
    status: "running",
    startedAt,
    currentStepId: workflow.steps[0]?.stepId ?? null,
    triggerEvent,
    triggerPayload,
  });

  emitWorkflowStarted(workflow.workflowId, executionId);

  let lastError: string | null = null;
  let succeeded = false;

  for (let wfAttempt = 0; wfAttempt <= MAX_WORKFLOW_RETRIES; wfAttempt++) {
    if (wfAttempt > 0) {
      workflowExecutionStore.incrementRetry(executionId);
      await workflowExponentialBackoff(wfAttempt - 1);
    }

    const result = await attemptWorkflow(workflow, triggerPayload, triggerEvent, executionId);

    if (result.ok) {
      succeeded = true;
      lastError = null;
      break;
    }

    lastError = result.error;
    console.warn(
      `[workflow-executor] "${workflow.workflowId}" attempt ${wfAttempt + 1}/${MAX_WORKFLOW_RETRIES + 1} failed:`,
      lastError
    );
  }

  if (succeeded) {
    workflowExecutionStore.completeExecution(executionId, "completed");
    emitWorkflowCompleted(workflow.workflowId, executionId, "completed");
  } else {
    workflowExecutionStore.markDead(executionId);
    emitWorkflowFailed(workflow.workflowId, executionId, lastError ?? "Unknown error after all retries");
    sendToDlq(workflow.workflowId, executionId, lastError ?? "Unknown error after all retries", triggerPayload);
  }
}

/**
 * Cross-tab leader election for scheduled workflow execution.
 *
 * When a Realtime trigger fires, all connected tabs receive it simultaneously.
 * This function uses the BroadcastChannel API to negotiate which tab "wins"
 * the right to execute the workflow for a given trigger tick.
 *
 * Protocol:
 *  1. The tab that receives the Realtime event broadcasts a "claim" message.
 *  2. All other tabs that also received the event hear the claim and back off.
 *  3. After a 150ms coordination window, the tab that first posted the claim
 *     proceeds (it will have received no competing claim from an earlier tab).
 *
 * Falls back to `true` (allow execution) when BroadcastChannel is unavailable.
 */
const SCHEDULE_LEADER_CHANNEL = "workflow-schedule-leader";

function acquireScheduleLease(idempotencyKey: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof BroadcastChannel === "undefined") {
      resolve(true);
      return;
    }
    const bc = new BroadcastChannel(SCHEDULE_LEADER_CHANNEL);
    const tabId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let yielded = false;

    bc.onmessage = (e: MessageEvent<{ type: string; key: string; tabId: string }>) => {
      if (
        e.data?.type === "claim" &&
        e.data?.key === idempotencyKey &&
        e.data?.tabId !== tabId
      ) {
        yielded = true;
        bc.close();
        resolve(false);
      }
    };

    bc.postMessage({ type: "claim", key: idempotencyKey, tabId });

    setTimeout(() => {
      if (!yielded) {
        bc.close();
        resolve(true);
      }
    }, 150);
  });
}

/**
 * Subscribe to Supabase Realtime for engine_supervisor rows with
 * runtime_class = 'workflow-schedule'. The autonomous-cron-dispatcher
 * upserts these rows on a server-side schedule, providing the reliable
 * server-triggered scheduling path. When updated_at changes, the executor
 * fires the corresponding workflow via platformBus.
 *
 * Guards:
 *  1. Per-session Set<engine_name:updated_at> prevents double execution when
 *     Supabase Realtime delivers the same change event more than once.
 *  2. BroadcastChannel leader election (acquireScheduleLease) ensures only one
 *     browser tab executes the workflow per trigger tick even when multiple
 *     tabs are open simultaneously.
 */
function subscribeToScheduleTriggers(
  workflows: WorkflowDef[],
  onCleanup: (fn: () => void) => void,
): void {
  const firedKeys = new Set<string>();

  try {
    const channel = db.channel("workflow-schedule-triggers")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "system",
          table: "engine_supervisor",
          filter: "runtime_class=eq.workflow-schedule",
        },
        (payload: { new?: Record<string, unknown> }) => {
          const row = payload.new;
          if (!row) return;
          const engineName = row.engine_name as string | undefined;
          if (!engineName?.startsWith("wf:")) return;
          const updatedAt = (row.updated_at as string | undefined) ?? String(Date.now());
          const idempotencyKey = `${engineName}:${updatedAt}`;
          if (firedKeys.has(idempotencyKey)) return;
          firedKeys.add(idempotencyKey);

          const workflowId = engineName.slice(3);
          const wf = workflows.find((w) => w.workflowId === workflowId);
          if (!wf || wf.status !== "active") return;
          void acquireScheduleLease(idempotencyKey).then((won) => {
            if (!won) {
              console.info(`[workflow-executor] another tab claimed "${workflowId}" for key=${idempotencyKey} — skipping`);
              return;
            }
            console.info(`[workflow-executor] schedule trigger received for "${workflowId}" via Supabase Realtime (key=${idempotencyKey})`);
            return runWorkflow(wf, { _scheduled: true, _trigger: "server-cron" }, "schedule");
          }).catch((e) => {
            console.error(`[workflow-executor] schedule error "${workflowId}":`, e);
          });
        }
      )
      .subscribe((status: string) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("[workflow-executor] Realtime subscription error — scheduled workflows will not trigger automatically");
        }
      });
    onCleanup(() => { void channel.unsubscribe(); });
  } catch (e) {
    console.warn("[workflow-executor] Could not set up Realtime schedule subscription:", e);
  }
}

class WorkflowExecutorService {
  private _started = false;
  private _unsubs: Array<() => void> = [];
  private _allWorkflows: WorkflowDef[] = [];

  start(): void {
    if (this._started) return;
    this._started = true;

    this._allWorkflows = [
      ...getBuiltInWorkflows(),
      ...EXTRA_WORKFLOWS,
    ] as WorkflowDef[];

    const byEvent = new Map<string, WorkflowDef[]>();
    const scheduleWorkflows: WorkflowDef[] = [];

    for (const wf of this._allWorkflows) {
      if (wf.trigger.type === "event" && wf.trigger.eventName) {
        const list = byEvent.get(wf.trigger.eventName) ?? [];
        list.push(wf);
        byEvent.set(wf.trigger.eventName, list);
      } else if (wf.trigger.type === "schedule") {
        scheduleWorkflows.push(wf);
      }
    }

    for (const [eventName, workflows] of byEvent) {
      const unsub = platformBus.on(eventName, (event: PlatformEvent) => {
        const payload = (event.payload ?? {}) as Record<string, unknown>;
        for (const wf of workflows) {
          const conditionsOk = evaluateTriggerConditions(wf.trigger.conditions, payload);
          if (!conditionsOk) continue;
          void runWorkflow(wf, payload, eventName).catch((e) => {
            console.error(`[workflow-executor] uncaught error running "${wf.workflowId}":`, e);
          });
        }
      });
      this._unsubs.push(unsub);
    }

    if (scheduleWorkflows.length > 0) {
      subscribeToScheduleTriggers(
        scheduleWorkflows,
        (fn) => this._unsubs.push(fn),
      );
    }

    platformBus.emit("automation:executor_started", {
      workflowCount: this._allWorkflows.length,
      eventTriggers: Array.from(byEvent.keys()),
      scheduleTriggers: scheduleWorkflows.map((w) => w.workflowId),
      timestamp: Date.now(),
    }, "automation-engine");

    console.info(
      `[workflow-executor] started — ${this._allWorkflows.length} workflows, ` +
      `${byEvent.size} event triggers, ${scheduleWorkflows.length} schedule triggers (Realtime) registered`
    );
  }

  stop(): void {
    this._unsubs.forEach((fn) => fn());
    this._unsubs = [];
    this._started = false;
    console.info("[workflow-executor] stopped");
  }

  getWorkflows(): WorkflowDef[] {
    return this._allWorkflows;
  }

  isStarted(): boolean {
    return this._started;
  }

  triggerManual(workflowId: string, payload: Record<string, unknown> = {}): void {
    const wf = this._allWorkflows.find((w) => w.workflowId === workflowId);
    if (!wf) {
      console.warn(`[workflow-executor] manual trigger: workflow "${workflowId}" not found`);
      return;
    }
    void runWorkflow(wf, payload, "manual").catch((e) => {
      console.error(`[workflow-executor] manual trigger error for "${workflowId}":`, e);
    });
  }
}

export const workflowExecutor = new WorkflowExecutorService();
