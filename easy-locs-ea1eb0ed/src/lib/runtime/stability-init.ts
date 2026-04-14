import {
  registerEnforcedMachine,
  enforceTransition,
  addGuard,
  type GuardCondition,
} from "@/lib/state-machines/runtime-enforcement";
import { isFeatureEnabled } from "@/lib/control-plane/kill-switches";
import {
  BOOKING_MACHINE,
  CHECKOUT_MACHINE,
  MESSAGE_MACHINE,
  AUTH_SESSION_MACHINE,
  CALL_MACHINE,
  REPAIR_MACHINE,
  SUBSCRIPTION_MACHINE,
  UPLOAD_MACHINE,
  SUPPORT_TICKET_MACHINE,
} from "@/lib/state-machines/canonical-machines";
import { flowStateManager } from "@/lib/state-machines/flow-state-manager";
import { registerDefaultBoundaryValidators, validateAtBoundary } from "@/lib/validation/boundary-validators";
import { classifyPath, executeFastPath, setHeavyPathEnqueuer } from "@/lib/runtime/path-discipline";
import { enqueue } from "@/lib/queue/action-queue";
import { registerDefaultReadModels } from "@/lib/runtime/read-models";
import {
  setDomainThresholds,
  registerPreemptiveAction,
} from "@/lib/runtime/anomaly-detection";
import { syncFromServer } from "@/lib/control-plane/server-persistence";
import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";

let initialized = false;

export function initRuntimeStability(): void {
  if (initialized) return;
  initialized = true;

  initEnforcedMachines();

  initGuards();

  flowStateManager.setEnforceFn((flowId, machineName, currentState, event, context) => {
    return enforceTransition(flowId, machineName, currentState, event, context);
  });
  setHeavyPathEnqueuer((queue, flow, context) => {
    enqueue(queue, {
      id: `heavy_${flow}_${Date.now()}`,
      domain: queue.split(":")[0] || "system",
      action: `heavy_path_${flow}`,
      execute: async () => context,
    }).catch((err) => {
      platformBus.emit("runtime:heavy_enqueue_error", {
        flow,
        queue,
        error: err instanceof Error ? err.message : String(err),
      }, "system");
    });
  });

  registerDefaultBoundaryValidators();
  initBoundaryEnforcement();
  initPathDisciplineEnforcement();
  registerDefaultReadModels();
  initAnomalyThresholds();
  initPreemptiveActions();

  syncFromServer(db).catch((err) => {
    platformBus.emit("runtime:sync_error", {
      module: "server-persistence",
      error: String(err),
    }, "system");
  });

  platformBus.emit("runtime:stability_initialized", {
    timestamp: new Date().toISOString(),
    modules: [
      "enforced_machines",
      "boundary_validators",
      "read_models",
      "anomaly_detection",
      "preemptive_actions",
      "server_persistence",
    ],
  }, "system");
}

