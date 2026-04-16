export {
  structuredLogger,
  type LogDomain,
  type LogLevel,
  type StructuredLogEntry,
  type StructuredLogger,
} from "./structured-logger";

export {
  TRACE_HEADERS,
  startTrace,
  startSpan,
  endSpan,
  ensureTrace,
  getCurrentTrace,
  clearTrace,
  injectTraceHeaders,
  extractTraceFromHeaders,
  installFetchTracePropagation,
  generateTraceId,
  generateSpanId,
  generateRequestId,
  type TraceContext,
} from "./trace-context";

export {
  recordRed,
  snapshot as redSnapshot,
  snapshotByDomain as redSnapshotByDomain,
  getRedBuffer,
  clearRed,
  type RedSample,
  type RedSnapshot,
} from "./red-metrics";

export {
  SLO_CATALOG,
  evaluateSlo,
  evaluateAllSlos,
  criticalSloBreaches,
  type SloDefinition,
  type SloEvaluation,
  type SloKind,
} from "./slo";

export {
  evaluateDomainAlerts,
  dispatchDomainAlerts,
  evaluateAllAlerts,
  getDomainAlertRules,
  setCustomAlertRules,
  type DomainAlertRule,
  type DomainAlertResult,
  type AlertBreach,
} from "./alerting-rules";

export {
  notifyAlert,
  registerAlertSink,
  type AlertNotification,
  type AlertSeverity,
  type AlertSink,
} from "./alert-dispatcher";

export { instrumentQuery } from "./db-instrumentation";
export { initBrowserOtel, isOtelBootstrapped } from "./otel-bootstrap";

export {
  recordAiCall,
  instrumentAiCall,
  aiCostSnapshot,
  estimateCost,
  getAiBuffer,
  clearAiBuffer,
  DEFAULT_PRICING as AI_DEFAULT_PRICING,
  type AiCallSample,
  type AiCostSnapshot,
} from "./ai-cost-tracker";

export {
  buildDomainDashboard,
  buildGlobalSnapshot,
  type DomainDashboard,
  type GlobalObservabilitySnapshot,
} from "./domain-dashboards";

export {
  addDomainBreadcrumb,
  captureDomainError,
  captureDomainWarning,
  instrumentCriticalAction,
  setDomainContext,
  setSafeUserContext,
  startDomainSpan,
  type ObservabilityDomain,
} from "./sentry-helpers";
