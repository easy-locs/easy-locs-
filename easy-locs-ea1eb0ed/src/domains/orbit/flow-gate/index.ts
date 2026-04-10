/**
 * ORBIT FLOW GATE SYSTEM — Entry/Output grouping + anti-infiltration.
 *
 * Architecture:
 *   UI → OrbitEntry → executeFlow/withFlowGate → pipeline → guardedWrite → owner → emitOutput → UI
 */

// ── Entry Registry ──
export { OrbitEntry } from "./orbit-entry-registry";
export type { OrbitEntryKey } from "./orbit-entry-registry";

// ── Output Registry ──
export { OrbitOutput, emitOutput, onOutput } from "./orbit-output-registry";
export type { OrbitOutputType } from "./orbit-output-registry";

// ── Flow Gate (core) ──
export {
  // Flow tracking
  assertSingleFlow,
  enterFlow,
  exitFlow,
  isFlowActive,
  getActiveFlows,
  // Cross-flow
  assertCrossFlow,
  // Dedup
  preventDuplicateExecution,
  wasProcessed,
  // Write guard
  guardedWrite,
  // Flow wrappers
  executeFlow,
  withFlowGate,
  withFlowGateSync,
  // Flow state
  FlowState,
  setFlowState,
  getFlowState,
  // Registries
  PipelineRegistry,
  OwnerRegistry,
  SignalRegistry,
  resolveSignalOwner,
  // Serial
  issueSerial,
  hasSerial,
  // Batch
  openBatch,
  closeBatch,
  getBatch,
  // Auditor
  auditFlow,
  auditAllFlows,
  // Error
  FlowGateError,
} from "./orbit-flow-gate";
export type {
  EntryKey,
  PipelineKey,
  OwnerKey,
  OutputKey,
  SerialKind,
  BatchKey,
  SignalKey,
  FlowStateValue,
  FlowContext,
  FlowBatch,
} from "./orbit-flow-gate";
