/**
 * Controlled Self-Evolution layer (Level C, Level D-prep).
 *
 * Architecture:
 *   AuditAgent (read-only) ──► PlannerAgent (stateless) ──►
 *     Commander (registry + safeguards) ──► Approval chokepoint ──►
 *       RepairAgent (only after approved)
 *
 * Policy: see docs/EVOLUTION_POLICY.md
 *
 * Hard rules:
 *   - Agents may NOT spawn other agents.
 *   - Nothing executes until a proposal is `approved` via approval.ts.
 *   - Level D (`LEVEL_D_ENABLED`) is OFF by default and gated by env.
 */

export * from './types';
export {
  getEvolutionConfig,
  setEvolutionConfig,
  resetEvolutionConfig,
  onConfigChange,
  EVOLUTION_DEFAULTS,
} from './config';

export {
  registerProposal,
  updateStatus,
  getEntry,
  getLineage,
  listEntries,
  countActive,
  makeContentHash,
  makeProposalId,
  hydrateRegistry,
} from './registry';

export {
  checkPipelineDepth,
  checkRecursiveSpawn,
  checkConcurrencyLimit,
  makeLoopGuard,
  runAllProposalSafeguards,
} from './safeguards';

export {
  emit,
  subscribe,
  getEvents,
  getSummary,
  buildPerformanceImpact,
  isPaused,
  getRejectionStreak,
  hydrateEvents,
} from './monitoring';

export {
  approve,
  reject,
  pause,
  resume,
  getProposal,
  listProposals,
  markExecuting,
  markCompleted,
  markFailed,
  markRolledBack,
  recordSuggested,
  hydrateProposals,
} from './approval';

export { auditAgent } from './agents/audit-agent';
export { plannerAgent } from './agents/planner-agent';
export { commander } from './agents/commander';
export { makeRepairAgent } from './agents/repair-agent';
export type { RepairExecutor } from './agents/repair-agent';
export { runEvolutionCycle } from './pipeline';
export type { CycleInput, CycleResult } from './pipeline';
