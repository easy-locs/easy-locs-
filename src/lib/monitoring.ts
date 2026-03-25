/**
 * Production Monitoring Service
 * Captures runtime errors, performance metrics, and sync health checks.
 * All data stored in-memory and optionally persisted to Supabase audit_logs.
 * 
 * Unified with Sentry + module_health for full observability.
 */

import { supabase } from "@/integrations/supabase/client";
import { initUnifiedMonitoring } from "@/lib/monitoring/unified-monitor";

// ── Types ──────────────────────────────────────────────────────────

export type EventSeverity = "critical" | "error" | "warning" | "info";

export interface MonitoringEvent {
  id: string;
  type: "error" | "warning" | "performance" | "sync_failure" | "ui_issue";
  severity: EventSeverity;
  source: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  resolved: boolean;
  count: number; // dedup counter
}

export interface SyncCheckResult {
  name: string;
  status: "ok" | "warning" | "error";
  message: string;
  checkedAt: string;
  durationMs?: number;
}

export interface HealthReport {
  status: "healthy" | "degraded" | "unhealthy";
  checks: SyncCheckResult[];
  timestamp: string;
  uptimeMs: number;
}

// ── Event Store ────────────────────────────────────────────────────

const MAX_EVENTS = 200;
const DEDUP_WINDOW_MS = 5000;
let events: MonitoringEvent[] = [];
let listeners: Array<() => void> = [];
const startTime = Date.now();
let monitoringInitialized = false;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribeMonitoring(fn: () => void) {
  listeners.push(fn);
  return () => { listeners = listeners.filter((l) => l !== fn); };
}

export function getMonitoringEvents() {
  return [...events];
}

function inferSeverity(type: MonitoringEvent["type"]): EventSeverity {
  switch (type) {
    case "error": case "sync_failure": return "error";
    case "warning": return "warning";
    case "performance": case "ui_issue": return "info";
    default: return "info";
  }
}

export function pushEvent(evt: Omit<MonitoringEvent, "id" | "timestamp" | "resolved" | "severity" | "count"> & { severity?: EventSeverity }) {
  // Dedup: merge with recent identical events
  const now = Date.now();
  const recent = events.find(
    e => e.source === evt.source && e.message === evt.message && !e.resolved
      && (now - new Date(e.timestamp).getTime()) < DEDUP_WINDOW_MS
  );

  if (recent) {
    recent.count++;
    recent.timestamp = new Date().toISOString();
    notify();
    return recent;
  }

  const entry: MonitoringEvent = {
    ...evt,
    id: uid(),
    severity: evt.severity || inferSeverity(evt.type),
    timestamp: new Date().toISOString(),
    resolved: false,
    count: 1,
  };
  events = [entry, ...events].slice(0, MAX_EVENTS);
  notify();

  // Persist critical errors to audit_logs (fire-and-forget)
  if (evt.type === "error" || evt.type === "sync_failure") {
    persistToAuditLog(entry).catch(() => {});
  }
  return entry;
}

export function resolveEvent(id: string) {
  events = events.map((e) => (e.id === id ? { ...e, resolved: true } : e));
  notify();
}

export function clearEvents() {
  events = [];
  notify();
}

// ── Structured Logger ──────────────────────────────────────────────

export const logger = {
  info: (source: string, message: string, meta?: Record<string, unknown>) => {
    if (import.meta.env.DEV) console.log(`[${source}]`, message, meta || "");
  },
  warn: (source: string, message: string, meta?: Record<string, unknown>) => {
    console.warn(`[${source}]`, message, meta || "");
    pushEvent({ type: "warning", source, message, metadata: meta });
  },
  error: (source: string, message: string, meta?: Record<string, unknown>) => {
    console.error(`[${source}]`, message, meta || "");
    pushEvent({ type: "error", source, message, metadata: meta, severity: "error" });
  },
  critical: (source: string, message: string, meta?: Record<string, unknown>) => {
    console.error(`[CRITICAL][${source}]`, message, meta || "");
    pushEvent({ type: "error", source, message, metadata: meta, severity: "critical" });
  },
};

