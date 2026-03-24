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

  // 7. Backend reconnect check (5min)
  registerJob("backend-reconnect", 5 * 60_000, async () => {
    const { checkBackendReconnect } = await import("./platform-health-checks");
    const results = await checkBackendReconnect();
    const failed = results.filter(r => !r.healthy);
    if (failed.length > 0) {
      console.warn(`[continuous] Backend reconnect issues:`, failed.map(r => `${r.module}: ${r.detail}`));
    }
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
