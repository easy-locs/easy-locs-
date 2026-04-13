/**
 * @deprecated — Merged into governance-audit-engine.ts.
 * This file is a backward-compat shim. Import from @/engines/governance/governance-audit-engine instead.
 */
export type { RemediationAction } from "./governance-audit-engine";
export {
  attemptRemediation,
  getRemediationLog,
  getRemediationStats,
  GovernanceAuditEngine as AutoRemediationEngine,
} from "./governance-audit-engine";
