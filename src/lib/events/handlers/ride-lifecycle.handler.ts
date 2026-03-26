/**
 * Ride Lifecycle Handler — listens to mobility_jobs realtime changes
 * and emits canonical ride lifecycle events on the eventBus.
 *
 * Brain owner: Execution Brain
 * Source of truth: mobility_jobs table (via Supabase realtime)
 *
 * Emits:
 * - ride.driver.assigned
 * - ride.arrived_pickup
 * - ride.started
 * - ride.completed
 * - ride.cancelled
 * - ride.status.updated
 */
import { eventBus } from "@/lib/core/event-bus";
import { supabase } from "@/integrations/supabase/client";

// Status → canonical event mapping
const STATUS_EVENT_MAP: Record<string, string> = {
  accepted: "ride.driver.assigned",
  rider_arriving_pickup: "ride.status.updated",
  rider_arrived_pickup: "ride.arrived_pickup",
  picked_up: "ride.status.updated",
  in_progress: "ride.started",
  rider_arriving_dropoff: "ride.status.updated",
  completed: "ride.completed",
  cancelled: "ride.cancelled",
  failed_no_rider: "ride.cancelled",
};

// Valid status transitions (guards)
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

// Track previous status per job to detect actual transitions
const previousStatus = new Map<string, string>();

let lifecycleChannel: ReturnType<typeof supabase.channel> | null = null;

/**
 * Start listening to mobility_jobs changes globally.
 * Called once at app init from event-init.ts.
 */
export function initRideLifecycleHandler() {
  if (lifecycleChannel) return; // already initialized

  lifecycleChannel = supabase
    .channel("ride-lifecycle-global")
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

        // Update tracked status
        previousStatus.set(jobId, newStatus);

        // Emit specific lifecycle event
        const specificEvent = STATUS_EVENT_MAP[newStatus];
        if (specificEvent) {
          void eventBus.emit(specificEvent, {
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
          });
        }

        // Always emit generic status update
        void eventBus.emit("ride.status.updated", {
          jobId,
          status: newStatus,
          previousStatus: oldStatus,
          riderUserId: newRow.rider_user_id,
          customerUserId: newRow.customer_user_id,
        });

        if (import.meta.env.DEV) {
          console.log(`[ride-lifecycle] ${jobId}: ${oldStatus} → ${newStatus}`);
        }
      }
    )
    .subscribe();
}

export function stopRideLifecycleHandler() {
  if (lifecycleChannel) {
    supabase.removeChannel(lifecycleChannel);
    lifecycleChannel = null;
  }
  previousStatus.clear();
}
