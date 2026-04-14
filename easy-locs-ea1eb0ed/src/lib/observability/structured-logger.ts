import * as Sentry from "@sentry/react";
export { instrumentIdentityOTPRequest, instrumentIdentityOTPVerify } from "./domain-instrumentation";

export type LogLevel = "debug" | "info" | "warn" | "error" | "critical";

export type LogDomain =
  | "auth"
  | "identity"
  | "profile"
  | "orbit"
  | "orbit_call"
  | "wallet"
  | "payment"
  | "payout"
  | "dashboard"
  | "radar"
  | "marketplace"
  | "listing"
  | "scraping"
  | "media"
  | "notification"
  | "search"
  | "maps"
  | "booking"
  | "rider"
  | "hotel"
  | "food"
  | "services"
  | "flights"
  | "property"
  | "support"
  | "admin"
  | "realtime"
  | "storage"
  | "cron"
  | "analytics"
  | "experiment"
  | "taxonomy"
  | "intelligence"
  | "local_commerce"
  | "system";

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  domain: LogDomain;
  subdomain?: string;
  vertical?: string;
  route?: string;
  action: string;
  message: string;
  trace_id?: string;
  request_id?: string;
  user_id_safe?: string;
  org_id?: string;
  release_id?: string;
  environment: string;
  result?: "success" | "failure" | "partial" | "skipped" | "timeout";
  duration_ms?: number;
  status_code?: number;
  retry_count?: number;
  external_provider?: string;
  error_code?: string;
  error_classification?: string;
  severity?: string;
  feature_flags?: Record<string, boolean>;
  payload_summary?: Record<string, unknown>;
  [key: string]: unknown;
}

const PII_PATTERNS = [
  /\b\d{10,15}\b/g,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  /\b(eyJ[A-Za-z0-9_-]{10,})\b/g,
  /\b\d{6}\b/g,
];

function scrubPII(value: string): string {
  let cleaned = value;
  for (const pattern of PII_PATTERNS) {
    cleaned = cleaned.replace(pattern, "[REDACTED]");
  }
  return cleaned;
}

const ENV = typeof window !== "undefined"
  ? (window as any).__ENV__ || "development"
  : process.env.NODE_ENV || "development";

const RELEASE_ID = typeof window !== "undefined"
  ? (window as any).__RELEASE_ID__ || "unknown"
  : "unknown";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  critical: 4,
};

let minLevel: LogLevel = ENV === "production" ? "info" : "debug";

const LOG_BUFFER: StructuredLogEntry[] = [];
const MAX_BUFFER = 500;

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
}

function buildEntry(
  level: LogLevel,
  domain: LogDomain,
  action: string,
  message: string,
  extra?: Partial<StructuredLogEntry>
): StructuredLogEntry {
  const entry: StructuredLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    domain,
    action,
    message: scrubPII(message),
    environment: ENV,
    release_id: RELEASE_ID,
    ...extra,
  };
  return entry;
}

function emit(entry: StructuredLogEntry): void {
  LOG_BUFFER.push(entry);
  if (LOG_BUFFER.length > MAX_BUFFER) LOG_BUFFER.shift();

  const consoleMethod =
    entry.level === "critical" || entry.level === "error"
      ? "error"
      : entry.level === "warn"
        ? "warn"
        : entry.level === "debug"
          ? "debug"
          : "log";

  if (ENV !== "production" || entry.level !== "debug") {
    console[consoleMethod](
      `[${entry.domain}.${entry.action}]`,
      entry.message,
      entry.duration_ms != null ? `(${entry.duration_ms}ms)` : "",
      entry.result ? `→ ${entry.result}` : ""
    );
  }

  if (entry.level === "error" || entry.level === "critical") {
    Sentry.addBreadcrumb({
      category: `${entry.domain}.${entry.action}`,
      message: entry.message,
      level: entry.level === "critical" ? "fatal" : "error",
      data: {
        domain: entry.domain,
        action: entry.action,
        result: entry.result,
        error_code: entry.error_code,
        duration_ms: entry.duration_ms,
        trace_id: entry.trace_id,
      },
    });

    if (entry.level === "critical") {
      Sentry.captureMessage(`[CRITICAL] ${entry.domain}.${entry.action}: ${entry.message}`, {
        level: "fatal",
        tags: {
          domain: entry.domain,
          action: entry.action,
          vertical: entry.vertical,
          error_code: entry.error_code,
        },
        extra: {
          trace_id: entry.trace_id,
          result: entry.result,
          duration_ms: entry.duration_ms,
          payload_summary: entry.payload_summary,
        },
      });
    }
  } else if (entry.level === "warn") {
    Sentry.addBreadcrumb({
      category: `${entry.domain}.${entry.action}`,
      message: entry.message,
      level: "warning",
      data: {
        domain: entry.domain,
        result: entry.result,
      },
    });
  }
}

