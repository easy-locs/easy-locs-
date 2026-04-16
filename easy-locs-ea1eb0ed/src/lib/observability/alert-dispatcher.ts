/**
 * Alert notification dispatcher with pluggable sinks.
 *
 * Built-in sinks:
 *   - `structuredLog`  — always on, emits a structuredLogger entry at the
 *                        mapped level (which already feeds Sentry for
 *                        error + critical levels).
 *   - `sentry`         — explicit Sentry captureMessage with rich tags so
 *                        the alert is searchable independently of the
 *                        breadcrumb trail.
 *   - `webhook`        — optional. Posts JSON to `VITE_ALERT_WEBHOOK_URL`
 *                        (Slack-compatible incoming-webhook payload).
 *   - `db`             — persists the alert to `observability_alert_log`
 *                        when the table exists; swallows missing-table
 *                        errors so older environments keep working.
 *
 * Sinks are registered statically but callers can append their own with
 * `registerAlertSink(...)` for e.g. PagerDuty or custom channels.
 */

import * as Sentry from "@sentry/react";
import { structuredLogger, type LogDomain } from "./structured-logger";

export type AlertSeverity = "info" | "warn" | "error" | "critical";

export interface AlertNotification {
  source: "domain_alert" | "slo_breach" | "map_error" | "custom";
  rule_id: string;
  domain: string;
  breach?: string;
  severity: AlertSeverity;
  measured: number;
  threshold: number;
  sample_count?: number;
  window_ms?: number;
  fired_at: string;
  extra?: Record<string, unknown>;
}

export type AlertSink = (n: AlertNotification) => Promise<void> | void;

const SEVERITY_TO_LOG: Record<AlertSeverity, "info" | "warn" | "error" | "critical"> = {
  info: "info",
  warn: "warn",
  error: "error",
  critical: "critical",
};

const structuredLogSink: AlertSink = (n) => {
  const level = SEVERITY_TO_LOG[n.severity];
  const msg = `[${n.source}] ${n.domain}/${n.rule_id}${n.breach ? ` breach=${n.breach}` : ""}: measured=${n.measured} threshold=${n.threshold}`;
  structuredLogger[level](n.domain as LogDomain, `alert.${n.breach ?? n.source}`, msg, {
    result: "failure",
    payload_summary: {
      rule_id: n.rule_id,
      breach: n.breach,
      measured: n.measured,
      threshold: n.threshold,
      sample_count: n.sample_count,
      window_ms: n.window_ms,
      source: n.source,
    },
  });
};

const sentrySink: AlertSink = (n) => {
  try {
    Sentry.captureMessage(
      `[ALERT ${n.source}] ${n.domain}/${n.rule_id}${n.breach ? ` breach=${n.breach}` : ""}`,
      {
        level: n.severity === "critical" ? "fatal" : n.severity === "error" ? "error" : "warning",
        tags: {
          alert_source: n.source,
          alert_rule: n.rule_id,
          domain: n.domain,
          breach: n.breach ?? "n/a",
        },
        extra: {
          measured: n.measured,
          threshold: n.threshold,
          sample_count: n.sample_count,
          window_ms: n.window_ms,
          fired_at: n.fired_at,
          ...n.extra,
        },
      },
    );
  } catch {
    // Sentry may not be initialised — fall through silently.
  }
};

const webhookSink: AlertSink = async (n) => {
  const url = typeof import.meta !== "undefined"
    ? (import.meta as { env?: Record<string, string> }).env?.VITE_ALERT_WEBHOOK_URL
    : undefined;
  if (!url) return;
  const emoji = n.severity === "critical" ? "🚨" : n.severity === "error" ? "⚠️" : "ℹ️";
  const payload = {
    text: `${emoji} *${n.domain}*/${n.rule_id}${n.breach ? ` — ${n.breach}` : ""}: measured=${n.measured} threshold=${n.threshold} (${n.sample_count ?? 0} samples / ${n.window_ms ?? 0}ms)`,
    severity: n.severity,
    source: n.source,
    fired_at: n.fired_at,
    domain: n.domain,
    breach: n.breach,
  };
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Non-fatal; the structured log + Sentry sinks still recorded the alert.
  }
};

const dbSink: AlertSink = async (n) => {
  try {
    const { db: supabase } = await import("@/services/db");
    await supabase.from("observability_alert_log").insert({
      rule_id: n.rule_id,
      domain: n.domain,
      breach: n.breach ?? null,
      measured: n.measured,
      threshold: n.threshold,
      sample_count: n.sample_count ?? null,
      window_ms: n.window_ms ?? null,
      source: n.source,
      severity: n.severity,
      fired_at: n.fired_at,
    });
  } catch {
    // Table may not exist yet — swallow.
  }
};

const SINKS: AlertSink[] = [structuredLogSink, sentrySink, webhookSink, dbSink];

export function registerAlertSink(sink: AlertSink): void {
  SINKS.push(sink);
}

export async function notifyAlert(n: AlertNotification): Promise<void> {
  await Promise.all(
    SINKS.map(async (s) => {
      try { await s(n); } catch { /* never let one sink break the others */ }
    }),
  );
}
