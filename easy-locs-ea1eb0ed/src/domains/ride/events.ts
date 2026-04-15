import { publishDomainEvent, createDomainEvent } from "../shared/domain-event-bus";
import type { RideEventPort } from "./ports";

export const rideEvents: RideEventPort = {
  rideRequested(jobId: string, customerId: string) {
    publishDomainEvent(
      createDomainEvent("ride:requested", jobId, "ride_job", {
        jobId,
        customerId,
      }, "ride")
    );
  },

  offerSent(jobId: string, riderId: string) {
    publishDomainEvent(
      createDomainEvent("ride:offer_sent", jobId, "ride_job", {
        jobId,
        riderId,
      }, "ride")
    );
  },

  rideAccepted(jobId: string, riderId: string, customerId: string) {
    publishDomainEvent(
      createDomainEvent("ride:accepted", jobId, "ride_job", {
        jobId,
        riderId,
        customerId,
      }, "ride")
    );
  },

  driverArriving(jobId: string, customerId: string) {
    publishDomainEvent(
      createDomainEvent("ride:driver_arriving", jobId, "ride_job", {
        jobId,
        customerId,
      }, "ride")
    );
  },

  driverArrived(jobId: string, customerId: string) {
    publishDomainEvent(
      createDomainEvent("ride:driver_arrived", jobId, "ride_job", {
        jobId,
        customerId,
      }, "ride")
    );
  },

  tripStarted(jobId: string, customerId: string) {
    publishDomainEvent(
      createDomainEvent("ride:trip_started", jobId, "ride_job", {
        jobId,
        customerId,
      }, "ride")
    );
  },

  tripCompleted(jobId: string, customerId: string, riderId: string, fare: number, currency: string) {
    publishDomainEvent(
      createDomainEvent("ride:trip_completed", jobId, "ride_job", {
        jobId,
        customerId,
        riderId,
        fare,
        currency,
      }, "ride")
    );
  },

  rideCancelled(jobId: string, cancelledBy: string, reason: string) {
    publishDomainEvent(
      createDomainEvent("ride:cancelled", jobId, "ride_job", {
        jobId,
        cancelledBy,
        reason,
      }, "ride")
    );
  },
};
