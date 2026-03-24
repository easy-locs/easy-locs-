/**
 * PLATFORM CONTINUOUS ENGINE
 * Client-side interval-based automation layer.
 * Runs health checks, store sync, audits, auto-fix, and boost refreshes at fixed intervals.
 */

import { runPlatformRecovery } from "./platform-recovery-engine";
import { runAutoFix } from "./platform-auto-fix";
import { runAllHealthChecks } from "./platform-health-checks";
import { runEngineHealthChecks } from "@/lib/engine/engineHealthChecks";

type IntervalJob = {
  name: string;
  intervalMs: number;
  fn: () => Promise<void> | void;
  timerId?: ReturnType<typeof setInterval>;
  lastRun?: string;
  runCount: number;
  lastStatus: "ok" | "error" | "pending";
  lastDetail?: string;
};

const jobs: IntervalJob[] = [];
let running = false;

function registerJob(name: string, intervalMs: number, fn: () => Promise<void> | void) {
  if (jobs.find(j => j.name === name)) return;
  jobs.push({ name, intervalMs, fn, runCount: 0, lastStatus: "pending" });
}

async function executeJob(job: IntervalJob) {
  try {
    await job.fn();
    job.lastStatus = "ok";
  } catch (e: any) {
    job.lastStatus = "error";
    job.lastDetail = e?.message ?? "unknown";
    console.warn(`[continuous] Job "${job.name}" failed:`, e);
  }
  job.runCount++;
  job.lastRun = new Date().toISOString();
}

// ── Public API ──────────────────────────────────────────────

