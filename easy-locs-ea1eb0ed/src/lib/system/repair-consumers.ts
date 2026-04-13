import { platformBus } from "@/lib/shared/platform-bus";
import { supabase } from "@/integrations/supabase/client";

const COOLDOWN_MS = 10_000;
const MAX_RETRIES = 3;
const BACKOFF = [10_000, 30_000, 60_000];

interface ConsumerState {
  lastRun: number;
  attempts: number;
  lastAttemptTime: number;
}

const state: Record<string, ConsumerState> = {};

function getState(key: string): ConsumerState {
  if (!state[key]) state[key] = { lastRun: 0, attempts: 0, lastAttemptTime: 0 };
  return state[key];
}

function canRun(key: string): { allowed: boolean; reason?: string } {
  const s = getState(key);
  const now = Date.now();

  if (now - s.lastRun < COOLDOWN_MS) {
    return { allowed: false, reason: "cooldown_active" };
  }

  if (s.attempts >= MAX_RETRIES && now - s.lastAttemptTime < BACKOFF[Math.min(s.attempts - 1, BACKOFF.length - 1)]) {
    return { allowed: false, reason: "max_retries_backoff" };
  }

  if (s.attempts >= MAX_RETRIES) {
    s.attempts = 0;
  }

  return { allowed: true };
}

function recordRun(key: string, result: "success" | "failed" | "skipped_cooldown") {
  const s = getState(key);
  const now = Date.now();
  s.lastRun = now;
  s.lastAttemptTime = now;
  if (result === "failed") {
    s.attempts++;
  } else if (result === "success") {
    s.attempts = 0;
  }
  console.log(`[repair-consumer] ${key} — action: ${key}, attempt: ${s.attempts}, result: ${result}`);
}

export function installRepairConsumers(): () => void {
  const unsubs: (() => void)[] = [];

  unsubs.push(platformBus.on("system:sync_requested", async () => {
    const key = "system:sync_requested";
    const check = canRun(key);
    if (!check.allowed) {
      console.log(`[repair-consumer] ${key} — action: targeted_channel_reconnect, attempt: ${getState(key).attempts}, result: skipped_cooldown (${check.reason})`);
      return;
    }

    try {
      const channels = supabase.getChannels();
      const staleChannels = channels.filter(ch => {
        const s = (ch as any).state;
        return s === "errored" || s === "closed" || s === "timed_out";
      });

      if (staleChannels.length === 0) {
        const allChannels = supabase.getChannels();
        const healthyCount = allChannels.filter(ch => (ch as any).state === "joined").length;
        if (healthyCount > 0) {
          sessionStorage.setItem("el-last-sync-ts", String(Date.now()));
          console.log(`[repair-consumer] ${key} — action: targeted_channel_reconnect, attempt: ${getState(key).attempts + 1}, result: success (${healthyCount} healthy channels, no stale)`);
          recordRun(key, "success");
        } else {
          console.log(`[repair-consumer] ${key} — action: targeted_channel_reconnect, attempt: ${getState(key).attempts + 1}, result: success (no channels active)`);
          recordRun(key, "success");
        }
        return;
      }

      let reconnected = 0;
      for (const ch of staleChannels) {
        try {
          ch.subscribe();
          reconnected++;
          console.log(`[repair-consumer] ${key} — reconnected channel: ${(ch as any).topic || "unknown"}`);
        } catch (chErr) {
          console.warn(`[repair-consumer] ${key} — channel reconnect failed:`, chErr);
        }
      }

      if (reconnected > 0) {
        sessionStorage.setItem("el-last-sync-ts", String(Date.now()));
        recordRun(key, "success");
      } else {
        recordRun(key, "failed");
      }
    } catch (err) {
      recordRun(key, "failed");
      console.error(`[repair-consumer] ${key} — error:`, err);
    }
  }));

  unsubs.push(platformBus.on("system:online_recovered", async () => {
    const key = "system:online_recovered";
    const check = canRun(key);
    if (!check.allowed) {
      console.log(`[repair-consumer] ${key} — action: targeted_stale_refetch, attempt: ${getState(key).attempts}, result: skipped_cooldown (${check.reason})`);
      return;
    }

    try {
      const { queryClient: qc } = await import("@/lib/query-client");

      if (qc && typeof qc.invalidateQueries === "function") {
        await qc.invalidateQueries({ stale: true } as any);
        console.log(`[repair-consumer] ${key} — action: targeted_stale_refetch, attempt: ${getState(key).attempts + 1}, result: success`);
        recordRun(key, "success");
      } else {
        console.log(`[repair-consumer] ${key} — action: targeted_stale_refetch, attempt: ${getState(key).attempts + 1}, result: success (no query client found, skipped)`);
        recordRun(key, "success");
      }
    } catch (err) {
      recordRun(key, "failed");
      console.error(`[repair-consumer] ${key} — error:`, err);
    }
  }));

  unsubs.push(platformBus.on("system:stale_queries_detected", async () => {
    const key = "system:stale_queries_detected";
    const check = canRun(key);
    if (!check.allowed) {
      console.log(`[repair-consumer] ${key} — action: invalidate_stale_queries, attempt: ${getState(key).attempts}, result: skipped_cooldown (${check.reason})`);
      return;
    }

    try {
      const { queryClient: qc } = await import("@/lib/query-client");

      if (qc && typeof qc.invalidateQueries === "function") {
        await qc.invalidateQueries();
        console.log(`[repair-consumer] ${key} — action: invalidate_stale_queries, attempt: ${getState(key).attempts + 1}, result: success`);
        recordRun(key, "success");
      } else {
        console.log(`[repair-consumer] ${key} — action: invalidate_stale_queries, attempt: ${getState(key).attempts + 1}, result: success (no query client, skipped)`);
        recordRun(key, "success");
      }
    } catch (err) {
      recordRun(key, "failed");
      console.error(`[repair-consumer] ${key} — error:`, err);
    }
  }));

  console.log("[repair-consumer] Installed guarded consumers for system:sync_requested, system:online_recovered, system:stale_queries_detected");

  return () => unsubs.forEach(fn => fn());
}