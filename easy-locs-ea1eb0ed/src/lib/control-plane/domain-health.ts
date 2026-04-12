import { structuredLogger } from "@/lib/observability/structured-logger";
import type { ControlDomain, DomainHealthSnapshot, HealthStatus } from "./types";

interface QuarantineState {
  reason: string;
  startedAt: string;
  quarantinedBy: string;
}

interface DomainMetrics {
  total_actions: number;
  failed_actions: number;
  latencies_ms: number[];
  failing_actions: Map<string, number>;
  last_error_at?: string;
  window_start: string;
  quarantine?: QuarantineState;
}

const HEALTH_WINDOW_MS = 5 * 60 * 1000;

const domainMetrics = new Map<ControlDomain, DomainMetrics>();

function ensureMetrics(domain: ControlDomain): DomainMetrics {
  if (!domainMetrics.has(domain)) {
    domainMetrics.set(domain, {
      total_actions: 0,
      failed_actions: 0,
      latencies_ms: [],
      failing_actions: new Map(),
      window_start: new Date().toISOString(),
    });
  }
  return domainMetrics.get(domain)!;
}

function rotateWindow(m: DomainMetrics): void {
  const windowAge = Date.now() - new Date(m.window_start).getTime();
  if (windowAge > HEALTH_WINDOW_MS) {
    m.total_actions = 0;
    m.failed_actions = 0;
    m.latencies_ms = [];
    m.failing_actions.clear();
    m.window_start = new Date().toISOString();
  }
}

export function recordAction(
  domain: ControlDomain,
  action: string,
  success: boolean,
  latency_ms?: number
): void {
  const m = ensureMetrics(domain);
  rotateWindow(m);
  m.total_actions++;
  if (!success) {
    m.failed_actions++;
    m.last_error_at = new Date().toISOString();
    m.failing_actions.set(action, (m.failing_actions.get(action) || 0) + 1);
  }
  if (latency_ms != null) {
    m.latencies_ms.push(latency_ms);
    if (m.latencies_ms.length > 500) m.latencies_ms.shift();
  }
}

function computeP95(latencies: number[]): number {
  if (latencies.length === 0) return 0;
  const sorted = [...latencies].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.95);
  return sorted[Math.min(idx, sorted.length - 1)];
}

function computeHealthStatus(errorRate: number, p95: number, quarantine?: QuarantineState): HealthStatus {
  if (quarantine) return "quarantined";
  if (errorRate > 0.2 || p95 > 10000) return "unhealthy";
  if (errorRate > 0.05 || p95 > 3000) return "degraded";
  return "healthy";
}

export function getDomainHealth(domain: ControlDomain): DomainHealthSnapshot {
  const m = domainMetrics.get(domain);
  if (!m || m.total_actions === 0) {
    return {
      domain,
      status: "unknown",
      error_rate: 0,
      success_rate: 1,
      latency_p95_ms: 0,
      active_incidents: 0,
      top_failing_actions: [],
      last_checked: new Date().toISOString(),
      rollback_ready: true,
    };
  }

  rotateWindow(m);
  const errorRate = m.total_actions > 0 ? m.failed_actions / m.total_actions : 0;
  const successRate = 1 - errorRate;
  const p95 = computeP95(m.latencies_ms);
  const status = computeHealthStatus(errorRate, p95, m.quarantine);

  const topFailing = [...m.failing_actions.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([action]) => action);

  return {
    domain,
    status,
    error_rate: Math.round(errorRate * 10000) / 10000,
    success_rate: Math.round(successRate * 10000) / 10000,
    latency_p95_ms: Math.round(p95),
    active_incidents: 0,
    degraded_since: status !== "healthy" ? m.last_error_at : undefined,
    top_failing_actions: topFailing,
    last_checked: new Date().toISOString(),
    rollback_ready: true,
  };
}

const ALL_DOMAINS: ControlDomain[] = [
  "auth", "identity", "orbit", "orbit_call", "wallet", "payment",
  "dashboard", "radar", "marketplace", "listing", "scraping", "media",
  "notification", "booking", "food", "hotel", "services", "flights",
  "property", "rider", "support", "admin", "realtime", "cron", "taxonomy",
];

export function getAllDomainHealth(): DomainHealthSnapshot[] {
  return ALL_DOMAINS.map(getDomainHealth);
}

export function getPlatformHealthStatus(): HealthStatus {
  const snapshots = getAllDomainHealth();
  const active = snapshots.filter((s) => s.status !== "unknown");
  if (active.length === 0) return "unknown";
  if (active.some((s) => s.status === "unhealthy")) return "unhealthy";
  if (active.some((s) => s.status === "quarantined")) return "degraded";
  if (active.some((s) => s.status === "degraded")) return "degraded";
  return "healthy";
}

export function quarantineDomain(domain: ControlDomain, reason: string, by = "repair-system"): void {
  const m = ensureMetrics(domain);
  m.quarantine = {
    reason,
    startedAt: new Date().toISOString(),
    quarantinedBy: by,
  };
  structuredLogger.warn(
    domain as any,
    "domain.quarantined",
    `Domain ${domain} quarantined: ${reason}`,
    { payload_summary: { domain, reason, by } }
  );
}

export function liftDomainQuarantine(domain: ControlDomain): void {
  const m = domainMetrics.get(domain);
  if (m?.quarantine) {
    delete m.quarantine;
    structuredLogger.info(
      domain as any,
      "domain.quarantine_lifted",
      `Domain ${domain} quarantine lifted`
    );
  }
}

export function isDomainQuarantined(domain: ControlDomain): boolean {
  const m = domainMetrics.get(domain);
  return !!m?.quarantine;
}

export function resetDomainMetrics(domain?: ControlDomain): void {
  if (domain) {
    domainMetrics.delete(domain);
  } else {
    domainMetrics.clear();
  }
}
