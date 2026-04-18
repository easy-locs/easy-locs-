import type { AuditFinding, ProposedTask } from '../types';
import { makeContentHash, makeProposalId } from '../registry';

export interface PlanInput {
  finding: AuditFinding;
  files: string[];
  rollbackPlan: string;
  risks?: string[];
  /** Carries pipeline depth from the cycle that triggered this planning. */
  pipelineDepth?: number;
  /** If this proposal originated from the result of executing another. */
  parentProposalId?: string | null;
  /** Default true: humans must approve unless commander rules say otherwise. */
  requiresHumanApproval?: boolean;
}

/**
 * PlannerAgent — turns findings into proposed task specs. Stateless.
 * It does not register, persist, or execute anything; that is the
 * commander/approval layer's responsibility.
 */
export const plannerAgent = {
  plan(input: PlanInput): ProposedTask {
    const intent = `Repair: ${input.finding.message}`;
    const now = new Date().toISOString();
    const id = makeProposalId();
    const contentHash = makeContentHash({
      intent,
      domain: input.finding.domain,
      files: input.files,
    });
    return {
      id,
      parentFindingId: input.finding.id,
      parentProposalId: input.parentProposalId ?? null,
      contentHash,
      intent,
      domain: input.finding.domain,
      files: input.files,
      risks: input.risks ?? [],
      rollbackPlan: input.rollbackPlan,
      requiresHumanApproval: input.requiresHumanApproval ?? true,
      pipelineDepth: input.pipelineDepth ?? 1,
      status: 'suggested',
      createdAt: now,
      updatedAt: now,
    };
  },
};
