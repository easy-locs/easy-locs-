/**
 * @deprecated — Merged into flow-integrity-engine.ts.
 * This file is a backward-compat shim. Import from @/engines/governance/flow-integrity-engine instead.
 */
export {
  registerFlow,
  updateFlowState,
  getFlow,
  getAllFlows,
  getFlowViolations,
  getFlowClosureStats,
  ALL_CRITICAL_FLOWS,
  FlowIntegrityEngine as FlowClosureEngine,
} from "./flow-integrity-engine";
