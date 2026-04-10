import { queryClient } from "@/lib/query-client";

interface HealthMetric {
  name: string;
  status: "ok" | "warn" | "fail";
  detail?: string;
  ts: number;
}

const healthLog: HealthMetric[] = [];
const MAX_LOG = 50;

function logHealth(metric: HealthMetric) {
  healthLog.push(metric);
  if (healthLog.length > MAX_LOG) healthLog.shift();
}

function checkQueryHealth() {
  const queries = queryClient.getQueryCache().getAll();
  let stale = 0;
  let errors = 0;
  const now = Date.now();

  for (const q of queries) {
    if (q.state.status === "error") errors++;
    if (q.state.dataUpdatedAt && now - q.state.dataUpdatedAt > 300_000) stale++;
  }

  if (errors > 5) {
    logHealth({ name: "query-errors", status: "warn", detail: `${errors} failed queries`, ts: now });
    for (const q of queries) {
      if (q.state.status === "error") {
        queryClient.invalidateQueries({ queryKey: q.queryKey });
      }
    }
  }

  if (stale > 20) {
    logHealth({ name: "stale-queries", status: "warn", detail: `${stale} stale — gc triggered`, ts: now });
    for (const q of queries) {
      if (q.state.dataUpdatedAt && now - q.state.dataUpdatedAt > 600_000 && !q.getObserversCount()) {
        queryClient.removeQueries({ queryKey: q.queryKey });
      }
    }
  }

  logHealth({ name: "query-health", status: errors > 5 ? "warn" : "ok", detail: `${queries.length}q ${errors}err ${stale}stale`, ts: now });
}

function checkMemory() {
  const now = Date.now();
  if (typeof performance !== "undefined" && (performance as any).memory) {
    const mem = (performance as any).memory;
    const usedMB = Math.round(mem.usedJSHeapSize / 1024 / 1024);
    const limitMB = Math.round(mem.jsHeapSizeLimit / 1024 / 1024);
    const pct = Math.round((usedMB / limitMB) * 100);

    if (pct > 80) {
      logHealth({ name: "memory", status: "warn", detail: `${usedMB}MB/${limitMB}MB (${pct}%)`, ts: now });
      const allQueries = queryClient.getQueryCache().getAll();
      for (const q of allQueries) {
        if (!q.getObserversCount() && q.state.dataUpdatedAt && now - q.state.dataUpdatedAt > 120_000) {
          queryClient.removeQueries({ queryKey: q.queryKey });
        }
      }
      logHealth({ name: "memory-gc", status: "ok", detail: "Inactive stale queries removed", ts: now });
    } else {
      logHealth({ name: "memory", status: "ok", detail: `${usedMB}MB (${pct}%)`, ts: now });
    }
  }
}

function runSelfCheck() {
  try {
    checkQueryHealth();
    checkMemory();
  } catch (err) {
    logHealth({ name: "self-check", status: "fail", detail: String(err), ts: Date.now() });
  }
}

const INTERVAL_ACTIVE_MS = 45_000;
const INTERVAL_HIDDEN_MS = 120_000;
let _intervalId: ReturnType<typeof setInterval> | null = null;
let _installed = false;

function reschedule(ms: number) {
  if (_intervalId) clearInterval(_intervalId);
  _intervalId = setInterval(runSelfCheck, ms);
}

export function installSelfPilot() {
  if (_installed) return;
  _installed = true;

  runSelfCheck();
  reschedule(INTERVAL_ACTIVE_MS);

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        runSelfCheck();
        reschedule(INTERVAL_ACTIVE_MS);
      } else {
        reschedule(INTERVAL_HIDDEN_MS);
      }
    });
  }
}

export function getSelfPilotHealth(): HealthMetric[] {
  return [...healthLog];
}

export function getSelfPilotSummary() {
  const last = healthLog.slice(-10);
  const warns = last.filter(m => m.status === "warn").length;
  const fails = last.filter(m => m.status === "fail").length;
  return {
    status: fails > 0 ? "critical" : warns > 2 ? "degraded" : "healthy",
    checks: last.length,
    warns,
    fails,
    lastCheck: last[last.length - 1]?.ts ?? 0,
  };
}
