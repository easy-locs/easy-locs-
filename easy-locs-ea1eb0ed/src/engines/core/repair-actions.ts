import { isOperationAllowed, isDomainOperationAllowed, hasDomainActivationSheet } from "./repair-safety";
import type { MutationRecord } from "./proof-system";

export type RepairOperationType = "invalidate" | "refresh" | "reset" | "reconnect" | "fallback" | "suppress";

const FINANCIAL_DOMAINS = new Set([
  "wallet", "payment", "billing", "settlement", "ledger", "fraud",
]);

export interface RepairActionResult {
  success: boolean;
  operation: RepairOperationType;
  target: string;
  mutation: MutationRecord | null;
  error: string | null;
  rollbackFn: (() => void) | null;
}

interface ActionState {
  key: string;
  beforeValue: string;
  afterValue: string;
  restoredValue: string | null;
}

const actionHistory: ActionState[] = [];
const MAX_ACTION_HISTORY = 500;

function captureState(target: string): string {
  try {
    const val = localStorage.getItem(target);
    return val ?? "[empty]";
  } catch {
    return "[unreadable]";
  }
}

function recordActionState(state: ActionState): void {
  actionHistory.push(state);
  if (actionHistory.length > MAX_ACTION_HISTORY) {
    actionHistory.splice(0, actionHistory.length - MAX_ACTION_HISTORY);
  }
}

export function canExecuteRepair(domain: string, operation: string): { allowed: boolean; reason: string } {
  if (FINANCIAL_DOMAINS.has(domain)) {
    return { allowed: false, reason: `Financial domain "${domain}" permanently blocked from automated repair` };
  }

  if (!isOperationAllowed(operation)) {
    return { allowed: false, reason: `Operation "${operation}" not in global allowlist` };
  }

  if (hasDomainActivationSheet(domain)) {
    if (!isDomainOperationAllowed(domain, operation)) {
      return { allowed: false, reason: `Operation "${operation}" not allowed by domain activation sheet for "${domain}"` };
    }
  }

  return { allowed: true, reason: "ok" };
}

export function executeRepairAction(
  operation: RepairOperationType,
  target: string,
  domain: string,
): RepairActionResult {
  const check = canExecuteRepair(domain, operation);
  if (!check.allowed) {
    return {
      success: false,
      operation,
      target,
      mutation: null,
      error: check.reason,
      rollbackFn: null,
    };
  }

  const beforeState = captureState(target);
  const appliedAt = Date.now();

  try {
    const executor = OPERATION_EXECUTORS[operation];
    executor(target);
  } catch (err) {
    return {
      success: false,
      operation,
      target,
      mutation: null,
      error: err instanceof Error ? err.message : String(err),
      rollbackFn: null,
    };
  }

  const afterState = captureState(target);

  const actionState: ActionState = {
    key: target,
    beforeValue: beforeState,
    afterValue: afterState,
    restoredValue: null,
  };
  recordActionState(actionState);

  const mutation: MutationRecord = {
    operation,
    target,
    beforeState,
    afterState,
    appliedAt,
    rolledBackAt: null,
  };

  const rollbackFn = createRollbackFn(target, beforeState, mutation, actionState);

  return {
    success: true,
    operation,
    target,
    mutation,
    error: null,
    rollbackFn,
  };
}

function createRollbackFn(
  target: string,
  beforeState: string,
  mutation: MutationRecord,
  actionState: ActionState,
): () => void {
  return () => {
    try {
      if (beforeState === "[empty]") {
        localStorage.removeItem(target);
      } else if (beforeState !== "[unreadable]") {
        localStorage.setItem(target, beforeState);
      }
      mutation.rolledBackAt = Date.now();
      actionState.restoredValue = beforeState;
    } catch {}
  };
}

const OPERATION_EXECUTORS: Record<RepairOperationType, (target: string) => void> = {
  invalidate(target: string) {
    try {
      localStorage.removeItem(target);
    } catch {}
  },

  refresh(target: string) {
    try {
      const current = localStorage.getItem(target);
      if (current) {
        const parsed = JSON.parse(current);
        if (parsed && typeof parsed === "object" && "timestamp" in parsed) {
          parsed.timestamp = Date.now();
          parsed._refreshed = true;
          localStorage.setItem(target, JSON.stringify(parsed));
        }
      }
    } catch {}
  },

  reset(target: string) {
    try {
      localStorage.removeItem(target);
    } catch {}
  },

  reconnect(_target: string) {
    // no-op placeholder — reconnection is signaled via platformBus by the caller
  },

  fallback(_target: string) {
    // no-op placeholder — fallback selection is handled by the pipeline stage
  },

  suppress(_target: string) {
  },
};

export function getActionHistory(): ActionState[] {
  return [...actionHistory];
}

export function getActionHistorySize(): number {
  return actionHistory.length;
}
