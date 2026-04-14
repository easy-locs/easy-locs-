import { platformBus } from "@/lib/shared/platform-bus";
import { receiveViolation, type ViolationReport } from "@/lib/control-plane/enforcement-hub";
import { recordObservabilityProof } from "./observability";

export type CriticalFlowId =
  | "login"
  | "logout"
  | "session_restore"
  | "onboarding"
  | "search"
  | "open_detail"
  | "contact"
  | "message"
  | "call"
  | "pay"
  | "checkout"
  | "booking"
  | "upload"
  | "notification_open"
  | "deep_link";

export type FlowStepStatus = "pending" | "active" | "completed" | "failed" | "skipped";

interface FlowStep {
  id: string;
  name: string;
  status: FlowStepStatus;
  enteredAt: number | null;
  completedAt: number | null;
}

interface FlowStateMachine {
  flowId: CriticalFlowId;
  steps: string[];
  transitions: Record<string, string[]>;
  terminalSteps: string[];
}

interface ActiveFlowInstance {
  instanceId: string;
  flowId: CriticalFlowId;
  currentStep: string;
  steps: FlowStep[];
  startedAt: number;
  completedAt: number | null;
  status: "active" | "completed" | "failed" | "timeout";
  userId?: string;
  metadata?: Record<string, unknown>;
}

