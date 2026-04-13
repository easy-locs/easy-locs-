import { engineOrchestrator } from "./core/engine-orchestrator";
import { registerAllActivationSheets, getAllSheetEngineIds } from "./core/domain-activation-sheets";
import { installRepairBridge, getRepairBridgeReport } from "./core/repair-bridge";
import { installUiRepairBridge, getUiRepairBridgeReport } from "./core/ui-repair-bridge";
import { getProofsByDomain, getProofStats } from "./core/proof-system";
import { enablePipeline, getPipelineReport } from "./core/repair-pipeline";

import { AutoFixEngine } from "./self-healing/auto-fix-engine";
import { AutoPublishOrchEngine } from "./lifecycle/auto-publish-orch-engine";
import { AutoUnpublishOrchEngine } from "./lifecycle/auto-unpublish-orch-engine";
import { DataTrustOrchEngine } from "./quality/data-trust-orch-engine";
import { DataCompletenessOrchEngine } from "./quality/data-completeness-orch-engine";
import { DataQualityOrchEngine } from "./quality/data-quality-orch-engine";
import { BackendConnectivityOrchEngine } from "./infra/backend-connectivity-orch-engine";
import { GroceryNormalizerOrchEngine } from "./normalizers/grocery-normalizer-orch-engine";
import { FoodMenuNormalizerOrchEngine } from "./normalizers/food-menu-normalizer-orch-engine";
import { ServiceCatalogNormalizerOrchEngine } from "./normalizers/service-catalog-normalizer-orch-engine";
import { MenuRebuildOrchEngine } from "./normalizers/menu-rebuild-orch-engine";
import { AdaptiveTaxonomyOrchEngine } from "./taxonomy/adaptive-taxonomy-orch-engine";
import { CategoryMappingOrchEngine } from "./taxonomy/category-mapping-orch-engine";
import { FullStackLinkageOrchEngine } from "./infra/full-stack-linkage-orch-engine";
import { PublishGateFoodOrchEngine } from "./gates/publish-gate-food-orch-engine";
import { PublishGateGroceryOrchEngine } from "./gates/publish-gate-grocery-orch-engine";
import { PublishGateServiceOrchEngine } from "./gates/publish-gate-service-orch-engine";
import { FlowIntegrityEngine } from "./governance/flow-integrity-engine";
import { GovernanceAuditEngine } from "./governance/governance-audit-engine";
import { registerCanonicalResolutions } from "@/lib/canonical-resolution-guard";

let registered = false;

