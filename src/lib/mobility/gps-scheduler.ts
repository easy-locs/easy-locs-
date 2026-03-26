/**
 * Adaptive GPS Scheduler — controls GPS push frequency based on ride state.
 * 
 * Intervals:
 * - idle online: 20s heartbeat (rider_presence only)
 * - assigned far from pickup: 10s
 * - assigned close to pickup (<1.5km): 4s
 * - in_progress: 3s
 * - background/degraded: 15s
 *
 * Brain owner: Execution Brain
 * Writes: rider_presence, trip_live_state, trip_location_points
 */
import { supabase } from "@/integrations/supabase/client";
import { eventBus } from "@/lib/core/event-bus";

export type GPSPhase = "idle" | "assigned_far" | "assigned_close" | "in_progress" | "background";

const INTERVAL_MS: Record<GPSPhase, number> = {
  idle: 20_000,
  assigned_far: 10_000,
  assigned_close: 4_000,
  in_progress: 3_000,
  background: 15_000,
};

// Breadcrumb sampling: only insert every Nth push to avoid DB flood
const BREADCRUMB_SAMPLE: Record<GPSPhase, number> = {
  idle: 0, // no breadcrumbs when idle
  assigned_far: 3,
  assigned_close: 2,
  in_progress: 2,
  background: 5,
};

export interface GPSHealth {
  phase: GPSPhase;
  lastSyncAt: string | null;
  pushCount: number;
  errors: number;
  signal: "strong" | "weak" | "lost";
}

interface SchedulerState {
  timer: ReturnType<typeof setInterval> | null;
  phase: GPSPhase;
  jobId: string | null;
  userId: string | null;
  riderProfileId: string | null;
  pushCount: number;
  errors: number;
  lastSyncAt: string | null;
  watchId: number | null;
  lastLat: number | null;
  lastLng: number | null;
}

const state: SchedulerState = {
  timer: null, phase: "idle", jobId: null, userId: null, riderProfileId: null,
  pushCount: 0, errors: 0, lastSyncAt: null, watchId: null,
  lastLat: null, lastLng: null,
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function pushLocation() {
  if (!state.userId) return;
  if (!state.lastLat || !state.lastLng) return;

  const now = new Date().toISOString();
  const lat = state.lastLat;
  const lng = state.lastLng;

  try {
    // Always update rider_presence
    await (supabase as any).from("rider_presence").upsert({
      user_id: state.userId,
      lat, lng,
      last_seen_at: now,
      is_online: true,
      current_status: state.jobId ? "busy" : "online",
    }, { onConflict: "user_id" });

    // If active job, also update trip_live_state
    if (state.jobId && state.phase !== "idle") {
      await supabase.from("trip_live_state").upsert({
        job_id: state.jobId,
        rider_user_id: state.userId,
        rider_profile_id: state.riderProfileId,
        lat, lng,
        updated_at: now,
      } as any);

      // Sampled breadcrumb insert
      const sample = BREADCRUMB_SAMPLE[state.phase];
      if (sample > 0 && state.pushCount % sample === 0) {
        await supabase.from("trip_location_points").insert({
          job_id: state.jobId,
          rider_user_id: state.userId,
          rider_profile_id: state.riderProfileId,
          lat, lng,
          recorded_at: now,
        } as any);
      }
    }

    state.pushCount++;
    state.lastSyncAt = now;
    void eventBus.emit("driver.position.updated", { userId: state.userId, lat, lng, phase: state.phase });
  } catch {
    state.errors++;
  }
}

function startGeoWatch() {
  if (state.watchId != null || !navigator.geolocation) return;
  state.watchId = navigator.geolocation.watchPosition(
    (pos) => {
      state.lastLat = pos.coords.latitude;
      state.lastLng = pos.coords.longitude;
    },
    () => { /* GPS error — signal degrades */ },
    { enableHighAccuracy: true, maximumAge: 5000 }
  );
}

function stopGeoWatch() {
  if (state.watchId != null) {
    navigator.geolocation.clearWatch(state.watchId);
    state.watchId = null;
  }
}

function restartTimer() {
  if (state.timer) clearInterval(state.timer);
  const ms = INTERVAL_MS[state.phase];
  state.timer = setInterval(pushLocation, ms);
  // Immediate first push
  void pushLocation();
}

/** Set the current phase and restart timer with correct interval */
export function setGPSPhase(phase: GPSPhase) {
  if (state.phase === phase) return;
  state.phase = phase;
  restartTimer();
}

/** Determine phase from job status + distance to pickup */
export function computePhase(
  jobStatus: string | null,
  driverLat: number | null,
  driverLng: number | null,
  pickupLat: number | null,
  pickupLng: number | null,
): GPSPhase {
  if (!jobStatus || jobStatus === "completed" || jobStatus === "cancelled") return "idle";
  if (["in_progress", "rider_arriving_dropoff", "picked_up"].includes(jobStatus)) return "in_progress";
  if (["accepted", "rider_arriving_pickup", "rider_arrived_pickup"].includes(jobStatus)) {
    if (driverLat && driverLng && pickupLat && pickupLng) {
      const dist = haversineKm(driverLat, driverLng, pickupLat, pickupLng);
      return dist < 1.5 ? "assigned_close" : "assigned_far";
    }
    return "assigned_far";
  }
  return "idle";
}

/** Start the adaptive GPS scheduler */
export function startGPSScheduler(opts: {
  userId: string;
  riderProfileId?: string | null;
  jobId?: string | null;
  initialPhase?: GPSPhase;
}) {
  state.userId = opts.userId;
  state.riderProfileId = opts.riderProfileId ?? null;
  state.jobId = opts.jobId ?? null;
  state.phase = opts.initialPhase ?? "idle";
  state.pushCount = 0;
  state.errors = 0;
  startGeoWatch();
  restartTimer();
}

/** Update the active job context */
export function setActiveJob(jobId: string | null) {
  state.jobId = jobId;
}

/** Stop the GPS scheduler completely */
export function stopGPSScheduler() {
  if (state.timer) { clearInterval(state.timer); state.timer = null; }
  stopGeoWatch();
  state.jobId = null;
  state.phase = "idle";
}

/** Get current GPS health for UI display */
export function getGPSHealth(): GPSHealth {
  const sinceLast = state.lastSyncAt ? Date.now() - new Date(state.lastSyncAt).getTime() : Infinity;
  let signal: GPSHealth["signal"] = "strong";
  if (sinceLast > 30_000) signal = "weak";
  if (sinceLast > 60_000 || !state.lastLat) signal = "lost";
  return {
    phase: state.phase,
    lastSyncAt: state.lastSyncAt,
    pushCount: state.pushCount,
    errors: state.errors,
    signal,
  };
}