const FLOW_MACHINES: Record<CriticalFlowId, FlowStateMachine> = {
  login: {
    flowId: "login",
    steps: ["init", "credentials", "validating", "mfa", "authenticated", "failed"],
    transitions: {
      init: ["credentials"],
      credentials: ["validating"],
      validating: ["authenticated", "mfa", "failed"],
      mfa: ["authenticated", "failed"],
      authenticated: [],
      failed: ["init"],
    },
    terminalSteps: ["authenticated", "failed"],
  },
  logout: {
    flowId: "logout",
    steps: ["init", "cleanup", "confirmed", "failed"],
    transitions: {
      init: ["cleanup"],
      cleanup: ["confirmed", "failed"],
      confirmed: [],
      failed: [],
    },
    terminalSteps: ["confirmed", "failed"],
  },
  session_restore: {
    flowId: "session_restore",
    steps: ["init", "checking_token", "restoring_state", "restored", "expired", "failed"],
    transitions: {
      init: ["checking_token"],
      checking_token: ["restoring_state", "expired", "failed"],
      restoring_state: ["restored", "failed"],
      restored: [],
      expired: [],
      failed: [],
    },
    terminalSteps: ["restored", "expired", "failed"],
  },
  onboarding: {
    flowId: "onboarding",
    steps: ["init", "profile", "preferences", "verification", "completed", "failed"],
    transitions: {
      init: ["profile"],
      profile: ["preferences", "failed"],
      preferences: ["verification", "completed", "failed"],
      verification: ["completed", "failed"],
      completed: [],
      failed: ["init"],
    },
    terminalSteps: ["completed", "failed"],
  },
  search: {
    flowId: "search",
    steps: ["init", "querying", "results", "no_results", "failed"],
    transitions: {
      init: ["querying"],
      querying: ["results", "no_results", "failed"],
      results: ["init"],
      no_results: ["init"],
      failed: ["init"],
    },
    terminalSteps: ["results", "no_results", "failed"],
  },
  open_detail: {
    flowId: "open_detail",
    steps: ["init", "loading", "loaded", "not_found", "failed"],
    transitions: {
      init: ["loading"],
      loading: ["loaded", "not_found", "failed"],
      loaded: [],
      not_found: [],
      failed: ["init"],
    },
    terminalSteps: ["loaded", "not_found", "failed"],
  },
  contact: {
    flowId: "contact",
    steps: ["init", "resolving", "channel_open", "failed"],
    transitions: {
      init: ["resolving"],
      resolving: ["channel_open", "failed"],
      channel_open: [],
      failed: ["init"],
    },
    terminalSteps: ["channel_open", "failed"],
  },
  message: {
    flowId: "message",
    steps: ["init", "composing", "sending", "sent", "delivered", "failed"],
    transitions: {
      init: ["composing"],
      composing: ["sending"],
      sending: ["sent", "failed"],
      sent: ["delivered"],
      delivered: [],
      failed: ["composing"],
    },
    terminalSteps: ["delivered", "failed"],
  },
  call: {
    flowId: "call",
    steps: ["init", "dialing", "ringing", "connecting", "active", "ended", "failed"],
    transitions: {
      init: ["dialing"],
      dialing: ["ringing", "failed"],
      ringing: ["connecting", "ended", "failed"],
      connecting: ["active", "failed"],
      active: ["ended"],
      ended: [],
      failed: ["init"],
    },
    terminalSteps: ["ended", "failed"],
  },
  pay: {
    flowId: "pay",
    steps: ["init", "selecting_method", "processing", "confirmed", "failed"],
    transitions: {
      init: ["selecting_method"],
      selecting_method: ["processing"],
      processing: ["confirmed", "failed"],
      confirmed: [],
      failed: ["selecting_method"],
    },
    terminalSteps: ["confirmed", "failed"],
  },
  checkout: {
    flowId: "checkout",
    steps: ["init", "cart_review", "address", "payment", "confirming", "confirmed", "failed"],
    transitions: {
      init: ["cart_review"],
      cart_review: ["address"],
      address: ["payment"],
      payment: ["confirming"],
      confirming: ["confirmed", "failed"],
      confirmed: [],
      failed: ["cart_review"],
    },
    terminalSteps: ["confirmed", "failed"],
  },
  booking: {
    flowId: "booking",
    steps: ["init", "selecting", "details", "payment", "confirming", "confirmed", "failed"],
    transitions: {
      init: ["selecting"],
      selecting: ["details"],
      details: ["payment"],
      payment: ["confirming"],
      confirming: ["confirmed", "failed"],
      confirmed: [],
      failed: ["selecting"],
    },
    terminalSteps: ["confirmed", "failed"],
  },
  upload: {
    flowId: "upload",
    steps: ["init", "selecting", "uploading", "processing", "completed", "failed"],
    transitions: {
      init: ["selecting"],
      selecting: ["uploading"],
      uploading: ["processing", "failed"],
      processing: ["completed", "failed"],
      completed: [],
      failed: ["selecting"],
    },
    terminalSteps: ["completed", "failed"],
  },
  notification_open: {
    flowId: "notification_open",
    steps: ["init", "resolving", "navigating", "displayed", "failed"],
    transitions: {
      init: ["resolving"],
      resolving: ["navigating", "failed"],
      navigating: ["displayed", "failed"],
      displayed: [],
      failed: [],
    },
    terminalSteps: ["displayed", "failed"],
  },
  deep_link: {
    flowId: "deep_link",
    steps: ["init", "parsing", "resolving", "navigating", "displayed", "not_found", "failed"],
    transitions: {
      init: ["parsing"],
      parsing: ["resolving", "failed"],
      resolving: ["navigating", "not_found", "failed"],
      navigating: ["displayed", "failed"],
      displayed: [],
      not_found: [],
      failed: [],
    },
    terminalSteps: ["displayed", "not_found", "failed"],
  },
};

const flowDomainMap: Record<CriticalFlowId, string> = {
  login: "auth",
  logout: "auth",
  session_restore: "auth",
  onboarding: "auth",
  search: "marketplace",
  open_detail: "marketplace",
  contact: "messaging",
  message: "messaging",
  call: "messaging",
  pay: "payments",
  checkout: "payments",
  booking: "marketplace",
  upload: "media",
  notification_open: "realtime",
  deep_link: "navigation",
};

const activeInstances = new Map<string, ActiveFlowInstance>();
const completedInstances: ActiveFlowInstance[] = [];
const MAX_COMPLETED = 500;
let instanceCounter = 0;

const FLOW_TIMEOUT_MS = 120_000;

