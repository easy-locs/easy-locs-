import type { RideUseCases, RequestRideCommand, RideJobStatus, RideVehicleType } from "./ports";
import { rideRepository } from "./adapters/supabase.adapter";
import { rideEvents } from "./events";
import { calculateEstimate, calculateCommission } from "./pricing";
import { createDomainLogger } from "../shared/observability";
import { requireAuth, type SecurityContext } from "../shared/security-guards";
import { createActionGuard, acquireSinglePath } from "@/lib/guards/action-guard";
import * as mobRepo from "@/repositories/mobility.repository";

const log = createDomainLogger("ride");

const requestGuard = createActionGuard("ride.request");
const respondGuard = createActionGuard("ride.respond");
const advanceGuard = createActionGuard("ride.advance");
const cancelGuard = createActionGuard("ride.cancel");
const rateGuard = createActionGuard("ride.rate_client");

function estimateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.3;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  searching: ["accepted", "cancelled", "failed_no_rider", "expired"],
  accepted: ["rider_arriving_pickup", "cancelled"],
  rider_arriving_pickup: ["rider_arrived_pickup", "cancelled"],
  rider_arrived_pickup: ["in_progress", "cancelled"],
  in_progress: ["completed"],
};
const TERMINAL_STATES = new Set(["completed", "cancelled", "failed_no_rider", "expired"]);

