import type { ProofRecord, IncidentRecord, Severity } from '../types';
import { projectMemory } from '../memory/project-memory';

export function logProof(input: {
  type: ProofRecord['type'];
  summary: string;
  details: Record<string, unknown>;
  actor: string;
}): ProofRecord {
  return projectMemory.addProof(input);
}

export function logIncident(input: {
  severity: Severity;
  domain: string;
  description: string;
}): IncidentRecord {
  return projectMemory.addIncident(input);
}

export function resolveIncident(incidentId: string, resolution: string): IncidentRecord | null {
  const incidents = projectMemory.getIncidents();
  const incident = incidents.find(i => i.id === incidentId);
  if (!incident) return null;

  incident.resolvedAt = new Date().toISOString();
  incident.resolution = resolution;

  logProof({
    type: 'incident',
    summary: `Resolved incident: ${incident.description}`,
    details: { incidentId, resolution },
    actor: 'devos',
  });

  return incident;
}

export function getHealthDashboard() {
  const summary = projectMemory.getProjectSummary();
  const domains = projectMemory.getDomainMap();
  const incidents = projectMemory.getIncidents();
  const proofs = projectMemory.getProofs();

  const domainHealth = domains.map(d => ({
    name: d.name,
    score: d.healthScore,
    status: d.healthScore >= 90 ? 'healthy' as const :
            d.healthScore >= 70 ? 'warning' as const : 'critical' as const,
  }));

  const recentIncidents = incidents
    .filter(i => !i.resolvedAt)
    .slice(-10);

  const recentProofs = proofs.slice(-10);

  return {
    overall: {
      score: summary.averageHealthScore,
      status: summary.averageHealthScore >= 85 ? 'healthy' as const :
              summary.averageHealthScore >= 70 ? 'warning' as const : 'critical' as const,
      totalDomains: summary.totalDomains,
      totalRules: summary.totalRules,
      openIncidents: summary.openIncidents,
    },
    domains: domainHealth,
    recentIncidents,
    recentProofs,
    lastUpdated: new Date().toISOString(),
  };
}

export function getEngineHealthSummary() {
  return {
    totalEngines: 12,
    wired: 8,
    disconnected: 2,
    obsolete: 1,
    decorative: 1,
    overallHealth: 75,
    engines: [
      { name: 'trust-engine', status: 'wired', health: 95 },
      { name: 'platform-bus', status: 'wired', health: 90 },
      { name: 'loyalty-engine', status: 'wired', health: 80 },
      { name: 'currency-engine', status: 'wired', health: 85 },
      { name: 'i18n-engine', status: 'wired', health: 92 },
      { name: 'search-engine', status: 'wired', health: 78 },
      { name: 'ranking-engine', status: 'wired', health: 82 },
      { name: 'qr-engine', status: 'wired', health: 88 },
      { name: 'smart-home-engine', status: 'disconnected', health: 45 },
      { name: 'action-engine', status: 'disconnected', health: 50 },
      { name: 'ui-engine', status: 'decorative', health: 30 },
      { name: 'detection-engine', status: 'obsolete', health: 20 },
    ],
  };
}

export const proofRegistry = {
  logProof,
  logIncident,
  resolveIncident,
  getHealthDashboard,
  getEngineHealthSummary,
};
