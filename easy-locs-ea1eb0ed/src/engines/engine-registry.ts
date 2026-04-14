import { engineOrchestrator } from "./core/engine-orchestrator";
import { registerAllActivationSheets, getAllSheetEngineIds } from "./core/domain-activation-sheets";
import { installRepairBridge, getRepairBridgeReport } from "./core/repair-bridge";
import { installUiRepairBridge, getUiRepairBridgeReport } from "./core/ui-repair-bridge";
import { getProofsByDomain, getProofStats } from "./core/proof-system";
import { enablePipeline, getPipelineReport } from "./core/repair-pipeline";
import { sentinelEngineRegistry } from "@/core/sentinel/registry/engine-registry";
import type { BaseEngine } from "./core/base-engine";
import type { UnifiedEngineReport } from "@/lib/engines/unified-global-engine";

let _latestUnifiedReport: UnifiedEngineReport | null = null;

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
import { MediaRelevanceEngine } from "./governance/media-relevance-engine";
import { TextIntegrityEngine } from "./governance/text-integrity-engine";
import { PageOpenEngine } from "./governance/page-open-engine";
import { TaxonomyRuntimeEngine } from "./data/taxonomy-runtime-engine";
import { UnreadIntegrityEngine } from "./realtime/unread-integrity-engine";
import { registerCanonicalResolutions } from "@/lib/canonical-resolution-guard";
import { getActiveFlags } from "@/lib/control-plane/feature-flags";

let registered = false;

function bridgeEngineToSentinel(engine: BaseEngine): void {
  sentinelEngineRegistry.register({
    engine_id: engine.id,
    engine_name: engine.name,
    engine_domain: engine.category,
    engine_type: "domain",
    owner_domain: engine.domain,
    criticality: "medium",
    enabled: true,
    heartbeat_interval_sec: Math.max(1, Math.round(engine.intervalMs / 1000)),
    last_heartbeat_at: 0,
    status: "healthy",
    version: "1.0.0",
    source_of_truth: "engine-registry",
    created_at: Date.now(),
    updated_at: Date.now(),
  });
}

