export type EvolutionStage =
  | 'audit'
  | 'planner'
  | 'commander'
  | 'repair';

export type ProposalStatus =
  | 'suggested'
  | 'approved'
  | 'rejected'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'rolled-back';

export type RejectionReason =
  | 'duplicate-content'
  | 'duplicate-id'
  | 'recursive-spawn'
  | 'pipeline-depth-exceeded'
  | 'concurrent-limit-exceeded'
  | 'cycle-cap-exceeded'
  | 'loop-cap-exceeded'
  | 'cooldown-active'
  | 'sensitive-zone'
  | 'level-d-required'
  | 'policy-violation'
  | 'invalid-payload'
  | 'human-rejected'
  | 'banned-content-hash';

export interface AuditFinding {
  id: string;
  stage: 'audit';
  domain: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string;
  location: string;
  detectedAt: string;
}

export interface ProposedTask {
  id: string;
  parentFindingId: string;
  parentProposalId: string | null;
  contentHash: string;
  intent: string;
  domain: string;
  files: string[];
  risks: string[];
  rollbackPlan: string;
  requiresHumanApproval: boolean;
  pipelineDepth: number;
  status: ProposalStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: { kind: 'human' | 'commander'; id: string };
  rejectedAt?: string;
  rejectionReason?: RejectionReason;
  rejectionDetail?: string;
  executedAt?: string;
  completedAt?: string;
  rolledBackAt?: string;
  performance?: {
    before?: Record<string, number>;
    after?: Record<string, number>;
  };
}

export interface PipelineEvent {
  id: string;
  at: string;
  stage: EvolutionStage | 'approval' | 'safeguard' | 'monitor';
  kind:
    | 'finding-emitted'
    | 'proposal-suggested'
    | 'proposal-approved'
    | 'proposal-rejected'
    | 'proposal-executing'
    | 'proposal-completed'
    | 'proposal-failed'
    | 'proposal-rolled-back'
    | 'safeguard-tripped'
    | 'pipeline-paused'
    | 'pipeline-resumed'
    | 'config-changed'
    | 'cycle-started'
    | 'cycle-finished';
  proposalId?: string;
  findingId?: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface RegistryEntry {
  id: string;
  contentHash: string;
  lineage: string[];
  createdAt: string;
  status: ProposalStatus;
  rolledBackAt?: string;
  bannedUntil?: string;
}

export interface EvolutionConfig {
  MAX_CONCURRENT_TASKS: number;
  MAX_PROPOSALS_PER_CYCLE: number;
  MAX_PIPELINE_DEPTH: number;
  MAX_ITERATIONS_PER_CYCLE: number;
  CYCLE_COOLDOWN_MS: number;
  REJECTION_ESCALATION_THRESHOLD: number;
  BAN_DURATION_MS: number;
  LEVEL_D_ENABLED: boolean;
}

export interface Approver {
  kind: 'human' | 'commander';
  id: string;
}