export const structuredLogger = {
  debug(domain: LogDomain, action: string, message: string, extra?: Partial<StructuredLogEntry>) {
    if (!shouldLog("debug")) return;
    emit(buildEntry("debug", domain, action, message, extra));
  },

  info(domain: LogDomain, action: string, message: string, extra?: Partial<StructuredLogEntry>) {
    if (!shouldLog("info")) return;
    emit(buildEntry("info", domain, action, message, extra));
  },

  warn(domain: LogDomain, action: string, message: string, extra?: Partial<StructuredLogEntry>) {
    if (!shouldLog("warn")) return;
    emit(buildEntry("warn", domain, action, message, extra));
  },

  error(domain: LogDomain, action: string, message: string, extra?: Partial<StructuredLogEntry>) {
    if (!shouldLog("error")) return;
    emit(buildEntry("error", domain, action, message, extra));
  },

  critical(domain: LogDomain, action: string, message: string, extra?: Partial<StructuredLogEntry>) {
    emit(buildEntry("critical", domain, action, message, extra));
  },

  timed<T>(
    domain: LogDomain,
    action: string,
    fn: () => T | Promise<T>,
    extra?: Partial<StructuredLogEntry>
  ): T | Promise<T> {
    const start = performance.now();
    try {
      const result = fn();
      if (result instanceof Promise) {
        return result
          .then((v) => {
            const duration_ms = Math.round(performance.now() - start);
            this.info(domain, action, `Completed`, { ...extra, duration_ms, result: "success" });
            return v;
          })
          .catch((err) => {
            const duration_ms = Math.round(performance.now() - start);
            this.error(domain, action, err?.message || "Failed", {
              ...extra,
              duration_ms,
              result: "failure",
              error_code: err?.code,
            });
            throw err;
          }) as T | Promise<T>;
      }
      const duration_ms = Math.round(performance.now() - start);
      this.info(domain, action, `Completed`, { ...extra, duration_ms, result: "success" });
      return result;
    } catch (err: any) {
      const duration_ms = Math.round(performance.now() - start);
      this.error(domain, action, err?.message || "Failed", {
        ...extra,
        duration_ms,
        result: "failure",
        error_code: err?.code,
      });
      throw err;
    }
  },

  getBuffer(): readonly StructuredLogEntry[] {
    return LOG_BUFFER;
  },

  getRecentByDomain(domain: LogDomain, limit = 50): StructuredLogEntry[] {
    return LOG_BUFFER.filter((e) => e.domain === domain).slice(-limit);
  },

  getErrorsByDomain(domain: LogDomain): StructuredLogEntry[] {
    return LOG_BUFFER.filter(
      (e) => e.domain === domain && (e.level === "error" || e.level === "critical")
    );
  },

  setMinLevel(level: LogLevel) {
    minLevel = level;
  },

  flush(): StructuredLogEntry[] {
    const entries = [...LOG_BUFFER];
    LOG_BUFFER.length = 0;
    return entries;
  },
};

export type StructuredLogger = typeof structuredLogger;
