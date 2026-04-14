import { platformBus } from "@/lib/shared/platform-bus";
import { enqueueCheckpointPersist } from "@/lib/runtime/runtime-rpc-client";
import {
  type CanonicalMachineDef,
  type TransitionRejection,
  transition,
} from "./canonical-machines";
import { flowStateManager } from "./flow-state-manager";

export type GuardCondition<S extends string = string> = (
  currentState: S,
  event: string,
  context?: Record<string, unknown>,
) => { allowed: boolean; reason?: string };

export interface TimeoutRule<S extends string = string> {
  state: S;
  timeoutMs: number;
  escalationEvent: string;
}

export interface RollbackRule<S extends string = string> {
  state: S;
  reversible: boolean;
  rollbackEvent?: string;
}

export interface EnforcedMachineConfig<S extends string = string> {
  machineName: string;
  machine: CanonicalMachineDef<S>;
  guards: Map<string, GuardCondition<S>>;
  timeoutRules: TimeoutRule<S>[];
  rollbackRules: RollbackRule<S>[];
}

interface TransitionRecord {
  transitionId: string;
  flowId: string;
  machineName: string;
  fromState: string;
  event: string;
  toState: string | null;
  guardResults: Record<string, { allowed: boolean; reason?: string }>;
  timestamp: number;
}

const transitionHistory: TransitionRecord[] = [];
const MAX_TRANSITION_HISTORY = 500;
const activeTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
let timeoutEscalationCount = 0;
const enforcedMachines = new Map<string, EnforcedMachineConfig>();

