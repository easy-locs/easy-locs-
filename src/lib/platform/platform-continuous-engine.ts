/**
 * PLATFORM CONTINUOUS ENGINE
 * Client-side interval-based automation layer.
 * Runs health checks, store sync, audits, and boost refreshes at fixed intervals.
 */

import { runPlatformRecovery } from "./platform-recovery-engine";
import { runEngineHealthChecks } from "@/lib/engine/engineHealthChecks";

type IntervalJob = {
  name: string;
  intervalMs: number;
  fn: () => Promise<void> | void;
  timerId?: ReturnType<typeof setInterval>;
  lastRun?: string;
  runCount: number;
  lastStatus: "ok" | "error" | "pending";
};

const jobs: IntervalJob[] = [];
let running = false;

// ── Job definitions ──────────────────────────────────────────

function registerJob(name: string, intervalMs: number, fn: () => Promise<void> | void) {
  if (jobs.find(j => j.name === name)) return;
  jobs.push({ name, intervalMs, fn, runCount: 0, lastStatus: "pending" });
}

async function executeJob(job: IntervalJob) {
  try {
    await job.fn();
    job.lastStatus = "ok";
  } catch (e) {
    job.lastStatus = "error";
    console.warn(`[continuous] Job "${job.name}" failed:`, e);
  }
  job.runCount++;
  job.lastRun = new Date().toISOString();
}

// ── Public API ──────────────────────────────────────────────

export function startContinuousEngine() {
  if (running) return;
  running = true;

  // Register all periodic client jobs
  registerJob("engine-health", 5 * 60_000, async () => {
    await runEngineHealthChecks();
  });

  registerJob("platform-recovery", 10 * 60_000, async () => {
    await runPlatformRecovery("cron");
  });

  registerJob("store-consistency", 5 * 60_000, async () => {
    // Verify critical stores are hydrated
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

  registerJob("boost-slot-refresh", 60 * 60_000, async () => {
    // Trigger client-side boost cache invalidation
    try {
      const { platformBus } = await import("@/lib/shared/platform-bus");
      platformBus.emit("boost.slots.refresh", { reason: "periodic" }, "system");
    } catch {}
  });

  // Start all intervals
  for (const job of jobs) {
    // Run once immediately (staggered by 2s per job)
    const idx = jobs.indexOf(job);
    setTimeout(() => void executeJob(job), 8000 + idx * 2000);
    
    // Then run periodically
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
    })),
  };
}