function generateInstanceId(flowId: string): string {
  instanceCounter++;
  return `flow-${flowId}-${Date.now()}-${instanceCounter}`;
}

export function startFlow(
  flowId: CriticalFlowId,
  opts?: { userId?: string; metadata?: Record<string, unknown> },
): string {
  const machine = FLOW_MACHINES[flowId];
  if (!machine) return "";

  const instanceId = generateInstanceId(flowId);
  const initialStep = machine.steps[0];

  const instance: ActiveFlowInstance = {
    instanceId,
    flowId,
    currentStep: initialStep,
    steps: machine.steps.map((s) => ({
      id: s,
      name: s,
      status: s === initialStep ? "active" : "pending",
      enteredAt: s === initialStep ? Date.now() : null,
      completedAt: null,
    })),
    startedAt: Date.now(),
    completedAt: null,
    status: "active",
    userId: opts?.userId,
    metadata: opts?.metadata,
  };

  activeInstances.set(instanceId, instance);

  platformBus.emit("enforcement:flow_started", {
    instanceId,
    flowId,
    step: initialStep,
  }, "system");

  return instanceId;
}

export function transitionFlow(
  instanceId: string,
  targetStep: string,
): { success: boolean; reason: string } {
  const instance = activeInstances.get(instanceId);
  if (!instance) return { success: false, reason: "Instance not found" };
  if (instance.status !== "active") return { success: false, reason: `Flow already ${instance.status}` };

  const machine = FLOW_MACHINES[instance.flowId];
  const allowed = machine.transitions[instance.currentStep];
  if (!allowed || !allowed.includes(targetStep)) {
    const violation: ViolationReport = {
      id: `flow-v-${instanceId}-${Date.now()}`,
      engine: "flow",
      domain: flowDomainMap[instance.flowId] ?? "system",
      severity: "error",
      code: "ILLEGAL_FLOW_TRANSITION",
      message: `Flow ${instance.flowId}: illegal transition ${instance.currentStep} → ${targetStep}`,
      source: "flow-enforcement",
      detectedAt: new Date().toISOString(),
      metadata: {
        flowId: instance.flowId,
        instanceId,
        from: instance.currentStep,
        to: targetStep,
        allowed,
      },
    };
    receiveViolation(violation);

    recordObservabilityProof({
      id: `proof-flow-violation-${instanceId}-${Date.now()}`,
      source: "flow-enforcement",
      category: "state_machine_violation",
      timestamp: new Date().toISOString(),
      what: `Illegal transition in ${instance.flowId}: ${instance.currentStep} → ${targetStep}`,
      why: `Allowed transitions from ${instance.currentStep}: ${(allowed ?? []).join(", ") || "none"}`,
      where: `flow:${instance.flowId}`,
      correction: "Transition blocked",
      fallbackUsed: false,
      rollbackUsed: false,
      recurrenceRisk: "medium",
    });

    return {
      success: false,
      reason: `Illegal transition: ${instance.currentStep} → ${targetStep}. Allowed: ${(allowed ?? []).join(", ")}`,
    };
  }

  const currentStepObj = instance.steps.find((s) => s.id === instance.currentStep);
  if (currentStepObj) {
    currentStepObj.status = "completed";
    currentStepObj.completedAt = Date.now();
  }

  instance.currentStep = targetStep;
  const targetStepObj = instance.steps.find((s) => s.id === targetStep);
  if (targetStepObj) {
    targetStepObj.status = "active";
    targetStepObj.enteredAt = Date.now();
  }

  if (machine.terminalSteps.includes(targetStep)) {
    completeInstance(instance, targetStep === "failed" ? "failed" : "completed");
  }

  platformBus.emit("enforcement:flow_transitioned", {
    instanceId,
    flowId: instance.flowId,
    step: targetStep,
  }, "system");

  return { success: true, reason: "Transition successful" };
}

