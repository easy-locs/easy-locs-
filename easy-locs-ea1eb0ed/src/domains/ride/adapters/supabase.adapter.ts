import type { RideRepository, RideDetail, RideDriverInfo, RideJobStatus } from "../ports";
import { createDomainLogger } from "../../shared/observability";
import * as mobRepo from "@/repositories/mobility.repository";

const log = createDomainLogger("ride");

function mapJobToDetail(row: any): RideDetail {
  return {
    id: row.id,
    status: row.status,
    customerUserId: row.customer_user_id ?? "",
    riderUserId: row.rider_user_id ?? undefined,
    pickupLat: row.pickup_lat ?? 0,
    pickupLng: row.pickup_lng ?? 0,
    pickupAddress: row.pickup_address ?? "",
    pickupLabel: row.pickup_label,
    dropoffLat: row.dropoff_lat ?? 0,
    dropoffLng: row.dropoff_lng ?? 0,
    dropoffAddress: row.dropoff_address ?? "",
    dropoffLabel: row.dropoff_label,
    vehicleType: row.service_level ?? "taxi_standard",
    quotedPrice: row.quoted_price ?? 0,
    currentPrice: row.current_price ?? 0,
    currency: row.currency ?? "AED",
    confirmationCode: row.confirmation_code,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    driver: row.rider_user_id
      ? {
          userId: row.rider_user_id,
          fullName: row.rider_name ?? "Driver",
          photoUrl: row.rider_photo_url,
          plateNumber: row.vehicle_plate,
          vehicleBrand: row.vehicle_brand,
          vehicleModel: row.vehicle_model,
          vehicleColor: row.vehicle_color,
          ratingAvg: row.rider_rating ?? 0,
          totalCompletedRides: row.rider_total_trips ?? 0,
        }
      : undefined,
  };
}

function getPeriodDates(period: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString();
  let start: Date;

  switch (period) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      break;
    case "month":
      start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      break;
    default:
      start = new Date(now);
      start.setDate(start.getDate() - 30);
  }

  return { start: start.toISOString(), end };
}

export const rideRepository: RideRepository = {
  async findJobById(id: string): Promise<RideDetail | null> {
    try {
      const row = await mobRepo.fetchMobilityJobMaybe(id);
      return row ? mapJobToDetail(row) : null;
    } catch (err) {
      log.error("find_job_by_id", err instanceof Error ? err : new Error(String(err)));
      return null;
    }
  },

  async findJobsByUser(userId: string, period: string): Promise<RideDetail[]> {
    const { start } = getPeriodDates(period);
    const rows = await mobRepo.fetchMobilityJobs({
      customerUserId: userId,
      jobTypes: ["taxi"],
      orderBy: "created_at",
      ascending: false,
    });
    return rows
      .filter((r: any) => new Date(r.created_at) >= new Date(start))
      .map(mapJobToDetail);
  },

  async findDriverCompletedJobs(driverId: string, startDate: string, endDate: string): Promise<any[]> {
    const rows = await mobRepo.fetchMobilityJobs({
      riderUserId: driverId,
      jobTypes: ["taxi"],
      statuses: ["completed"],
      orderBy: "completed_at",
      ascending: false,
    });
    return rows.filter((r: any) => {
      const completedAt = r.completed_at ? new Date(r.completed_at) : null;
      return completedAt && completedAt >= new Date(startDate) && completedAt <= new Date(endDate);
    });
  },

  async findDriverOfferStats(driverId: string, startDate: string, endDate: string): Promise<{ received: number; accepted: number }> {
    try {
      const { db } = await import("@/services/db");
      const { data: offers } = await db
        .from("mobility_job_offers")
        .select("status")
        .eq("rider_user_id", driverId)
        .gte("offered_at", startDate)
        .lte("offered_at", endDate);

      const all = offers ?? [];
      return {
        received: all.length,
        accepted: all.filter((o: any) => o.status === "accepted").length,
      };
    } catch {
      return { received: 0, accepted: 0 };
    }
  },

  async updateJobStatus(jobId: string, status: RideJobStatus): Promise<void> {
    const statusTimestamp: Record<string, string> = {
      accepted: "accepted_at",
      in_progress: "started_at",
      completed: "completed_at",
    };
    const updates: Record<string, any> = { status };
    if (statusTimestamp[status]) {
      updates[statusTimestamp[status]] = new Date().toISOString();
    }
    await mobRepo.updateMobilityJob(jobId, updates);
    log.info("job_status_updated", { jobId, status });
  },

  async fetchDriverInfo(userId: string): Promise<RideDriverInfo | null> {
    try {
      const { db } = await import("@/services/db");
      const { data: profile } = await db
        .from("profiles")
        .select("id, name, first_name, last_name, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      if (!profile) return null;

      const { data: riderProfile } = await db
        .from("rider_profiles")
        .select("plate_number, vehicle_brand, vehicle_model, vehicle_color, rating, total_completed_rides")
        .eq("user_id", userId)
        .maybeSingle();

      return {
        userId: profile.id,
        fullName: profile.name || [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Driver",
        photoUrl: profile.avatar_url,
        plateNumber: riderProfile?.plate_number,
        vehicleBrand: riderProfile?.vehicle_brand,
        vehicleModel: riderProfile?.vehicle_model,
        vehicleColor: riderProfile?.vehicle_color,
        ratingAvg: riderProfile?.rating ?? 0,
        totalCompletedRides: riderProfile?.total_completed_rides ?? 0,
      };
    } catch (err) {
      log.error("fetch_driver_info", err instanceof Error ? err : new Error(String(err)));
      return null;
    }
  },

  async toggleOnline(userId: string, online: boolean): Promise<void> {
    try {
      const profile = await mobRepo.fetchRiderProfile(userId);
      if (profile) {
        await mobRepo.updateRiderProfile(profile.id, {
          is_online: online,
          is_available: online,
        });
      }
      await mobRepo.upsertRiderPresence({
        rider_user_id: userId,
        is_online: online,
        is_available: online,
        last_seen_at: new Date().toISOString(),
      });
      log.info("driver_online_toggled", { userId, online });
    } catch (err) {
      log.error("toggle_online", err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  },

  subscribeOffers(userId: string, callback: (payload: any) => void): { unsubscribe: () => void } {
    const ch = mobRepo.subscribeToTable(
      `driver-offers:${userId}`,
      "mobility_job_offers",
      `rider_user_id=eq.${userId}`,
      callback
    );
    return {
      unsubscribe: () => mobRepo.unsubscribeChannel(ch),
    };
  },

  async fetchJobRaw(jobId: string): Promise<any | null> {
    try {
      return await mobRepo.fetchMobilityJobMaybe(jobId);
    } catch {
      return null;
    }
  },

  async insertClientRating(data): Promise<void> {
    try {
      const { db } = await import("@/services/db");
      await db.from("client_ratings").insert({
        job_id: data.jobId,
        rider_user_id: data.riderUserId,
        client_user_id: data.clientUserId,
        rating: data.rating,
        comment: data.comment || null,
      });
      log.info("client_rating_inserted", { jobId: data.jobId, rating: data.rating });
    } catch (err) {
      log.error("insert_client_rating", err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  },
};