function initEnforcedMachines(): void {
  const machines: Array<{ name: string; machine: any; timeouts?: Array<{ state: string; timeoutMs: number; escalationEvent: string }>; rollbacks?: Array<{ state: string; reversible: boolean; rollbackEvent?: string }> }> = [
    {
      name: "BOOKING_MACHINE",
      machine: BOOKING_MACHINE,
      timeouts: [
        { state: "payment_pending", timeoutMs: 900_000, escalationEvent: "CANCEL" },
        { state: "confirming", timeoutMs: 300_000, escalationEvent: "CANCEL" },
      ],
      rollbacks: [
        { state: "slot_selected", reversible: true, rollbackEvent: "CANCEL" },
        { state: "confirming", reversible: true, rollbackEvent: "CANCEL" },
        { state: "payment_pending", reversible: true, rollbackEvent: "CANCEL" },
      ],
    },
    {
      name: "CHECKOUT_MACHINE",
      machine: CHECKOUT_MACHINE,
      timeouts: [
        { state: "payment_pending", timeoutMs: 600_000, escalationEvent: "CANCEL" },
        { state: "processing", timeoutMs: 120_000, escalationEvent: "FAIL" },
      ],
      rollbacks: [
        { state: "cart_review", reversible: true, rollbackEvent: "CANCEL" },
        { state: "address_selection", reversible: true, rollbackEvent: "BACK" },
        { state: "payment_selection", reversible: true, rollbackEvent: "BACK" },
      ],
    },
    {
      name: "MESSAGE_MACHINE",
      machine: MESSAGE_MACHINE,
      timeouts: [
        { state: "sending", timeoutMs: 30_000, escalationEvent: "FAIL" },
      ],
    },
    {
      name: "AUTH_SESSION_MACHINE",
      machine: AUTH_SESSION_MACHINE,
      timeouts: [
        { state: "authenticating", timeoutMs: 60_000, escalationEvent: "FAIL" },
        { state: "refreshing", timeoutMs: 30_000, escalationEvent: "FAIL" },
        { state: "locked", timeoutMs: 1800_000, escalationEvent: "TIMEOUT" },
      ],
    },
    {
      name: "CALL_MACHINE",
      machine: CALL_MACHINE,
      timeouts: [
        { state: "calling", timeoutMs: 60_000, escalationEvent: "TIMEOUT" },
        { state: "ringing", timeoutMs: 45_000, escalationEvent: "TIMEOUT" },
        { state: "reconnecting", timeoutMs: 30_000, escalationEvent: "TIMEOUT" },
      ],
    },
    {
      name: "REPAIR_MACHINE",
      machine: REPAIR_MACHINE,
      timeouts: [
        { state: "quote_sent", timeoutMs: 604_800_000, escalationEvent: "REJECT" },
      ],
    },
    {
      name: "SUBSCRIPTION_MACHINE",
      machine: SUBSCRIPTION_MACHINE,
      timeouts: [
        { state: "past_due", timeoutMs: 604_800_000, escalationEvent: "CANCEL" },
      ],
    },
    {
      name: "UPLOAD_MACHINE",
      machine: UPLOAD_MACHINE,
      timeouts: [
        { state: "uploading", timeoutMs: 300_000, escalationEvent: "FAIL" },
        { state: "processing", timeoutMs: 120_000, escalationEvent: "FAIL" },
      ],
    },
    {
      name: "SUPPORT_TICKET_MACHINE",
      machine: SUPPORT_TICKET_MACHINE,
      timeouts: [
        { state: "waiting_customer", timeoutMs: 604_800_000, escalationEvent: "TIMEOUT" },
        { state: "waiting_agent", timeoutMs: 86_400_000, escalationEvent: "TIMEOUT" },
      ],
    },
  ];

  for (const m of machines) {
    registerEnforcedMachine({
      machineName: m.name,
      machine: m.machine,
      guards: new Map(),
      timeoutRules: (m.timeouts ?? []).map(t => ({
        state: t.state,
        timeoutMs: t.timeoutMs,
        escalationEvent: t.escalationEvent,
      })),
      rollbackRules: (m.rollbacks ?? []).map(r => ({
        state: r.state,
        reversible: r.reversible,
        rollbackEvent: r.rollbackEvent,
      })),
    });
  }
}

function initGuards(): void {
  const killSwitchGuard = (feature: string): GuardCondition => {
    return (_currentState, _event) => {
      if (!isFeatureEnabled(feature)) {
        return { allowed: false, reason: `Kill switch "${feature}" is disabled` };
      }
      return { allowed: true };
    };
  };

  addGuard("BOOKING_MACHINE", "CONFIRM", killSwitchGuard("booking_checkout_enabled"));
  addGuard("BOOKING_MACHINE", "PAY", killSwitchGuard("booking_checkout_enabled"));

  addGuard("CHECKOUT_MACHINE", "SUBMIT_PAYMENT", killSwitchGuard("wallet_payments_enabled"));
  addGuard("CHECKOUT_MACHINE", "PROCESS", killSwitchGuard("wallet_payments_enabled"));

  addGuard("MESSAGE_MACHINE", "SEND", (_state, _event, context) => {
    if (context && typeof context.bodyLength === "number" && context.bodyLength > 50_000) {
      return { allowed: false, reason: "Message body exceeds maximum size (50KB)" };
    }
    return { allowed: true };
  });

  addGuard("AUTH_SESSION_MACHINE", "AUTHENTICATE", killSwitchGuard("otp_enabled"));

  addGuard("CALL_MACHINE", "START_CALL", killSwitchGuard("orbit_calls_enabled"));

  addGuard("UPLOAD_MACHINE", "START_UPLOAD", killSwitchGuard("media_upload_enabled"));
}

