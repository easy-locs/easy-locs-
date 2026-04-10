/**
 * Observability — Structured domain logger.
 * All domain operations log through this for traceability.
 * Production-ready: pluggable sink (console, Sentry, PostHog).
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface DomainLogEntry {
  level: LogLevel;
  domain: string;
  action: string;
  correlationId?: string;
  userId?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
  error?: string;
  timestamp: string;
}

type LogSink = (entry: DomainLogEntry) => void;

const sinks: LogSink[] = [];
const buffer: DomainLogEntry[] = [];
const MAX_BUFFER = 1000;

/** Register a log sink (console, Sentry, analytics, etc.) */
export function registerLogSink(sink: LogSink): () => void {
  sinks.push(sink);
  return () => {
    const idx = sinks.indexOf(sink);
    if (idx >= 0) sinks.splice(idx, 1);
  };
}

/** Default console sink — registered automatically in dev */
const consoleSink: LogSink = (entry) => {
  const prefix = `[${entry.domain}] ${entry.action}`;
  const suffix = entry.duration ? ` (${entry.duration}ms)` : "";
  switch (entry.level) {
    case "error": console.error(prefix + suffix, entry.metadata, entry.error); break;
    case "warn": console.warn(prefix + suffix, entry.metadata); break;
    case "debug": console.debug(prefix + suffix, entry.metadata); break;
    default: console.log(prefix + suffix, entry.metadata);
  }
};

if (typeof window !== "undefined" && import.meta.env.DEV) {
  registerLogSink(consoleSink);
}

function dispatch(entry: DomainLogEntry) {
  buffer.push(entry);
  if (buffer.length > MAX_BUFFER) buffer.splice(0, buffer.length - MAX_BUFFER);
  for (const sink of sinks) {
    try { sink(entry); } catch { /* non-fatal */ }
  }
}

/** Create a scoped logger for a domain */
export function createDomainLogger(domain: string) {
  return {
    debug(action: string, metadata?: Record<string, unknown>) {
      dispatch({ level: "debug", domain, action, metadata, timestamp: new Date().toISOString() });
    },
    info(action: string, metadata?: Record<string, unknown>) {
      dispatch({ level: "info", domain, action, metadata, timestamp: new Date().toISOString() });
    },
    warn(action: string, metadata?: Record<string, unknown>) {
      dispatch({ level: "warn", domain, action, metadata, timestamp: new Date().toISOString() });
    },
    error(action: string, error: unknown, metadata?: Record<string, unknown>) {
      dispatch({
        level: "error", domain, action, metadata,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    },
    /** Timed operation — returns a stop function */
    timed(action: string, metadata?: Record<string, unknown>) {
      const start = performance.now();
      return {
        done(extra?: Record<string, unknown>) {
          dispatch({
            level: "info", domain, action,
            duration: Math.round(performance.now() - start),
            metadata: { ...metadata, ...extra },
            timestamp: new Date().toISOString(),
          });
        },
        fail(error: unknown) {
          dispatch({
            level: "error", domain, action,
            duration: Math.round(performance.now() - start),
            error: error instanceof Error ? error.message : String(error),
            metadata,
            timestamp: new Date().toISOString(),
          });
        },
      };
    },
  };
}

/** Get recent logs for diagnostics */
export function getLogBuffer(): readonly DomainLogEntry[] {
  return buffer;
}
