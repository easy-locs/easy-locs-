/**
 * Bridge between the controlled self-evolution layer and the existing
 * DevOS audit/repair engines. This is the only place where the new
 * pipeline touches the legacy engines, so wiring is opt-in and reversible.
 */
import type { AuditResult, Violation, PatchRecord } from '../types';
import { auditEngine } from '../audit/audit-engine';
import { safePatchPipeline } from '../repair-center/safe-patch-pipeline';
import type { AuditScanInput } from './agents/audit-agent';
import type { ProposedTask } from './types';
import type { RepairExecutor } from './agents/repair-agent';
import { runEvolutionCycle, type CycleResult } from './pipeline';
import { subscribe, getEvents, getSummary, hydrateEvents, buildPerformanceImpact } from './monitoring';
import { listProposals, hydrateProposals } from './approval';
import { listEntries, hydrateRegistry } from './registry';
import { evolutionPersistence } from './persistence';
import { setEvolutionConfig } from './config';

const SEVERITY_MAP: Record<string, AuditScanInput['severity']> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
  info: 'info',
};

export function violationsToScanInput(audits: AuditResult[]): AuditScanInput[] {
  const inputs: AuditScanInput[] = [];
  for (const audit of audits) {
    for (const v of audit.violations) {
      inputs.push({
        domain: v.domain,
        severity: SEVERITY_MAP[v.severity] ?? 'info',
        message: v.message,
        location: v.location,
      });
    }
  }
  return inputs;
}

function planFromViolations(
  audits: AuditResult[],
): Map<string, { files: string[]; rollbackPlan: string; risks?: string[] }> {
  const map = new Map<string, { files: string[]; rollbackPlan: string; risks?: string[] }>();
  for (const audit of audits) {
    for (const v of audit.violations) {
      const files = [v.location];
      map.set(`${v.domain}::${v.message}::${v.location}`, {
        files,
        rollbackPlan: `Revert ${v.location} to last known good state`,
        risks: v.severity === 'critical' || v.severity === 'high' ? ['Touches critical violation'] : [],
      });
    }
  }
  return map;
}

/**
 * Run a full evolution cycle backed by the existing auditEngine. Findings
 * become proposals that sit in `suggested` until approved through the
 * chokepoint. Nothing executes here.
 */
export async function runEvolutionCycleFromAuditEngine(): Promise<CycleResult> {
  const audits = auditEngine.runFullAudit();
  const scan = violationsToScanInput(audits);
  const planMap = planFromViolations(audits);

  return runEvolutionCycle({
    scan,
    planFor: (finding) => {
      const key = `${finding.domain}::${finding.message}::${finding.location}`;
      const plan = planMap.get(key);
      if (!plan) return null;
      return {
        files: plan.files,
        rollbackPlan: plan.rollbackPlan,
        risks: plan.risks,
        pipelineDepth: 1,
        parentProposalId: null,
        requiresHumanApproval: true,
      };
    },
  });
}

/**
 * Build a RepairExecutor that runs approved proposals through the existing
 * safePatchPipeline. We do NOT invent new mutations; the underlying
 * pipeline is what the project already trusts.
 */
export function makeSafePatchExecutor(): RepairExecutor {
  const live = new Map<string, PatchRecord>();
  return {
    async execute(task: ProposedTask) {
      try {
        const patch = safePatchPipeline.createPatch({
          domain: task.domain,
          description: task.intent,
          files: task.files,
          risks: task.risks,
          rollbackPlan: task.rollbackPlan,
        });
        const result = safePatchPipeline.applyPatch(patch);
        live.set(task.id, result);
        if (result.status === 'applied') return { ok: true as const };
        return { ok: false as const, detail: `safePatchPipeline status=${result.status}` };
      } catch (err) {
        return { ok: false as const, detail: err instanceof Error ? err.message : String(err) };
      }
    },
    async rollback(task: ProposedTask) {
      try {
        const patch = live.get(task.id);
        if (!patch) {
          return { ok: false, detail: `No live patch tracked for ${task.id}` };
        }
        const r = safePatchPipeline.rollbackPatch(patch);
        return { ok: r.status === 'rolled-back', detail: `safePatchPipeline status=${r.status}` };
      } catch (err) {
        return { ok: false, detail: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}

/**
 * Wire monitoring/registry/proposals into localStorage so they survive
 * reloads. Idempotent: safe to call multiple times.
 */
let persistenceWired = false;
export function wireEvolutionPersistence(): void {
  if (persistenceWired) return;
  persistenceWired = true;

  // Hydrate in-memory stores from the last persisted snapshot so state
  // survives reloads. Each hydrate*() is additive and dedup-safe.
  try {
    const proposals = evolutionPersistence.loadProposals();
    const events = evolutionPersistence.loadEvents();
    const registry = evolutionPersistence.loadRegistry();
    const cfg = evolutionPersistence.loadConfigOverrides();
    if (proposals.length) hydrateProposals(proposals);
    if (events.length) hydrateEvents(events);
    if (registry.length) hydrateRegistry(registry);
    if (cfg && typeof cfg === 'object') {
      try { setEvolutionConfig(cfg as Parameters<typeof setEvolutionConfig>[0]); } catch { /* ignore bad overrides */ }
    }
  } catch {
    // hydration must never block boot
  }

  // Snapshot on every event (cheap; small payloads).
  subscribe(() => {
    try {
      evolutionPersistence.saveEvents(getEvents());
      evolutionPersistence.saveProposals(listProposals());
      evolutionPersistence.saveRegistry(listEntries());
    } catch {
      // never throw from monitoring path
    }
  });
}

export function getPerformanceImpactRows() {
  return buildPerformanceImpact(listProposals());
}

export function getEvolutionDashboardSnapshot() {
  return {
    summary: getSummary(),
    proposals: listProposals(),
    registry: listEntries(),
    events: getEvents().slice(-100),
  };
}

export function severitySnapshot(violations: Violation[]) {
  // Helper for UI counts; kept here to colocate bridge concerns.
  const out: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const v of violations) out[v.severity] = (out[v.severity] ?? 0) + 1;
  return out;
}