export function generateTransitionId(): string {
  return `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function registerEnforcedMachine<S extends string>(
  config: EnforcedMachineConfig<S>,
): void {
  enforcedMachines.set(config.machineName, config as EnforcedMachineConfig<string>);
}

export function addGuard<S extends string>(
  machineName: string,
  eventPattern: string,
  guard: GuardCondition<S>,
): void {
  const config = enforcedMachines.get(machineName);
  if (config) {
    config.guards.set(eventPattern, guard as GuardCondition<string>);
  }
}

export function addTimeoutRule<S extends string>(
  machineName: string,
  rule: TimeoutRule<S>,
): void {
  const config = enforcedMachines.get(machineName);
  if (config) {
    config.timeoutRules.push(rule as TimeoutRule<string>);
  }
}

export function enforceTransition<S extends string>(
  flowId: string,
  machineName: string,
  currentState: S,
  event: string,
  context?: Record<string, unknown>,
): {
  success: boolean;
  newState: S | null;
  transitionId: string;
  guardResults: Record<string, { allowed: boolean; reason?: string }>;
  rejection?: TransitionRejection;
} {
  const transitionId = generateTransitionId();
  const config = enforcedMachines.get(machineName);
  const guardResults: Record<string, { allowed: boolean; reason?: string }> = {};

  if (config) {
    for (const [pattern, guard] of config.guards) {
      if (pattern === "*" || pattern === event || pattern === `${currentState}:${event}`) {
        const result = guard(currentState, event, context);
        guardResults[pattern] = result;

        if (!result.allowed) {
          const record: TransitionRecord = {
            transitionId,
            flowId,
            machineName,
            fromState: currentState,
            event,
            toState: null,
            guardResults,
            timestamp: Date.now(),
          };
          transitionHistory.push(record);
          if (transitionHistory.length > MAX_TRANSITION_HISTORY) transitionHistory.shift();

          platformBus.emit("state_machine:guard_rejected", {
            flowId,
            machineName,
            currentState,
            event,
            guardPattern: pattern,
            reason: result.reason,
            transitionId,
          }, "system");

          return {
            success: false,
            newState: null,
            transitionId,
            guardResults,
          };
        }
      }
    }
  }

  const machine = config?.machine;
  if (!machine) {
    return {
      success: false,
      newState: null,
      transitionId,
      guardResults,
    };
  }

  const newState = transition(machine, currentState, event) as S | null;

  const record: TransitionRecord = {
    transitionId,
    flowId,
    machineName,
    fromState: currentState,
    event,
    toState: newState,
    guardResults,
    timestamp: Date.now(),
  };
  transitionHistory.push(record);
  if (transitionHistory.length > MAX_TRANSITION_HISTORY) transitionHistory.shift();

  if (newState === null) {
    platformBus.emit("state_machine:invalid_transition", {
      flowId,
      machineName,
      currentState,
      event,
      transitionId,
    }, "system");

    return {
      success: false,
      newState: null,
      transitionId,
      guardResults,
      rejection: {
        currentState,
        event,
        validEvents: Object.keys(machine.states[currentState]?.on ?? {}),
        timestamp: Date.now(),
      },
    };
  }

  if (config) {
    clearStateTimeout(flowId);
    scheduleStateTimeout(flowId, machineName, newState, config);
  }

  platformBus.emit("state_machine:transition_success", {
    flowId,
    machineName,
    from: currentState,
    event,
    to: newState,
    transitionId,
  }, "system");

  persistCheckpoint(flowId, machineName, newState, currentState, event, transitionId, guardResults);

  return {
    success: true,
    newState,
    transitionId,
    guardResults,
  };
}

function persistCheckpoint(
  flowId: string,
  machineName: string,
  currentState: string,
  previousState: string,
  event: string,
  transitionId: string,
  guardResults: Record<string, { allowed: boolean; reason?: string }>,
): void {
  enqueueCheckpointPersist({
    flowId,
    machineName,
    currentState,
    previousState,
    event,
    transitionId,
    guardResults,
  });

  platformBus.emit("enforcement:checkpoint", {
    flowId,
    machineName,
    currentState,
    previousState,
    event,
    transitionId,
    guardResults,
    timestamp: Date.now(),
  }, "system");
}

function scheduleStateTimeout<S extends string>(
  flowId: string,
  machineName: string,
  state: S,
  config: EnforcedMachineConfig<string>,
): void {
  const rule = config.timeoutRules.find(r => r.state === state);
  if (!rule) return;

  const timeoutKey = `${flowId}:${machineName}`;
  const timer = setTimeout(() => {
    activeTimeouts.delete(timeoutKey);
    timeoutEscalationCount++;

    platformBus.emit("state_machine:timeout_escalation", {
      flowId,
      machineName,
      state,
      escalationEvent: rule.escalationEvent,
      timeoutMs: rule.timeoutMs,
    }, "system");

    const flow = flowStateManager.getFlow(flowId);
    if (flow && flow.currentState === state) {
      flowStateManager.send(flowId, rule.escalationEvent);
    }
  }, rule.timeoutMs);

  activeTimeouts.set(timeoutKey, timer);
}

function clearStateTimeout(flowId: string): void {
  for (const [key, timer] of activeTimeouts) {
    if (key.startsWith(`${flowId}:`)) {
      clearTimeout(timer);
      activeTimeouts.delete(key);
    }
  }
}

export function canRollback(machineName: string, state: string): boolean {
  const config = enforcedMachines.get(machineName);
  if (!config) return false;
  const rule = config.rollbackRules.find(r => r.state === state);
  return rule?.reversible ?? false;
}

export function getRollbackEvent(machineName: string, state: string): string | undefined {
  const config = enforcedMachines.get(machineName);
  if (!config) return undefined;
  const rule = config.rollbackRules.find(r => r.state === state);
  return rule?.rollbackEvent;
}

export function getTransitionHistory(flowId?: string, limit = 50): TransitionRecord[] {
  const filtered = flowId
    ? transitionHistory.filter(r => r.flowId === flowId)
    : transitionHistory;
  return filtered.slice(-limit);
}

export function getEnforcedMachineNames(): string[] {
  return Array.from(enforcedMachines.keys());
}

export function getEnforcementMetrics(): {
  totalTransitions: number;
  guardRejections: number;
  invalidTransitions: number;
  timeoutEscalations: number;
  activeMachines: number;
  activeTimeouts: number;
} {
  let guardRejections = 0;
  let invalidTransitions = 0;

  for (const r of transitionHistory) {
    if (r.toState === null) {
      const hasGuardReject = Object.values(r.guardResults).some(g => !g.allowed);
      if (hasGuardReject) guardRejections++;
      else invalidTransitions++;
    }
  }

  return {
    totalTransitions: transitionHistory.length,
    guardRejections,
    invalidTransitions,
    activeMachines: enforcedMachines.size,
    activeTimeouts: activeTimeouts.size,
    timeoutEscalations: timeoutEscalationCount,
  };
}

export function clearEnforcement(): void {
  transitionHistory.length = 0;
  for (const timer of activeTimeouts.values()) clearTimeout(timer);
  activeTimeouts.clear();
  enforcedMachines.clear();
  timeoutEscalationCount = 0;
}
