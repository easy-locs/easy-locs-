/**
 * Mobility Status Machine — strict transition guards.
 * Single source of truth for allowed status transitions.
 * No UI or backend may bypass this.
 */

export const MOBILITY_STATUSES = [
  "draft", "pricing", "searching", "offered", "accepted",
  "rider_arriving_pickup", "rider_arrived_pickup", "picked_up",
  "in_progress", "rider_arriving_dropoff",
  "completed", "cancelled", "failed_no_rider",
] as const;

export type MobilityStatus = typeof MOBILITY_STATUSES[number];

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

/** Check if a transition is valid */
export function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Get all valid next statuses from current */
export function getNextStatuses(current: string): string[] {
  return VALID_TRANSITIONS[current] ?? [];
}

/** Whether the status is a final/terminal state */
export function isFinalStatus(status: string): boolean {
  return ["completed", "cancelled", "failed_no_rider"].includes(status);
}

/** Whether the status represents an active ride (driver assigned + moving) */
export function isActiveRideStatus(status: string): boolean {
  return ["accepted", "rider_arriving_pickup", "rider_arrived_pickup", "picked_up", "in_progress", "rider_arriving_dropoff"].includes(status);
}

/** Whether the ride is pre-pickup phase */
export function isPrePickupStatus(status: string): boolean {
  return ["accepted", "rider_arriving_pickup"].includes(status);
}

/** Whether the ride is in-trip phase */
export function isInTripStatus(status: string): boolean {
  return ["picked_up", "in_progress", "rider_arriving_dropoff"].includes(status);
}

/** Whether cancellation is allowed from this status */
export function canCancel(status: string): boolean {
  return VALID_TRANSITIONS[status]?.includes("cancelled") ?? false;
}

/** Get the timeline step index for UI (0-4) */
export function getTimelineStep(status: string): number {
  const steps: Record<string, number> = {
    draft: -1, pricing: -1, searching: 0, offered: 0,
    accepted: 1, rider_arriving_pickup: 1,
    rider_arrived_pickup: 2, picked_up: 2,
    in_progress: 3, rider_arriving_dropoff: 3,
    completed: 4,
    cancelled: -1, failed_no_rider: -1,
  };
  return steps[status] ?? -1;
}

/** Get the driver's next action label and target status */
export function getDriverNextAction(status: string): { nextStatus: string; labelKey: string } | null {
  const actions: Record<string, { nextStatus: string; labelKey: string }> = {
    accepted: { nextStatus: "rider_arriving_pickup", labelKey: "ride.action_navigate_pickup" },
    rider_arriving_pickup: { nextStatus: "rider_arrived_pickup", labelKey: "ride.action_arrived_pickup" },
    rider_arrived_pickup: { nextStatus: "picked_up", labelKey: "ride.action_confirm_pickup" },
    picked_up: { nextStatus: "in_progress", labelKey: "ride.action_start_trip" },
    in_progress: { nextStatus: "completed", labelKey: "ride.action_complete" },
    rider_arriving_dropoff: { nextStatus: "completed", labelKey: "ride.action_complete" },
  };
  return actions[status] ?? null;
}
