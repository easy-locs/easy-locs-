/**
 * @deprecated — Merged into governance-audit-engine.ts.
 * This file is a backward-compat shim. Import from @/engines/governance/governance-audit-engine instead.
 */
export type { ConflictLaw } from "./governance-audit-engine";
export {
  reportArchitectureDebt,
  getArchitectureDebt,
  getUnresolvedDebt,
  getAllGovernanceViolations,
  getGovernanceSummary,
  GovernanceAuditEngine as AntiConflictEngine,
} from "./governance-audit-engine";
