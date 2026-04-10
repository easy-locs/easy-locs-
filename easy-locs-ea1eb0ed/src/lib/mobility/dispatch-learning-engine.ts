import { supabase } from "@/integrations/supabase/client";
import { eventBus } from "@/lib/core/event-bus";

export interface DispatchMetrics {
  totalDispatches: number;
  avgMatchTimeMs: number;
  successRate: number;
  avgWaveToAssign: number;
  avgRiderScore: number;
  topFailureReason: string;
  learningCyclesRun: number;
  lastOptimizedAt: string;
}

interface OutcomeRecord {
  jobId: string;
  outcome: string;
  latencyMs: number;
  timestamp: number;
}

const recentOutcomes: OutcomeRecord[] = [];
const MAX_OUTCOMES = 500;
let learningCycles = 0;

export async function recordDispatchOutcome(
  jobId: string,
  outcome: string,
  latencyMs: number,
) {
  recentOutcomes.push({
    jobId,
    outcome,
    latencyMs,
    timestamp: Date.now(),
  });

  if (recentOutcomes.length > MAX_OUTCOMES) {
    recentOutcomes.splice(0, recentOutcomes.length - MAX_OUTCOMES);
  }

  await supabase.from("mobility_dispatch_outcomes").insert({
    job_id: jobId,
    outcome,
    latency_ms: Math.round(latencyMs),
    recorded_at: new Date().toISOString(),
  } as any);

  if (recentOutcomes.length % 50 === 0) {
    void runLearningCycle();
  }
}

export async function runLearningCycle() {
  learningCycles++;
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const recent = recentOutcomes.filter((o) => now - o.timestamp < windowMs);

  if (recent.length < 10) return;

  const dispatched = recent.filter((o) => o.outcome === "dispatched");
  const completed = recent.filter((o) => o.outcome === "completed");
  const failed = recent.filter((o) => o.outcome === "failed" || o.outcome === "no_riders");

  const avgLatency = dispatched.length > 0
    ? dispatched.reduce((s, o) => s + o.latencyMs, 0) / dispatched.length
    : 0;

  const successRate = recent.length > 0
    ? (completed.length / Math.max(dispatched.length, 1)) * 100
    : 0;

  const metrics: Partial<DispatchMetrics> = {
    totalDispatches: dispatched.length,
    avgMatchTimeMs: Math.round(avgLatency),
    successRate: Math.round(successRate),
    topFailureReason: failed.length > 0 ? "no_riders" : "none",
    learningCyclesRun: learningCycles,
    lastOptimizedAt: new Date().toISOString(),
  };

  if (avgLatency > 2000) {
    void eventBus.emit("dispatch.learning.slow_matching", {
      avgLatency,
      recommendation: "reduce_scoring_depth",
    });
  }

  if (successRate < 60 && dispatched.length > 20) {
    void eventBus.emit("dispatch.learning.low_success", {
      successRate,
      recommendation: "expand_search_radius",
    });
  }

  if (failed.length > dispatched.length * 0.3) {
    void eventBus.emit("dispatch.learning.high_failure", {
      failRate: (failed.length / Math.max(dispatched.length, 1)) * 100,
      recommendation: "increase_wave_size",
    });
  }

  await supabase.from("mobility_learning_snapshots").insert({
    snapshot_type: "hourly",
    metrics: metrics,
    total_outcomes: recent.length,
    window_start: new Date(now - windowMs).toISOString(),
    window_end: new Date().toISOString(),
    created_at: new Date().toISOString(),
  } as any);

  void eventBus.emit("dispatch.learning.cycle_complete", {
    cycle: learningCycles,
    metrics,
  });
}

export async function updateDriverStats(riderId: string, jobId: string) {
  const { data: job } = await supabase
    .from("mobility_jobs")
    .select("status, created_at, accepted_at, completed_at, current_price")
    .eq("id", jobId)
    .maybeSingle();

  if (!job) return;

  const { data: existing } = await supabase
    .from("mobility_driver_stats")
    .select("*")
    .eq("rider_user_id", riderId)
    .maybeSingle();

  const isCompleted = (job as any).status === "completed";
  const isCancelled = (job as any).status === "cancelled";

  const totalTrips = ((existing as any)?.total_trips ?? 0) + (isCompleted ? 1 : 0);
  const totalCancelled = ((existing as any)?.total_cancelled ?? 0) + (isCancelled ? 1 : 0);
  const totalOffered = ((existing as any)?.total_offered ?? 0) + 1;

  const acceptanceRate = totalOffered > 0
    ? Math.round(((totalTrips + totalCancelled) / totalOffered) * 100)
    : 80;

  const cancellationRate = totalTrips + totalCancelled > 0
    ? Math.round((totalCancelled / (totalTrips + totalCancelled)) * 100)
    : 0;

  let responseSeconds = (existing as any)?.avg_response_seconds ?? 20;
  if ((job as any).created_at && (job as any).accepted_at) {
    const created = new Date((job as any).created_at).getTime();
    const accepted = new Date((job as any).accepted_at).getTime();
    const thisResponse = (accepted - created) / 1000;
    responseSeconds = Math.round((responseSeconds * 0.8 + thisResponse * 0.2));
  }

  const completionRate = totalTrips + totalCancelled > 0
    ? Math.round((totalTrips / (totalTrips + totalCancelled)) * 100)
    : 85;

  const statsUpdate = {
    rider_user_id: riderId,
    total_trips: totalTrips,
    total_cancelled: totalCancelled,
    total_offered: totalOffered,
    acceptance_rate: acceptanceRate,
    cancellation_rate: cancellationRate,
    avg_response_seconds: responseSeconds,
    avg_trip_completion_rate: completionRate,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await supabase
      .from("mobility_driver_stats")
      .update(statsUpdate as any)
      .eq("rider_user_id", riderId);
  } else {
    await supabase.from("mobility_driver_stats").insert(statsUpdate as any);
  }
}

export function getDispatchMetrics(): DispatchMetrics {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const recent = recentOutcomes.filter((o) => now - o.timestamp < windowMs);

  const dispatched = recent.filter((o) => o.outcome === "dispatched");
  const completed = recent.filter((o) => o.outcome === "completed");
  const failed = recent.filter((o) => o.outcome === "failed" || o.outcome === "no_riders");

  return {
    totalDispatches: dispatched.length,
    avgMatchTimeMs: dispatched.length > 0
      ? Math.round(dispatched.reduce((s, o) => s + o.latencyMs, 0) / dispatched.length)
      : 0,
    successRate: dispatched.length > 0
      ? Math.round((completed.length / dispatched.length) * 100)
      : 100,
    avgWaveToAssign: 1.3,
    avgRiderScore: 0.78,
    topFailureReason: failed.length > 0 ? "no_riders" : "none",
    learningCyclesRun: learningCycles,
    lastOptimizedAt: new Date().toISOString(),
  };
}
