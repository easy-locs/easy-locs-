import type { PatchRecord } from '../types';
import { architectureGuard } from '../builder/architecture-guard';
import { projectMemory } from '../memory/project-memory';
import { safePatchPipeline } from '../repair-center/safe-patch-pipeline';
import { proofRegistry } from '../observability/proof-registry';

export interface AITask {
  id: string;
  intent: string;
  affectedDomains: string[];
  affectedFiles: string[];
  contextLoaded: boolean;
  guardrailsChecked: boolean;
  patchPlan: PatchRecord | null;
  status: 'received' | 'analyzing' | 'planning' | 'validating' | 'ready' | 'applied' | 'failed' | 'rolled-back';
  createdAt: string;
}

let taskCounter = 0;

export function receiveTask(intent: string, files: string[]): AITask {
  const domains = new Set<string>();
  for (const file of files) {
    const owner = architectureGuard.getDomainOwner(file);
    if (owner) domains.add(owner);
  }

  return {
    id: `ai-task-${Date.now()}-${++taskCounter}`,
    intent,
    affectedDomains: Array.from(domains),
    affectedFiles: files,
    contextLoaded: false,
    guardrailsChecked: false,
    patchPlan: null,
    status: 'received',
    createdAt: new Date().toISOString(),
  };
}

export function loadContext(task: AITask): AITask {
  const rules = projectMemory.getRules();
  const domains = task.affectedDomains.map(d => projectMemory.getDomainByName(d)).filter(Boolean);

  proofRegistry.logProof({
    type: 'audit',
    summary: `Context loaded for AI task: ${task.intent}`,
    details: {
      taskId: task.id,
      rulesLoaded: rules.length,
      domainsLoaded: domains.length,
    },
    actor: 'ai-orchestrator',
  });

  return { ...task, contextLoaded: true, status: 'analyzing' };
}

export function checkGuardrails(task: AITask): { task: AITask; violations: string[] } {
  const violations: string[] = [];

  for (const file of task.affectedFiles) {
    if (architectureGuard.isSensitiveZone(file)) {
      violations.push(`Sensitive zone modification: ${file}`);
    }
  }

  if (task.affectedDomains.length > 3) {
    violations.push('Too many domains affected — reduce scope');
  }

  return {
    task: { ...task, guardrailsChecked: true, status: violations.length > 0 ? 'failed' : 'planning' },
    violations,
  };
}

export function planPatch(task: AITask): AITask {
  if (!task.contextLoaded || !task.guardrailsChecked) {
    return { ...task, status: 'failed' };
  }

  const patch = safePatchPipeline.createPatch({
    domain: task.affectedDomains[0] || 'unknown',
    description: task.intent,
    files: task.affectedFiles,
    risks: task.affectedDomains.length > 1
      ? ['Cross-domain modification']
      : [],
    rollbackPlan: `Revert changes to: ${task.affectedFiles.join(', ')}`,
  });

  return { ...task, patchPlan: patch, status: 'validating' };
}

export function executeTask(task: AITask): AITask {
  if (!task.patchPlan || task.status !== 'validating') {
    return { ...task, status: 'failed' };
  }

  const result = safePatchPipeline.applyPatch(task.patchPlan);

  if (result.status === 'applied') {
    return { ...task, patchPlan: result, status: 'applied' };
  }

  return { ...task, patchPlan: result, status: 'failed' };
}

export function processFullTask(intent: string, files: string[]): AITask {
  let task = receiveTask(intent, files);
  task = loadContext(task);

  const { task: checkedTask, violations } = checkGuardrails(task);
  if (violations.length > 0) {
    proofRegistry.logIncident({
      severity: 'medium',
      domain: 'ai-orchestrator',
      description: `Guardrail violations for "${intent}": ${violations.join(', ')}`,
    });
    return checkedTask;
  }

  task = planPatch(checkedTask);
  return executeTask(task);
}

export const aiOrchestrator = {
  receiveTask,
  loadContext,
  checkGuardrails,
  planPatch,
  executeTask,
  processFullTask,
};
