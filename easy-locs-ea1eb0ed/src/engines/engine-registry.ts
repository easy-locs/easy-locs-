import { engineOrchestrator } from "./core/engine-orchestrator";
import { registerAllActivationSheets, getAllSheetEngineIds } from "./core/domain-activation-sheets";
import { installRepairBridge, getRepairBridgeReport } from "./core/repair-bridge";
import { installUiRepairBridge, getUiRepairBridgeReport } from "./core/ui-repair-bridge";
import { getProofsByDomain, getProofStats } from "./core/proof-system";
import { enablePipeline, getPipelineReport } from "./core/repair-pipeline";
import { sentinelEngineRegistry } from "@/core/sentinel/registry/module-tracker";
import type { BaseEngine } from "./core/base-engine";
import type { UnifiedEngineReport } from "@/lib/engines/unified-global-engine";

let _latestUnifiedReport: UnifiedEngineReport | null = null;

import { RepairEngine } from "./consolidated/repair-engine";
import { LearningEngine } from "./consolidated/learning-engine";
import { TaxonomyEngine } from "./consolidated/taxonomy-engine";
import { UICorrectionEngine } from "./consolidated/ui-correction-engine";
import { ConsolidatedFlowIntegrityEngine } from "./consolidated/flow-integrity-engine";
import { FraudDetectionEngine } from "./consolidated/fraud-detection-engine";
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

const CONSOLIDATED_ENGINE_IDS = [
  "repair-engine",
  "learning-engine",
  "taxonomy-engine",
  "ui-correction-engine",
  "flow-integrity-engine",
  "fraud-detection-engine",
] as const;