function initPathDisciplineEnforcement(): void {
  const pathEnforcedFlows = [
    "message_send",
    "payment",
    "booking",
    "file_upload",
    "auth_session",
    "food_order",
    "notification",
    "dashboard_bootstrap",
  ];

  for (const flow of pathEnforcedFlows) {
    platformBus.on(`domain:${flow}:start`, (payload: unknown) => {
      const estimatedMs = (payload && typeof payload === "object" && "estimatedLatencyMs" in (payload as Record<string, unknown>))
        ? (payload as Record<string, unknown>).estimatedLatencyMs as number
        : 0;
      const pathType = classifyPath(flow, estimatedMs);
      if (pathType === "heavy") {
        platformBus.emit("path:routed_heavy", { flow, estimatedMs }, "system");
      }
    });
  }
}

function initBoundaryEnforcement(): void {
  const boundaryPrefixes = [
    "api_response:",
    "webhook:",
    "event_bus:",
    "queue_consumer:",
    "cache_restore:",
    "store_mutation:",
  ];

  platformBus.on("boundary:validate", (payload: unknown) => {
    if (!payload || typeof payload !== "object") return;
    const { boundary: boundaryName, data, correlationId } = payload as {
      boundary?: string;
      data?: unknown;
      correlationId?: string;
    };
    if (!boundaryName || data === undefined) return;

    const result = validateAtBoundary(boundaryName, data, {
      correlationId,
      quarantineOnFail: true,
    });
    if (!result.valid) {
      platformBus.emit("boundary:validation_failed", {
        boundary: boundaryName,
        errors: result.errors,
        quarantined: result.quarantined,
      }, "system");
    }
  });

  for (const prefix of boundaryPrefixes) {
    platformBus.on(`data:${prefix}*`, (payload: unknown) => {
      if (!payload || typeof payload !== "object") return;
      const pObj = payload as Record<string, unknown>;
      const schemaName = pObj.schemaName as string | undefined;
      if (!schemaName) return;

      const result = validateAtBoundary(schemaName, pObj.data, {
        correlationId: pObj.correlationId as string | undefined,
        quarantineOnFail: true,
      });
      if (!result.valid) {
        platformBus.emit("boundary:validation_failed", {
          boundary: schemaName,
          errors: result.errors,
          quarantined: result.quarantined,
        }, "system");
      }
    });
  }
}

function initAnomalyThresholds(): void {
  setDomainThresholds("wallet", {
    errorVelocityPerMinute: 20,
    p95LatencyMs: 1000,
    mutationRejectionRate: 0.1,
  });

  setDomainThresholds("booking", {
    errorVelocityPerMinute: 30,
    p95LatencyMs: 1500,
  });

  setDomainThresholds("orbit", {
    errorVelocityPerMinute: 100,
    p95LatencyMs: 500,
    reconnectFrequency: 50,
  });

  setDomainThresholds("auth", {
    errorVelocityPerMinute: 20,
    p95LatencyMs: 800,
    invalidTransitionCount: 5,
  });

  setDomainThresholds("food", {
    errorVelocityPerMinute: 40,
    p95LatencyMs: 1200,
  });
}

function initPreemptiveActions(): void {
  registerPreemptiveAction("pre_throttle", (domain, metric, value) => {
    platformBus.emit("anomaly:pre_throttle", { domain, metric, value }, "system");
  });

  registerPreemptiveAction("degrade_mode", (domain, metric, value) => {
    platformBus.emit("anomaly:degrade_mode", { domain, metric, value }, "system");
  });

  registerPreemptiveAction("freeze_writes", (domain, metric, value) => {
    platformBus.emit("anomaly:freeze_writes", { domain, metric, value }, "system");
  });

  registerPreemptiveAction("suppress_retries", (domain, metric, value) => {
    platformBus.emit("anomaly:suppress_retries", { domain, metric, value }, "system");
  });

  registerPreemptiveAction("quarantine_engine", (domain, metric, value) => {
    platformBus.emit("anomaly:quarantine_engine", { domain, metric, value }, "system");
  });
}

export function isRuntimeStabilityInitialized(): boolean {
  return initialized;
}