function completeInstance(instance: ActiveFlowInstance, status: "completed" | "failed" | "timeout"): void {
  instance.status = status;
  instance.completedAt = Date.now();

  const currentStepObj = instance.steps.find((s) => s.id === instance.currentStep);
  if (currentStepObj) {
    currentStepObj.status = status === "completed" ? "completed" : "failed";
    currentStepObj.completedAt = Date.now();
  }

  activeInstances.delete(instance.instanceId);
  completedInstances.push(instance);
  if (completedInstances.length > MAX_COMPLETED) {
    completedInstances.splice(0, completedInstances.length - MAX_COMPLETED);
  }

  recordObservabilityProof({
    id: `proof-flow-${status}-${instance.instanceId}`,
    source: "flow-enforcement",
    category: "flow_enforcement",
    timestamp: new Date().toISOString(),
    what: `Flow ${instance.flowId} ${status}`,
    why: status === "timeout"
      ? "Flow exceeded timeout"
      : status === "failed"
        ? "Flow ended in failure state"
        : "Flow completed successfully",
    where: `flow:${instance.flowId}`,
    correction: "none",
    fallbackUsed: false,
    rollbackUsed: false,
    recurrenceRisk: status === "failed" ? "medium" : "low",
    metadata: {
      instanceId: instance.instanceId,
      durationMs: (instance.completedAt ?? Date.now()) - instance.startedAt,
      finalStep: instance.currentStep,
    },
  });
}

export function checkFlowTimeouts(): number {
  let timedOut = 0;
  const now = Date.now();

  for (const [, instance] of activeInstances) {
    if (now - instance.startedAt > FLOW_TIMEOUT_MS) {
      completeInstance(instance, "timeout");
      timedOut++;
    }
  }

  return timedOut;
}

export function getFlowMachine(flowId: CriticalFlowId): FlowStateMachine | null {
  return FLOW_MACHINES[flowId] ?? null;
}

export function getActiveFlows(): ActiveFlowInstance[] {
  return Array.from(activeInstances.values());
}

export function getActiveFlowById(instanceId: string): ActiveFlowInstance | null {
  return activeInstances.get(instanceId) ?? null;
}

export function getCompletedFlows(limit = 50): ActiveFlowInstance[] {
  return completedInstances.slice(-limit);
}

export function getFlowEnforcementStats(): {
  activeFlows: number;
  completedFlows: number;
  failedFlows: number;
  timedOutFlows: number;
  byFlowId: Record<string, { active: number; completed: number; failed: number }>;
} {
  const byFlowId: Record<string, { active: number; completed: number; failed: number }> = {};
  const allFlowIds: CriticalFlowId[] = [
    "login", "logout", "session_restore", "onboarding", "search",
    "open_detail", "contact", "message", "call", "pay",
    "checkout", "booking", "upload", "notification_open", "deep_link",
  ];

  for (const id of allFlowIds) {
    byFlowId[id] = { active: 0, completed: 0, failed: 0 };
  }

  for (const instance of activeInstances.values()) {
    if (byFlowId[instance.flowId]) byFlowId[instance.flowId].active++;
  }

  let failedFlows = 0;
  let timedOutFlows = 0;

  for (const instance of completedInstances) {
    if (byFlowId[instance.flowId]) {
      if (instance.status === "failed") {
        byFlowId[instance.flowId].failed++;
        failedFlows++;
      } else if (instance.status === "timeout") {
        byFlowId[instance.flowId].failed++;
        timedOutFlows++;
      } else {
        byFlowId[instance.flowId].completed++;
      }
    }
  }

  return {
    activeFlows: activeInstances.size,
    completedFlows: completedInstances.filter((i) => i.status === "completed").length,
    failedFlows,
    timedOutFlows,
    byFlowId,
  };
}

export function getAllCriticalFlowIds(): CriticalFlowId[] {
  return Object.keys(FLOW_MACHINES) as CriticalFlowId[];
}

export function clearFlowEnforcement(): void {
  activeInstances.clear();
  completedInstances.length = 0;
}
