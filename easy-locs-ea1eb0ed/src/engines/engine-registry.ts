import { engineOrchestrator } from "./core/engine-orchestrator";
import { registerAllActivationSheets } from "./core/domain-activation-sheets";
import { installRepairBridge, getRepairBridgeReport } from "./core/repair-bridge";
import { installUiRepairBridge, getUiRepairBridgeReport } from "./core/ui-repair-bridge";
import { getProofsByDomain, getProofStats } from "./core/proof-system";
import { getPipelineReport } from "./core/repair-pipeline";

import { AutoFixEngine } from "./self-healing/auto-fix-engine";

let registered = false;

export function registerAllEngines(): void {
  if (registered) return;
  registered = true;

  engineOrchestrator.registerAll([
    new AutoFixEngine(),
  ]);
}

export function bootEngineSystem(): () => void {
  if (typeof process !== "undefined" && process.env?.VITEST === "true") {
    return () => {};
  }
  if (import.meta.env.MODE === "test" && !import.meta.env.VITEST_ALLOW_ENGINES) {
    return () => {};
  }

  registerAllActivationSheets();
  const teardownBridge = installRepairBridge();
  const teardownUiBridge = installUiRepairBridge();
  registerAllEngines();
  engineOrchestrator.startAll();

  let disposed = false;

  const catchupTimer = setTimeout(() => {
    if (disposed) return;
    import("@/lib/data-quality/engines/taxonomy-integrity-engine").then(
      ({ TaxonomyIntegrityEngine }) => {
        if (disposed) return;
        const engine = new TaxonomyIntegrityEngine();
        engine.scan("SAFE_AUTO");
      },
    ).catch(() => {});
  }, 500);

  const diagnosticTimer = import.meta.env.DEV ? setTimeout(() => {
    if (disposed) return;
    const bridge = getRepairBridgeReport();
    const pipeline = getPipelineReport();
    const proofs = getProofsByDomain("taxonomy");
    const stats = getProofStats();
    let diag = `REPAIR: proofs=${proofs.length} runs=${pipeline.totalRuns} blocked=${pipeline.totalBlocked}`;
    if (proofs.length > 0) {
      const p = proofs[proofs.length - 1];
      const changed = p.mutation ? p.mutation.beforeState !== p.mutation.afterState : false;
      diag += ` | outcome=${p.outcome} dur=${p.durationMs}ms rb=${p.rolledBack} changed=${changed}`;
      diag += ` | stages=${p.stages.map(s => `${s.stage}:${s.result}`).join("→")}`;
    }
    const uiBridge = getUiRepairBridgeReport();
    diag += ` | bridge=${JSON.stringify(bridge)}`;
    diag += ` | uiBridge=${JSON.stringify(uiBridge)}`;
    console.warn(`[REPAIR-DIAGNOSTIC] ${diag}`);
    if (typeof window !== "undefined") {
      (window as any).__REPAIR_DIAG = { diag, stats, proofs: proofs.length, bridge, uiBridge, pipeline: { runs: pipeline.totalRuns, blocked: pipeline.totalBlocked } };
    }
  }, 5000) : null;

  return () => {
    disposed = true;
    clearTimeout(catchupTimer);
    if (diagnosticTimer) clearTimeout(diagnosticTimer);
    teardownUiBridge();
    teardownBridge();
    engineOrchestrator.stopAll();
  };
}
