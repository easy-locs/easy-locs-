export type TelemetrySeverity = "info" | "warning" | "critical";
export type TelemetryEventType =
  | "page_view"
  | "route_dead"
  | "click_dead"
  | "action_started"
  | "action_success"
  | "action_timeout"
  | "action_failed"
  | "runtime_error"
  | "promise_rejection"
  | "blank_state_suspect"
  | "network_error"
  | "ui_warning";

export interface BrowserTelemetryPayload {
  sessionId: string;
  userId?: string | null;
  orgId?: string | null;
  pageUrl?: string | null;
  routeKey?: string | null;
  componentKey?: string | null;
  flowKey?: string | null;
  eventType: TelemetryEventType;
  severity?: TelemetrySeverity;
  actionKey?: string | null;
  status?: string | null;
  durationMs?: number | null;
  message?: string | null;
  errorStack?: string | null;
  metadata?: Record<string, unknown>;
}

export interface BrowserFrontIncidentPayload {
  sessionId: string;
  userId?: string | null;
  pageUrl?: string | null;
  routeKey?: string | null;
  componentKey?: string | null;
  flowKey?: string | null;
  issueType: string;
  severity?: TelemetrySeverity;
  title: string;
  summary?: string | null;
  metadata?: Record<string, unknown>;
}

export function getBrowserRuntimeSessionId(): string {
  return "disabled";
}

export function pushBrowserTelemetry(_payload: BrowserTelemetryPayload): void {}

export function pushBrowserFrontIncident(_payload: BrowserFrontIncidentPayload): void {}

export async function flushBrowserTelemetry(): Promise<void> {}
