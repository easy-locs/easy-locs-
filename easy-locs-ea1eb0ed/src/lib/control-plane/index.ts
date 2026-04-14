export type {
  ControlDomain,
  HealthStatus,
  IncidentPriority,
  IncidentStatus,
  DomainHealthSnapshot,
  Incident,
  KillSwitch,
  FeatureFlag,
  ReleaseRecord,
  PlatformHealthSummary,
} from "./types";

export {
  recordAction,
  getDomainHealth,
  getAllDomainHealth,
  getPlatformHealthStatus,
  resetDomainMetrics,
  quarantineDomain,
  liftDomainQuarantine,
  isDomainQuarantined,
} from "./domain-health";

export {
  createIncident,
  resolveIncident,
  updateIncidentStatus,
  getActiveIncidents,
  getIncidentsByPriority,
  getIncidentHistory,
  getIncidentStats,
} from "./incident-engine";

export {
  isFeatureEnabled,
  toggleKillSwitch,
  getKillSwitch,
  getAllKillSwitches,
  getDisabledFeatures,
  emergencyShutdown,
} from "./kill-switches";

export {
  isEnabled as isFeatureFlagEnabled,
  setFlag,
  getFlag,
  getAllFlags,
  getFlagsByDomain,
  getActiveFlags,
} from "./feature-flags";

export {
  receiveViolation,
  getViolationLog,
  getActionLog,
  getEnforcementStats,
  clearEnforcementLogs,
  type EnforcementEngine,
  type ViolationReport,
  type ViolationSeverity,
  type EnforcementDecision,
  type EnforcementAction,
} from "./enforcement-hub";

import { getAllDomainHealth, getPlatformHealthStatus } from "./domain-health";
import { getActiveIncidents, getIncidentStats } from "./incident-engine";
import { getAllKillSwitches } from "./kill-switches";
import { getEnforcementStats } from "./enforcement-hub";
import type { PlatformHealthSummary } from "./types";

export function getPlatformSummary(): PlatformHealthSummary {
  return {
    overall_status: getPlatformHealthStatus(),
    domains: getAllDomainHealth(),
    active_incidents: getActiveIncidents(),
    kill_switches: getAllKillSwitches(),
    checked_at: new Date().toISOString(),
  };
}

export function getFullPlatformReport() {
  return {
    ...getPlatformSummary(),
    incident_stats: getIncidentStats(),
    enforcement: getEnforcementStats(),
  };
}
