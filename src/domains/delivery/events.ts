/**
 * Delivery Domain — Event adapter.
 */
import { publishDomainEvent, createDomainEvent } from "../shared/domain-event-bus";
import type { DeliveryEventPort, DeliveryJob, Driver, TrackingUpdate } from "./ports";

export const deliveryEvents: DeliveryEventPort = {
  jobDispatched(job: DeliveryJob) {
    publishDomainEvent(
      createDomainEvent("dispatch:job_created", job.id, "delivery_job", {
        orderId: job.orderId, mode: job.mode,
        pickup: job.pickup, dropoff: job.dropoff,
      }, "delivery")
    );
  },

  driverAssigned(job: DeliveryJob, driver: Driver) {
    publishDomainEvent(
      createDomainEvent("dispatch:driver_assigned", job.id, "delivery_job", {
        jobId: job.id, driverId: driver.id, driverName: driver.name,
      }, "delivery")
    );
  },

  trackingUpdated(update: TrackingUpdate) {
    publishDomainEvent(
      createDomainEvent("delivery:tracking_updated", update.jobId, "delivery_job", {
        driverId: update.driverId, location: update.location, eta: update.eta,
      }, "delivery")
    );
  },

  delivered(job: DeliveryJob) {
    publishDomainEvent(
      createDomainEvent("delivery:completed", job.id, "delivery_job", {
        orderId: job.orderId, driverId: job.driverId,
      }, "delivery")
    );
  },

  jobCancelled(jobId: string, reason: string) {
    publishDomainEvent(
      createDomainEvent("delivery:cancelled", jobId, "delivery_job", { reason }, "delivery")
    );
  },
};
