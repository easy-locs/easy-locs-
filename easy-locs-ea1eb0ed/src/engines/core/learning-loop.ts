import { platformBus } from "@/lib/shared/platform-bus";
import { sendRepairToOmega, getAgentMessageLog } from "@/core/protocols/agent-protocol";

export interface RepairOutcome {
  issueId: string;
  correlationId: string;
  outcome: "success" | "partial" | "failed";
  attemptNumber: number;
  engineId: string;
  durationMs: number;
  patchDescription?: string;
}

export interface Invariant {
  id: string;
  domain: string;
  description: string;
  check: () => boolean;
  severity: "critical" | "high" | "medium";
}

const _invariants: Invariant[] = [];
const _repairHistory: RepairOutcome[] = [];
const MAX_HISTORY = 200;

export function registerInvariant(inv: Invariant): void {
  if (_invariants.some((i) => i.id === inv.id)) return;
  _invariants.push(inv);
}

export function getRegisteredInvariants(): readonly Invariant[] {
  return _invariants;
}

export function checkAllInvariants(): { passed: string[]; failed: string[] } {
  const passed: string[] = [];
  const failed: string[] = [];
  for (const inv of _invariants) {
    try {
      if (inv.check()) passed.push(inv.id);
      else failed.push(inv.id);
    } catch {
      failed.push(inv.id);
    }
  }
  return { passed, failed };
}

export function recordRepairOutcome(outcome: RepairOutcome): void {
  _repairHistory.push(outcome);
  if (_repairHistory.length > MAX_HISTORY) _repairHistory.shift();

  sendRepairToOmega({
    correlationId: outcome.correlationId,
    issueId: outcome.issueId,
    outcome: outcome.outcome,
    attemptNumber: outcome.attemptNumber,
    durationMs: outcome.durationMs,
    sideEffects: [],
    metadata: {
      engineId: outcome.engineId,
      patchDescription: outcome.patchDescription ?? "none",
    },
  });

  platformBus.emit("engine:repair_outcome", outcome, "learning-loop");
}

export function getRepairHistory(): readonly RepairOutcome[] {
  return _repairHistory;
}

export function getRepairSuccessRate(): number {
  if (_repairHistory.length === 0) return 1;
  const successes = _repairHistory.filter((r) => r.outcome === "success").length;
  return successes / _repairHistory.length;
}

export function installLearningLoop(): () => void {
  const unsubs: (() => void)[] = [];

  unsubs.push(
    platformBus.on("agent:repair_to_omega", (event) => {
      const msg = event.payload as Record<string, unknown>;
      const meta = (msg.metadata ?? {}) as Record<string, unknown>;
      const outcome: RepairOutcome = {
        issueId: (msg.issueId as string) ?? "unknown",
        correlationId: (msg.correlationId as string) ?? event.correlationId ?? "unknown",
        outcome: (msg.outcome as RepairOutcome["outcome"]) ?? "failed",
        attemptNumber: (msg.attemptNumber as number) ?? 1,
        engineId: (meta.engineId as string) ?? "unknown",
        durationMs: (msg.durationMs as number) ?? 0,
        patchDescription: (meta.patchDescription as string) ?? undefined,
      };
      _repairHistory.push(outcome);
      if (_repairHistory.length > MAX_HISTORY) _repairHistory.shift();
    })
  );

  const invariantCheckInterval = setInterval(() => {
    if ((globalThis as any).__E2E_RUNNING__) return;
    const { failed } = checkAllInvariants();
    if (failed.length > 0) {
      platformBus.emit("engine:invariants_violated", { failed, timestamp: Date.now() }, "learning-loop");
    }
  }, 30_000);

  return () => {
    unsubs.forEach((fn) => fn());
    clearInterval(invariantCheckInterval);
  };
}
