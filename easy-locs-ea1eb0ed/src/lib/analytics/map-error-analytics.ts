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

const DEDUP_WINDOW_MS = 10_000;
const MAX_DEDUP_ENTRIES = 100;

class LRUDedupCache {
  private entries = new Map<string, number>();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  isDuplicate(key: string): boolean {
    const expiresAt = this.entries.get(key);
    if (expiresAt === undefined) return false;
    if (Date.now() > expiresAt) {
      this.entries.delete(key);
      return false;
    }
    this.entries.delete(key);
    this.entries.set(key, expiresAt);
    return true;
  }

  record(key: string, ttlMs: number): void {
    if (this.entries.has(key)) {
      this.entries.delete(key);
    }
    if (this.entries.size >= this.maxSize) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey !== undefined) this.entries.delete(oldestKey);
    }
    this.entries.set(key, Date.now() + ttlMs);
  }

  get size(): number {
    return this.entries.size;
  }
}

const dedupCache = new LRUDedupCache(MAX_DEDUP_ENTRIES);

const recentErrorBuffer: Array<{
  timestamp: number;
  component: string;
  errorType: MapErrorType;
  errorMessage: string;
  route: string;
}> = [];
const MAX_ERROR_BUFFER = 200;

export function getRecentErrorBuffer() {
  return recentErrorBuffer;
}

export function trackMapError(ctx: MapErrorContext): void {
  const errorType = ctx.errorType ?? classifyMapError(ctx.errorMessage);
  const routeBucket = typeof window !== "undefined" ? window.location.pathname : "";
  const dedupKey = `${routeBucket}:${ctx.component}:${errorType}`;

  if (dedupCache.isDuplicate(dedupKey)) return;
  dedupCache.record(dedupKey, DEDUP_WINDOW_MS);

  const sessionId = getSessionId();

  recentErrorBuffer.push({
    timestamp: Date.now(),
    component: ctx.component,
    errorType,
    errorMessage: ctx.errorMessage,
    route: routeBucket,
  });
  if (recentErrorBuffer.length > MAX_ERROR_BUFFER) {
    recentErrorBuffer.splice(0, recentErrorBuffer.length - MAX_ERROR_BUFFER);
  }

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

  persistMapError({
    component: ctx.component,
    error_type: errorType,
    error_message: ctx.errorMessage,
    route: routeBucket,
    lat: ctx.lat ?? null,
    lng: ctx.lng ?? null,
    zoom: ctx.zoom ?? null,
    session_id: sessionId,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
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

interface MapErrorPersistPayload {
  component: string;
  error_type: MapErrorType;
  error_message: string;
  route: string;
  lat: number | null;
  lng: number | null;
  zoom: number | null;
  session_id: string;
  user_agent: string | null;
}

const PERSIST_BATCH: MapErrorPersistPayload[] = [];
let persistTimer: ReturnType<typeof setTimeout> | null = null;
const PERSIST_INTERVAL_MS = 5_000;
const PERSIST_BATCH_SIZE = 20;

function persistMapError(payload: MapErrorPersistPayload): void {
  PERSIST_BATCH.push(payload);
  if (PERSIST_BATCH.length >= PERSIST_BATCH_SIZE) {
    flushMapErrors();
  } else if (!persistTimer) {
    persistTimer = setTimeout(flushMapErrors, PERSIST_INTERVAL_MS);
  }
}

async function flushMapErrors(): Promise<void> {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (PERSIST_BATCH.length === 0) return;
  const batch = PERSIST_BATCH.splice(0, PERSIST_BATCH.length);

  try {
    const { db: supabase } = await import("@/services/db");
    await supabase.from("map_error_analytics").insert(
      batch.map((b) => ({
        component: b.component,
        error_type: b.error_type,
        error_message: b.error_message.slice(0, 500),
        route: b.route,
        lat: b.lat,
        lng: b.lng,
        zoom: b.zoom,
        session_id: b.session_id,
        user_agent: b.user_agent?.slice(0, 300) ?? null,
        created_at: new Date().toISOString(),
      }))
    );
  } catch {
    structuredLogger.warn("maps", "persist_map_errors_failed", `Failed to persist ${batch.length} map error records`);
  }
}
