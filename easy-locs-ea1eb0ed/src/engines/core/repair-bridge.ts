import { platformBus } from "@/lib/shared/platform-bus";
import { isPlatformFlagEnabled } from "@/lib/growth/feature-flag-registry";
import {
  executePipeline,
  enablePipeline,
  disablePipeline,
  type PipelineInput,
  type IssueCategory,
  type IssueSeverity,
} from "./repair-pipeline";
import type { RepairOperationType } from "./repair-actions";
import type { RepairLevel } from "./proof-system";
import { getProofsByDomain, getProofStats } from "./proof-system";

export interface TaxonomyConflictPayload {
  sweepId: string;
  entityId: string;
  source: string;
  issueCode: string;
  actualVertical: string;
  expectedVertical: string;
  severity: string;
  decisionTier: string;
  timestamp: number;
}

interface SweepBuffer {
  events: TaxonomyConflictPayload[];
  timer: ReturnType<typeof setTimeout>;
}

const DEBOUNCE_MS = 500;
const MAX_BUFFER_SIZE = 50;

const sweepBuffers = new Map<string, SweepBuffer>();
let pipelineRunning = false;
const pendingFlushQueue: string[] = [];
let unsubscribe: (() => void) | null = null;

function highestSeverity(events: TaxonomyConflictPayload[]): IssueSeverity {
  if (events.some(e => e.severity === "critical")) return "critical";
  if (events.some(e => e.severity === "high")) return "high";
  if (events.some(e => e.severity === "medium")) return "medium";
  return "low";
}

function buildRawSignal(sweepId: string, events: TaxonomyConflictPayload[]): string {
  const codeMap = new Map<string, number>();
  for (const e of events) {
    codeMap.set(e.issueCode, (codeMap.get(e.issueCode) ?? 0) + 1);
  }
  const codes = Array.from(codeMap.entries()).map(([k, v]) => `${k}×${v}`).join(", ");
  return `Taxonomy sweep ${sweepId}: ${events.length} conflicts (${codes})`;
}

async function flushBuffer(sweepId: string): Promise<void> {
  const buffer = sweepBuffers.get(sweepId);
  if (!buffer || buffer.events.length === 0) {
    sweepBuffers.delete(sweepId);
    return;
  }

  if (!isPlatformFlagEnabled("enable_repair_pipeline")) {
    sweepBuffers.delete(sweepId);
    return;
  }

  if (pipelineRunning) {
    if (!pendingFlushQueue.includes(sweepId)) {
      pendingFlushQueue.push(sweepId);
    }
    return;
  }

  const events = [...buffer.events];
  sweepBuffers.delete(sweepId);

  const input: PipelineInput = {
    engineId: "taxonomy-integrity",
    domain: "taxonomy",
    issueSignature: "taxonomy_violation:wrong_vertical",
    repairChainId: `taxonomy-sweep-${sweepId}`,
    category: "data" as IssueCategory,
    severity: highestSeverity(events),
    rawSignal: buildRawSignal(sweepId, events),
    suggestedOperation: "refresh" as RepairOperationType,
    suggestedTarget: "el-taxonomy-classifications",
    repairLevel: "L2" as RepairLevel,
  };

  pipelineRunning = true;

  try {
    enablePipeline();
    const result = await executePipeline(input);

    if (import.meta.env.DEV) {
      const proofs = getProofsByDomain("taxonomy");
      const stats = getProofStats();
      console.log(
        `[repair-bridge] Pipeline ${result.outcome}: proofId=${result.proofId} duration=${result.durationMs}ms rolledBack=${result.rolledBack} stageCount=${result.stageCount}`,
      );
      console.log(`[repair-bridge] Proof records: ${proofs.length} taxonomy proofs`, stats);
      if (proofs.length > 0) {
        const latest = proofs[proofs.length - 1];
        console.log(`[repair-bridge] Latest proof:`, {
          id: latest.id,
          outcome: latest.outcome,
          stages: latest.stages.map(s => `${s.stage}:${s.result}`).join(" → "),
          mutation: latest.mutation ? {
            beforeLen: latest.mutation.beforeState.length,
            afterLen: latest.mutation.afterState.length,
            changed: latest.mutation.beforeState !== latest.mutation.afterState,
          } : null,
          duration: latest.durationMs,
          rolledBack: latest.rolledBack,
        });
      }
      try {
        const diagPayload = JSON.stringify({
          ts: Date.now(),
          outcome: result.outcome,
          proofId: result.proofId,
          durationMs: result.durationMs,
          rolledBack: result.rolledBack,
          stageCount: result.stageCount,
          totalProofs: proofs.length,
          stats,
          proofs: proofs.map(p => ({
            id: p.id,
            outcome: p.outcome,
            durationMs: p.durationMs,
            rolledBack: p.rolledBack,
            domain: p.domain,
            engineId: p.engineId,
            repairLevel: p.repairLevel,
            stages: p.stages.map(s => ({ stage: s.stage, result: s.result })),
            quarantineTriggered: !!p.quarantineTriggered,
            safetyAbort: !!p.safetyAbort,
            mutationChanged: p.mutation ? p.mutation.beforeState !== p.mutation.afterState : null,
            mutationBeforeLen: p.mutation?.beforeState?.length ?? null,
            mutationAfterLen: p.mutation?.afterState?.length ?? null,
          })),
          bridge: getRepairBridgeReport(),
        });
        localStorage.setItem("__repair_diag", diagPayload);
        fetch("/__repair_diag_write", { method: "POST", body: diagPayload }).catch(() => {});
      } catch {}
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn("[repair-bridge] Pipeline execution error:", err);
      try {
        fetch("/__repair_diag_write", {
          method: "POST",
          body: JSON.stringify({ ts: Date.now(), error: String(err), bridge: getRepairBridgeReport() }),
        }).catch(() => {});
      } catch {}
    }
  } finally {
    disablePipeline();
    pipelineRunning = false;

    drainPendingQueue();
  }
}

