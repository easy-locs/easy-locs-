import { useEffect, useRef } from "react";
import { db as supabase } from "@/services/db";

const ENGINE_CRON_INTERVAL_MS = 5 * 60 * 1000;
const ENGINE_RUN_INTERVAL_MS = 10 * 60 * 1000;
const INITIAL_DELAY_MS = 45_000;
const STORAGE_KEY_CRON = "easylocs_last_engine_cron";
const STORAGE_KEY_RUN = "easylocs_last_engine_run";

function shouldRun(key: string, intervalMs: number): boolean {
  try {
    const last = localStorage.getItem(key);
    if (!last) return true;
    return Date.now() - Number(last) >= intervalMs;
  } catch {
    return true;
  }
}

function markRan(key: string) {
  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {}
}

async function triggerCronServer() {
  if (!shouldRun(STORAGE_KEY_CRON, ENGINE_CRON_INTERVAL_MS)) return;
  try {
    const { error } = await supabase.functions.invoke("engine-cron-server", { body: {} });
    if (!error) markRan(STORAGE_KEY_CRON);
  } catch {}
}

async function triggerRunEngineCron() {
  if (!shouldRun(STORAGE_KEY_RUN, ENGINE_RUN_INTERVAL_MS)) return;
  try {
    const { error } = await supabase.functions.invoke("run-engine-cron", { body: {} });
    if (!error) markRan(STORAGE_KEY_RUN);
  } catch {}
}

async function runBothCrons() {
  if (document.visibilityState === "hidden") return;
  await Promise.allSettled([triggerCronServer(), triggerRunEngineCron()]);
}

export function useAutoEngineCron() {
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const initialDelay = setTimeout(runBothCrons, INITIAL_DELAY_MS);

    intervalRef.current = setInterval(runBothCrons, ENGINE_CRON_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") runBothCrons();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(initialDelay);
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
