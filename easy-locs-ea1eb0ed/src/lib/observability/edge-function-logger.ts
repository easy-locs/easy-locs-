export type EdgeLogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface EdgeLogEntry {
  timestamp: string;
  level: EdgeLogLevel;
  fn: string;
  correlationId: string;
  requestId: string;
  msg: string;
  durationMs?: number;
  statusCode?: number;
  userId?: string;
  error?: { name: string; message: string; stack?: string };
  meta?: Record<string, unknown>;
}

export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function generateCorrelationId(): string {
  return `cor_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEdgeLogger(functionName: string, requestId?: string) {
  const reqId = requestId || generateRequestId();
  const correlationId = generateCorrelationId();
  const startTime = Date.now();

  function log(level: EdgeLogLevel, message: string, extra?: Record<string, unknown>): void {
    const entry: EdgeLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      fn: functionName,
      correlationId,
      requestId: reqId,
      msg: message,
      durationMs: Date.now() - startTime,
    };

    if (extra) {
      if (extra.userId) entry.userId = String(extra.userId);
      if (extra.statusCode) entry.statusCode = Number(extra.statusCode);
      if (extra.error) {
        const err = extra.error as Error;
        entry.error = { name: err.name, message: err.message, stack: err.stack };
      }
      const { userId, statusCode, error, ...rest } = extra;
      if (Object.keys(rest).length > 0) entry.meta = rest;
    }

    const json = JSON.stringify(entry);
    if (level === "error" || level === "fatal") {
      console.error(json);
    } else if (level === "warn") {
      console.warn(json);
    } else {
      console.log(json);
    }
  }

  return {
    debug: (msg: string, meta?: Record<string, unknown>) => log("debug", msg, meta),
    info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => log("error", msg, meta),
    fatal: (msg: string, meta?: Record<string, unknown>) => log("fatal", msg, meta),
    requestId: reqId,
    correlationId,
    elapsed: () => Date.now() - startTime,
  };
}

export interface EdgeHealthCheck {
  function: string;
  status: "healthy" | "degraded" | "unhealthy";
  uptime_ms: number;
  checks: Record<string, boolean>;
  version: string;
  timestamp: string;
}

export function createHealthCheckResponse(
  functionName: string,
  checks: Record<string, boolean>,
  version = "1.0.0",
): EdgeHealthCheck {
  const allHealthy = Object.values(checks).every(Boolean);
  const someHealthy = Object.values(checks).some(Boolean);

  return {
    function: functionName,
    status: allHealthy ? "healthy" : someHealthy ? "degraded" : "unhealthy",
    uptime_ms: 0,
    checks,
    version,
    timestamp: new Date().toISOString(),
  };
}

export const EDGE_ALERT_RULES = {
  error_rate_threshold: 0.05,
  payment_failure_threshold: 0.02,
  latency_p95_ms: 5000,
  auth_failure_burst: 10,
  consecutive_failures: 3,
};
