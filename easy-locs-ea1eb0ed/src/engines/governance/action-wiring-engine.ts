/**
 * @deprecated — Merged into flow-integrity-engine.ts.
 * This file is a backward-compat shim. Import from @/engines/governance/flow-integrity-engine instead.
 */
export {
  registerAction,
  registerActions,
  getAction,
  getAllActions,
  trackActionClick,
  validateActionWiring,
  getActionViolations,
  getActionStats,
  FlowIntegrityEngine as ActionWiringEngine,
} from "./flow-integrity-engine";