export function registerAllEngines(): void {
  if (registered) return;
  registered = true;

  const engines = [
    new RepairEngine(),
    new LearningEngine(),
    new TaxonomyEngine(),
    new UICorrectionEngine(),
    new ConsolidatedFlowIntegrityEngine(),
    new FraudDetectionEngine(),
  ];

  const actualIds = engines.map(e => e.id);
  const expectedSet = new Set<string>(CONSOLIDATED_ENGINE_IDS);
  const unexpected = actualIds.filter(id => !expectedSet.has(id));
  const missing = [...expectedSet].filter(id => !actualIds.includes(id));
  if (unexpected.length > 0 || missing.length > 0) {
    console.error(`[engine-boot] ASSERTION FAILED: Expected exactly ${CONSOLIDATED_ENGINE_IDS.length} consolidated engines.`,
      unexpected.length > 0 ? `Unexpected: ${unexpected.join(", ")}` : "",
      missing.length > 0 ? `Missing: ${missing.join(", ")}` : "");
  }

  engineOrchestrator.registerAll(engines);
  engines.forEach(bridgeEngineToSentinel);

  if (import.meta.env.DEV) {
    console.log(`[engine-boot] ${engines.length} consolidated engines registered: ${actualIds.join(", ")}`);
  }
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

  let teardownLearning: (() => void) | null = null;
  let teardownE2EWire: (() => void) | null = null;
  let teardownProtocol: (() => void) | null = null;
  let teardownWiringVerification: (() => void) | null = null;

  Promise.all([
    import("./core/learning-loop"),
    import("./core/runtime-qa-scenarios"),
    import("./core/e2e-auto-repair-wire"),
    import("@/core/protocols/agent-protocol"),
    import("./core/wiring-verifier"),
  ]).then(([learningMod, qaMod, e2eWireMod, protocolMod, wiringMod]) => {
    teardownLearning = learningMod.installLearningLoop();
    qaMod.registerCoreScenarios();
    teardownE2EWire = e2eWireMod.installE2EAutoRepairWire();
    teardownProtocol = protocolMod.installAgentProtocolListeners();
    teardownWiringVerification = wiringMod.installContinuousWiringVerification();
    console.log("[engine-boot] Learning loop, QA scenarios, protocol listeners, E2E wire, and wiring verifier installed");
  }).catch((e) => {
    console.warn("[engine-boot] Failed to install auxiliary modules:", e);
  });

  engineOrchestrator.registerStartupTask("data-services-init", () => {
    let forexTeardown: (() => void) | null = null;
    let prayerTeardown: (() => void) | null = null;
    let newsTeardown: (() => void) | null = null;
    let weatherTeardown: (() => void) | null = null;
    let healthTeardown: (() => void) | null = null;
    let cancelled = false;

    const startWithRetry = (
      name: string,
      loader: () => Promise<() => void>,
      assignTeardown: (fn: () => void) => void,
      maxAttempts = 3,
    ) => {
      let attempt = 0;
      const tryStart = () => {
        attempt++;
        loader().then(teardown => {
          if (cancelled) { teardown(); return; }
          assignTeardown(teardown);
          console.log(`[data-services] ${name} started successfully`);
        }).catch(err => {
          console.warn(`[data-services] ${name} failed (attempt ${attempt}/${maxAttempts}):`, err);
          if (!cancelled && attempt < maxAttempts) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
            setTimeout(tryStart, delay);
          }
        });
      };
      tryStart();
    };

    startWithRetry("forex", () =>
      import("@/services/data/forex-data-service").then(m => m.startForexService()),
      fn => { forexTeardown = fn; },
    );
    startWithRetry("prayer", () =>
      import("@/services/data/prayer-data-service").then(m => m.startPrayerService()),
      fn => { prayerTeardown = fn; },
    );
    startWithRetry("news", () =>
      import("@/services/data/news-data-service").then(m => m.startNewsService()),
      fn => { newsTeardown = fn; },
    );
    startWithRetry("weather", () =>
      import("@/services/data/weather-data-service").then(m => m.startWeatherService()),
      fn => { weatherTeardown = fn; },
    );

    import("@/services/data/islamic-events-service").then(({ getIslamicEventDates }) =>
      getIslamicEventDates().then(events => {
        if (cancelled || events.length === 0) return;
        const find = (id: string) => events.find(e => e.id === id);
        const ramadan = find("ramadan");
        const eidFitr = find("eid_fitr");
        const eidAdha = find("eid_adha");
        if (ramadan && eidFitr && eidAdha) {
          import("@/lib/context/global-context-engine").then(({ setDynamicIslamicEvents }) => {
            setDynamicIslamicEvents({
              ramadanStart: ramadan.gregorianStart,
              ramadanEnd: ramadan.gregorianEnd,
              eidFitrStart: eidFitr.gregorianStart,
              eidFitrEnd: eidFitr.gregorianEnd,
              eidAdhaStart: eidAdha.gregorianStart,
              eidAdhaEnd: eidAdha.gregorianEnd,
            });
          });
        }
      })
    ).catch(() => {});

    import("@/services/data/data-health-monitor").then(({ startHealthMonitor, registerHealthTarget }) => {
      if (cancelled) return;

      import("@/services/data/forex-data-service").then(({ getForexServiceCache, stopForexService, startForexService }) => {
        registerHealthTarget({
          name: "forex",
          expectedIntervalMs: 60_000,
          getLastUpdate: () => getForexServiceCache()?.fetchedAt ?? null,
          restart: () => {
            console.log("[health-monitor] Restarting forex service");
            stopForexService();
            const teardown = startForexService();
            forexTeardown = teardown;
          },
        });
      }).catch(err => console.warn("[health-monitor] forex registration failed", err));

      import("@/services/data/prayer-data-service").then(({ getPrayerServiceCache, stopPrayerService, startPrayerService }) => {
        registerHealthTarget({
          name: "prayer",
          expectedIntervalMs: 120_000,
          getLastUpdate: () => getPrayerServiceCache()?.fetchedAt ?? null,
          restart: () => {
            console.log("[health-monitor] Restarting prayer service");
            stopPrayerService();
            const teardown = startPrayerService();
            prayerTeardown = teardown;
          },
        });
      }).catch(err => console.warn("[health-monitor] prayer registration failed", err));

      import("@/services/data/news-data-service").then(({ getNewsServiceCache, stopNewsService, startNewsService }) => {
        registerHealthTarget({
          name: "news",
          expectedIntervalMs: 300_000,
          getLastUpdate: () => getNewsServiceCache()?.fetchedAt ?? null,
          restart: () => {
            console.log("[health-monitor] Restarting news service");
            stopNewsService();
            const teardown = startNewsService();
            newsTeardown = teardown;
          },
        });
      }).catch(err => console.warn("[health-monitor] news registration failed", err));

      import("@/services/data/weather-data-service").then(({ getWeatherServiceCache, stopWeatherService, startWeatherService }) => {
        registerHealthTarget({
          name: "weather",
          expectedIntervalMs: 120_000,
          getLastUpdate: () => getWeatherServiceCache()?.fetchedAt ?? null,
          restart: () => {
            console.log("[health-monitor] Restarting weather service");
            stopWeatherService();
            const teardown = startWeatherService();
            weatherTeardown = teardown;
          },
        });
      }).catch(err => console.warn("[health-monitor] weather registration failed", err));

      healthTeardown = startHealthMonitor();
    }).catch(err => console.warn("[data-services] health-monitor failed to start:", err));

    return () => {
      cancelled = true;
      if (forexTeardown) forexTeardown();
      if (prayerTeardown) prayerTeardown();
      if (newsTeardown) newsTeardown();
      if (weatherTeardown) weatherTeardown();
      if (healthTeardown) healthTeardown();
    };
  });

  const retryAsync = (
    name: string,
    fn: () => Promise<void>,
    cancelled: () => boolean,
    maxAttempts = 3,
    attempt = 1,
  ): void => {
    fn().catch(err => {
      console.warn(`[engine-boot] ${name} failed (attempt ${attempt}/${maxAttempts}):`, err);
      if (!cancelled() && attempt < maxAttempts) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        setTimeout(() => retryAsync(name, fn, cancelled, maxAttempts, attempt + 1), delay);
      }
    });
  };

  engineOrchestrator.registerStartupTask("flow-registry-init", () => {
    let cancelled = false;
    retryAsync("flow-registry-init", () =>
      import("@/lib/runtime/flow-completeness-validator").then(({ initCoreFlowRegistry }) => {
        if (!cancelled) initCoreFlowRegistry();
      }),
      () => cancelled,
    );
    return () => { cancelled = true; };
  });

  engineOrchestrator.registerStartupTask("property-automation-init", () => {
    let cancelled = false;
    retryAsync("property-automation-init", () =>
      import("@/lib/engines/property-automation-engine").then(({ initPropertyAutomation }) => {
        if (!cancelled) initPropertyAutomation();
      }),
      () => cancelled,
    );
    return () => { cancelled = true; };
  });

  engineOrchestrator.registerStartupTask("real-estate-engines-init", () => {
    let cancelled = false;
    let teardown: (() => void) | null = null;
    retryAsync("real-estate-engines-init", () =>
      import("@/lib/engines/real-estate-engine-registry").then(({ initRealEstateEngines }) => {
        if (cancelled) return;
        teardown = initRealEstateEngines();
        if (cancelled && teardown) { teardown(); teardown = null; }
      }),
      () => cancelled,
    );
    return () => {
      cancelled = true;
      if (teardown) { teardown(); teardown = null; }
    };
  });

  engineOrchestrator.registerStartupTask("sentinel-core-init", () => {
    let cancelled = false;
    let shutdown: (() => void) | null = null;
    retryAsync("sentinel-core-init", async () => {
      const { sentinelCore } = await import("@/core/sentinel");
      if (cancelled) return;
      await sentinelCore.boot();
      if (cancelled) { sentinelCore.shutdown(); return; }
      shutdown = () => sentinelCore.shutdown();
    }, () => cancelled);
    return () => { cancelled = true; if (shutdown) { shutdown(); shutdown = null; } };
  }, { phase: "late" });

  engineOrchestrator.registerStartupTask("platform-recovery-init", () => {
    let cancelled = false;
    retryAsync("platform-recovery-init", () =>
      import("@/lib/platform/platform-recovery-engine").then(({ runPlatformRecovery }) => {
        if (!cancelled) void runPlatformRecovery("boot");
      }),
      () => cancelled,
    );
    return () => { cancelled = true; };
  }, { phase: "late" });

  engineOrchestrator.registerStartupTask("wiring-verifier-boot", () => {
    let cancelled = false;
    retryAsync("wiring-verifier-boot", async () => {
      const { runWiringVerification } = await import("@/engines/core/wiring-verifier");
      if (!cancelled) await runWiringVerification();
    }, () => cancelled);
    return () => { cancelled = true; };
  }, { phase: "deferred" });

  engineOrchestrator.registerStartupTask("repair-hardening-boot", () => {
    const flags = getActiveFlags();
    if (flags["repair-hardening"] === false) return;
    let cancelled = false;
    retryAsync("repair-hardening-boot", () =>
      import("@/engines/core/repair-hardening").then(({ resetHardeningState }) => {
        if (!cancelled) resetHardeningState();
      }),
      () => cancelled,
    );
    return () => { cancelled = true; };
  }, { phase: "deferred" });

  engineOrchestrator.registerStartupTask("engine-learning-boot", () => {
    let teardown: (() => void) | null = null;
    let cancelled = false;
    retryAsync("engine-learning-boot", async () => {
      const { startLearningCycle } = await import("@/engines/core/engine-learning");
      if (cancelled) return;
      teardown = startLearningCycle();
      if (cancelled && teardown) { teardown(); teardown = null; }
    }, () => cancelled);
    return () => { cancelled = true; if (teardown) { teardown(); teardown = null; } };
  }, { phase: "deferred" });

  engineOrchestrator.registerStartupTask("module-link-engine-boot", () => {
    let cancelled = false;
    retryAsync("module-link-engine-boot", async () => {
      const { runModuleLinkEngine } = await import("@/lib/engines/module-link-engine");
      if (cancelled) return;
      const report = runModuleLinkEngine();
      if (import.meta.env.DEV) {
        console.log(`[module-link] Wiring validated: ${report.issues.length} issues, ${report.unwiredCategories.length} orphans`);
      }
    }, () => cancelled);
    return () => { cancelled = true; };
  }, { phase: "deferred" });

  engineOrchestrator.registerStartupTask("shop-cleanup-engine-boot", () => {
    let cancelled = false;
    retryAsync("shop-cleanup-engine-boot", async () => {
      const { runShopCleanupEngine } = await import("@/lib/engines/shop-cleanup-engine");
      if (cancelled) return;
      const result = await runShopCleanupEngine();
      if (import.meta.env.DEV) {
        console.log(`[shop-cleanup] Sweep: ${result.results.length} actions, ${result.autoFixed} auto-fixed`);
      }
    }, () => cancelled);
    return () => { cancelled = true; };
  }, { phase: "late" });

  engineOrchestrator.registerStartupTask("unified-global-engine-boot", () => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    retryAsync("unified-global-engine-boot", async () => {
      const { runUnifiedGlobalEngine } = await import("@/lib/engines/unified-global-engine");
      if (cancelled) return;
      const ctx = { country: null, city: null, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
      const run = () => { _latestUnifiedReport = runUnifiedGlobalEngine(ctx); };
      run();
      intervalId = setInterval(run, 300_000);
    }, () => cancelled);
    return () => { cancelled = true; if (intervalId) { clearInterval(intervalId); intervalId = null; } };
  }, { phase: "deferred" });

  engineOrchestrator.registerStartupTask("stale-cache-scanner-boot", () => {
    let teardown: (() => void) | null = null;
    let cancelled = false;
    retryAsync("stale-cache-scanner-boot", async () => {
      const { startStaleCacheScanner } = await import("@/lib/runtime/stale-cache-detector");
      if (cancelled) return;
      teardown = startStaleCacheScanner(60_000);
      if (cancelled && teardown) { teardown(); teardown = null; }
    }, () => cancelled);
    return () => { cancelled = true; if (teardown) { teardown(); teardown = null; } };
  }, { phase: "deferred" });

  engineOrchestrator.registerStartupTask("realtime-health-boot", () => {
    let teardown: (() => void) | null = null;
    let cancelled = false;
    retryAsync("realtime-health-boot", async () => {
      const { startRealtimeHealthCheck } = await import("@/lib/runtime/realtime-intelligence");
      if (cancelled) return;
      teardown = startRealtimeHealthCheck(30_000);
      if (cancelled && teardown) { teardown(); teardown = null; }
    }, () => cancelled);
    return () => { cancelled = true; if (teardown) { teardown(); teardown = null; } };
  }, { phase: "deferred" });

  engineOrchestrator.registerStartupTask("auto-repair-engine-boot", () => {
    let teardown: (() => void) | null = null;
    let cancelled = false;
    retryAsync("auto-repair-engine-boot", async () => {
      const { startAutoRepairEngine } = await import("@/lib/runtime/auto-repair-engine");
      if (cancelled) return;
      teardown = startAutoRepairEngine(45_000);
      if (cancelled && teardown) { teardown(); teardown = null; }
    }, () => cancelled);
    return () => { cancelled = true; if (teardown) { teardown(); teardown = null; } };
  }, { phase: "deferred" });

  engineOrchestrator.registerStartupTask("omega-core-boot", () => {
    let cancelled = false;
    let shutdown: (() => void) | null = null;
    retryAsync("omega-core-boot", async () => {
      const { omegaCore } = await import("@/core/omega");
      if (cancelled) return;
      await omegaCore.boot();
      if (cancelled) { omegaCore.shutdown(); return; }
      shutdown = () => omegaCore.shutdown();
    }, () => cancelled);
    return () => { cancelled = true; if (shutdown) { shutdown(); shutdown = null; } };
  }, { phase: "late" });

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
          const stripped = s.id.replace(/^sh-/, "").replace(/-orch$/, "").replace(/-engine$/, "");
          registeredIds.add(stripped);
        }

        const phantomMetadata = [...metadataKeys].filter(k => !registeredIds.has(k));
        const missingMetadata = allStats
          .map(s => s.id)
          .filter(id => {
            const stripped = id.replace(/^sh-/, "").replace(/-orch$/, "").replace(/-engine$/, "");
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

  registerCanonicalResolutions().catch(err => console.warn("[engine-boot] canonical resolutions failed:", err));


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
    teardownWiringVerification?.();
    teardownProtocol?.();
    teardownE2EWire?.();
    teardownLearning?.();
    teardownUiBridge();
    teardownBridge();
    engineOrchestrator.stopAll();
  };
}
