import { getCanonicalIdentity } from "@/lib/canonical-identity";
import { runAction } from "@/lib/run-action";
import {
  getRide,
  insertRide,
  insertRideEvent,
  insertTrackingPosition,
  listOpenRidesForDrivers,
  listMyRides,
  updateRide,
} from "./repository";
import type { CreateRideInput, RideStatus, RideRow } from "./types";

function computeInitialStatus(input: CreateRideInput): RideStatus {
  return input.bookingMode === "scheduled" ? "scheduled" : "searching";
}

export async function createRide(input: CreateRideInput): Promise<RideRow> {
  const identity = await getCanonicalIdentity();
  if (!identity.authUserId) throw new Error("Authentication required");

  if (input.bookingMode === "scheduled") {
    if (!input.scheduledFor) throw new Error("scheduledFor is required");
    if (new Date(input.scheduledFor).getTime() <= Date.now()) throw new Error("Scheduled date must be in the future");
  }

  return runAction({
    name: "CREATE_RIDE",
    invalidate: ["rides", "driver-open-rides"],
    execute: async () => {
      const ride = await insertRide({
        rider_user_id: identity.authUserId!,
        driver_user_id: null,
        ride_type: input.rideType,
        booking_mode: input.bookingMode,
        status: computeInitialStatus(input),
        pickup_label: input.pickupLabel,
        pickup_lat: input.pickupLat ?? null,
        pickup_lng: input.pickupLng ?? null,
        dropoff_label: input.dropoffLabel,
        dropoff_lat: input.dropoffLat ?? null,
        dropoff_lng: input.dropoffLng ?? null,
        scheduled_for: input.scheduledFor ?? null,
        notes: input.notes ?? null,
        currency: input.currency ?? "AED",
        estimated_price: input.estimatedPrice ?? null,
        final_price: null,
        passenger_name: input.passengerName ?? null,
        passenger_phone: input.passengerPhone ?? null,
      });
      await insertRideEvent(ride.id, "ride.created", identity.authUserId!, {
        bookingMode: input.bookingMode,
        rideType: input.rideType,
      });
      return ride;
    },
  }).then(r => r.data!);
}

export async function acceptRide(rideId: string): Promise<RideRow> {
  const identity = await getCanonicalIdentity();
  if (!identity.authUserId) throw new Error("Authentication required");

  return runAction({
    name: "ACCEPT_RIDE",
    invalidate: ["rides", "driver-open-rides"],
    execute: async () => {
      const ride = await getRide(rideId);
      if (!["searching", "scheduled"].includes(ride.status)) throw new Error("Ride not available");
      if (ride.driver_user_id) throw new Error("Ride already accepted");

      const next = await updateRide(rideId, { driver_user_id: identity.authUserId!, status: "accepted" });
      await insertRideEvent(rideId, "ride.accepted", identity.authUserId!, {});
      return next;
    },
  }).then(r => r.data!);
}

export async function updateRideStatus(rideId: string, status: RideStatus): Promise<RideRow> {
  const identity = await getCanonicalIdentity();

  return runAction({
    name: "UPDATE_RIDE_STATUS",
    invalidate: ["rides"],
    execute: async () => {
      const ride = await updateRide(rideId, { status });
      await insertRideEvent(rideId, `ride.${status}`, identity.authUserId, {});
      return ride;
    },
  }).then(r => r.data!);
}

export async function cancelRide(rideId: string, reason?: string): Promise<RideRow> {
  const identity = await getCanonicalIdentity();

  return runAction({
    name: "CANCEL_RIDE",
    invalidate: ["rides", "driver-open-rides"],
    execute: async () => {
      const ride = await getRide(rideId);
      if (["completed", "cancelled"].includes(ride.status)) throw new Error("Cannot cancel");
      const next = await updateRide(rideId, { status: "cancelled" });
      await insertRideEvent(rideId, "ride.cancelled", identity.authUserId, { reason: reason ?? null });
      return next;
    },
  }).then(r => r.data!);
}

export async function pushMyTracking(input: {
  rideId: string;
  lat: number;
  lng: number;
  heading?: number | null;
  speedKmh?: number | null;
  accuracyM?: number | null;
}) {
  const identity = await getCanonicalIdentity();
  if (!identity.authUserId) throw new Error("Authentication required");

  return insertTrackingPosition({
    rideId: input.rideId,
    userId: identity.authUserId,
    lat: input.lat,
    lng: input.lng,
    heading: input.heading,
    speedKmh: input.speedKmh,
    accuracyM: input.accuracyM,
  });
}

export async function fetchMyRides() {
  const identity = await getCanonicalIdentity();
  if (!identity.authUserId) return [];
  return listMyRides(identity.authUserId);
}

export async function fetchDriverOpenRides() {
  return listOpenRidesForDrivers();
}
