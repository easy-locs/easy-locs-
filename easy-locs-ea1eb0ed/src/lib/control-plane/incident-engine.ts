import { structuredLogger } from "@/lib/observability/structured-logger";
import { platformBus } from "@/lib/shared/platform-bus";
import type { ControlDomain, Incident, IncidentPriority, IncidentStatus } from "./types";

const activeIncidents: Incident[] = [];
let incidentCounter = 0;

const DOMAIN_CRITICALITY: Record<ControlDomain, number> = {
  auth: 100,
  identity: 95,
  wallet: 100,
  payment: 100,
  orbit: 85,
  orbit_call: 80,
  dashboard: 60,
  radar: 50,
  marketplace: 70,
  listing: 65,
  scraping: 40,
  media: 45,
  notification: 55,
  booking: 75,
  food: 70,
  hotel: 65,
  services: 60,
  flights: 70,
  property: 55,
  rider: 60,
  support: 50,
  admin: 40,
  realtime: 75,
  cron: 35,
  taxonomy: 30,
};

function computePriority(
  domain: ControlDomain,
  affectedUsers?: number,
  isSecurityIssue?: boolean,
  isMoneyImpact?: boolean
): IncidentPriority {
  const criticality = DOMAIN_CRITICALITY[domain] || 50;

  if (isSecurityIssue) return "P0";
  if (isMoneyImpact && criticality >= 80) return "P0";
  if (criticality >= 90 && (affectedUsers ?? 0) > 10) return "P0";
  if (criticality >= 70) return "P1";
  if (criticality >= 50) return "P2";
  return "P3";
}

export function createIncident(opts: {
  domain: ControlDomain;
  title: string;
  description: string;
  error_code?: string;
  release_id?: string;
  affected_users_estimate?: number;
  is_security?: boolean;
  is_money_impact?: boolean;
  auto_mitigated?: boolean;
}): Incident {
  incidentCounter++;
  const priority = computePriority(
    opts.domain,
    opts.affected_users_estimate,
    opts.is_security,
    opts.is_money_impact
  );

  const incident: Incident = {
    id: `INC-${Date.now()}-${incidentCounter}`,
    domain: opts.domain,
    priority,
    status: "active",
    title: opts.title,
    description: opts.description,
    detected_at: new Date().toISOString(),
    affected_users_estimate: opts.affected_users_estimate,
    error_code: opts.error_code,
    release_id: opts.release_id,
    auto_mitigated: opts.auto_mitigated ?? false,
  };

  activeIncidents.push(incident);

  structuredLogger.warn(
    opts.domain as any,
    "incident.created",
    `[${priority}] ${opts.title}`,
    {
      error_code: opts.error_code,
      payload_summary: { incident_id: incident.id, priority },
    }
  );

  platformBus.emit("sla:warning", {
    incident_id: incident.id,
    domain: opts.domain,
    priority,
    title: opts.title,
  }, "system");

  if (activeIncidents.length > 100) {
    const resolved = activeIncidents.findIndex((i) => i.status === "resolved");
    if (resolved >= 0) activeIncidents.splice(resolved, 1);
  }

  return incident;
}

export function resolveIncident(incidentId: string): void {
  const incident = activeIncidents.find((i) => i.id === incidentId);
  if (incident) {
    incident.status = "resolved";
    incident.resolved_at = new Date().toISOString();
    structuredLogger.info(
      incident.domain as any,
      "incident.resolved",
      `Resolved: ${incident.title}`,
      { payload_summary: { incident_id: incidentId } }
    );
  }
}

export function updateIncidentStatus(incidentId: string, status: IncidentStatus): void {
  const incident = activeIncidents.find((i) => i.id === incidentId);
  if (incident) {
    incident.status = status;
  }
}

export function getActiveIncidents(domain?: ControlDomain): Incident[] {
  const active = activeIncidents.filter((i) => i.status !== "resolved");
  return domain ? active.filter((i) => i.domain === domain) : active;
}

export function getIncidentsByPriority(priority: IncidentPriority): Incident[] {
  return activeIncidents.filter((i) => i.priority === priority && i.status !== "resolved");
}

export function getIncidentHistory(limit = 50): Incident[] {
  return activeIncidents.slice(-limit);
}

export function getIncidentStats(): {
  total: number;
  active: number;
  by_priority: Record<IncidentPriority, number>;
  by_domain: Record<string, number>;
} {
  const active = activeIncidents.filter((i) => i.status !== "resolved");
  const byPriority: Record<IncidentPriority, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
  const byDomain: Record<string, number> = {};

  for (const i of active) {
    byPriority[i.priority]++;
    byDomain[i.domain] = (byDomain[i.domain] || 0) + 1;
  }

  return {
    total: activeIncidents.length,
    active: active.length,
    by_priority: byPriority,
    by_domain: byDomain,
  };
}
