/**
 * ORBIT FLOW GATE SYSTEM — Entry/Output grouping + anti-infiltration.
 *
 * Architecture:
 *   UI → OrbitEntry → withFlowGate → pipeline → guardedWrite → owner → emitOutput → UI
 */

// ── Entry Registry ──
export { OrbitEntry } from "./orbit-entry-registry";
export type { OrbitEntryKey } from "./orbit-entry-registry";

// ── Output Registry ──
export { OrbitOutput, emitOutput, onOutput } from "./orbit-output-registry";
export type { OrbitOutputType } from "./orbit-output-registry";

// ── Flow Gate (core) ──
export {
  assertSingleFlow,
  enterFlow,
  exitFlow,
  isFlowActive,
  getActiveFlows,
  assertCrossFlow,
  preventDuplicateExecution,
  wasProcessed,
  guardedWrite,
  withFlowGate,
  withFlowGateSync,
  FlowState,
  setFlowState,
  getFlowState,
  FlowGateError,
} from "./orbit-flow-gate";
export type { FlowStateValue } from "./orbit-flow-gate";
