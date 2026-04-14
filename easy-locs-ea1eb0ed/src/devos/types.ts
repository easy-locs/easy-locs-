export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ViolationType =
  | 'duplicate-provider'
  | 'duplicate-store'
  | 'duplicate-hook'
  | 'duplicate-type'
  | 'route-conflict'
  | 'forbidden-import'
  | 'direct-db-in-ui'
  | 'cross-domain-write'
  | 'shadow-system'
  | 'dead-route'
  | 'orphan-component'
  | 'missing-guard'
  | 'event-storm'
  | 'duplicate-event';

export interface Violation {
  id: string;
  type: ViolationType;
  severity: Severity;
  domain: string;
  location: string;
  message: string;
  suggestion?: string;
  detectedAt: string;
  resolvedAt?: string;
}

export type EngineStatus = 'useful-wired' | 'useful-disconnected' | 'duplicated' | 'obsolete' | 'decorative' | 'dangerous';

export interface EngineRecord {
  id: string;
  name: string;
  owner: string;
  purpose: string;
  category: string;
  status: EngineStatus;
  inputs: string[];
  outputs: string[];
  consumers: string[];
  dependencies: string[];
  healthScore: number;
  rollbackStrategy: string;
  lastChecked: string;
}

export type PatchPhase = 'detect' | 'classify' | 'localize' | 'plan' | 'validate-preconditions' | 'apply' | 'verify' | 'regression-check' | 'log-proof' | 'accept' | 'rollback';

export interface PatchRecord {
  id: string;
  phase: PatchPhase;
  domain: string;
  description: string;
  files: string[];
  risks: string[];
  rollbackPlan: string;
  createdAt: string;
  appliedAt?: string;
  status: 'pending' | 'approved' | 'applied' | 'failed' | 'rolled-back';
  proof?: ProofRecord;
}

export interface ProofRecord {
  id: string;
  type: 'audit' | 'repair' | 'test' | 'incident' | 'regression' | 'rollback' | 'deploy' | 'engine-health';
  summary: string;
  details: Record<string, unknown>;
  timestamp: string;
  actor: string;
}

export interface IncidentRecord {
  id: string;
  severity: Severity;
  domain: string;
  description: string;
  detectedAt: string;
  resolvedAt?: string;
  resolution?: string;
  proof?: ProofRecord;
}

export interface ProjectRule {
  id: string;
  category: 'architecture' | 'domain-ownership' | 'canonical-type' | 'forbidden-pattern' | 'anti-duplication' | 'dependency' | 'event-governance';
  rule: string;
  enforced: boolean;
  createdAt: string;
}

export interface DomainMapEntry {
  name: string;
  path: string;
  owner: string;
  routes: string[];
  services: string[];
  stores: string[];
  providers: string[];
  dependencies: string[];
  healthScore: number;
}

export interface AuditResult {
  id: string;
  type: 'code' | 'route' | 'flow' | 'engine' | 'schema' | 'runtime' | 'ux' | 'dead-code';
  domain: string;
  violations: Violation[];
  score: number;
  timestamp: string;
}

export interface DevOSState {
  domains: DomainMapEntry[];
  engines: EngineRecord[];
  violations: Violation[];
  patches: PatchRecord[];
  proofs: ProofRecord[];
  incidents: IncidentRecord[];
  rules: ProjectRule[];
  audits: AuditResult[];
  lastScanAt: string | null;
}
