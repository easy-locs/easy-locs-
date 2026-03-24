export {
  guardNavigation,
  guardOrbitWrite,
  guardSelfConversation,
  guardTaxonomy,
  guardEntityCreation,
  guardI18n,
  trackCriticalAction,
  auditMissedEvents,
  resetActionTracking,
} from "./platform-guards";

export {
  runArchitectureAudit,
  printAuditReport,
  type AuditViolation,
} from "./architecture-audit";
