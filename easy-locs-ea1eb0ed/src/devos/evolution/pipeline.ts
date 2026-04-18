import type { AuditFinding, PipelineEvent, ProposedTask } from './types';
import { auditAgent, type AuditScanInput } from './agents/audit-agent';
import { plannerAgent } from './agents/planner-agent';
import { commander } from './agents/commander';
import { makeLoopGuard } from './safeguards';
import { emit, isPaused } from './monitoring';
import { getEvolutionConfig } from './config';

let lastCycleAt = 0;

export interface CycleInput {
  scan: AuditScanInput[];
  /**
   * For each finding, supply the file plan + rollback plan the planner needs.
   * Returning `null` skips that finding.
   */
  planFor: (finding: AuditFinding) => null | {
    files: string[];
    rollbackPlan: string;
    risks?: string[];
    pipelineDepth?: number;
    parentProposalId?: string | null;
    requiresHumanApproval?: boolean;
  };
}

export interface CycleResult {
  startedAt: string;
  finishedAt: string;
  findings: AuditFinding[];
  proposals: ProposedTask[];
  events: PipelineEvent[];
  paused: boolean;
  cooldownActive: boolean;
}

export async function runEvolutionCycle(input: CycleInput): Promise<CycleResult> {
  const startedAt = new Date().toISOString();
  const cfg = getEvolutionConfig();
  const startEvents: PipelineEvent[] = [];

  if (isPaused()) {
    const e = emit({
      stage: 'safeguard',
      kind: 'cycle-started',
      message: 'Cycle skipped: pipeline is paused',
    });
    startEvents.push(e);
    return {
      startedAt,
      finishedAt: new Date().toISOString(),
      findings: [],
      proposals: [],
      events: startEvents,
      paused: true,
      cooldownActive: false,
    };
  }

  const sinceLast = Date.now() - lastCycleAt;
  if (lastCycleAt > 0 && sinceLast < cfg.CYCLE_COOLDOWN_MS) {
    const e = emit({
      stage: 'safeguard',
      kind: 'cycle-started',
      message: `Cycle skipped: cooldown active (${sinceLast}ms < ${cfg.CYCLE_COOLDOWN_MS}ms)`,
    });
    startEvents.push(e);
    return {
      startedAt,
      finishedAt: new Date().toISOString(),
      findings: [],
      proposals: [],
      events: startEvents,
      paused: false,
      cooldownActive: true,
    };
  }
  lastCycleAt = Date.now();

  emit({ stage: 'audit', kind: 'cycle-started', message: 'Evolution cycle started' });

  const findings = auditAgent.scan(input.scan);
  const guard = makeLoopGuard();
  const proposals: ProposedTask[] = [];

  for (const finding of findings) {
    const bump = guard.bump();
    if (!bump.ok) {
      emit({
        stage: 'safeguard',
        kind: 'safeguard-tripped',
        message: `Loop guard tripped: ${bump.detail}`,
        details: { reason: bump.reason },
      });
      break;
    }
    if (proposals.length >= cfg.MAX_PROPOSALS_PER_CYCLE) {
      emit({
        stage: 'safeguard',
        kind: 'safeguard-tripped',
        findingId: finding.id,
        message: `Cycle proposal cap reached (${cfg.MAX_PROPOSALS_PER_CYCLE})`,
        details: { reason: 'cycle-cap-exceeded' },
      });
      break;
    }
    const plan = input.planFor(finding);
    if (!plan) continue;
    const draft = plannerAgent.plan({ finding, ...plan });
    const result = commander.validateAndQueue(draft);
    proposals.push(result.proposal);
  }

  const finishedAt = new Date().toISOString();
  emit({
    stage: 'audit',
    kind: 'cycle-finished',
    message: `Evolution cycle finished: ${findings.length} findings, ${proposals.length} proposals`,
    details: { findings: findings.length, proposals: proposals.length },
  });

  return {
    startedAt,
    finishedAt,
    findings,
    proposals,
    events: startEvents,
    paused: false,
    cooldownActive: false,
  };
}

export function resetCooldownForTests(): void {
  lastCycleAt = 0;
}
