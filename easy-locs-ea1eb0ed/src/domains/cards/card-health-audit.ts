import { CARD_REGISTRY, computeConnectionStatus, hasKnownAdapter, getCardAuditSummary } from "./card-registry";
import type { CardRegistryEntry } from "./card-contract";
import { structuredLogger } from "@/lib/observability/structured-logger";
import { recordAction } from "@/lib/control-plane/domain-health";
import { platformBus } from "@/lib/shared/platform-bus";

export interface CardAuditResult {
  key: string;
  domain: string;
  surface: string;
  connectionStatus: CardRegistryEntry["connectionStatus"];
  issues: string[];
  healthy: boolean;
}

export interface CardHealthReport {
  timestamp: string;
  total_cards: number;
  connected: number;
  partial: number;
  orphan: number;
  broken: number;
  mocked: number;
  uncomputed: number;
  issues: CardAuditResult[];
  overall_health: "healthy" | "degraded" | "unhealthy";
}

const ROUTE_PATTERN = /^\/[a-z0-9\-/]*$/;

export function auditCard(entry: CardRegistryEntry): CardAuditResult {
  const issues: string[] = [];
  const adapterExists = hasKnownAdapter(entry.key);

  const connectionStatus = computeConnectionStatus(entry, {
    hasAdapter: adapterExists,
    hasCardShellUsage: adapterExists,
    hasRealAction: !!entry.route && ROUTE_PATTERN.test(entry.route),
    hasValidRoute: !!entry.route && entry.route.length > 0,
    hasDirectFetch: false,
    hasMock: false,
  });

  if (!adapterExists) {
    issues.push(`Missing adapter hook for card "${entry.key}"`);
  }

  if (!entry.route || !ROUTE_PATTERN.test(entry.route)) {
    issues.push(`Invalid or missing route: "${entry.route}"`);
  }

  if (!entry.requiredCapability) {
    issues.push("Missing requiredCapability");
  }

  if (!entry.sourceKey) {
    issues.push("Missing sourceKey — no data pipeline defined");
  }

  if (entry.classification === "delegated_pipeline_card" && !entry.delegationOwner) {
    issues.push("Delegated card missing delegationOwner");
  }

  return {
    key: entry.key,
    domain: entry.domain,
    surface: entry.surface,
    connectionStatus,
    issues,
    healthy: issues.length === 0 && connectionStatus === "connected",
  };
}

export function runFullCardAudit(): CardHealthReport {
  const start = performance.now();
  const entries = Object.values(CARD_REGISTRY);
  const results = entries.map(auditCard);

  const connected = results.filter((r) => r.connectionStatus === "connected").length;
  const partial = results.filter((r) => r.connectionStatus === "partial").length;
  const orphan = results.filter((r) => r.connectionStatus === "orphan").length;
  const broken = results.filter((r) => r.connectionStatus === "broken").length;
  const mocked = results.filter((r) => r.connectionStatus === "mocked").length;
  const uncomputed = results.filter((r) => !r.connectionStatus).length;

  const issueCards = results.filter((r) => !r.healthy);
  const healthyRatio = entries.length > 0 ? connected / entries.length : 1;

  let overall_health: CardHealthReport["overall_health"] = "healthy";
  if (healthyRatio < 0.5 || broken > 0) overall_health = "unhealthy";
  else if (healthyRatio < 0.8 || orphan > 0) overall_health = "degraded";

  const elapsed = Math.round(performance.now() - start);

  recordAction("dashboard", "card_audit", overall_health !== "unhealthy", elapsed);

  structuredLogger.info("dashboard", "card_audit", `Card audit complete: ${connected}/${entries.length} connected`, {
    total: entries.length,
    connected,
    partial,
    orphan,
    broken,
    mocked,
    uncomputed,
    issue_count: issueCards.length,
    overall_health,
    elapsed_ms: elapsed,
  });

  platformBus.emit("dashboard:card_audit_completed" as any, {
    total: entries.length,
    connected,
    orphan,
    broken,
    overall_health,
  }, "system");

  return {
    timestamp: new Date().toISOString(),
    total_cards: entries.length,
    connected,
    partial,
    orphan,
    broken,
    mocked,
    uncomputed,
    issues: issueCards,
    overall_health,
  };
}

export function getDeadCards(): CardAuditResult[] {
  return Object.values(CARD_REGISTRY)
    .map(auditCard)
    .filter((r) => r.connectionStatus === "orphan" || r.connectionStatus === "broken");
}

export function getCardHealthSummary(): Record<string, number> {
  return getCardAuditSummary();
}