export function registerAllEngines(): void {
  if (registered) return;
  registered = true;

  engineOrchestrator.registerAll([
    new AutoFixEngine(),
    new AutoPublishOrchEngine(),
    new AutoUnpublishOrchEngine(),
    new DataTrustOrchEngine(),
    new DataCompletenessOrchEngine(),
    new DataQualityOrchEngine(),
    new BackendConnectivityOrchEngine(),
    new GroceryNormalizerOrchEngine(),
    new FoodMenuNormalizerOrchEngine(),
    new ServiceCatalogNormalizerOrchEngine(),
    new MenuRebuildOrchEngine(),
    new AdaptiveTaxonomyOrchEngine(),
    new CategoryMappingOrchEngine(),
    new FullStackLinkageOrchEngine(),
    new PublishGateFoodOrchEngine(),
    new PublishGateGroceryOrchEngine(),
    new PublishGateServiceOrchEngine(),
    new FlowIntegrityEngine(),
    new GovernanceAuditEngine(),
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
  enablePipeline();
  const teardownBridge = installRepairBridge();
  const teardownUiBridge = installUiRepairBridge();
  registerAllEngines();

  engineOrchestrator.registerStartupTask("flow-registry-init", () => {
    let cancelled = false;
    import("@/lib/runtime/flow-completeness-validator").then(({ initCoreFlowRegistry }) => {
      if (!cancelled) initCoreFlowRegistry();
    }).catch(() => {});
    return () => { cancelled = true; };
  });

  engineOrchestrator.registerStartupTask("property-automation-init", () => {
    let cancelled = false;
    import("@/lib/engines/property-automation-engine").then(({ initPropertyAutomation }) => {
      if (!cancelled) initPropertyAutomation();
    }).catch(() => {});
    return () => { cancelled = true; };
  });

  engineOrchestrator.registerStartupTask("real-estate-engines-init", () => {
    let cancelled = false;
    let teardown: (() => void) | null = null;
    import("@/lib/engines/real-estate-engine-registry").then(({ initRealEstateEngines }) => {
      if (cancelled) return;
      teardown = initRealEstateEngines();
      if (cancelled && teardown) { teardown(); teardown = null; }
    }).catch(() => {});
    return () => {
      cancelled = true;
      if (teardown) { teardown(); teardown = null; }
    };
  });

  engineOrchestrator.registerStartupTask("god-core-init", () => {
    let cancelled = false;
    import("@/lib/god/god-core").then(({ godCore }) => {
      if (!cancelled) godCore.boot();
    }).catch(() => {});
    return () => { cancelled = true; };
  }, { phase: "late" });

  engineOrchestrator.registerStartupTask("sentinel-core-init", () => {
    let cancelled = false;
    let shutdown: (() => void) | null = null;
    import("@/core/sentinel").then(async ({ sentinelCore }) => {
      if (cancelled) return;
      await sentinelCore.boot();
      if (cancelled) { sentinelCore.shutdown(); return; }
      shutdown = () => sentinelCore.shutdown();
    }).catch(() => {});
    return () => { cancelled = true; if (shutdown) { shutdown(); shutdown = null; } };
  }, { phase: "late" });

  engineOrchestrator.registerStartupTask("omega-core-init", () => {
    let cancelled = false;
    let shutdown: (() => void) | null = null;
    import("@/core/omega").then(async ({ omegaCore }) => {
      if (cancelled) return;
      await omegaCore.boot();
      if (cancelled) { omegaCore.shutdown(); return; }
      shutdown = () => omegaCore.shutdown();
    }).catch(() => {});
    return () => { cancelled = true; if (shutdown) { shutdown(); shutdown = null; } };
  }, { phase: "late" });

  engineOrchestrator.registerStartupTask("platform-recovery-init", () => {
    let cancelled = false;
    import("@/lib/platform/platform-recovery-engine").then(({ runPlatformRecovery }) => {
      if (!cancelled) void runPlatformRecovery("boot");
    }).catch(() => {});
    return () => { cancelled = true; };
  }, { phase: "late" });

  engineOrchestrator.registerStartupTask("taxonomy-catchup-scan", () => {
    let cancelled = false;
    import("@/lib/data-quality/engines/taxonomy-integrity-engine").then(
      ({ TaxonomyIntegrityEngine }) => {
        if (cancelled) return;
        const engine = new TaxonomyIntegrityEngine();
        engine.scan("SAFE_AUTO");
      },
    ).catch(() => {});
    return () => { cancelled = true; };
  }, { phase: "deferred" });

  if (import.meta.env.DEV) {
    engineOrchestrator.registerStartupTask("activation-sheet-invariant", () => {
      const phantoms = getAllSheetEngineIds().filter(id => !engineOrchestrator.getEngine(id));
      if (phantoms.length > 0) {
        console.warn(
          "[engine-invariant] Activation sheets reference non-registered engine IDs — add them to registerAllEngines() or fix the sheet:",
          phantoms,
        );
      }
    });
  }

  engineOrchestrator.startAll();

  let disposed = false;

  registerCanonicalResolutions().catch(() => {});


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
    if (diagnosticTimer) clearTimeout(diagnosticTimer);
    teardownUiBridge();
    teardownBridge();
    engineOrchestrator.stopAll();
  };
}
