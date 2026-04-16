/**
 * Domain alerting rules (pure evaluation).
 *
 * `evaluateDomainAlerts()` is a **pure** read-only function: it returns the
 * current state of every rule without side effects so dashboards can render
 * it on every refresh without triggering alert floods.
 *
 * To actually fire alerts (structured log, Sentry, optional webhook sinks)
 * call `dispatchDomainAlerts()` — typically from a background scheduler
 * (e.g. a polling interval or cron), not from a render path.
 *
 * Map-specific alerting lives in `@/lib/analytics/map-error-alerting` — this
 * module complements it by covering the other critical domains.
 */

import { snapshotByDomain } from "./red-metrics";
import { criticalSloBreaches } from "./slo";
import type { LogDomain } from "./structured-logger";
import { notifyAlert, type AlertNotification } from "./alert-dispatcher";

export interface DomainAlertRule {
  id: string;
  domain: LogDomain;
  windowMs: number;
  max_error_rate?: number;
  max_p95_ms?: number;
  min_rate_per_min?: number;
  max_rate_per_min?: number;
  enabled: boolean;
}

const DEFAULT_RULES: DomainAlertRule[] = [
  { id: "payment_error_spike", domain: "payment", windowMs: 5 * 60_000, max_error_rate: 0.02, enabled: true },
  { id: "payment_latency_p95", domain: "payment", windowMs: 5 * 60_000, max_p95_ms: 3000, enabled: true },
  { id: "identity_auth_failures", domain: "identity", windowMs: 5 * 60_000, max_error_rate: 0.05, enabled: true },
  { id: "wallet_transfer_failures", domain: "wallet", windowMs: 10 * 60_000, max_error_rate: 0.01, enabled: true },
  { id: "orbit_realtime_latency", domain: "orbit", windowMs: 5 * 60_000, max_p95_ms: 500, enabled: true },
  { id: "orbit_message_errors", domain: "orbit", windowMs: 5 * 60_000, max_error_rate: 0.01, enabled: true },
  { id: "ai_latency_p95", domain: "intelligence", windowMs: 10 * 60_000, max_p95_ms: 8000, enabled: true },
  { id: "ai_error_rate", domain: "intelligence", windowMs: 10 * 60_000, max_error_rate: 0.05, enabled: true },
  { id: "rider_error_rate", domain: "rider", windowMs: 5 * 60_000, max_error_rate: 0.02, enabled: true },
];

let customRules: DomainAlertRule[] = [];
const lastFiredAt = new Map<string, number>();
const ALERT_COOLDOWN_MS = 60_000;

export function getDomainAlertRules(): DomainAlertRule[] {
  return [...DEFAULT_RULES, ...customRules];
}

export function setCustomAlertRules(rules: DomainAlertRule[]): void {
  customRules = rules;
}

export type AlertBreach = "error_rate" | "p95" | "rate_low" | "rate_high";

export interface DomainAlertResult {
  rule_id: string;
  domain: string;
  triggered: boolean;
  breach?: AlertBreach;
  measured: number;
  threshold: number;
  sample_count: number;
  window_ms: number;
}

/**
 * Pure, side-effect-free evaluation. Returns the current state of every
 * configured rule over its window. Safe to call from render paths.
 */
export function evaluateDomainAlerts(): DomainAlertResult[] {
  const results: DomainAlertResult[] = [];
  for (const rule of getDomainAlertRules()) {
    if (!rule.enabled) continue;
    const stats = snapshotByDomain(rule.windowMs)[rule.domain];
    if (!stats || stats.count === 0) continue;

    type Check = { ok: boolean; breach: AlertBreach; measured: number; threshold: number };
    const checks: Check[] = [];
    if (rule.max_error_rate != null) {
      checks.push({
        ok: stats.error_rate <= rule.max_error_rate,
        breach: "error_rate",
        measured: stats.error_rate,
        threshold: rule.max_error_rate,
      });
    }
    if (rule.max_p95_ms != null) {
      checks.push({
        ok: stats.p95 <= rule.max_p95_ms,
        breach: "p95",
        measured: stats.p95,
        threshold: rule.max_p95_ms,
      });
    }
    if (rule.min_rate_per_min != null) {
      checks.push({
        ok: stats.rate_per_min >= rule.min_rate_per_min,
        breach: "rate_low",
        measured: stats.rate_per_min,
        threshold: rule.min_rate_per_min,
      });
    }
    if (rule.max_rate_per_min != null) {
      checks.push({
        ok: stats.rate_per_min <= rule.max_rate_per_min,
        breach: "rate_high",
        measured: stats.rate_per_min,
        threshold: rule.max_rate_per_min,
      });
    }

    for (const c of checks) {
      results.push({
        rule_id: rule.id,
        domain: rule.domain,
        triggered: !c.ok,
        breach: c.breach,
        measured: c.measured,
        threshold: c.threshold,
        sample_count: stats.count,
        window_ms: rule.windowMs,
      });
    }
  }
  return results;
}

/**
 * Evaluates alerts and dispatches notifications for triggered ones,
 * respecting a per-rule cooldown. Intended to be called from a background
 * scheduler — NOT from a dashboard render path.
 */
export async function dispatchDomainAlerts(): Promise<DomainAlertResult[]> {
  const results = evaluateDomainAlerts();
  const now = Date.now();
  const notifications: AlertNotification[] = [];

  for (const r of results) {
    if (!r.triggered || !r.breach) continue;
    const key = `${r.rule_id}:${r.breach}`;
    const last = lastFiredAt.get(key) ?? 0;
    if (now - last <= ALERT_COOLDOWN_MS) continue;
    lastFiredAt.set(key, now);

    notifications.push({
      source: "domain_alert",
      rule_id: r.rule_id,
      domain: r.domain,
      breach: r.breach,
      severity: r.domain === "payment" || r.domain === "wallet" || r.domain === "identity"
        ? "critical"
        : "error",
      measured: r.measured,
      threshold: r.threshold,
      sample_count: r.sample_count,
      window_ms: r.window_ms,
      fired_at: new Date().toISOString(),
    });
  }

  if (notifications.length > 0) {
    await Promise.all(notifications.map((n) => notifyAlert(n).catch(() => {})));
  }
  return results;
}

/** Snapshot helper combining the pure domain-alert state and SLO breaches. */
export function evaluateAllAlerts(): {
  domain_alerts: DomainAlertResult[];
  slo_breaches: ReturnType<typeof criticalSloBreaches>;
} {
  return {
    domain_alerts: evaluateDomainAlerts(),
    slo_breaches: criticalSloBreaches(),
  };
}
