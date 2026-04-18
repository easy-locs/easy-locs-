import type { Approver, ProposedTask, RejectionReason } from './types';
import { getEntry, updateStatus } from './registry';
import { emit, noteApproval, noteRejection, isPaused, setPaused, getRejectionStreak } from './monitoring';
import { getEvolutionConfig } from './config';

const proposals = new Map<string, ProposedTask>();

export function getProposal(id: string): ProposedTask | null {
  return proposals.get(id) ?? null;
}

export function listProposals(filter?: { status?: ProposedTask['status'] }): ProposedTask[] {
  const all = Array.from(proposals.values());
  return filter?.status ? all.filter(p => p.status === filter.status) : all;
}

export function recordSuggested(task: ProposedTask): ProposedTask {
  proposals.set(task.id, task);
  emit({
    stage: 'approval',
    kind: 'proposal-suggested',
    proposalId: task.id,
    findingId: task.parentFindingId,
    message: `Proposal suggested: ${task.intent}`,
    details: {
      domain: task.domain,
      files: task.files,
      pipelineDepth: task.pipelineDepth,
      requiresHumanApproval: task.requiresHumanApproval,
    },
  });
  return task;
}

export interface ApprovalOk {
  ok: true;
  proposal: ProposedTask;
}
export interface ApprovalFail {
  ok: false;
  reason: RejectionReason;
  detail: string;
}
export type ApprovalResult = ApprovalOk | ApprovalFail;

export function approve(id: string, approver: Approver): ApprovalResult {
  const proposal = proposals.get(id);
  if (!proposal) {
    return { ok: false, reason: 'invalid-payload', detail: `Unknown proposal ${id}` };
  }
  if (proposal.status !== 'suggested') {
    return {
      ok: false,
      reason: 'policy-violation',
      detail: `Cannot approve proposal in status=${proposal.status}`,
    };
  }
  if (proposal.requiresHumanApproval && approver.kind !== 'human') {
    return {
      ok: false,
      reason: 'policy-violation',
      detail: `Proposal ${id} requires human approver, got ${approver.kind}`,
    };
  }
  if (isPaused()) {
    return {
      ok: false,
      reason: 'policy-violation',
      detail: 'Pipeline is paused — only resume() can reopen approvals',
    };
  }
  const next: ProposedTask = {
    ...proposal,
    status: 'approved',
    approvedAt: new Date().toISOString(),
    approvedBy: approver,
    updatedAt: new Date().toISOString(),
  };
  proposals.set(id, next);
  updateStatus(id, 'approved');
  noteApproval();
  emit({
    stage: 'approval',
    kind: 'proposal-approved',
    proposalId: id,
    message: `Proposal approved by ${approver.kind}:${approver.id}`,
    details: { approver },
  });
  return { ok: true, proposal: next };
}

export function reject(id: string, reason: RejectionReason, detail: string, by: Approver = { kind: 'commander', id: 'commander' }): ApprovalResult {
  const proposal = proposals.get(id);
  if (!proposal) {
    return { ok: false, reason: 'invalid-payload', detail: `Unknown proposal ${id}` };
  }
  if (proposal.status !== 'suggested') {
    return {
      ok: false,
      reason: 'policy-violation',
      detail: `Cannot reject proposal in status=${proposal.status}`,
    };
  }
  const next: ProposedTask = {
    ...proposal,
    status: 'rejected',
    rejectedAt: new Date().toISOString(),
    rejectionReason: reason,
    rejectionDetail: detail,
    updatedAt: new Date().toISOString(),
  };
  proposals.set(id, next);
  updateStatus(id, 'rejected');
  const streak = noteRejection();
  emit({
    stage: 'approval',
    kind: 'proposal-rejected',
    proposalId: id,
    message: `Proposal rejected: ${reason}`,
    details: { reason, detail, by, streak },
  });
  if (streak >= getEvolutionConfig().REJECTION_ESCALATION_THRESHOLD) {
    pause(`rejection streak ${streak} reached escalation threshold`);
  }
  return { ok: true, proposal: next };
}

export function markExecuting(id: string): ProposedTask | null {
  const p = proposals.get(id);
  if (!p || p.status !== 'approved') return null;
  const next: ProposedTask = { ...p, status: 'executing', executedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  proposals.set(id, next);
  updateStatus(id, 'executing');
  emit({ stage: 'repair', kind: 'proposal-executing', proposalId: id, message: `Executing ${id}` });
  return next;
}

export function markCompleted(id: string, performance?: ProposedTask['performance']): ProposedTask | null {
  const p = proposals.get(id);
  if (!p || p.status !== 'executing') return null;
  const next: ProposedTask = {
    ...p,
    status: 'completed',
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    performance: performance ?? p.performance,
  };
  proposals.set(id, next);
  updateStatus(id, 'completed');
  emit({ stage: 'repair', kind: 'proposal-completed', proposalId: id, message: `Completed ${id}`, details: { performance: next.performance } });
  return next;
}

export function markFailed(id: string, detail: string): ProposedTask | null {
  const p = proposals.get(id);
  if (!p) return null;
  const next: ProposedTask = { ...p, status: 'failed', updatedAt: new Date().toISOString() };
  proposals.set(id, next);
  updateStatus(id, 'failed');
  emit({ stage: 'repair', kind: 'proposal-failed', proposalId: id, message: `Failed ${id}: ${detail}`, details: { detail } });
  return next;
}

export function markRolledBack(id: string, detail: string): ProposedTask | null {
  const p = proposals.get(id);
  if (!p) return null;
  const next: ProposedTask = { ...p, status: 'rolled-back', rolledBackAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  proposals.set(id, next);
  updateStatus(id, 'rolled-back');
  emit({ stage: 'repair', kind: 'proposal-rolled-back', proposalId: id, message: `Rolled back ${id}: ${detail}`, details: { detail } });
  return next;
}

export function pause(reason: string): void {
  if (isPaused()) return;
  setPaused(true);
  emit({
    stage: 'safeguard',
    kind: 'pipeline-paused',
    message: `Pipeline paused: ${reason}`,
    details: { reason, rejectionStreak: getRejectionStreak() },
  });
}

export function resume(by: Approver): void {
  if (!isPaused()) return;
  if (by.kind !== 'human') {
    // Only humans may resume.
    emit({
      stage: 'safeguard',
      kind: 'safeguard-tripped',
      message: 'Resume attempted by non-human actor',
      details: { by },
    });
    return;
  }
  setPaused(false);
  emit({
    stage: 'safeguard',
    kind: 'pipeline-resumed',
    message: `Pipeline resumed by ${by.id}`,
    details: { by },
  });
}

export function clearProposalsForTests(): void {
  proposals.clear();
  setPaused(false);
}

/**
 * Invariant guard: anyone trying to short-circuit the chokepoint by mutating
 * a proposal status directly should call this to detect the bypass.
 */
export function assertNoBypass(observed: ProposedTask): void {
  const tracked = proposals.get(observed.id);
  if (!tracked) return;
  if (tracked.status !== observed.status) {
    emit({
      stage: 'safeguard',
      kind: 'safeguard-tripped',
      proposalId: observed.id,
      message: `Bypass detected: external status ${observed.status} != tracked ${tracked.status}`,
      details: { tracked, observed },
    });
    pause(`bypass attempt on ${observed.id}`);
  }
}
