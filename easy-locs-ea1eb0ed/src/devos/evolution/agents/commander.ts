import type { ProposedTask, RejectionReason } from '../types';
import { registerProposal } from '../registry';
import { runAllProposalSafeguards } from '../safeguards';
import { recordSuggested, reject, approve } from '../approval';
import { emit } from '../monitoring';
import { getEvolutionConfig } from '../config';

export interface CommanderValidationResult {
  ok: boolean;
  proposal: ProposedTask;
  rejectionReason?: RejectionReason;
  rejectionDetail?: string;
}

/**
 * Commander — validates proposals against policy, limits and the registry.
 * It does NOT execute anything. It can auto-approve only proposals where
 * `requiresHumanApproval === false` AND every safeguard passes AND we are
 * not in Level D mode (which is locked off).
 */
export const commander = {
  validateAndQueue(proposal: ProposedTask): CommanderValidationResult {
    // 1. Registry: unique id, content hash, ban list, lineage capture.
    const reg = registerProposal({
      id: proposal.id,
      contentHash: proposal.contentHash,
      parentProposalId: proposal.parentProposalId,
    });
    if (!reg.ok) {
      const detail = reg.detail;
      const reason = reg.reason;
      emit({
        stage: 'safeguard',
        kind: 'safeguard-tripped',
        proposalId: proposal.id,
        message: `Registry rejected proposal: ${reason}`,
        details: { reason, detail },
      });
      // Surface as a rejected suggestion so monitoring sees it.
      const recorded = recordSuggested({ ...proposal });
      reject(recorded.id, reason, detail);
      return { ok: false, proposal: recorded, rejectionReason: reason, rejectionDetail: detail };
    }

    // 2. Record suggestion (this is the chokepoint entry).
    const suggested = recordSuggested(proposal);

    // 3. Safeguards (depth, recursion, concurrency).
    const safe = runAllProposalSafeguards(suggested);
    if (!safe.ok) {
      emit({
        stage: 'safeguard',
        kind: 'safeguard-tripped',
        proposalId: suggested.id,
        message: `Safeguard rejected: ${safe.reason}`,
        details: { reason: safe.reason, detail: safe.detail },
      });
      reject(suggested.id, safe.reason, safe.detail);
      return { ok: false, proposal: suggested, rejectionReason: safe.reason, rejectionDetail: safe.detail };
    }

    // 4. If commander auto-approval is allowed, do it. Otherwise leave it
    //    in `suggested` for human review.
    if (!suggested.requiresHumanApproval) {
      const cfg = getEvolutionConfig();
      if (cfg.LEVEL_D_ENABLED) {
        const r = approve(suggested.id, { kind: 'commander', id: 'commander/auto' });
        if (!r.ok) {
          return { ok: false, proposal: suggested, rejectionReason: r.reason, rejectionDetail: r.detail };
        }
        return { ok: true, proposal: r.proposal };
      }
      // Level C: even commander-eligible proposals stay suggested. The
      // chokepoint requires explicit external approval.
    }

    return { ok: true, proposal: suggested };
  },
};