function drainPendingQueue(): void {
  while (pendingFlushQueue.length > 0 && !pipelineRunning) {
    const nextSweepId = pendingFlushQueue.shift()!;
    if (sweepBuffers.has(nextSweepId)) {
      void flushBuffer(nextSweepId);
      return;
    }
  }
}

function handleTaxonomyConflict(event: { payload: TaxonomyConflictPayload }): void {
  const payload = event.payload;
  if (!payload?.sweepId) return;

  if (!isPlatformFlagEnabled("enable_repair_pipeline")) return;

  const sweepId = payload.sweepId;
  let buffer = sweepBuffers.get(sweepId);

  if (!buffer) {
    const timer = setTimeout(() => void flushBuffer(sweepId), DEBOUNCE_MS);
    buffer = { events: [], timer };
    sweepBuffers.set(sweepId, buffer);
  }

  buffer.events.push(payload);

  if (buffer.events.length >= MAX_BUFFER_SIZE) {
    clearTimeout(buffer.timer);
    void flushBuffer(sweepId);
  }
}

export function installRepairBridge(): () => void {
  if (!unsubscribe) {
    unsubscribe = platformBus.on("taxonomy:conflict_detected", handleTaxonomyConflict);
  }

  if (import.meta.env.DEV) {
    const flagOn = isPlatformFlagEnabled("enable_repair_pipeline");
    console.log(`[repair-bridge] Installed — listening (flag ${flagOn ? "on" : "off"}, checked per-event)`);
  }

  return () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    for (const [, buffer] of sweepBuffers) {
      clearTimeout(buffer.timer);
    }
    sweepBuffers.clear();
    pendingFlushQueue.length = 0;
  };
}

export function isRepairBridgeActive(): boolean {
  return unsubscribe !== null;
}

export function getRepairBridgeReport() {
  return {
    listening: unsubscribe !== null,
    flagEnabled: isPlatformFlagEnabled("enable_repair_pipeline"),
    pendingBuffers: sweepBuffers.size,
    pendingFlushQueue: pendingFlushQueue.length,
    pipelineRunning,
  };
}
