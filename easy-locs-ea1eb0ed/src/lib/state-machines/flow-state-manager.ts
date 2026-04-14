import { platformBus } from "@/lib/shared/platform-bus";
import { recordObservabilityProof } from "@/lib/enforcement/observability";
import {
  type CanonicalMachineDef,
  transition,
  BOOKING_MACHINE,
  CHECKOUT_MACHINE,
  MESSAGE_MACHINE,
  AUTH_SESSION_MACHINE,
  type BookingFlowState,
  type CheckoutState,
  type MessageState,
  type AuthSessionState,
} from "./canonical-machines";

export interface FlowCheckpoint<S extends string = string> {
  state: S;
  timestamp: number;
  event: string;
  context?: Record<string, unknown>;
}

export interface FlowInstance<S extends string = string> {
  id: string;
  flowType: string;
  machine: CanonicalMachineDef<S>;
  currentState: S;
  checkpoints: FlowCheckpoint<S>[];
  createdAt: number;
  updatedAt: number;
  recoveryCount: number;
  lastRecoveryAt: number | null;
  metadata: Record<string, unknown>;
}

export interface FlowRecovery {
  flowId: string;
  flowType: string;
  fromState: string;
  attemptedEvent: string;
  rolledBackTo: string;
  timestamp: number;
  reason: string;
}

export interface FlowManagerMetrics {
  activeFlows: number;
  totalTransitions: number;
  totalRecoveries: number;
  recoveryByFlowType: Record<string, number>;
  activeFlowsByType: Record<string, number>;
  recentRecoveries: FlowRecovery[];
}

const MAX_CHECKPOINTS = 20;
const MAX_RECENT_RECOVERIES = 50;

class FlowStateManager {
  private flows = new Map<string, FlowInstance>();
  private _totalTransitions = 0;
  private _totalRecoveries = 0;
  private _recoveryByFlowType: Record<string, number> = {};
  private _recentRecoveries: FlowRecovery[] = [];

