import type { PatchRecord, PatchPhase, ProofRecord } from '../types';
import { architectureGuard } from '../builder/architecture-guard';
import { projectMemory } from '../memory/project-memory';

let patchCounter = 0;

function makePatchId(): string {
  return `patch-${Date.now()}-${++patchCounter}`;
}

export function createPatch(input: {
  domain: string;
  description: string;
  files: string[];
  risks: string[];
  rollbackPlan: string;
}): PatchRecord {
  return {
    id: makePatchId(),
    phase: 'detect',
    domain: input.domain,
    description: input.description,
    files: input.files,
    risks: input.risks,
    rollbackPlan: input.rollbackPlan,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };
}

export function advancePatch(patch: PatchRecord, targetPhase: PatchPhase): PatchRecord {
  const PHASE_ORDER: PatchPhase[] = [
    'detect', 'classify', 'localize', 'plan',
    'validate-preconditions', 'apply', 'verify',
    'regression-check', 'log-proof', 'accept',
  ];

  const currentIdx = PHASE_ORDER.indexOf(patch.phase);
  const targetIdx = PHASE_ORDER.indexOf(targetPhase);

  if (targetIdx <= currentIdx) {
    return { ...patch, phase: 'rollback', status: 'failed' };
  }

  return { ...patch, phase: targetPhase };
}

export function validatePreconditions(patch: PatchRecord): { valid: boolean; blockers: string[] } {
  const blockers: string[] = [];

  for (const file of patch.files) {
    const check = architectureGuard.validatePatchTarget(file);
    if (!check.allowed) {
      blockers.push(`File ${file} is not allowed for patching`);
    }
    if (check.requiresReview) {
      blockers.push(`File ${file} requires enhanced review: ${check.reason}`);
    }
  }

  if (patch.risks.length > 3) {
    blockers.push('Too many identified risks — reduce patch scope');
  }

  if (!patch.rollbackPlan || patch.rollbackPlan.length < 10) {
    blockers.push('Rollback plan is missing or insufficient');
  }

  return { valid: blockers.length === 0, blockers };
}

export function runFullPipeline(patch: PatchRecord): PatchRecord {
  const REQUIRED_PHASES: PatchPhase[] = [
    'detect', 'classify', 'localize', 'plan',
    'validate-preconditions', 'apply', 'verify',
    'regression-check', 'log-proof', 'accept',
  ];

  let current = patch;

  for (const phase of REQUIRED_PHASES) {
    if (phase === 'validate-preconditions') {
      const preconditions = validatePreconditions(current);
      if (!preconditions.valid) {
        return { ...current, phase: 'rollback', status: 'failed' };
      }
    }
    current = { ...current, phase };
  }

  const proof: ProofRecord = {
    id: `proof-${Date.now()}`,
    type: 'repair',
    summary: `Applied patch: ${current.description}`,
    details: {
      patchId: current.id,
      domain: current.domain,
      files: current.files,
      risks: current.risks,
      phasesCompleted: REQUIRED_PHASES,
    },
    timestamp: new Date().toISOString(),
    actor: 'devos-pipeline',
  };

  projectMemory.addProof({
    type: proof.type,
    summary: proof.summary,
    details: proof.details,
    actor: proof.actor,
  });

  return {
    ...current,
    phase: 'accept',
    status: 'applied',
    appliedAt: new Date().toISOString(),
    proof,
  };
}

export function applyPatch(patch: PatchRecord): PatchRecord {
  return runFullPipeline(patch);
}

export function rollbackPatch(patch: PatchRecord): PatchRecord {
  projectMemory.addIncident({
    severity: 'medium',
    domain: patch.domain,
    description: `Patch ${patch.id} rolled back: ${patch.description}`,
    resolution: patch.rollbackPlan,
  });

  return {
    ...patch,
    phase: 'rollback',
    status: 'rolled-back',
  };
}

export function getPipelineStatus(patch: PatchRecord): {
  currentPhase: PatchPhase;
  progress: number;
  canProceed: boolean;
} {
  const PHASES: PatchPhase[] = [
    'detect', 'classify', 'localize', 'plan',
    'validate-preconditions', 'apply', 'verify',
    'regression-check', 'log-proof', 'accept',
  ];
  const idx = PHASES.indexOf(patch.phase);
  return {
    currentPhase: patch.phase,
    progress: Math.round(((idx + 1) / PHASES.length) * 100),
    canProceed: patch.status !== 'failed' && patch.status !== 'rolled-back',
  };
}

export const safePatchPipeline = {
  createPatch,
  advancePatch,
  validatePreconditions,
  applyPatch,
  rollbackPatch,
  getPipelineStatus,
};
