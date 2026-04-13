import { platformBus } from "@/lib/shared/platform-bus";

export type WorkflowStatus = "draft" | "active" | "paused" | "completed" | "failed" | "cancelled";
export type TriggerType = "event" | "schedule" | "webhook" | "manual" | "condition";
export type ActionType = "send_notification" | "update_status" | "create_record" | "call_api" | "emit_event" | "delay" | "condition_branch" | "assign" | "escalate";

export interface WorkflowDefinition {
  workflowId: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  version: number;
  status: WorkflowStatus;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  executionCount: number;
  lastExecutedAt: number | null;
}

export interface WorkflowTrigger {
  type: TriggerType;
  eventName: string | null;
  schedule: string | null;
  conditions: Array<{ field: string; operator: "eq" | "ne" | "gt" | "lt" | "contains" | "in"; value: unknown }>;
}

export interface WorkflowStep {
  stepId: string;
  name: string;
  action: ActionType;
  config: Record<string, unknown>;
  onSuccess: string | null;
  onFailure: string | null;
  timeout: number;
  retries: number;
}

export interface WorkflowExecution {
  executionId: string;
  workflowId: string;
  status: WorkflowStatus;
  startedAt: number;
  completedAt: number | null;
  currentStepId: string | null;
  stepResults: Record<string, { status: "success" | "failed" | "skipped"; output: unknown; duration: number }>;
  triggerPayload: Record<string, unknown>;
  error: string | null;
}

const BUILT_IN_WORKFLOWS: Omit<WorkflowDefinition, "createdBy" | "createdAt" | "updatedAt" | "executionCount" | "lastExecutedAt">[] = [
  {
    workflowId: "wf_order_lifecycle",
    name: "Order Lifecycle",
    description: "Handles order from creation to completion",
    trigger: { type: "event", eventName: "marketplace:vente_completed", schedule: null, conditions: [] },
    steps: [
      { stepId: "confirm", name: "Send Confirmation", action: "send_notification", config: { templateId: "order_confirmed" }, onSuccess: "update_status", onFailure: null, timeout: 5000, retries: 2 },
      { stepId: "update_status", name: "Update Order Status", action: "update_status", config: { status: "confirmed" }, onSuccess: "notify_seller", onFailure: null, timeout: 5000, retries: 1 },
      { stepId: "notify_seller", name: "Notify Seller", action: "send_notification", config: { templateId: "new_order_seller" }, onSuccess: null, onFailure: null, timeout: 5000, retries: 2 },
    ],
    version: 1,
    status: "active",
  },
  {
    workflowId: "wf_delivery_tracking",
    name: "Delivery Tracking Updates",
    description: "Sends tracking updates throughout delivery",
    trigger: { type: "event", eventName: "delivery:dispatched", schedule: null, conditions: [] },
    steps: [
      { stepId: "notify_buyer", name: "Notify Buyer of Dispatch", action: "send_notification", config: { templateId: "order_shipped" }, onSuccess: "track", onFailure: null, timeout: 5000, retries: 2 },
      { stepId: "track", name: "Start Tracking", action: "emit_event", config: { eventName: "tracking:started" }, onSuccess: null, onFailure: null, timeout: 5000, retries: 0 },
    ],
    version: 1,
    status: "active",
  },
  {
    workflowId: "wf_seller_payout",
    name: "Seller Payout Processing",
    description: "Processes seller payouts after delivery confirmation",
    trigger: { type: "event", eventName: "delivery:validated", schedule: null, conditions: [] },
    steps: [
      { stepId: "calculate", name: "Calculate Payout", action: "call_api", config: { endpoint: "payout_calculator" }, onSuccess: "transfer", onFailure: "escalate", timeout: 10000, retries: 3 },
      { stepId: "transfer", name: "Transfer to Seller", action: "emit_event", config: { eventName: "wallet:transfer_completed" }, onSuccess: "notify", onFailure: "escalate", timeout: 30000, retries: 3 },
      { stepId: "notify", name: "Notify Seller", action: "send_notification", config: { templateId: "payout_completed" }, onSuccess: null, onFailure: null, timeout: 5000, retries: 2 },
      { stepId: "escalate", name: "Escalate Failure", action: "escalate", config: { team: "finance" }, onSuccess: null, onFailure: null, timeout: 5000, retries: 0 },
    ],
    version: 1,
    status: "active",
  },
  {
    workflowId: "wf_kyc_review",
    name: "KYC Review Process",
    description: "Handles KYC document review flow",
    trigger: { type: "event", eventName: "kyc:status_changed", schedule: null, conditions: [{ field: "status", operator: "eq", value: "submitted" }] },
    steps: [
      { stepId: "assign", name: "Assign Reviewer", action: "assign", config: { role: "compliance_officer" }, onSuccess: "notify_user", onFailure: null, timeout: 5000, retries: 1 },
      { stepId: "notify_user", name: "Notify User", action: "send_notification", config: { templateId: "kyc_in_review" }, onSuccess: null, onFailure: null, timeout: 5000, retries: 2 },
    ],
    version: 1,
    status: "active",
  },
];

export function getBuiltInWorkflows(): typeof BUILT_IN_WORKFLOWS {
  return BUILT_IN_WORKFLOWS;
}

export function getWorkflow(workflowId: string): typeof BUILT_IN_WORKFLOWS[0] | undefined {
  return BUILT_IN_WORKFLOWS.find((w) => w.workflowId === workflowId);
}

export function evaluateTriggerConditions(
  conditions: WorkflowTrigger["conditions"],
  payload: Record<string, unknown>
): boolean {
  for (const condition of conditions) {
    const value = payload[condition.field];
    switch (condition.operator) {
      case "eq": if (value !== condition.value) return false; break;
      case "ne": if (value === condition.value) return false; break;
      case "gt": if (typeof value !== "number" || value <= (condition.value as number)) return false; break;
      case "lt": if (typeof value !== "number" || value >= (condition.value as number)) return false; break;
      case "contains": if (typeof value !== "string" || !value.includes(condition.value as string)) return false; break;
      case "in": if (!Array.isArray(condition.value) || !condition.value.includes(value)) return false; break;
    }
  }
  return true;
}

export function getNextStep(
  workflow: typeof BUILT_IN_WORKFLOWS[0],
  currentStepId: string,
  success: boolean
): WorkflowStep | null {
  const step = workflow.steps.find((s) => s.stepId === currentStepId);
  if (!step) return null;
  const nextId = success ? step.onSuccess : step.onFailure;
  if (!nextId) return null;
  return workflow.steps.find((s) => s.stepId === nextId) ?? null;
}

export function emitWorkflowStarted(workflowId: string, executionId: string): void {
  platformBus.emit("automation:workflow_started", {
    workflowId, executionId, timestamp: Date.now(),
  }, "automation-engine");
}

export function emitWorkflowCompleted(workflowId: string, executionId: string, status: WorkflowStatus): void {
  platformBus.emit("automation:workflow_completed", {
    workflowId, executionId, status, timestamp: Date.now(),
  }, "automation-engine");
}

export function emitWorkflowFailed(workflowId: string, executionId: string, error: string): void {
  platformBus.emit("automation:workflow_failed", {
    workflowId, executionId, error, timestamp: Date.now(),
  }, "automation-engine");
  platformBus.emit("notification:created", {
    recipientId: "admin",
    type: "workflow_failure",
    title: "Workflow Failed",
    body: `Workflow ${workflowId} failed: ${error}`,
    route: "/admin/workflows",
  }, "automation-engine");
}
