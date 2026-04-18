import type { ProposedTask } from '../types';
import { getProposal, markCompleted, markExecuting, markFailed, markRolledBack } from '../approval';
import { emit, buildPerformanceImpact } from '../monitoring';

export interface RepairExecutor {
  /**
   * Concrete execution function, e.g. wired to safePatchPipeline.applyPatch.
   * Should return `{ ok: true, performance? }` or `{ ok: false, detail }`.
   */
  execute: (task: ProposedTask) => Promise<
    | { ok: true; performance?: ProposedTask['performance'] }
    | { ok: false; detail: string }
  >;
  /** Concrete rollback, e.g. wired to safePatchPipeline.rollbackPatch. */
  rollback: (task: ProposedTask) => Promise<{ ok: boolean; detail: string }>;
}

export function makeRepairAgent(executor: RepairExecutor) {
  return {
    async run(taskId: string): Promise<ProposedTask | null> {
      const proposal = getProposal(taskId);
      if (!proposal) {
        emit({
          stage: 'repair',
          kind: 'proposal-failed',
          proposalId: taskId,
          message: 'Repair attempted on unknown proposal',
        });
        return null;
      }
      if (proposal.status !== 'approved') {
        emit({
          stage: 'safeguard',
          kind: 'safeguard-tripped',
          proposalId: taskId,
          message: `Repair attempted on non-approved proposal (status=${proposal.status})`,
          details: { status: proposal.status },
        });
        return null;
      }
      const executing = markExecuting(taskId);
      if (!executing) return null;
      try {
        const result = await executor.execute(executing);
        if (!result.ok) {
          markFailed(taskId, result.detail);
          return getProposal(taskId);
        }
        const completed = markCompleted(taskId, result.performance);
        // Detect performance regression and surface it; the pipeline pause
        // is left to the caller because it owns escalation policy.
        if (completed) {
          const impact = buildPerformanceImpact([completed]);
          if (impact[0]?.regressed) {
            emit({
              stage: 'monitor',
              kind: 'safeguard-tripped',
              proposalId: taskId,
              message: 'Performance regression detected after repair',
              details: { impact: impact[0] },
            });
          }
        }
        return completed;
      } catch (err) {
        markFailed(taskId, err instanceof Error ? err.message : String(err));
        return getProposal(taskId);
      }
    },

    async rollback(taskId: string): Promise<ProposedTask | null> {
      const proposal = getProposal(taskId);
      if (!proposal) return null;
      const result = await executor.rollback(proposal);
      if (!result.ok) {
        emit({
          stage: 'repair',
          kind: 'proposal-failed',
          proposalId: taskId,
          message: `Rollback failed: ${result.detail}`,
        });
        return getProposal(taskId);
      }
      return markRolledBack(taskId, result.detail);
    },
  };
}
