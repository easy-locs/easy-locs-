import { structuredLogger } from "@/lib/observability/structured-logger";
import { trackEvent } from "@/lib/analytics/event-bus";

export type MapErrorType = "token" | "webgl" | "network" | "init_failure" | "runtime" | "unknown";

let _sessionId: string | null = null;
function getSessionId(): string {
  if (!_sessionId) {
    _sessionId = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
  return _sessionId;
}

export interface MapErrorContext {
  component: string;
  errorMessage: string;
  errorType?: MapErrorType;
  lat?: number | null;
  lng?: number | null;
  zoom?: number;
}

const ERROR_CLASSIFICATION_PATTERNS: Array<[RegExp, MapErrorType]> = [
  [/access.?token|unauthorized|401|403|not authorized|invalid.*token|expired.*token/i, "token"],
  [/webgl|context|3d rendering|gpu/i, "webgl"],
  [/network|fetch|load.*map.*library|timeout|failed to load|connection|offline/i, "network"],
  [/init|constructor|container/i, "init_failure"],
];

export function classifyMapError(message: string): MapErrorType {
  for (const [pattern, type] of ERROR_CLASSIFICATION_PATTERNS) {
    if (pattern.test(message)) return type;
  }
  return "unknown";
}

const recentErrors = new Map<string, number>();
const DEDUP_WINDOW_MS = 10_000;
const MAX_RECENT = 50;

function isDuplicate(key: string): boolean {
  const expiresAt = recentErrors.get(key);
  if (expiresAt === undefined) return false;
  if (Date.now() > expiresAt) {
    recentErrors.delete(key);
    return false;
  }
  return true;
}

function recordKey(key: string): void {
  if (recentErrors.size >= MAX_RECENT) {
    const oldest = recentErrors.keys().next().value;
    if (oldest !== undefined) recentErrors.delete(oldest);
  }
  recentErrors.set(key, Date.now() + DEDUP_WINDOW_MS);
}

export function trackMapError(ctx: MapErrorContext): void {
  const errorType = ctx.errorType ?? classifyMapError(ctx.errorMessage);
  const routeBucket = typeof window !== "undefined" ? window.location.pathname : "";
  const dedupKey = `${ctx.component}:${errorType}:${routeBucket}`;

  if (isDuplicate(dedupKey)) return;
  recordKey(dedupKey);

  const sessionId = getSessionId();

  structuredLogger.error("maps", "load_failure", ctx.errorMessage, {
    result: "failure",
    error_classification: errorType,
    trace_id: sessionId,
    payload_summary: {
      component: ctx.component,
      error_type: errorType,
      lat: ctx.lat ?? undefined,
      lng: ctx.lng ?? undefined,
      zoom: ctx.zoom ?? undefined,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      url: typeof window !== "undefined" ? window.location.pathname : undefined,
      session_id: sessionId,
    },
  });

  trackEvent({
    type: "map.load_failure",
    metadata: {
      component: ctx.component,
      error_type: errorType,
      error_message: ctx.errorMessage,
      lat: ctx.lat ?? undefined,
      lng: ctx.lng ?? undefined,
      zoom: ctx.zoom ?? undefined,
      session_id: sessionId,
    },
  });
}

export function trackMapErrorBoundary(componentStack: string | undefined, errorMessage: string): void {
  const truncatedStack = componentStack ? componentStack.slice(0, 500) : undefined;

  structuredLogger.error("maps", "error_boundary_crash", errorMessage, {
    result: "failure",
    error_classification: "runtime",
    payload_summary: {
      component: "MapErrorBoundary",
      component_stack: truncatedStack,
      url: typeof window !== "undefined" ? window.location.pathname : undefined,
    },
  });

  trackEvent({
    type: "map.load_failure",
    metadata: {
      component: "MapErrorBoundary",
      error_type: "runtime" as MapErrorType,
      error_message: errorMessage,
      component_stack: truncatedStack,
    },
  });
}
