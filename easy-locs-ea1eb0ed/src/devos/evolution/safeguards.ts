import type { ProposedTask, RejectionReason } from './types';
import { getEvolutionConfig } from './config';
import { countActive, getEntry } from './registry';

export interface SafeguardOk {
  ok: true;
}
export interface SafeguardFail {
  ok: false;
  reason: RejectionReason;
  detail: string;
}
export type SafeguardResult = SafeguardOk | SafeguardFail;

export function checkPipelineDepth(task: Pick<ProposedTask, 'pipelineDepth'>): SafeguardResult {
  const cfg = getEvolutionConfig();
  if (task.pipelineDepth > cfg.MAX_PIPELINE_DEPTH) {
    return {
      ok: false,
      reason: 'pipeline-depth-exceeded',
      detail: `pipelineDepth=${task.pipelineDepth} exceeds MAX_PIPELINE_DEPTH=${cfg.MAX_PIPELINE_DEPTH}`,
    };
  }
  return { ok: true };
}

export function checkRecursiveSpawn(task: Pick<ProposedTask, 'parentProposalId' | 'id'>): SafeguardResult {
  if (!task.parentProposalId) return { ok: true };
  const parent = getEntry(task.parentProposalId);
  if (!parent) return { ok: true };
  // A repair-executed proposal cannot itself produce a child proposal that
  // refers back to any ancestor in its lineage.
  if (parent.lineage.includes(task.id)) {
    return {
      ok: false,
      reason: 'recursive-spawn',
      detail: `Task ${task.id} appears in its own ancestor lineage via ${task.parentProposalId}`,
    };
  }
  // Also forbid execution-triggered re-planning chains beyond depth.
  if (parent.lineage.length + 1 > getEvolutionConfig().MAX_PIPELINE_DEPTH) {
    return {
      ok: false,
      reason: 'recursive-spawn',
      detail: `Lineage depth ${parent.lineage.length + 1} exceeds MAX_PIPELINE_DEPTH`,
    };
  }
  return { ok: true };
}

export function checkConcurrencyLimit(): SafeguardResult {
  const cfg = getEvolutionConfig();
  const active = countActive();
  if (active >= cfg.MAX_CONCURRENT_TASKS) {
    return {
      ok: false,
      reason: 'concurrent-limit-exceeded',
      detail: `${active} active tasks; cap is ${cfg.MAX_CONCURRENT_TASKS}`,
    };
  }
  return { ok: true };
}

export interface LoopGuard {
  iterations: number;
  bump: () => SafeguardResult;
  reset: () => void;
}

export function makeLoopGuard(): LoopGuard {
  let iterations = 0;
  return {
    get iterations() {
      return iterations;
    },
    bump() {
      iterations += 1;
      const cap = getEvolutionConfig().MAX_ITERATIONS_PER_CYCLE;
      if (iterations > cap) {
        return {
          ok: false,
          reason: 'loop-cap-exceeded',
          detail: `iterations=${iterations} exceeds MAX_ITERATIONS_PER_CYCLE=${cap}`,
        };
      }
      return { ok: true };
    },
    reset() {
      iterations = 0;
    },
  };
}

export function runAllProposalSafeguards(task: ProposedTask): SafeguardResult {
  const checks = [
    checkPipelineDepth(task),
    checkRecursiveSpawn(task),
    checkConcurrencyLimit(),
  ];
  for (const r of checks) {
    if (!r.ok) return r;
  }
  return { ok: true };
}