// ── Audit Persistence ──────────────────────────────────────────────

let _persistingAudit = false;

async function persistToAuditLog(evt: MonitoringEvent) {
  if (_persistingAudit) return;
  _persistingAudit = true;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("audit_logs").insert([{
      action: `monitoring:${evt.type}`,
      user_id: session.user.id,
      metadata_json: {
        source: evt.source,
        message: evt.message,
        severity: evt.severity,
        metadata: evt.metadata,
      } as any,
    }]);
  } catch {
    // Silent fail
  } finally {
    _persistingAudit = false;
  }
}

// ── Global Error Handlers ──────────────────────────────────────────

export function initMonitoring() {
  if (typeof window === "undefined") return;
  if (monitoringInitialized) return;
  monitoringInitialized = true;

  // Initialize unified monitoring (Sentry + module_health + global error handlers)
  initUnifiedMonitoring();

  // Unhandled JS errors
  window.addEventListener("error", (e) => {
    pushEvent({
      type: "error",
      source: e.filename || "unknown",
      message: e.message || "Unknown error",
      metadata: { lineno: e.lineno, colno: e.colno, stack: e.error?.stack?.slice(0, 500) },
    });
  });

  // Unhandled promise rejections
  window.addEventListener("unhandledrejection", (e) => {
    const msg = e.reason?.message || String(e.reason || "Unhandled promise rejection");
    pushEvent({
      type: "error",
      source: "promise",
      message: msg,
      metadata: { stack: e.reason?.stack?.slice(0, 500) },
    });
  });

  // Performance observer for long tasks (>200ms)
  if ("PerformanceObserver" in window) {
    try {
      const obs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 200) {
            pushEvent({
              type: "performance",
              source: "long-task",
              message: `Long task detected: ${Math.round(entry.duration)}ms`,
              metadata: { duration: entry.duration, name: entry.name },
            });
          }
        }
      });
      obs.observe({ entryTypes: ["longtask"] });
    } catch {
      // longtask not supported
    }
  }

  // Navigation performance
  window.addEventListener("load", () => {
    setTimeout(() => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (nav && nav.domContentLoadedEventEnd > 3000) {
        pushEvent({
          type: "performance",
          source: "page-load",
          message: `Slow page load: ${Math.round(nav.domContentLoadedEventEnd)}ms`,
          metadata: { domContentLoaded: nav.domContentLoadedEventEnd, loadComplete: nav.loadEventEnd },
        });
      }
    }, 0);
  });

  // Fetch/XHR error interceptor
  const origFetch = window.fetch;
  window.fetch = async (...args) => {
    const url = typeof args[0] === "string" ? args[0] : (args[0] as Request)?.url || "unknown";
    const isAuditReq = url.includes("/audit_logs");
    try {
      const res = await origFetch(...args);
      if (res.status >= 500 && !isAuditReq) {
        pushEvent({
          type: "error",
          source: "network",
          message: `Server error ${res.status} on ${url.split("?")[0]}`,
          metadata: { status: res.status, url: url.split("?")[0] },
        });
      }
      return res;
    } catch (err: any) {
      if (!isAuditReq) {
        pushEvent({
          type: "error",
          source: "network",
          message: `Network failure: ${err.message}`,
          metadata: { url: url.split("?")[0] },
        });
      }
      throw err;
    }
  };

  console.log("[Monitoring] Production monitoring initialized");
}

// ── Sync Health Checks ─────────────────────────────────────────────

