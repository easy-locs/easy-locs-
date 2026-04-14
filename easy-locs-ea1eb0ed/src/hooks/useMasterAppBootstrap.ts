/**
 * useMasterAppBootstrap — Atomic staged app bootstrap.
 *
 * TASK 5 — Boot hardening:
 * Previously stage-0 ran at 50ms and stage-1 (platform reactions) ran at 1500ms,
 * leaving a 1450ms window where events could fire before any listener was installed.
 * Now stage-0 and stage-1 are merged into a single immediate step (50ms), so
 * platform reactions are registered atomically alongside the orchestration engine.
 * hookDisposed guards ensure no work is done after the hook unmounts.
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

let booted = false;

export function useMasterAppBootstrap() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (booted) return;
    booted = true;
    const bootStart = performance.now();
    console.log("[boot] master-bootstrap started");

    let hookDisposed = false;
    const cleanups: Array<() => void> = [];
    const timers: ReturnType<typeof setTimeout>[] = [];

    // ── Stage 0+1 (merged): orchestration + platform reactions — installed atomically ──
    // Reactions are co-installed with the orchestration engine to eliminate the race
    // window where events could fire with no listeners present.
    const t0 = setTimeout(async () => {
      const t = performance.now() - bootStart;
      console.log(`[boot] stage-0+1 orchestration + reactions (${t.toFixed(0)}ms)`);
      try {
        const [
          { installOrchestrationEngine },
          { installSmartFlowBridge },
          { installOrbitCacheListener, registerQueryClient },
          { registerWalletQueryClient },
          { registerDashboardQueryClient },
          { registerDeliveryQueryClient },
          { registerOrderQueryClient },
          { registerStorefrontQueryClient },
          { registerSupportQueryClient },
          { installPlatformReactions },
          { installStorefrontReactions },
          { installCrossAppReactions },
          { installEngineConnectorHub },
          { installNotificationEventBridge },
          { installCounterBridge },
          { installDeliveryBridge },
        ] = await Promise.all([
          import("@/lib/orchestration/orchestrator"),
          import("@/lib/runtime/smart-flow-bridge"),
          import("@/lib/orbit/orbit-cache-invalidator"),
          import("@/lib/wallet/wallet-cache-invalidator"),
          import("@/lib/dashboard/dashboard-cache-invalidator"),
          import("@/lib/delivery/delivery-cache-invalidator"),
          import("@/lib/orders/order-cache-invalidator"),
          import("@/lib/storefront/storefront-cache-invalidator"),
          import("@/lib/support/support-cache-invalidator"),
          import("@/lib/shared/platform-bus"),
          import("@/lib/shared/storefront-reactions"),
          import("@/lib/shared/cross-app-reactions"),
          import("@/lib/system/engineConnectorHub"),
          import("@/lib/notifications/notification-event-bridge"),
          import("@/lib/dashboard/dashboard-counter-bridge"),
          import("@/lib/shared/v4-delivery-bridge"),
        ]);

        if (hookDisposed) return;

        // Register query clients first so invalidators are ready
        registerQueryClient(queryClient);
        registerWalletQueryClient(queryClient);
        registerDashboardQueryClient(queryClient);
        registerDeliveryQueryClient(queryClient);
        registerOrderQueryClient(queryClient);
        registerStorefrontQueryClient(queryClient);
        registerSupportQueryClient(queryClient);

        // Start orchestration engine
        installOrchestrationEngine();

        // Install all platform reactions atomically — no gap between engine start and listeners
        installEngineConnectorHub();
        cleanups.push(
          installSmartFlowBridge(),
          installOrbitCacheListener(),
          installPlatformReactions(),
          installStorefrontReactions(),
          installCrossAppReactions(),
          installNotificationEventBridge(),
          installCounterBridge(),
          installDeliveryBridge(),
        );
      } catch (e) {
        console.warn("[boot] stage-0+1 failed", e);
      }
    }, 50);
    timers.push(t0);

    // ── Stage 2: domain cache listeners ──
    const t2 = setTimeout(async () => {
      if (hookDisposed) return;
      const t = performance.now() - bootStart;
      console.log(`[boot] stage-2 cache listeners (${t.toFixed(0)}ms)`);
      try {
        const [
          { installWalletCacheListener },
          { installDashboardCacheListener },
          { installDeliveryCacheListener },
          { installOrderCacheListener },
          { installStorefrontCacheListener },
          { installSupportCacheListener },
          { installRentalCacheListeners },
          { installSeasonalCacheListeners },
          { installDealCacheListeners },
          { installConciergeCacheListeners },
          { installGroupCacheListeners },
          { installRadarCacheListeners },
          { installCrossDomainPropagationHandlers },
        ] = await Promise.all([
          import("@/lib/wallet/wallet-cache-invalidator"),
          import("@/lib/dashboard/dashboard-cache-invalidator"),
          import("@/lib/delivery/delivery-cache-invalidator"),
          import("@/lib/orders/order-cache-invalidator"),
          import("@/lib/storefront/storefront-cache-invalidator"),
          import("@/lib/support/support-cache-invalidator"),
          import("@/lib/rental/rental-cache-invalidator"),
          import("@/lib/seasonal/seasonal-cache-invalidator"),
          import("@/lib/deals/deals-cache-invalidator"),
          import("@/lib/concierge/concierge-cache-invalidator"),
          import("@/lib/groups/groups-cache-invalidator"),
          import("@/lib/radar/radar-cache-invalidator"),
          import("@/lib/orchestration/handlers/cross-domain-propagation-handlers"),
        ]);

        if (hookDisposed) return;

        cleanups.push(
          installWalletCacheListener(),
          installDashboardCacheListener(),
          installDeliveryCacheListener(),
          installOrderCacheListener(),
          installStorefrontCacheListener(),
          installSupportCacheListener(),
          installRentalCacheListeners(),
          installSeasonalCacheListeners(),
          installDealCacheListeners(),
          installConciergeCacheListeners(),
          installGroupCacheListeners(),
          installRadarCacheListeners(),
          installCrossDomainPropagationHandlers(),
        );

        const { installRepairConsumers } = await import("@/lib/system/repair-consumers");
        if (!hookDisposed) cleanups.push(installRepairConsumers());
      } catch (e) {
        console.warn("[boot] stage-2 failed", e);
      }
    }, 1500);
    timers.push(t2);

    // ── Stage 3: core engines ──
    const t3 = setTimeout(async () => {
      if (hookDisposed) return;
      const t = performance.now() - bootStart;
      console.log(`[boot] stage-3 core engines (${t.toFixed(0)}ms)`);
      try {
        const [
          { initCoreFlowRegistry },
          { startStaleCacheScanner },
          { startAutoRepairEngine },
          { startRealtimeHealthCheck },
        ] = await Promise.all([
          import("@/lib/runtime/flow-completeness-validator"),
          import("@/lib/runtime/stale-cache-detector"),
          import("@/lib/runtime/auto-repair-engine"),
          import("@/lib/runtime/realtime-intelligence"),
        ]);

        if (hookDisposed) return;

        initCoreFlowRegistry();
        cleanups.push(
          startStaleCacheScanner(60_000),
          startAutoRepairEngine(45_000),
          startRealtimeHealthCheck(30_000),
        );

        // Auth-gated: property/real-estate engines only needed for authenticated users
        const { data: { session: s3 } } = await supabase.auth.getSession();
        if (s3 && !hookDisposed) {
          const [{ initPropertyAutomation }, { initRealEstateEngines }] = await Promise.all([
            import("@/lib/engines/property-automation-engine"),
            import("@/lib/engines/real-estate-engine-registry"),
          ]);
          initPropertyAutomation();
          initRealEstateEngines();
        }
      } catch (e) {
        console.warn("[boot] stage-3 failed", e);
      }
    }, 3000);
    timers.push(t3);

    // ── Stage 4: engine system ──
    const t4 = setTimeout(async () => {
      if (hookDisposed) return;
      const t = performance.now() - bootStart;
      console.log(`[boot] stage-4 engine system (${t.toFixed(0)}ms)`);
      try {
        const { bootEngineSystem } = await import("@/engines/engine-registry");
        const cleanup = bootEngineSystem();
        if (cleanup) cleanups.push(cleanup);
      } catch (e) {
        console.warn("[boot] stage-4 failed", e);
      }

      if (hookDisposed) return;

      try {
        const [
          { installDistributedTracing, startSpan, endSpan },
          { domainCircuitBreaker },
          { backpressureManager },
          { installFlowCycleDetector },
          { adaptiveStormGuard },
          { slaEngineManager },
          { enableStrictMode, validateAllCanonicalMachines, setTransitionTracer },
          { platformBus: bus, getActiveTraceId },
          { adaptiveRetry },
          { deadEventCleanup },
        ] = await Promise.all([
          import("@/lib/infrastructure/distributed-tracing"),
          import("@/lib/infrastructure/domain-circuit-breaker"),
          import("@/lib/infrastructure/backpressure-manager"),
          import("@/lib/infrastructure/flow-cycle-detector"),
          import("@/lib/infrastructure/adaptive-storm-guard"),
          import("@/lib/infrastructure/sla-engine-contracts"),
          import("@/lib/state-machines/canonical-machines"),
          import("@/lib/shared/platform-bus"),
          import("@/lib/infrastructure/adaptive-retry"),
          import("@/lib/infrastructure/dead-event-cleanup"),
        ]);

        if (hookDisposed) return;

        cleanups.push(installDistributedTracing());
        cleanups.push(domainCircuitBreaker.install());
        cleanups.push(backpressureManager.install());
        cleanups.push(installFlowCycleDetector());
        cleanups.push(adaptiveStormGuard.install());
        cleanups.push(slaEngineManager.start());
        cleanups.push(adaptiveRetry.install());
        cleanups.push(deadEventCleanup.install());
        enableStrictMode();

        cleanups.push(setTransitionTracer((from, event, to) => {
          const traceId = getActiveTraceId();
          if (!traceId) return;
          const span = startSpan(
            traceId,
            `sm:transition:${from}->${to ?? "REJECTED"}`,
            "state-machine",
            null,
            { from, event, to, rejected: to === null },
          );
          endSpan(span, to !== null ? "ok" : "error");
        }));

        const machineValidation = validateAllCanonicalMachines();
        const invalidMachines = machineValidation.filter((m) => !m.valid);
        if (invalidMachines.length > 0) {
          console.warn("[boot] State machine graph issues:", invalidMachines);
          bus.emit("system:machine_graph_issues", { machines: invalidMachines }, "system");
        }
        const cycledMachines = machineValidation.filter((m) => m.cycles.length > 0);
        if (cycledMachines.length > 0) {
          console.warn("[boot] State machine cycles detected:", cycledMachines.map((m) => m.machineName));
        }

        cleanups.push(bus.addInterceptor((type, payload, source) => {
          if (!domainCircuitBreaker.canDispatch(type, payload)) return "block";
          if (adaptiveStormGuard.isSuppressed(type)) return "block";
          const activeTrace = getActiveTraceId();
          const bpResult = backpressureManager.enqueue(type, payload, source, {
            traceId: activeTrace ?? undefined,
          });
          if (bpResult === "enqueued") return "enqueue";
          return "pass";
        }));

        cleanups.push(bus.setTimingReporter((type, durationMs, success) => {
          backpressureManager.recordListenerTiming(type, durationMs);
          const sep = type.includes(":") ? ":" : ".";
          const domain = type.split(sep)[0].toLowerCase();
          if (success) {
            domainCircuitBreaker.recordSuccess(domain);
          } else {
            domainCircuitBreaker.recordFailure(domain);
          }
        }));

        console.log("[boot] stage-4 infrastructure layer installed (tracing, circuit breaker, backpressure, cycle detector, storm guard, SLA)");
      } catch (e) {
        console.warn("[boot] stage-4 infrastructure failed", e);
      }

      if (hookDisposed) return;

      try {
        const { runBootIntegrityCheck } = await import("@/lib/infrastructure/boot-integrity-gate");
        const integrityResult = runBootIntegrityCheck();
        console.log(`[boot] Boot integrity: ${integrityResult.summary}`);
      } catch (e) {
        console.warn("[boot] boot-integrity-gate failed", e);
      }

      const { data: { session: s4 } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      if (!s4) {
        console.log("[boot] stage-4 auth-gated ops skipped — no authenticated user");
        return;
      }

      if (hookDisposed) return;

      try {
        const { engineMemory } = await import("@/engines/core/engine-memory");
        if (hookDisposed) return;
        await engineMemory.loadFromSupabase();

        if (hookDisposed) return;
        const { startLearningCycle } = await import("@/engines/core/engine-learning");
        cleanups.push(startLearningCycle());
      } catch (e) {
        console.warn("[boot] engine-memory failed", e);
      }

      try {
        const { bootCommandCenter } = await import("@/core/command-center");
        if (!hookDisposed) bootCommandCenter();
      } catch (e) {
        console.warn("[boot] command-center failed", e);
      }
    }, 5000);
    timers.push(t4);

    // ── Late boot (idle): recovery + god/sentinel/omega ──
    let idleCbId: number | undefined;
    const scheduleLateBoot = () => {
      if (document.hidden) {
        const onVisible = () => { document.removeEventListener("visibilitychange", onVisible); scheduleLateBoot(); };
        document.addEventListener("visibilitychange", onVisible);
        return;
      }
      idleCbId = requestIdleCallback(async () => {
        if (hookDisposed) return;
        try {
          const { runPlatformRecovery } = await import("@/lib/platform/platform-recovery-engine");
          void runPlatformRecovery("boot");
        } catch (e) {
          console.warn("[boot] recovery failed", e);
        }

        if (document.hidden || hookDisposed) return;

        try {
          const { sentinelCore } = await import("@/core/sentinel");
          await sentinelCore.boot();
          cleanups.push(() => sentinelCore.shutdown());
        } catch (e) {
          console.warn("[boot] sentinel-core failed", e);
        }

        // omegaCore is the platform-wide AI intelligence layer (knowledge graph, decision engine,
        // memory, priority, prediction). It is DISTINCT from the deleted god-core (which was a
        // universal system bypass). omegaCore is governed by the command-center permission model
        // (requestEngineRunApproval). Boot is deferred to idle-time and is non-blocking.
        try {
          const { omegaCore } = await import("@/core/omega");
          await omegaCore.boot();
          cleanups.push(() => { omegaCore.shutdown(); });
        } catch (e) {
          console.warn("[boot] omega-core failed", e);
        }
      }, { timeout: 30_000 });
    };
    const t5 = setTimeout(scheduleLateBoot, 12_000);
    timers.push(t5);

    return () => {
      hookDisposed = true;
      timers.forEach(clearTimeout);
      if (idleCbId !== undefined) cancelIdleCallback(idleCbId);
      cleanups.forEach((fn) => fn());
      booted = false;
    };
  }, [queryClient]);
}
