/**
 * Automation Scheduler
 * Periodically scans and executes due workflows.
 * This is the heartbeat of the autonomy layer.
 */
import { supabase } from "@/integrations/supabase/client";
import { runWorkflowStep } from "./automation-runner";
import { platformBus } from "@/lib/shared/platform-bus";

export interface SchedulerState {
  running: boolean;
  lastRunAt: string | null;
  queueSize: number;
  inFlightCount: number;
  failedCount: number;
  completedToday: number;
}

const MAX_BATCH = 10;
const POLL_INTERVAL_MS = 30_000; // 30s

let _intervalId: ReturnType<typeof setInterval> | null = null;
let _state: SchedulerState = {
  running: false,
  lastRunAt: null,
  queueSize: 0,
  inFlightCount: 0,
  failedCount: 0,
  completedToday: 0,
};

export function getSchedulerState(): SchedulerState {
  return { ..._state };
}

/**
 * Fetch due workflows and execute them in order.
 */
export async function runSchedulerCycle(): Promise<number> {
  if (_state.inFlightCount > 0) return 0; // avoid overlap

  const now = new Date().toISOString();

  const { data: dueWorkflows } = await (supabase as any)
    .from("automation_workflows")
    .select("id, priority, scheduled_at")
    .in("status", ["queued", "scheduled"])
    .lte("scheduled_at", now)
    .order("priority", { ascending: false })
    .order("scheduled_at", { ascending: true })
    .limit(MAX_BATCH);

  const batch = dueWorkflows ?? [];
  _state.queueSize = batch.length;
  _state.inFlightCount = batch.length;
  _state.lastRunAt = now;

  let completed = 0;

  for (const wf of batch) {
    try {
      const result = await runWorkflowStep(wf.id);
      if (result.completed) completed++;
      if (result.error) _state.failedCount++;
    } catch {
      _state.failedCount++;
    }
    _state.inFlightCount--;
  }

  _state.completedToday += completed;
  return batch.length;
}

/**
 * Start the scheduler loop.
 */
export function startScheduler() {
  if (_state.running) return;
  _state.running = true;
  _state.completedToday = 0;
  _state.failedCount = 0;

  platformBus.emit("automation:scheduler_started" as any, {}, "system");
  _intervalId = setInterval(() => {
    runSchedulerCycle().catch(console.error);
  }, POLL_INTERVAL_MS);

  // Run immediately
  runSchedulerCycle().catch(console.error);
}

/**
 * Stop the scheduler loop.
 */
export function stopScheduler() {
  if (_intervalId) clearInterval(_intervalId);
  _intervalId = null;
  _state.running = false;
  platformBus.emit("automation:scheduler_stopped" as any, {}, "system");
}

/**
 * Get scheduler health stats from DB.
 */
export async function getSchedulerHealth() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [queued, running, scheduled, completedToday, failedToday] = await Promise.all([
    (supabase as any).from("automation_workflows").select("id", { count: "exact", head: true }).eq("status", "queued"),
    (supabase as any).from("automation_workflows").select("id", { count: "exact", head: true }).eq("status", "running"),
    (supabase as any).from("automation_workflows").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
    (supabase as any).from("automation_workflows").select("id", { count: "exact", head: true }).eq("status", "completed").gte("completed_at", todayStart.toISOString()),
    (supabase as any).from("automation_workflows").select("id", { count: "exact", head: true }).eq("status", "failed").gte("failed_at", todayStart.toISOString()),
  ]);

  return {
    queued: queued.count ?? 0,
    running: running.count ?? 0,
    scheduled: scheduled.count ?? 0,
    completedToday: completedToday.count ?? 0,
    failedToday: failedToday.count ?? 0,
    schedulerRunning: _state.running,
    lastRunAt: _state.lastRunAt,
  };
}
