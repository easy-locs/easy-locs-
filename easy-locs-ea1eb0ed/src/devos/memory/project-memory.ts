import type { ProjectRule, IncidentRecord, ProofRecord, DomainMapEntry } from '../types';

const ARCHITECTURE_RULES: ProjectRule[] = [
  { id: 'r-001', category: 'architecture', rule: 'Single source of truth — no parallel v1/v2 systems', enforced: true, createdAt: '2025-01-01' },
  { id: 'r-002', category: 'anti-duplication', rule: 'No duplicate providers, stores, hooks, or canonical types', enforced: true, createdAt: '2025-01-01' },
  { id: 'r-003', category: 'domain-ownership', rule: 'Each domain owns its screens, flows, services, and state machines', enforced: true, createdAt: '2025-01-01' },
  { id: 'r-004', category: 'architecture', rule: 'DevOS never owns business logic — it audits, monitors, and repairs', enforced: true, createdAt: '2025-01-01' },
  { id: 'r-005', category: 'forbidden-pattern', rule: 'No direct DB access from UI components — always use service layer', enforced: true, createdAt: '2025-01-01' },
  { id: 'r-006', category: 'event-governance', rule: 'Single platform-bus instance — no hidden event emitters', enforced: true, createdAt: '2025-01-01' },
  { id: 'r-007', category: 'architecture', rule: 'All AI changes must be traceable, reviewable, and reversible', enforced: true, createdAt: '2025-01-01' },
  { id: 'r-008', category: 'forbidden-pattern', rule: 'No massive renaming without structural gain', enforced: true, createdAt: '2025-01-01' },
  { id: 'r-009', category: 'architecture', rule: 'Preserve strict separation between product runtime and DevOS runtime', enforced: true, createdAt: '2025-01-01' },
  { id: 'r-010', category: 'dependency', rule: 'Sensitive zones require enhanced validation before modification', enforced: true, createdAt: '2025-01-01' },
];

const DOMAIN_MAP: DomainMapEntry[] = [
  { name: 'Dashboard', path: 'src/domains/dashboard', owner: 'core-team', routes: ['/dashboard'], services: ['dashboard-service'], stores: ['dashboard-store'], providers: [], dependencies: ['wallet', 'radar'], healthScore: 95 },
  { name: 'Radar', path: 'src/domains/radar', owner: 'core-team', routes: ['/radar'], services: ['radar-service', 'geo-service'], stores: ['radar-store'], providers: [], dependencies: ['map', 'geo'], healthScore: 90 },
  { name: 'Orbit', path: 'src/domains/orbit', owner: 'core-team', routes: ['/orbit', '/orbit/*'], services: ['orbit-service', 'e2ee-service'], stores: ['orbit-store'], providers: ['OrbitProvider'], dependencies: ['trust-engine', 'e2ee'], healthScore: 88 },
  { name: 'Wallet', path: 'src/domains/wallet', owner: 'core-team', routes: ['/wallet', '/wallet/*'], services: ['wallet-service', 'payment-service'], stores: ['wallet-store'], providers: ['WalletProvider'], dependencies: ['trust-engine', 'stripe'], healthScore: 92 },
  { name: 'Marketplace', path: 'src/domains/marketplace', owner: 'core-team', routes: ['/marketplace', '/shop/*'], services: ['marketplace-service'], stores: ['marketplace-store'], providers: [], dependencies: ['wallet', 'delivery'], healthScore: 85 },
  { name: 'Me', path: 'src/domains/me', owner: 'core-team', routes: ['/me', '/me/*'], services: ['profile-service'], stores: ['me-store'], providers: [], dependencies: ['wallet', 'loyalty'], healthScore: 90 },
  { name: 'Loyalty', path: 'src/domains/loyalty', owner: 'growth-team', routes: ['/me/loyalty-history', '/me/challenges', '/me/referral'], services: ['loyalty-service'], stores: [], providers: [], dependencies: ['wallet', 'platform-bus'], healthScore: 80 },
  { name: 'Creator', path: 'src/domains/creator', owner: 'growth-team', routes: ['/me/creator', '/me/creator/*'], services: ['creator-service'], stores: [], providers: [], dependencies: ['wallet', 'orbit'], healthScore: 75 },
  { name: 'Property', path: 'src/domains/property', owner: 'verticals-team', routes: ['/property/*'], services: ['property-service'], stores: [], providers: [], dependencies: ['map', 'wallet'], healthScore: 82 },
  { name: 'Travel', path: 'src/domains/travel', owner: 'verticals-team', routes: ['/travel/*', '/universe/*'], services: ['travel-service', 'flight-service'], stores: [], providers: [], dependencies: ['wallet', 'map'], healthScore: 70 },
  { name: 'Admin', path: 'src/domains/admin', owner: 'platform-team', routes: ['/admin/*'], services: ['admin-service'], stores: [], providers: [], dependencies: ['all'], healthScore: 85 },
];

let incidents: IncidentRecord[] = [];
let proofs: ProofRecord[] = [];
let customRules: ProjectRule[] = [];

export function getRules(): ProjectRule[] {
  return [...ARCHITECTURE_RULES, ...customRules];
}

export function addRule(rule: Omit<ProjectRule, 'id' | 'createdAt'>): ProjectRule {
  const newRule: ProjectRule = {
    ...rule,
    id: `r-custom-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  customRules.push(newRule);
  return newRule;
}

export function getDomainMap(): DomainMapEntry[] {
  return DOMAIN_MAP;
}

export function getDomainByName(name: string): DomainMapEntry | undefined {
  return DOMAIN_MAP.find(d => d.name.toLowerCase() === name.toLowerCase());
}

export function addIncident(incident: Omit<IncidentRecord, 'id' | 'detectedAt'>): IncidentRecord {
  const record: IncidentRecord = {
    ...incident,
    id: `inc-${Date.now()}`,
    detectedAt: new Date().toISOString(),
  };
  incidents.push(record);
  return record;
}

export function getIncidents(): IncidentRecord[] {
  return incidents;
}

export function addProof(proof: Omit<ProofRecord, 'id' | 'timestamp'>): ProofRecord {
  const record: ProofRecord = {
    ...proof,
    id: `proof-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  proofs.push(record);
  return record;
}

export function getProofs(): ProofRecord[] {
  return proofs;
}

export function getProjectSummary() {
  return {
    totalDomains: DOMAIN_MAP.length,
    totalRules: getRules().length,
    totalIncidents: incidents.length,
    openIncidents: incidents.filter(i => !i.resolvedAt).length,
    totalProofs: proofs.length,
    averageHealthScore: Math.round(DOMAIN_MAP.reduce((s, d) => s + d.healthScore, 0) / DOMAIN_MAP.length),
    lastUpdated: new Date().toISOString(),
  };
}

export const projectMemory = {
  getRules,
  addRule,
  getDomainMap,
  getDomainByName,
  addIncident,
  getIncidents,
  addProof,
  getProofs,
  getProjectSummary,
};