export function startContinuousEngine() {
  if (running) return;
  running = true;

  // 1. Engine health (5min)
  registerJob("engine-health", 5 * 60_000, async () => {
    await runEngineHealthChecks();
  });

  // 2. Platform recovery (10min)
  registerJob("platform-recovery", 10 * 60_000, async () => {
    await runPlatformRecovery("cron");
  });

  // 3. Auto-fix engine (5min) — detect & correct safe issues
  registerJob("auto-fix", 5 * 60_000, async () => {
    const fixes = await runAutoFix();
    const applied = fixes.filter(f => f.applied).length;
    if (applied > 0) {
      console.log(`[continuous] Auto-fix applied ${applied} corrections`);
    }
  });

  // 4. Geo + Wallet + Lead health (5min)
  registerJob("health-checks", 5 * 60_000, async () => {
    const results = await runAllHealthChecks();
    const unhealthy = results.filter(r => !r.healthy);
    if (unhealthy.length > 0) {
      console.warn(`[continuous] ${unhealthy.length} unhealthy modules:`, unhealthy.map(r => r.module));
    }
  });

  // 5. Store consistency (5min)
  registerJob("store-consistency", 5 * 60_000, async () => {
    try {
      const { useOrbitStore } = await import("@/stores/orbitStore");
      const { useWalletStore } = await import("@/stores/walletStore");
      const orbitState = useOrbitStore.getState();
      const walletState = useWalletStore.getState();
      
      if (orbitState.profile && !walletState.wallet) {
        console.log("[continuous] Wallet missing for active profile, rehydrating...");
        await walletState.loadWallet({
          walletId: `wallet_${orbitState.profile.orbitId}`,
          ownerOrbitId: orbitState.profile.id,
          currency: "AED",
        });
      }
    } catch {}
  });

  // 6. Boost slot refresh (1h)
  registerJob("boost-slot-refresh", 60 * 60_000, async () => {
    try {
      const { platformBus } = await import("@/lib/shared/platform-bus");
      platformBus.emit("boost.slots.refresh", { reason: "periodic" }, "system");
    } catch {}
  });

  // 8. Central ranking rerank (10min)
  registerJob("central-ranking-rerank", 10 * 60_000, async () => {
    try {
      const { rerankAll } = await import("@/lib/ranking/ranking-batch-runner");
      const result = await rerankAll();
      if (result.candidates + result.seeds > 0) {
        console.log(`[continuous] Reranked ${result.candidates} candidates + ${result.seeds} seeds`);
      }
    } catch {}
  });

  // 9. Global Experience refresh (5min)
  registerJob("global-experience-refresh", 5 * 60_000, async () => {
    try {
      const { useGlobalExperienceStore } = await import("@/stores/globalExperienceStore");
      useGlobalExperienceStore.getState().refresh();
    } catch {}
  });

  // 7. Backend reconnect check (5min)
  registerJob("backend-reconnect", 5 * 60_000, async () => {
    const { checkBackendReconnect } = await import("./platform-health-checks");
    const results = await checkBackendReconnect();
    const failed = results.filter(r => !r.healthy);
    if (failed.length > 0) {
      console.warn(`[continuous] Backend reconnect issues:`, failed.map(r => `${r.module}: ${r.detail}`));
    }
  });

  // 10. Coherence engine sweep (15min)
  registerJob("coherence-sweep", 15 * 60_000, async () => {
    try {
      const { runCoherenceGate } = await import("@/lib/engines/coherence-gate");
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: unchecked } = await (supabase as any)
        .from("seed_merchants")
        .select("id, name, vertical, subcategory, menu_items_json")
        .is("coherence_status", null)
        .limit(20);
      if (unchecked?.length) {
        let checked = 0;
        for (const e of unchecked) {
          const menuItems = Array.isArray(e.menu_items_json) ? e.menu_items_json : [];
          await runCoherenceGate(e.id, "seed_merchants", {
            entity_name: e.name ?? "",
            entity_vertical: e.vertical ?? "food",
            entity_subcategory: e.subcategory ?? "",
            menu_items: menuItems.map((i: any) => i?.name ?? ""),
          });
          checked++;
        }
        if (checked > 0) console.log(`[continuous] Coherence checked ${checked} entities`);
      }
    } catch {}
  });

  // 11. Shop quality engine (15min)
  registerJob("shop-quality", 15 * 60_000, async () => {
    try {
      const { runShopQualityCheck } = await import("@/lib/engines/shop-quality-engine");
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: shops } = await (supabase as any)
        .from("seed_merchants")
        .select("*")
        .is("quality_score", null)
        .limit(20);
      if (shops?.length) {
        let scored = 0;
        for (const shop of shops) {
          const result = runShopQualityCheck(shop);
          await (supabase as any)
            .from("seed_merchants")
            .update({
              quality_score: result.globalQualityScore,
              quality_tier: result.qualityClass,
            })
            .eq("id", shop.id);
          scored++;
        }
        if (scored > 0) console.log(`[continuous] Quality scored ${scored} shops`);
      }
    } catch {}
  });

  // 12. Entity recovery engine (30min)
  registerJob("entity-recovery", 30 * 60_000, async () => {
    try {
      const { recoverHiddenEntities } = await import("@/lib/engines/entity-recovery-engine");
      const result = await recoverHiddenEntities(10);
      if (result.recovered > 0) {
        console.log(`[continuous] Recovered ${result.recovered}/${result.total} entities`);
      }
    } catch {}
  });

  // 13. Auto-source enrichment trigger (1h)
  registerJob("auto-source-enrich", 60 * 60_000, async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await (supabase as any).functions.invoke("auto-onboarding-cron", { body: {} });
      console.log("[continuous] Auto-onboarding cron triggered");
    } catch {}
  });

  // Start all intervals staggered
  for (const job of jobs) {
    const idx = jobs.indexOf(job);
    setTimeout(() => void executeJob(job), 8000 + idx * 2000);
    job.timerId = setInterval(() => void executeJob(job), job.intervalMs);
  }

  console.log(`[continuous] Engine started with ${jobs.length} jobs`);
}

export function stopContinuousEngine() {
  for (const job of jobs) {
    if (job.timerId) clearInterval(job.timerId);
  }
  running = false;
  console.log("[continuous] Engine stopped");
}

export function getContinuousEngineStatus() {
  return {
    running,
    jobs: jobs.map(j => ({
      name: j.name,
      intervalMs: j.intervalMs,
      intervalLabel: j.intervalMs >= 3600000 ? `${j.intervalMs / 3600000}h` : `${j.intervalMs / 60000}min`,
      lastRun: j.lastRun ?? null,
      runCount: j.runCount,
      lastStatus: j.lastStatus,
      lastDetail: j.lastDetail,
    })),
  };
}