async function timedCheck(name: string, fn: () => Promise<SyncCheckResult>): Promise<SyncCheckResult> {
  const start = performance.now();
  try {
    const result = await fn();
    result.durationMs = Math.round(performance.now() - start);
    return result;
  } catch (err: any) {
    return {
      name,
      status: "error",
      message: `Check failed: ${err.message}`,
      checkedAt: new Date().toISOString(),
      durationMs: Math.round(performance.now() - start),
    };
  }
}

export async function runSyncHealthChecks(): Promise<SyncCheckResult[]> {
  const now = new Date().toISOString();

  const checks = await Promise.allSettled([
    timedCheck("Booking-Payment Sync", async () => {
      const { data } = await supabase.from("booking_requests").select("id").eq("status", "confirmed").limit(50);
      return { name: "Booking-Payment Sync", status: (data?.length || 0) > 20 ? "warning" as const : "ok" as const, message: `${data?.length || 0} confirmed bookings`, checkedAt: now };
    }),
    timedCheck("Concierge Payment Sync", async () => {
      const { data } = await supabase.from("concierge_orders").select("id").eq("status", "confirmed").eq("payment_status", "pending").limit(50);
      return { name: "Concierge Payment Sync", status: (data?.length || 0) > 5 ? "warning" as const : "ok" as const, message: `${data?.length || 0} pending payments`, checkedAt: now };
    }),
    timedCheck("Notification Queue", async () => {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false);
      return { name: "Notification Queue", status: (count || 0) > 100 ? "warning" as const : "ok" as const, message: `${count || 0} unread`, checkedAt: now };
    }),
    timedCheck("Marketplace Booking Sync", async () => {
      const { data } = await supabase.from("marketplace_bookings").select("id").eq("status", "awaiting_payment").limit(50);
      return { name: "Marketplace Booking Sync", status: (data?.length || 0) > 10 ? "warning" as const : "ok" as const, message: `${data?.length || 0} awaiting payment`, checkedAt: now };
    }),
    timedCheck("Edge Functions", async () => {
      const { error } = await supabase.functions.invoke("check-subscription", { body: {} });
      return { name: "Edge Functions", status: error ? "warning" as const : "ok" as const, message: error ? `Error: ${error.message}` : "Responding", checkedAt: now };
    }),
  ]);

  return checks.map(r => r.status === "fulfilled" ? r.value : { name: "Unknown", status: "error" as const, message: "Check failed", checkedAt: now });
}

// ── Health Report ──────────────────────────────────────────────────

export async function getHealthReport(): Promise<HealthReport> {
  const checks = await runSyncHealthChecks();
  const hasError = checks.some(c => c.status === "error");
  const hasWarning = checks.some(c => c.status === "warning");

  return {
    status: hasError ? "unhealthy" : hasWarning ? "degraded" : "healthy",
    checks,
    timestamp: new Date().toISOString(),
    uptimeMs: Date.now() - startTime,
  };
}

// ── Page Vitals ────────────────────────────────────────────────────

export function capturePageVitals(pageName: string) {
  if (typeof window === "undefined") return;
  
  try {
    const clsObserver = new PerformanceObserver((list) => {
      let clsValue = 0;
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value || 0;
        }
      }
      if (clsValue > 0.25) {
        pushEvent({
          type: "ui_issue",
          source: pageName,
          message: `High CLS detected: ${clsValue.toFixed(3)}`,
          metadata: { cls: clsValue },
        });
      }
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
    setTimeout(() => clsObserver.disconnect(), 10000);
  } catch {
    // layout-shift not supported
  }
}

// ── Event Summary ──────────────────────────────────────────────────

export function getEventSummary() {
  const unresolvedEvents = events.filter(e => !e.resolved);
  return {
    total: events.length,
    unresolved: unresolvedEvents.length,
    errors: unresolvedEvents.filter(e => e.type === "error").length,
    warnings: unresolvedEvents.filter(e => e.type === "warning").length,
    performance: unresolvedEvents.filter(e => e.type === "performance").length,
    critical: unresolvedEvents.filter(e => e.severity === "critical").length,
  };
}
