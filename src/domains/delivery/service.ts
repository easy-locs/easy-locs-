/**
 * Delivery Domain Service — Use-case implementations.
 */
import type { DeliveryUseCases, DispatchCommand, DriverEarnings } from "./ports";
import type { Money, DomainResult } from "../shared/types";
import { jobAdapter, driverAdapter, dispatchEngine } from "./adapters/supabase.adapter";
import { deliveryEvents } from "./events";
import { createDomainLogger } from "../shared/observability";
import { requireAuth, type SecurityContext } from "../shared/security-guards";
import * as delRepo from "@/repositories/delivery.repository";

const log = createDomainLogger("delivery");

export function createDeliveryService(ctx: SecurityContext | null): DeliveryUseCases {
  return {
    async dispatchJob(cmd: DispatchCommand) {
      requireAuth(ctx);
      const timer = log.timed("dispatch_job", { orderId: cmd.orderId, mode: cmd.mode });

      try {
        const job = {
          id: crypto.randomUUID(),
          orderId: cmd.orderId,
          driverId: undefined,
          pickup: cmd.pickup,
          dropoff: cmd.dropoff,
          status: "pending" as const,
          mode: cmd.mode,
          estimatedMinutes: await dispatchEngine.calculateETA(cmd.pickup, cmd.dropoff),
          fee: cmd.fee,
          createdAt: new Date().toISOString(),
        };

        await jobAdapter.save(job);
        deliveryEvents.jobDispatched(job);
        timer.done();
        return { ok: true as const, data: job };
      } catch (err) {
        timer.fail(err);
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async assignDriver(jobId: string, driverId: string) {
      requireAuth(ctx);
      try {
        const [job, driver] = await Promise.all([
          jobAdapter.findById(jobId),
          driverAdapter.findById(driverId),
        ]);
        if (!job) return { ok: false as const, error: "Job not found" };
        if (!driver) return { ok: false as const, error: "Driver not found" };

        await jobAdapter.updateStatus(jobId, "assigned");
        deliveryEvents.driverAssigned({ ...job, driverId, status: "assigned" }, driver);
        log.info("driver_assigned", { jobId, driverId });
        return { ok: true as const, data: undefined };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async updateTracking(update) {
      requireAuth(ctx);
      try {
        deliveryEvents.trackingUpdated(update);
        return { ok: true as const, data: undefined };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async completeDelivery(jobId: string, _proof?: string) {
      requireAuth(ctx);
      try {
        await jobAdapter.updateStatus(jobId, "delivered");
        const job = await jobAdapter.findById(jobId);
        if (job) deliveryEvents.delivered(job);
        log.info("delivery_completed", { jobId });
        return { ok: true as const, data: undefined };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async cancelJob(jobId: string, reason: string) {
      requireAuth(ctx);
      try {
        await jobAdapter.updateStatus(jobId, "cancelled");
        deliveryEvents.jobCancelled(jobId, reason);
        log.info("job_cancelled", { jobId, reason });
        return { ok: true as const, data: undefined };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async getDriverEarnings(driverId: string, period: string) {
      requireAuth(ctx);
      try {
        const jobs = await delRepo.fetchDriverJobs(driverId, period);
        const completed = jobs.filter((j: any) => j.status === "completed" || j.status === "delivered");
        const total = completed.reduce((sum: number, j: any) => sum + (j.current_price ?? 0), 0);

        const earnings: DriverEarnings = {
          total: { amount: total, currency: "XOF" },
          trips: completed.length,
          tips: { amount: 0, currency: "XOF" },
          period,
        };

        return { ok: true as const, data: earnings };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}
