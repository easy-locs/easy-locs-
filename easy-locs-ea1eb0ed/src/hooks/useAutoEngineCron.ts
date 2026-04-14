/**
 * useAutoEngineCron — DEPRECATED
 *
 * All cron scheduling is now handled server-side via pg_cron entries
 * that trigger the autonomous-cron-dispatcher Edge Function.
 *
 * This hook is retained as a no-op for backward compatibility.
 * It can be safely removed from components that reference it.
 */
export function useAutoEngineCron() {
  // No-op: all cron jobs run server-side via pg_cron.
  // See migration 20260414300000_autonomous_engine_systems.sql
}