function canTransition(from: string, to: string): boolean {
  if (TERMINAL_STATES.has(from)) return false;
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

function mapVehicleTypeToServiceLevel(vt: RideVehicleType): string {
  const map: Record<RideVehicleType, string> = {
    economy: "taxi_standard",
    comfort: "taxi_premium",
    premium: "taxi_xl",
  };
  return map[vt] ?? "taxi_standard";
}

export function createRideService(ctx: SecurityContext | null): RideUseCases {
  return {
    async estimatePrice(pickup, dropoff, vehicleType) {
      try {
        const estimate = calculateEstimate(
          pickup.lat, pickup.lng,
          dropoff.lat, dropoff.lng,
          vehicleType
        );
        return { ok: true as const, data: estimate };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async requestRide(cmd: RequestRideCommand) {
      requireAuth(ctx);

      const flowKey = `ride.request:${ctx!.userId}`;
      const release = acquireSinglePath(flowKey);
      if (!release) return { ok: false as const, error: "request_already_in_progress" };

      try {
        const result = await requestGuard.execute(
          async (actionCtx) => {
            const timer = log.timed("request_ride", {
              userId: ctx!.userId,
              vehicleType: cmd.vehicleType,
              correlationId: actionCtx.correlationId,
            });

            try {
              const serviceLevel = mapVehicleTypeToServiceLevel(cmd.vehicleType);
              const estimate = calculateEstimate(
                cmd.pickupLat, cmd.pickupLng,
                cmd.dropoffLat, cmd.dropoffLng,
                cmd.vehicleType
              );

              const data = await mobRepo.invokeDispatchRide({
                action: "create_job",
                job_type: "taxi",
                service_level: serviceLevel,
                booking_mode: "now",
                pickup_label: cmd.pickupLabel || cmd.pickupAddress,
                pickup_address: cmd.pickupAddress,
                pickup_lat: cmd.pickupLat,
                pickup_lng: cmd.pickupLng,
                dropoff_label: cmd.dropoffLabel || cmd.dropoffAddress,
                dropoff_address: cmd.dropoffAddress,
                dropoff_lat: cmd.dropoffLat,
                dropoff_lng: cmd.dropoffLng,
                seats_requested: cmd.seatsRequested || 1,
                quoted_price: estimate.estimatedPrice,
                currency: estimate.currency,
                payment_method: cmd.paymentMethod || "cash",
              });

              const jobId = data?.job?.id ?? data?.id;
              const confirmationCode = data?.confirmation_code ?? data?.job?.confirmation_code ?? "";

              if (jobId) {
                rideEvents.rideRequested(jobId, ctx!.userId);
              }

              timer.done();
              return { jobId, confirmationCode };
            } catch (err) {
              timer.fail(err);
              throw err;
            }
          },
          { requestId: `request_${ctx!.userId}_${Date.now()}`, metadata: { userId: ctx!.userId } }
        );

        if (result.deduplicated) return { ok: true as const, data: result.data! };
        if (!result.ok) return { ok: false as const, error: result.error ?? "Unknown error" };
        return { ok: true as const, data: result.data! };
      } finally {
        release();
      }
    },

    async respondToOffer(offerId, action) {
      requireAuth(ctx);

      const flowKey = `ride.respond:${offerId}`;
      const release = acquireSinglePath(flowKey);
      if (!release) return { ok: false as const, error: "response_already_in_progress" };

      try {
        const result = await respondGuard.execute(
          async () => {
            await mobRepo.invokeDispatchRide({
              action: action === "accept" ? "accept_offer" : "reject_offer",
              offer_id: offerId,
            });
            log.info("offer_responded", { offerId, action });
          },
          { requestId: `respond_${offerId}_${action}`, metadata: { offerId, action } }
        );

        if (!result.ok) return { ok: false as const, error: result.error ?? "Unknown error" };
        return { ok: true as const, data: undefined };
      } finally {
        release();
      }
    },

    async advanceStatus(jobId, newStatus) {
      requireAuth(ctx);

      const flowKey = `ride.advance:${jobId}`;
      const release = acquireSinglePath(flowKey);
      if (!release) return { ok: true as const, data: undefined };

      try {
        const result = await advanceGuard.execute(
          async () => {
            const job = await rideRepository.findJobById(jobId);
            if (!job) throw new Error("Job not found");

            if (!canTransition(job.status, newStatus)) {
              throw new Error(`Cannot transition from '${job.status}' to '${newStatus}'`);
            }

            await mobRepo.invokeDispatchRide({
              action: "advance_status",
              job_id: jobId,
              new_status: newStatus,
            });

            const customerId = job.customerUserId;

            switch (newStatus) {
              case "rider_arriving_pickup":
                rideEvents.driverArriving(jobId, customerId);
                break;
              case "rider_arrived_pickup":
                rideEvents.driverArrived(jobId, customerId);
                break;
              case "in_progress":
                rideEvents.tripStarted(jobId, customerId);
                break;
              case "completed":
                rideEvents.tripCompleted(
                  jobId,
                  customerId,
                  ctx!.userId,
                  job.currentPrice,
                  job.currency
                );
                break;
            }

            log.info("status_advanced", { jobId, from: job.status, to: newStatus });
          },
          { requestId: `advance_${jobId}_${newStatus}`, metadata: { jobId, newStatus } }
        );

        if (!result.ok) return { ok: false as const, error: result.error ?? "Unknown error" };
        return { ok: true as const, data: undefined };
      } finally {
        release();
      }
    },

    async cancelRide(jobId, reason) {
      requireAuth(ctx);

      const flowKey = `ride.cancel:${jobId}`;
      const release = acquireSinglePath(flowKey);
      if (!release) return { ok: true as const, data: undefined };

      try {
        const result = await cancelGuard.execute(
          async () => {
            const job = await rideRepository.findJobById(jobId);
            if (job && TERMINAL_STATES.has(job.status)) {
              throw new Error(`Cannot cancel: ride is '${job.status}'`);
            }

            await mobRepo.invokeDispatchRide({
              action: "advance_status",
              job_id: jobId,
              new_status: "cancelled",
            });

            rideEvents.rideCancelled(jobId, ctx!.userId, reason);
            log.info("ride_cancelled", { jobId, reason });
          },
          { requestId: `cancel_${jobId}`, metadata: { jobId, reason } }
        );

        if (!result.ok) return { ok: false as const, error: result.error ?? "Unknown error" };
        return { ok: true as const, data: undefined };
      } finally {
        release();
      }
    },

    async getRideDetail(jobId) {
      requireAuth(ctx);
      try {
        const detail = await rideRepository.findJobById(jobId);
        if (!detail) return { ok: false as const, error: "Ride not found" };

        if (detail.driver?.userId && !detail.driver.plateNumber) {
          const driverInfo = await rideRepository.fetchDriverInfo(detail.driver.userId);
          if (driverInfo) {
            detail.driver = driverInfo;
          }
        }

        return { ok: true as const, data: detail };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async getRideHistory(userId, period) {
      requireAuth(ctx);
      try {
        const rides = await rideRepository.findJobsByUser(userId, period);
        return { ok: true as const, data: rides };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async getDriverStats(driverId, period) {
      requireAuth(ctx);
      try {
        const { start, end } = (() => {
          const now = new Date();
          const e = now.toISOString();
          let s: Date;
          switch (period) {
            case "today":
              s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              break;
            case "week":
              s = new Date(now); s.setDate(s.getDate() - 7);
              break;
            case "month":
              s = new Date(now); s.setMonth(s.getMonth() - 1);
              break;
            default:
              s = new Date(now); s.setDate(s.getDate() - 30);
          }
          return { start: s.toISOString(), end: e };
        })();

        const completedJobs = await rideRepository.findDriverCompletedJobs(driverId, start, end);
        const offerStats = await rideRepository.findDriverOfferStats(driverId, start, end);

        const totalEarnings = completedJobs.reduce((sum: number, j: any) =>
          sum + (j.current_price ?? j.quoted_price ?? 0), 0);

        const dailyMap = new Map<string, { earnings: number; trips: number }>();
        for (const j of completedJobs) {
          const date = j.completed_at
            ? new Date(j.completed_at).toISOString().split("T")[0]
            : new Date(j.created_at).toISOString().split("T")[0];
          const entry = dailyMap.get(date) ?? { earnings: 0, trips: 0 };
          entry.earnings += j.current_price ?? j.quoted_price ?? 0;
          entry.trips += 1;
          dailyMap.set(date, entry);
        }

        const dailyBreakdown = Array.from(dailyMap.entries())
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => a.date.localeCompare(b.date));

        let totalDistanceKm = 0;
        const recentTrips = completedJobs.slice(0, 50).map((j: any) => {
          const gross = j.current_price ?? j.quoted_price ?? 0;
          const commission = calculateCommission(gross);
          const tripDuration = j.started_at && j.completed_at
            ? Math.round((new Date(j.completed_at).getTime() - new Date(j.started_at).getTime()) / 60000)
            : 0;
          const tripDist = (j.pickup_lat && j.dropoff_lat)
            ? estimateDistanceKm(j.pickup_lat, j.pickup_lng, j.dropoff_lat, j.dropoff_lng)
            : 0;
          totalDistanceKm += tripDist;
          return {
            id: j.id,
            pickupLabel: j.pickup_label ?? j.pickup_address ?? "Pickup",
            dropoffLabel: j.dropoff_label ?? j.dropoff_address ?? "Dropoff",
            duration: tripDuration,
            distance: Math.round(tripDist * 10) / 10,
            grossAmount: gross,
            commission,
            netAmount: Math.round((gross - commission) * 100) / 100,
            completedAt: j.completed_at ?? j.created_at,
          };
        });

        const totalTripMinutes = completedJobs.reduce((sum: number, j: any) => {
          if (j.accepted_at && j.completed_at) {
            return sum + (new Date(j.completed_at).getTime() - new Date(j.accepted_at).getTime()) / 60000;
          }
          return sum;
        }, 0);
        const hoursOnline = Math.round((totalTripMinutes / 60) * 10) / 10;

        const acceptanceRate = offerStats.received > 0
          ? Math.round((offerStats.accepted / offerStats.received) * 100)
          : 100;

        return {
          ok: true as const,
          data: {
            totalEarnings: Math.round(totalEarnings * 100) / 100,
            totalTrips: completedJobs.length,
            totalDistance: Math.round(totalDistanceKm * 10) / 10,
            hoursOnline,
            acceptanceRate,
            currency: "AED",
            dailyBreakdown,
            recentTrips,
          },
        };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async rateClient(jobId, riderUserId, clientUserId, rating, comment) {
      requireAuth(ctx);

      const flowKey = `ride.rate_client:${jobId}`;
      const release = acquireSinglePath(flowKey);
      if (!release) return { ok: true as const, data: undefined };

      try {
        const result = await rateGuard.execute(
          async () => {
            await rideRepository.insertClientRating({
              jobId,
              riderUserId,
              clientUserId,
              rating,
              comment,
            });
            log.info("client_rated", { jobId, rating });
          },
          { requestId: `rate_client_${jobId}`, metadata: { jobId, rating } }
        );

        if (!result.ok) return { ok: false as const, error: result.error ?? "Unknown error" };
        return { ok: true as const, data: undefined };
      } finally {
        release();
      }
    },

    async toggleDriverOnline(online: boolean) {
      requireAuth(ctx);
      try {
        await rideRepository.toggleOnline(ctx!.userId, online);
        return { ok: true as const, data: undefined };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },

    subscribeToOffers(callback: (offer: any) => void) {
      requireAuth(ctx);
      return rideRepository.subscribeOffers(ctx!.userId, callback);
    },

    async fetchJobRaw(jobId: string) {
      requireAuth(ctx);
      try {
        const job = await rideRepository.fetchJobRaw(jobId);
        if (!job) return { ok: false as const, error: "Job not found" };
        return { ok: true as const, data: job };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}
