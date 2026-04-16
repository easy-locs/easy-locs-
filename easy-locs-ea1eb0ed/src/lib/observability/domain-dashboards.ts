/**
 * Domain dashboard composer.
 *
 * Aggregates structured logs + RED metrics + SLO evaluations + AI cost/latency
 * into a single snapshot that the admin observability UI can render without
 * reaching into each subsystem directly.
 */

import { structuredLogger, type LogDomain } from "./structured-logger";
import { snapshotByDomain, type RedSnapshot } from "./red-metrics";
import { evaluateAllSlos, type SloEvaluation } from "./slo";
import { aiCostSnapshot, type AiCostSnapshot } from "./ai-cost-tracker";
import { evaluateDomainAlerts, type DomainAlertResult } from "./alerting-rules";

export interface DomainDashboard {
  domain: LogDomain;
  title: string;
  red: RedSnapshot | null;
  recent_errors: number;
  recent_critical: number;
  slos: SloEvaluation[];
  active_alerts: DomainAlertResult[];
  updated_at: string;
}

const DOMAIN_TITLES: Partial<Record<LogDomain, string>> = {
  maps: "Maps health",
  rider: "Ride / ETA",
  payment: "Payments",
  orbit: "Orbit (messaging + realtime)",
  identity: "Identity / Auth",
  wallet: "Wallet",
  intelligence: "AI / Intelligence",
  marketplace: "Marketplace",
  search: "Search / Discovery",
  booking: "Booking",
  realtime: "Realtime delivery",
};

export function buildDomainDashboard(domain: LogDomain, windowMs = 5 * 60_000): DomainDashboard {
  const red = snapshotByDomain(windowMs)[domain] ?? null;
  const errors = structuredLogger.getErrorsByDomain(domain);
  const recent_errors = errors.filter((e) => e.level === "error").length;
  const recent_critical = errors.filter((e) => e.level === "critical").length;
  const slos = evaluateAllSlos().filter((s) => s.slo.domain === domain);
  const active_alerts = evaluateDomainAlerts().filter((a) => a.domain === domain && a.triggered);

  return {
    domain,
    title: DOMAIN_TITLES[domain] ?? domain,
    red,
    recent_errors,
    recent_critical,
    slos,
    active_alerts,
    updated_at: new Date().toISOString(),
  };
}

export interface GlobalObservabilitySnapshot {
  generated_at: string;
  domains: DomainDashboard[];
  ai: AiCostSnapshot;
  slo_summary: {
    total: number;
    meeting: number;
    breaching_critical: number;
  };
  alert_summary: {
    total_triggered: number;
    by_domain: Record<string, number>;
  };
}

const CORE_DOMAINS: LogDomain[] = [
  "identity",
  "wallet",
  "payment",
  "orbit",
  "maps",
  "rider",
  "intelligence",
  "marketplace",
  "search",
  "booking",
  "realtime",
];

export function buildGlobalSnapshot(windowMs = 5 * 60_000): GlobalObservabilitySnapshot {
  const domains = CORE_DOMAINS.map((d) => buildDomainDashboard(d, windowMs));
  const allSlos = evaluateAllSlos();
  const alerts = evaluateDomainAlerts().filter((a) => a.triggered);

  const byDomain: Record<string, number> = {};
  for (const a of alerts) {
    byDomain[a.domain] = (byDomain[a.domain] ?? 0) + 1;
  }

  return {
    generated_at: new Date().toISOString(),
    domains,
    ai: aiCostSnapshot(60 * 60_000),
    slo_summary: {
      total: allSlos.length,
      meeting: allSlos.filter((s) => s.meets_objective).length,
      breaching_critical: allSlos.filter((s) => s.slo.critical && !s.meets_objective).length,
    },
    alert_summary: {
      total_triggered: alerts.length,
      by_domain: byDomain,
    },
  };
}
