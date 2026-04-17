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

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  label: string,
  maxAttempts = 3,
  baseDelayMs = 1000,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) {
        console.warn(`[boot] ${label} failed after ${maxAttempts} attempts:`, err);
        throw err;
      }
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(`[boot] ${label} attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms:`, err);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error("unreachable");
}

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
        await retryWithBackoff(async () => {
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
            { installQrPaymentReactions },
            { installStorefrontReactions },
            { installCrossAppReactions },
            { installEngineConnectorHub },
            { installNotificationEventBridge },
            { initPushEventBridge },
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
            import("@/lib/qr/qr-payment-reactions"),
            import("@/lib/shared/storefront-reactions"),
            import("@/lib/shared/cross-app-reactions"),
            import("@/lib/system/engineConnectorHub"),
            import("@/lib/notifications/notification-event-bridge"),
            import("@/lib/push/push-event-bridge"),
            import("@/lib/dashboard/dashboard-counter-bridge"),
            import("@/lib/shared/v4-delivery-bridge"),
          ]);

          if (hookDisposed) return;

          registerQueryClient(queryClient);
          registerWalletQueryClient(queryClient);
          registerDashboardQueryClient(queryClient);
          registerDeliveryQueryClient(queryClient);
          registerOrderQueryClient(queryClient);
          registerStorefrontQueryClient(queryClient);
          registerSupportQueryClient(queryClient);

          installOrchestrationEngine();

          installEngineConnectorHub();
          cleanups.push(
            installSmartFlowBridge(),
            installOrbitCacheListener(),
            installPlatformReactions(),
            installQrPaymentReactions(),
            installStorefrontReactions(),
            installCrossAppReactions(),
            installNotificationEventBridge(),
            installCounterBridge(),
            installDeliveryBridge(),
          );
          initPushEventBridge();
        }, "stage-0+1 orchestration");
      } catch (e) {
        console.warn("[boot] stage-0+1 failed after retries", e);
      }
    }, 50);
    timers.push(t0);

    // ── Stage 1.5: Redis proxy + presence service + session metadata ──
    const tRedis = setTimeout(async () => {
      if (hookDisposed) return;
      const t = performance.now() - bootStart;
      console.log(`[boot] stage-1.5 redis layer (${t.toFixed(0)}ms)`);
      try {
        await retryWithBackoff(async () => {
          const { initRedisProxy } = await import("@/lib/redis/redis-client");
          const { initPresenceService, startHeartbeat } = await import("@/lib/redis/presence-service");

          initRedisProxy(supabase);
          initPresenceService(supabase);

          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && !hookDisposed) {
            startHeartbeat(session.user.id, "online");

            supabase.functions.invoke("presence-heartbeat", {
              body: {
                action: "store_session",
                session_id: session.access_token?.slice(-16) ?? "unknown",
                user_agent: navigator.userAgent,
              },
            }).catch(err => console.warn("[boot] presence-heartbeat store_session failed:", err));
          }

          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
            if (hookDisposed) return;
            if (event === "SIGNED_IN" && newSession?.user) {
              startHeartbeat(newSession.user.id, "online");
              supabase.functions.invoke("presence-heartbeat", {
                body: {
                  action: "store_session",
                  session_id: newSession.access_token?.slice(-16) ?? "unknown",
                  user_agent: navigator.userAgent,
                },
              }).catch(err => console.warn("[boot] presence-heartbeat store_session failed:", err));
            } else if (event === "TOKEN_REFRESHED" && newSession?.access_token) {
              // token refreshed
            } else if (event === "SIGNED_OUT") {
              import("@/lib/redis/presence-service").then(({ stopHeartbeat: sh }) => sh()).catch(err => console.warn("[boot] presence stop failed:", err));
            }
          });
          cleanups.push(() => subscription.unsubscribe());

          console.log("[boot] redis proxy + presence + session initialized");
        }, "stage-1.5 redis layer");
      } catch (e) {
        console.warn("[boot] redis layer failed after retries (non-blocking)", e);
      }
    }, 500);
    timers.push(tRedis);

    // ── Stage 2: domain cache listeners ──
    const t2 = setTimeout(async () => {
      if (hookDisposed) return;
      const t = performance.now() - bootStart;
      console.log(`[boot] stage-2 cache listeners (${t.toFixed(0)}ms)`);
      try {
        await retryWithBackoff(async () => {
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
        }, "stage-2 cache listeners");
      } catch (e) {
        console.warn("[boot] stage-2 failed after retries", e);
      }
    }, 1500);
    timers.push(t2);

    // ── Stage 3: core engines ──
    const t3 = setTimeout(async () => {
      if (hookDisposed) return;
      const t = performance.now() - bootStart;
      console.log(`[boot] stage-3 core engines (${t.toFixed(0)}ms)`);
      try {
        await retryWithBackoff(async () => {
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

          const { data: { session: s3 } } = await supabase.auth.getSession();
          if (s3 && !hookDisposed) {
            const [{ initPropertyAutomation }, { initRealEstateEngines }] = await Promise.all([
              import("@/lib/engines/property-automation-engine"),
              import("@/lib/engines/real-estate-engine-registry"),
            ]);
            initPropertyAutomation();
            initRealEstateEngines();
          }
        }, "stage-3 core engines");
      } catch (e) {
        console.warn("[boot] stage-3 failed after retries", e);
      }
    }, 3000);
    timers.push(t3);

    // ── Stage 4: engine system ──
    const t4 = setTimeout(async () => {
      if (hookDisposed) return;
      const t = performance.now() - bootStart;
      console.log(`[boot] stage-4 engine system (${t.toFixed(0)}ms)`);
      try {
        await retryWithBackoff(async () => {
          const { bootEngineSystem } = await import("@/engines/engine-registry");
          const cleanup = bootEngineSystem();
          if (cleanup) cleanups.push(cleanup);
        }, "stage-4 engine system");
      } catch (e) {
        console.warn("[boot] stage-4 engine system failed after retries", e);
      }

      if (hookDisposed) return;

      try {
        await retryWithBackoff(async () => {
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
            { installClosedLoopWiring },
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
            import("@/lib/self-healing/closed-loop-wiring"),
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
          cleanups.push(installClosedLoopWiring());
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

          console.log("[boot] stage-4 infrastructure layer installed");
        }, "stage-4 infrastructure");
      } catch (e) {
        console.warn("[boot] stage-4 infrastructure failed after retries", e);
      }

      if (hookDisposed) return;

      try {
        const { runBootIntegrityCheck } = await import("@/lib/infrastructure/boot-integrity-gate");
        const integrityResult = runBootIntegrityCheck();
        console.log(`[boot] Boot integrity: ${integrityResult.summary}`);
      } catch (e) {
        console.warn("[boot] boot-integrity-gate failed", e);
      }

      const { data: { session: s4 } } = await supabase.auth.getSession().catch(err => {
        console.warn("[boot] Failed to get session for stage-4:", err);
        return { data: { session: null } };
      });
      if (!s4) {
        console.log("[boot] stage-4 auth-gated ops skipped — no authenticated user");
        return;
      }

      if (hookDisposed) return;

      try {
        await retryWithBackoff(async () => {
          const { engineMemory } = await import("@/engines/core/engine-memory");
          if (hookDisposed) return;
          await engineMemory.loadFromSupabase();

          if (hookDisposed) return;
          const { startLearningCycle } = await import("@/engines/core/engine-learning");
          cleanups.push(startLearningCycle());
        }, "stage-4 engine-memory");
      } catch (e) {
        console.warn("[boot] engine-memory failed after retries", e);
      }

      try {
        await retryWithBackoff(async () => {
          const { bootCommandCenter } = await import("@/core/command-center");
          if (!hookDisposed) bootCommandCenter();
        }, "stage-4 command-center");
      } catch (e) {
        console.warn("[boot] command-center failed after retries", e);
      }
    }, 5000);
    timers.push(t4);

    // ── Late boot (idle): recovery + server event subscription ──
    // Sentinel and Omega now run server-side via Supabase Edge Functions + pg_cron.
    // The browser subscribes to server_events via Supabase Realtime (read-only)
    // instead of running the intelligence loop and sentinel guards locally.
    // DOM-dependent engines (auto-fix, flow-integrity) remain browser-side.
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
          await retryWithBackoff(async () => {
            const { runPlatformRecovery } = await import("@/lib/platform/platform-recovery-engine");
            void runPlatformRecovery("boot");
          }, "late-boot recovery");
        } catch (e) {
          console.warn("[boot] recovery failed after retries", e);
        }

        if (document.hidden || hookDisposed) return;

        // Server brain subscriptions are handled by useServerEvents hook
        // wired through AppBootstrapGuard. Events/decisions are forwarded to
        // platformBus so the entire infrastructure layer can react.
        console.log("[boot] server brain subscriptions delegated to useServerEvents hook");
      }, { timeout: 30_000 });
    };
    const t5 = setTimeout(scheduleLateBoot, 12_000);
    timers.push(t5);

    return () => {
      hookDisposed = true;
      timers.forEach(clearTimeout);
      if (idleCbId !== undefined) cancelIdleCallback(idleCbId);
      cleanups.forEach((fn) => fn());
      import("@/lib/redis/presence-service").then(({ stopHeartbeat }) => stopHeartbeat()).catch(err => console.warn("[boot] cleanup presence stop failed:", err));
      booted = false;
    };
  }, [queryClient]);
}