export function registerAllEngines(): void {
  if (registered) return;
  registered = true;

  const engines = [
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
    new MediaRelevanceEngine(),
    new TextIntegrityEngine(),
    new PageOpenEngine(),
    new TaxonomyRuntimeEngine(),
    new UnreadIntegrityEngine(),
  ];

  engineOrchestrator.registerAll(engines);
  engines.forEach(bridgeEngineToSentinel);
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

  engineOrchestrator.registerStartupTask("platform-recovery-init", () => {
    let cancelled = false;
    import("@/lib/platform/platform-recovery-engine").then(({ runPlatformRecovery }) => {
      if (!cancelled) void runPlatformRecovery("boot");
    }).catch(() => {});
    return () => { cancelled = true; };
  }, { phase: "late" });

  engineOrchestrator.registerStartupTask("wiring-verifier-boot", () => {
    let cancelled = false;
    import("@/engines/core/wiring-verifier").then(({ runWiringVerification }) => {
      if (!cancelled) runWiringVerification().catch(() => {});
    }).catch(() => {});
    return () => { cancelled = true; };
  }, { phase: "deferred" });

  engineOrchestrator.registerStartupTask("repair-hardening-boot", () => {
    const flags = getActiveFlags();
    if (flags["repair-hardening"] === false) return;
    import("@/engines/core/repair-hardening").then(({ resetHardeningState }) => {
      resetHardeningState();
    }).catch(() => {});
  }, { phase: "deferred" });

  engineOrchestrator.registerStartupTask("engine-learning-boot", () => {
    let teardown: (() => void) | null = null;
    let cancelled = false;
    import("@/engines/core/engine-learning").then(({ startLearningCycle }) => {
      if (cancelled) return;
      teardown = startLearningCycle();
      if (cancelled && teardown) { teardown(); teardown = null; }
    }).catch(() => {});
    return () => { cancelled = true; if (teardown) { teardown(); teardown = null; } };
  }, { phase: "deferred" });

  engineOrchestrator.registerStartupTask("module-link-engine-boot", () => {
    let cancelled = false;
    import("@/lib/engines/module-link-engine").then(({ runModuleLinkEngine }) => {
      if (cancelled) return;
      const report = runModuleLinkEngine();
      if (import.meta.env.DEV) {
        console.log(`[module-link] Wiring validated: ${report.issues.length} issues, ${report.unwiredCategories.length} orphans`);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, { phase: "deferred" });

  engineOrchestrator.registerStartupTask("shop-cleanup-engine-boot", () => {
    let cancelled = false;
    import("@/lib/engines/shop-cleanup-engine").then(({ runShopCleanupEngine }) => {
      if (cancelled) return;
      runShopCleanupEngine().then(result => {
        if (import.meta.env.DEV) {
          console.log(`[shop-cleanup] Sweep: ${result.results.length} actions, ${result.autoFixed} auto-fixed`);
        }
      }).catch(() => {});
    }).catch(() => {});
    return () => { cancelled = true; };
  }, { phase: "late" });

  engineOrchestrator.registerStartupTask("unified-global-engine-boot", () => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    import("@/lib/engines/unified-global-engine").then(({ runUnifiedGlobalEngine }) => {
      if (cancelled) return;
      const ctx = { country: null, city: null, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
      const run = () => { _latestUnifiedReport = runUnifiedGlobalEngine(ctx); };
      run();
      intervalId = setInterval(run, 300_000);
    }).catch(() => {});
    return () => { cancelled = true; if (intervalId) { clearInterval(intervalId); intervalId = null; } };
  }, { phase: "deferred" });

  engineOrchestrator.registerStartupTask("autonomous-business-engine-boot", () => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    import("@/lib/engines/autonomous-business-engine").then(({ runAutonomousBusinessEngine }) => {
      if (cancelled) return;
      const run = () => { if (_latestUnifiedReport) runAutonomousBusinessEngine(_latestUnifiedReport); };
      setTimeout(run, 5_000);
      intervalId = setInterval(run, 600_000);
    }).catch(() => {});
    return () => { cancelled = true; if (intervalId) { clearInterval(intervalId); intervalId = null; } };
  }, { phase: "late" });

  engineOrchestrator.registerStartupTask("stale-cache-scanner-boot", () => {
    let teardown: (() => void) | null = null;
    let cancelled = false;
    import("@/lib/runtime/stale-cache-detector").then(({ startStaleCacheScanner }) => {
      if (cancelled) return;
      teardown = startStaleCacheScanner(60_000);
      if (cancelled && teardown) { teardown(); teardown = null; }
    }).catch(() => {});
    return () => { cancelled = true; if (teardown) { teardown(); teardown = null; } };
  }, { phase: "deferred" });

  engineOrchestrator.registerStartupTask("realtime-health-boot", () => {
    let teardown: (() => void) | null = null;
    let cancelled = false;
    import("@/lib/runtime/realtime-intelligence").then(({ startRealtimeHealthCheck }) => {
      if (cancelled) return;
      teardown = startRealtimeHealthCheck(30_000);
      if (cancelled && teardown) { teardown(); teardown = null; }
    }).catch(() => {});
    return () => { cancelled = true; if (teardown) { teardown(); teardown = null; } };
  }, { phase: "deferred" });

  engineOrchestrator.registerStartupTask("auto-repair-engine-boot", () => {
    let teardown: (() => void) | null = null;
    let cancelled = false;
    import("@/lib/runtime/auto-repair-engine").then(({ startAutoRepairEngine }) => {
      if (cancelled) return;
      teardown = startAutoRepairEngine(45_000);
      if (cancelled && teardown) { teardown(); teardown = null; }
    }).catch(() => {});
    return () => { cancelled = true; if (teardown) { teardown(); teardown = null; } };
  }, { phase: "deferred" });

  engineOrchestrator.registerStartupTask("omega-core-boot", () => {
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

    engineOrchestrator.registerStartupTask("metadata-registry-invariant", () => {
      import("@/lib/engines/engine-metadata-registry").then(({ ENGINE_METADATA }) => {
        const metadataKeys = new Set(Object.keys(ENGINE_METADATA));
        const allStats = engineOrchestrator.getAllStats();
        const registeredIds = new Set<string>();
        for (const s of allStats) {
          registeredIds.add(s.id);
          const stripped = s.id.replace(/^sh-/, "").replace(/-orch$/, "");
          registeredIds.add(stripped);
        }

        const phantomMetadata = [...metadataKeys].filter(k => !registeredIds.has(k));
        const missingMetadata = allStats
          .map(s => s.id)
          .filter(id => {
            const stripped = id.replace(/^sh-/, "").replace(/-orch$/, "");
            return !metadataKeys.has(id) && !metadataKeys.has(stripped);
          });

        if (phantomMetadata.length > 0) {
          console.warn(
            "[engine-invariant] ENGINE_METADATA has keys with no registered engine — remove them:",
            phantomMetadata,
          );
        }
        if (missingMetadata.length > 0) {
          console.warn(
            "[engine-invariant] Registered engines missing from ENGINE_METADATA — add entries:",
            missingMetadata,
          );
        }
        if (phantomMetadata.length === 0 && missingMetadata.length === 0) {
          console.log(
            `[engine-invariant] Registry ↔ Metadata aligned: ${metadataKeys.size} metadata entries, ${allStats.length} registered engines`,
          );
        }
      }).catch((err) => {
        console.warn("[engine-invariant] Failed to load metadata registry for invariant check:", err instanceof Error ? err.message : String(err));
      });
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
