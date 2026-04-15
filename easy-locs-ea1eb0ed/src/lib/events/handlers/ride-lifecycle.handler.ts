/**
 * Ride Lifecycle Handler — listens to mobility_jobs realtime changes
 * and emits canonical ride lifecycle events on the platformBus.
 *
 * Brain owner: Execution Brain
 * Source of truth: mobility_jobs table (via Supabase realtime)
 *
 * Emits:
 * - ride:driver_assigned
 * - ride:arrived_pickup
 * - ride:started
 * - ride:completed
 * - ride:cancelled
 * - ride:status_updated
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";

const STATUS_EVENT_MAP: Record<string, string> = {
  accepted: "ride:driver_assigned",
  rider_arriving_pickup: "ride:status_updated",
  rider_arrived_pickup: "ride:arrived_pickup",
  picked_up: "ride:status_updated",
  in_progress: "ride:started",
  rider_arriving_dropoff: "ride:status_updated",
  completed: "ride:completed",
  cancelled: "ride:cancelled",
  failed_no_rider: "ride:cancelled",
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["pricing", "searching", "cancelled"],
  pricing: ["searching", "cancelled"],
  searching: ["offered", "accepted", "cancelled", "failed_no_rider"],
  offered: ["accepted", "cancelled", "failed_no_rider"],
  accepted: ["rider_arriving_pickup", "cancelled"],
  rider_arriving_pickup: ["rider_arrived_pickup", "cancelled"],
  rider_arrived_pickup: ["picked_up", "cancelled"],
  picked_up: ["in_progress", "rider_arriving_dropoff", "cancelled"],
  in_progress: ["rider_arriving_dropoff", "completed", "cancelled"],
  rider_arriving_dropoff: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  failed_no_rider: [],
};

export function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

const previousStatus = new Map<string, string>();

let lifecycleChannel: ReturnType<typeof createRealtimeChannel> | null = null;

export function initRideLifecycleHandler() {
  if (lifecycleChannel) return;

  lifecycleChannel = createRealtimeChannel("ride-lifecycle-global")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "mobility_jobs" },
      (payload) => {
        const newRow = payload.new as Record<string, unknown>;
        const oldRow = payload.old as Record<string, unknown>;

        const jobId = newRow.id as string;
        const newStatus = newRow.status as string;
        const oldStatus = (oldRow.status as string) || previousStatus.get(jobId) || "";

        if (!newStatus || newStatus === oldStatus) return;

        previousStatus.set(jobId, newStatus);

        const ridePayload = {
          jobId,
          status: newStatus,
          previousStatus: oldStatus,
          riderUserId: newRow.rider_user_id,
          customerUserId: newRow.customer_user_id,
          jobType: newRow.job_type,
          pickupLat: newRow.pickup_lat,
          pickupLng: newRow.pickup_lng,
          dropoffLat: newRow.dropoff_lat,
          dropoffLng: newRow.dropoff_lng,
          currentPrice: newRow.current_price,
          currency: newRow.currency,
        };

        const specificEvent = STATUS_EVENT_MAP[newStatus];
        if (specificEvent && specificEvent !== "ride:status_updated") {
          platformBus.emit(specificEvent, ridePayload, "tracking");
        }

        platformBus.emit("ride:status_updated", ridePayload, "tracking");

        if (import.meta.env.DEV) {
          console.log(`[ride-lifecycle] ${jobId}: ${oldStatus} → ${newStatus}`);
        }
      }
    )
    .subscribe();
}

export function stopRideLifecycleHandler() {
  if (lifecycleChannel) {
    removeRealtimeChannel(lifecycleChannel);
    lifecycleChannel = null;
  }
  previousStatus.clear();
}
