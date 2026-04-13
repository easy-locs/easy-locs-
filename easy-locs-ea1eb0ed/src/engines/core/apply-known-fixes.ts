import { engineMemory } from "./engine-memory";
import { engineObserver } from "./engine-observer";
import { platformBus } from "@/lib/shared/platform-bus";
import {
  executeRepairAction,
  type RepairOperationType,
} from "./repair-actions";
import { engineStormGuard } from "./engine-storm-guard";

export interface ApplyContext {
  engineId: string;
  domain: string;
  activeSignatures: string[];
}

export interface ApplyResult {
  applied: number;
  skipped: number;
  failed: number;
  fixes: string[];
}

export function applyKnownFixes(context: ApplyContext): ApplyResult {
  if (!engineMemory.isLoaded || context.activeSignatures.length === 0) {
    return { applied: 0, skipped: 0, failed: 0, fixes: [] };
  }

  let applied = 0;
  let skipped = 0;
  let failed = 0;
  const appliedSignatures: string[] = [];

  for (const sig of context.activeSignatures) {
    const fix = engineMemory.getKnownFix(sig);
    if (!fix || !fix.auto_apply || fix.disabled || fix.confidence < 0.5) {
      continue;
    }

    if (!engineStormGuard.canApplyCorrection(context.engineId, sig)) {
      skipped++;
      engineObserver.log(context.engineId, "storm-guard", "warn",
        `Storm guard blocked fix: ${sig}`);
      continue;
    }

    const execResult = executeFix(fix.fix_function, fix.fix_applied, fix.domain ?? context.domain);
    if (execResult) {
      applied++;
      appliedSignatures.push(sig);
      engineStormGuard.recordCorrection(context.engineId, sig);
      void engineMemory.recordApply(sig);
      engineObserver.log("engine-memory", "engine-memory", "debug",
        `Pre-applied known fix: ${sig} (score=${fix.score}, confidence=${fix.confidence})`);
    } else {
      failed++;
      void engineMemory.recordFailure(sig);
    }
  }

  if (applied > 0) {
    engineObserver.log("engine-memory", "engine-memory", "info",
      `Pre-applied ${applied} known fixes for ${context.domain}/${context.engineId}`);
  }

  return { applied, skipped, failed, fixes: appliedSignatures };
}

const FIX_FUNCTION_REGISTRY: Record<string, (domain: string) => boolean> = {};

export function registerFixFunction(id: string, fn: (domain: string) => boolean): void {
  FIX_FUNCTION_REGISTRY[id] = fn;
}

function executeFix(
  fixFunction: string | null,
  fixApplied: string | null,
  domain: string,
): boolean {
  if (fixFunction && FIX_FUNCTION_REGISTRY[fixFunction]) {
    try {
      return FIX_FUNCTION_REGISTRY[fixFunction](domain);
    } catch {
      return false;
    }
  }

  if (fixFunction) {
    const parts = (fixApplied ?? "").split(" on ");
    const operation = parts[0]?.trim() as RepairOperationType | undefined;
    const target = parts[1]?.trim();

    if (operation && target) {
      try {
        const result = executeRepairAction(operation, target, domain);
        return result.success;
      } catch {
        return false;
      }
    }
  }

  return false;
}

export function checkAntiRegression(
  issueSignature: string,
  engineId: string,
  domain: string,
): boolean {
  const knownFix = engineMemory.getKnownFix(issueSignature);

  if (!knownFix) return false;
  if (!knownFix.auto_apply || knownFix.disabled) return false;
  if (knownFix.confidence < 0.8) return false;

  void engineMemory.recordRecurrence(issueSignature);

  const reapplied = executeFix(knownFix.fix_function, knownFix.fix_applied, domain);

  platformBus.emit("engine:memory:regression", {
    issueSignature,
    engineId,
    domain,
    fixId: knownFix.id,
    confidence: knownFix.confidence,
    appliedCount: knownFix.applied_count,
    recurrenceCount: knownFix.recurrence_after_fix + 1,
    reapplied,
  }, "system");

  engineObserver.log("engine-memory", "engine-memory", "error",
    `ANTI-REGRESSION: Bug "${issueSignature}" re-detected despite known fix ` +
    `(confidence=${knownFix.confidence}, applied=${knownFix.applied_count}x, ` +
    `recurrence=${knownFix.recurrence_after_fix + 1}). ` +
    `Re-application ${reapplied ? "SUCCEEDED" : "FAILED"}.`);

  return true;
}
