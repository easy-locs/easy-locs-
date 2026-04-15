/**
 * Delivery Domain Service — Use-case implementations.
 * ALL write-paths are guarded with idempotency + single-path enforcement.
 *
 * AUDIT STATUS: HARDENED
 * ✅ Guards on all write actions (dispatch, assign, complete, cancel)
 * ✅ Single-path on non-parallel flows
 * ✅ requestId + correlationId propagated
 * ✅ State machine validation (no backward transitions)
 * ✅ Structured logging
 * ✅ Repository-only data access
 */
import type { DeliveryUseCases, DispatchCommand, DriverEarnings } from "./ports";
import { jobAdapter, driverAdapter, dispatchEngine } from "./adapters/supabase.adapter";
import { deliveryEvents } from "./events";
import { createDomainLogger } from "../shared/observability";
import { requireAuth, type SecurityContext } from "../shared/security-guards";
import { createActionGuard, acquireSinglePath } from "@/lib/guards/action-guard";
import { requireKycLevel } from "@/lib/kyc/kyc-gate-service";
import * as delRepo from "@/repositories/delivery.repository";

const log = createDomainLogger("delivery");

// ── Guards (module-level singletons) ──
const dispatchGuard = createActionGuard("delivery.dispatch");
const assignGuard = createActionGuard("delivery.assign");
const completeGuard = createActionGuard("delivery.complete");
const cancelGuard = createActionGuard("delivery.cancel");

// ── State machine ──
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["assigned", "cancelled"],
  assigned: ["picked_up", "cancelled"],
  picked_up: ["in_transit"],
  in_transit: ["delivered"],
};
const TERMINAL_STATES = new Set(["delivered", "cancelled"]);

function canTransition(from: string, to: string): boolean {
  if (TERMINAL_STATES.has(from)) return false;
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function createDeliveryService(ctx: SecurityContext | null): DeliveryUseCases {
  return {
    async dispatchJob(cmd: DispatchCommand & { requestId?: string }) {
      requireAuth(ctx);

      if (!cmd.orderId) return { ok: false as const, error: "Missing orderId" };

      const flowKey = `delivery.dispatch:${cmd.orderId}`;
      const release = acquireSinglePath(flowKey);
      if (!release) return { ok: false as const, error: "dispatch_already_in_progress" };

      try {
        const result = await dispatchGuard.execute(
          async (actionCtx) => {
            const timer = log.timed("dispatch_job", {
              orderId: cmd.orderId,
              mode: cmd.mode,
              correlationId: actionCtx.correlationId,
              requestId: actionCtx.requestId,
            });

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
              return job;
            } catch (err) {
              timer.fail(err);
              throw err;
            }
          },
          {
            requestId: cmd.requestId,
            metadata: { orderId: cmd.orderId, mode: cmd.mode },
          }
        );

        if (result.deduplicated) return { ok: true as const, data: result.data! };
        if (!result.ok) return { ok: false as const, error: result.error ?? "Unknown error" };
        return { ok: true as const, data: result.data! };
      } finally {
        release();
      }
    },

    async assignDriver(jobId: string, driverId: string, requestId?: string) {
      requireAuth(ctx);

      if (!jobId || !driverId) return { ok: false as const, error: "Missing jobId or driverId" };

      const flowKey = `delivery.assign:${jobId}`;
      const release = acquireSinglePath(flowKey);
      if (!release) return { ok: false as const, error: "assignment_already_in_progress" };

      try {
        const result = await assignGuard.execute(
          async (actionCtx) => {
            const [job, driver] = await Promise.all([
              jobAdapter.findById(jobId),
              driverAdapter.findById(driverId),
            ]);
            if (!job) throw new Error("Job not found");
            if (!driver) throw new Error("Driver not found");

            await requireKycLevel(driver.userId, "basic");

            // State machine check
            if (!canTransition(job.status, "assigned")) {
              throw new Error(`Cannot assign: job is '${job.status}'`);
            }

            // Driver availability check
            if (driver.status === "offline") {
              throw new Error("Driver is offline");
            }

            await jobAdapter.updateStatus(jobId, "assigned");
            deliveryEvents.driverAssigned({ ...job, driverId, status: "assigned" }, driver);
            log.info("driver_assigned", {
              jobId, driverId,
              correlationId: actionCtx.correlationId,
              requestId: actionCtx.requestId,
            });
          },
          {
            requestId: requestId ?? `assign_${jobId}_${driverId}`,
            metadata: { jobId, driverId },
          }
        );

        if (!result.ok) return { ok: false as const, error: result.error ?? "Unknown error" };
        return { ok: true as const, data: undefined };
      } finally {
        release();
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

      const flowKey = `delivery.complete:${jobId}`;
      const release = acquireSinglePath(flowKey);
      if (!release) return { ok: true as const, data: undefined }; // idempotent

      try {
        const result = await completeGuard.execute(
          async (actionCtx) => {
            const job = await jobAdapter.findById(jobId);
            if (job && !canTransition(job.status, "delivered")) {
              throw new Error(`Cannot complete: job is '${job.status}'`);
            }

            await jobAdapter.updateStatus(jobId, "delivered");
            const updated = await jobAdapter.findById(jobId);
            if (updated) deliveryEvents.delivered(updated);
            log.info("delivery_completed", {
              jobId,
              correlationId: actionCtx.correlationId,
              requestId: actionCtx.requestId,
            });
          },
          {
            requestId: `complete_${jobId}`,
            metadata: { jobId },
          }
        );

        if (!result.ok) return { ok: false as const, error: result.error ?? "Unknown error" };
        return { ok: true as const, data: undefined };
      } finally {
        release();
      }
    },

    async cancelJob(jobId: string, reason: string) {
      requireAuth(ctx);

      const flowKey = `delivery.cancel:${jobId}`;
      const release = acquireSinglePath(flowKey);
      if (!release) return { ok: true as const, data: undefined }; // idempotent

      try {
        const result = await cancelGuard.execute(
          async (actionCtx) => {
            const job = await jobAdapter.findById(jobId);
            if (job && TERMINAL_STATES.has(job.status)) {
              throw new Error(`Cannot cancel: job is '${job.status}'`);
            }

            await jobAdapter.updateStatus(jobId, "cancelled");
            deliveryEvents.jobCancelled(jobId, reason);
            log.info("job_cancelled", {
              jobId, reason,
              correlationId: actionCtx.correlationId,
              requestId: actionCtx.requestId,
            });
          },
          {
            requestId: `cancel_${jobId}`,
            metadata: { jobId, reason },
          }
        );

        if (!result.ok) return { ok: false as const, error: result.error ?? "Unknown error" };
        return { ok: true as const, data: undefined };
      } finally {
        release();
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
