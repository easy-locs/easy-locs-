/**
 * ORBIT FLOW GATE — Anti-infiltration core.
 *
 * Prevents:
 * - duplicate concurrent flows (double-tap, double-send)
 * - unauthorized cross-flow triggers
 * - writes outside pipelines
 * - duplicate pipeline executions
 *
 * Every entry MUST: assertSingleFlow → enterFlow → pipeline → exitFlow
 */

const __DEV__ = typeof process !== "undefined"
  ? process.env.NODE_ENV !== "production"
  : true;

// ══════════════════════════════════════════════
// 1. FLOW TRACKING
// ══════════════════════════════════════════════

const activeFlows = new Map<string, number>();

/** Check that no instance of this flow is running. Throws if duplicate. */
export function assertSingleFlow(key: string): void {
  if (activeFlows.has(key)) {
    if (__DEV__) console.warn(`[FLOW BLOCKED] duplicate entry: ${key}`);
    throw new FlowGateError(`duplicate_flow`, key);
  }
}

/** Mark a flow as active. Supports re-entrant counting. */
export function enterFlow(key: string): void {
  const count = activeFlows.get(key) ?? 0;
  activeFlows.set(key, count + 1);
  if (__DEV__) console.debug(`[FLOW START] ${key} (depth: ${count + 1})`);
}

/** Mark a flow as complete. Must be called in finally block. */
export function exitFlow(key: string): void {
  const count = activeFlows.get(key) ?? 0;
  if (count <= 1) {
    activeFlows.delete(key);
  } else {
    activeFlows.set(key, count - 1);
  }
  if (__DEV__) console.debug(`[FLOW END] ${key}`);
}

/** Check if a flow is currently active. */
export function isFlowActive(key: string): boolean {
  return activeFlows.has(key);
}

/** Get all active flows (debug only). */
export function getActiveFlows(): string[] {
  return Array.from(activeFlows.keys());
}

// ══════════════════════════════════════════════
// 2. CROSS-FLOW PROTECTION
// ══════════════════════════════════════════════

/**
 * Whitelist of allowed cross-flow triggers.
 * Format: { "source.flow": ["allowed.target1", "allowed.target2"] }
 */
const allowedCrossFlows: Record<string, string[]> = {
  // Media send may trigger text message (caption)
  "media.send": ["message.sendText"],
  "media.sendBatch": ["message.sendText"],
  // Voice send may trigger text message
  "voice.send": ["message.sendText"],
  // Location send is standalone
  "location.send": [],
  // Conversation creation may trigger a system message
  "conversation.createGroup": ["message.sendText"],
  // Read receipt may clear marked unread
  "receipt.markRead": ["receipt.clearMarkedUnread"],
};

/** Assert that a cross-flow trigger is allowed. */
export function assertCrossFlow(from: string, to: string): void {
  const allowed = allowedCrossFlows[from] || [];
  if (!allowed.includes(to)) {
    if (__DEV__) console.warn(`[CROSS FLOW BLOCKED] ${from} → ${to}`);
    throw new FlowGateError(`cross_flow_blocked`, `${from} → ${to}`);
  }
}

// ══════════════════════════════════════════════
// 3. PIPELINE DEDUP (anti duplicate execution)
// ══════════════════════════════════════════════

const processedIds = new Set<string>();
const PROCESSED_TTL = 60_000; // 60s

/** Prevent duplicate pipeline execution for same ID. */
export function preventDuplicateExecution(id: string): void {
  if (processedIds.has(id)) {
    throw new FlowGateError("duplicate_execution", id);
  }
  processedIds.add(id);
  // Auto-cleanup after TTL
  setTimeout(() => processedIds.delete(id), PROCESSED_TTL);
}

/** Check if an ID has been processed recently. */
export function wasProcessed(id: string): boolean {
  return processedIds.has(id);
}

// ══════════════════════════════════════════════
// 4. GUARDED WRITE
// ══════════════════════════════════════════════

/**
 * Ensure writes only happen from within a flow pipeline.
 * Source must start with "flow:" to be allowed.
 */
export function guardedWrite(source: string, fn: () => void): void {
  if (!source.startsWith("flow:")) {
    if (__DEV__) console.error(`[WRITE BLOCKED] non-flow write from: ${source}`);
    throw new FlowGateError("write_blocked", source);
  }
  fn();
}

// ══════════════════════════════════════════════
// 5. FLOW WRAPPER (convenience)
// ══════════════════════════════════════════════

/**
 * Wrap an entire flow with gate protection.
 * Handles assertSingleFlow + enterFlow + exitFlow automatically.
 */
export async function withFlowGate<T>(
  flowKey: string,
  fn: () => Promise<T>,
): Promise<T> {
  assertSingleFlow(flowKey);
  enterFlow(flowKey);
  try {
    const result = await fn();
    if (__DEV__) console.debug(`[FLOW COMPLETE] ${flowKey}`);
    return result;
  } catch (err) {
    if (__DEV__) console.debug(`[FLOW FAILED] ${flowKey}`, err);
    throw err;
  } finally {
    exitFlow(flowKey);
  }
}

/**
 * Synchronous version of withFlowGate.
 */
export function withFlowGateSync<T>(
  flowKey: string,
  fn: () => T,
): T {
  assertSingleFlow(flowKey);
  enterFlow(flowKey);
  try {
    const result = fn();
    if (__DEV__) console.debug(`[FLOW COMPLETE] ${flowKey}`);
    return result;
  } catch (err) {
    if (__DEV__) console.debug(`[FLOW FAILED] ${flowKey}`, err);
    throw err;
  } finally {
    exitFlow(flowKey);
  }
}

// ══════════════════════════════════════════════
// 6. FLOW STATE MACHINE
// ══════════════════════════════════════════════

export const FlowState = {
  idle: 0,
  running: 1,
  completed: 2,
  failed: 3,
} as const;

export type FlowStateValue = typeof FlowState[keyof typeof FlowState];

const flowStates = new Map<string, FlowStateValue>();

export function setFlowState(key: string, state: FlowStateValue): void {
  flowStates.set(key, state);
}

export function getFlowState(key: string): FlowStateValue {
  return flowStates.get(key) ?? FlowState.idle;
}

// ══════════════════════════════════════════════
// 7. ERROR TYPE
// ══════════════════════════════════════════════

export class FlowGateError extends Error {
  public readonly code: string;
  public readonly detail: string;

  constructor(code: string, detail: string) {
    super(`[FlowGate] ${code}: ${detail}`);
    this.name = "FlowGateError";
    this.code = code;
    this.detail = detail;
  }
}