  createFlow<S extends string>(
    id: string,
    flowType: string,
    machine: CanonicalMachineDef<S>,
    initialContext?: Record<string, unknown>,
  ): FlowInstance<S> {
    const flow: FlowInstance<S> = {
      id,
      flowType,
      machine,
      currentState: machine.initial,
      checkpoints: [{
        state: machine.initial,
        timestamp: Date.now(),
        event: "INIT",
        context: initialContext,
      }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      recoveryCount: 0,
      lastRecoveryAt: null,
      metadata: initialContext ?? {},
    };

    this.flows.set(id, flow as FlowInstance);

    platformBus.emit("flow:created", {
      flowId: id,
      flowType,
      initialState: machine.initial,
    }, "system");

    return flow;
  }

  send<S extends string>(flowId: string, event: string, context?: Record<string, unknown>): {
    success: boolean;
    previousState: S;
    currentState: S;
    recovered: boolean;
    recoveredTo?: S;
  } {
    const flow = this.flows.get(flowId) as FlowInstance<S> | undefined;
    if (!flow) {
      return { success: false, previousState: "unknown" as S, currentState: "unknown" as S, recovered: false };
    }

    const previousState = flow.currentState;
    const nextState = transition(flow.machine, flow.currentState, event);

    if (nextState !== null) {
      flow.currentState = nextState;
      flow.updatedAt = Date.now();
      this._totalTransitions++;

      flow.checkpoints.push({
        state: nextState,
        timestamp: Date.now(),
        event,
        context,
      });
      if (flow.checkpoints.length > MAX_CHECKPOINTS) {
        flow.checkpoints.splice(0, flow.checkpoints.length - MAX_CHECKPOINTS);
      }

      platformBus.emit("flow:transition", {
        flowId,
        flowType: flow.flowType,
        from: previousState,
        event,
        to: nextState,
      }, "system");

      return { success: true, previousState, currentState: nextState, recovered: false };
    }

    const recoveredState = this.rollbackToLastGood(flow, event);

    const recovery: FlowRecovery = {
      flowId,
      flowType: flow.flowType,
      fromState: previousState,
      attemptedEvent: event,
      rolledBackTo: recoveredState,
      timestamp: Date.now(),
      reason: `Invalid transition: ${previousState} + ${event}`,
    };

    this._totalRecoveries++;
    flow.recoveryCount++;
    flow.lastRecoveryAt = Date.now();
    this._recoveryByFlowType[flow.flowType] = (this._recoveryByFlowType[flow.flowType] ?? 0) + 1;

    this._recentRecoveries.push(recovery);
    if (this._recentRecoveries.length > MAX_RECENT_RECOVERIES) {
      this._recentRecoveries.shift();
    }

    platformBus.emit("flow:recovery", {
      flowId,
      flowType: flow.flowType,
      fromState: previousState,
      attemptedEvent: event,
      recoveredTo: recoveredState,
    }, "system");

    recordObservabilityProof({
      id: `proof-flow-recovery-${flowId}-${Date.now()}`,
      source: "flow-state-manager",
      category: "state_machine_violation",
      timestamp: new Date().toISOString(),
      what: `Invalid transition in ${flow.flowType}: ${previousState} + ${event}`,
      why: `Event "${event}" is not valid in state "${previousState}"`,
      where: `flow:${flow.flowType}:${flowId}`,
      correction: `Rolled back to last-good state: ${recoveredState}`,
      fallbackUsed: false,
      rollbackUsed: true,
      recurrenceRisk: flow.recoveryCount > 3 ? "high" : "medium",
      metadata: { recovery },
    });

    return {
      success: false,
      previousState,
      currentState: flow.currentState,
      recovered: true,
      recoveredTo: flow.currentState,
    };
  }

  private rollbackToLastGood<S extends string>(flow: FlowInstance<S>, failedEvent: string): S {
    for (let i = flow.checkpoints.length - 1; i >= 0; i--) {
      const checkpoint = flow.checkpoints[i];
      const node = flow.machine.states[checkpoint.state];
      if (node?.on && Object.keys(node.on).length > 0) {
        flow.currentState = checkpoint.state;
        flow.updatedAt = Date.now();

        flow.checkpoints.push({
          state: checkpoint.state,
          timestamp: Date.now(),
          event: `ROLLBACK(${failedEvent})`,
        });
        if (flow.checkpoints.length > MAX_CHECKPOINTS) {
          flow.checkpoints.splice(0, flow.checkpoints.length - MAX_CHECKPOINTS);
        }

        return checkpoint.state;
      }
    }

    flow.currentState = flow.machine.initial;
    flow.updatedAt = Date.now();
    flow.checkpoints.push({
      state: flow.machine.initial,
      timestamp: Date.now(),
      event: `RESET(${failedEvent})`,
    });

    return flow.machine.initial;
  }

  getFlow(flowId: string): FlowInstance | undefined {
    return this.flows.get(flowId);
  }

  getFlowState(flowId: string): string | undefined {
    return this.flows.get(flowId)?.currentState;
  }

  getValidEvents(flowId: string): string[] {
    const flow = this.flows.get(flowId);
    if (!flow) return [];
    const node = flow.machine.states[flow.currentState];
    return node?.on ? Object.keys(node.on) : [];
  }

  destroyFlow(flowId: string): void {
    const flow = this.flows.get(flowId);
    if (flow) {
      platformBus.emit("flow:destroyed", {
        flowId,
        flowType: flow.flowType,
        finalState: flow.currentState,
      }, "system");
      this.flows.delete(flowId);
    }
  }

  createBookingFlow(id: string, context?: Record<string, unknown>): FlowInstance<BookingFlowState> {
    return this.createFlow(id, "booking", BOOKING_MACHINE, context);
  }

  createPaymentFlow(id: string, context?: Record<string, unknown>): FlowInstance<CheckoutState> {
    return this.createFlow(id, "payment", CHECKOUT_MACHINE, context);
  }

  createMessageFlow(id: string, context?: Record<string, unknown>): FlowInstance<MessageState> {
    return this.createFlow(id, "message", MESSAGE_MACHINE, context);
  }

  createAuthFlow(id: string, context?: Record<string, unknown>): FlowInstance<AuthSessionState> {
    return this.createFlow(id, "auth", AUTH_SESSION_MACHINE, context);
  }

  getFlowsByType(flowType: string): FlowInstance[] {
    return Array.from(this.flows.values()).filter(f => f.flowType === flowType);
  }

  getMetrics(): FlowManagerMetrics {
    const activeFlowsByType: Record<string, number> = {};
    for (const flow of this.flows.values()) {
      activeFlowsByType[flow.flowType] = (activeFlowsByType[flow.flowType] ?? 0) + 1;
    }

    return {
      activeFlows: this.flows.size,
      totalTransitions: this._totalTransitions,
      totalRecoveries: this._totalRecoveries,
      recoveryByFlowType: { ...this._recoveryByFlowType },
      activeFlowsByType,
      recentRecoveries: [...this._recentRecoveries],
    };
  }

  pruneCompletedFlows(maxAge = 300_000): number {
    const cutoff = Date.now() - maxAge;
    let pruned = 0;

    for (const [id, flow] of this.flows) {
      const node = flow.machine.states[flow.currentState];
      const isTerminal = !node?.on || Object.keys(node.on).length === 0;
      if (isTerminal && flow.updatedAt < cutoff) {
        this.flows.delete(id);
        pruned++;
      }
    }

    return pruned;
  }

  reset(): void {
    this.flows.clear();
    this._totalTransitions = 0;
    this._totalRecoveries = 0;
    this._recoveryByFlowType = {};
    this._recentRecoveries = [];
  }
}

export const flowStateManager = new FlowStateManager();
