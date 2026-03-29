/**
 * Delivery Domain — Concrete adapters wiring existing repositories to DDD ports.
 */
import type {
  DeliveryJobRepository, DriverRepository, DispatchEnginePort,
  DeliveryJob, Driver, TrackingUpdate,
} from "../ports";
import type { Money, GeoPoint } from "../../shared/types";
import { deliveryEvents } from "../events";
import { createDomainLogger } from "../../shared/observability";
import * as delRepo from "@/repositories/delivery.repository";

const log = createDomainLogger("delivery");

// ── Job Adapter ──
export const jobAdapter: DeliveryJobRepository = {
  async findById(id: string): Promise<DeliveryJob | null> {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase
      .from("mobility_jobs")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data ? mapJob(data) : null;
  },

  async findActive(): Promise<DeliveryJob[]> {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase
      .from("mobility_jobs")
      .select("*")
      .in("status", ["pending", "assigned", "picked_up", "in_transit"])
      .order("created_at", { ascending: false })
      .limit(100);
    return (data ?? []).map(mapJob);
  },

  async save(job: DeliveryJob): Promise<void> {
    const { supabase } = await import("@/integrations/supabase/client");
    await (supabase as any).from("mobility_jobs").upsert({
      id: job.id,
      order_id: job.orderId,
      rider_user_id: job.driverId,
      status: job.status,
      job_type: job.mode,
      current_price: job.fee.amount,
      currency: job.fee.currency,
    });
    log.info("job_saved", { jobId: job.id });
  },

  async updateStatus(id: string, status: DeliveryJob["status"]): Promise<void> {
    const { supabase } = await import("@/integrations/supabase/client");
    await (supabase as any).from("mobility_jobs").update({ status }).eq("id", id);
    log.info("job_status_updated", { jobId: id, status });
  },
};

// ── Driver Adapter ──
export const driverAdapter: DriverRepository = {
  async findById(id: string): Promise<Driver | null> {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase
      .from("profiles")
      .select("id, name, first_name, last_name")
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      userId: data.id,
      name: data.name || [data.first_name, data.last_name].filter(Boolean).join(" ") || "Driver",
      vehicleType: "car",
      location: { lat: 0, lng: 0 },
      status: "online",
      rating: 4.5,
    };
  },

  async findNearby(location: GeoPoint, radiusKm: number): Promise<Driver[]> {
    log.debug("find_nearby_drivers", { location, radiusKm });
    return []; // Delegated to dispatch engine edge function
  },

  async updateLocation(driverId: string, location: GeoPoint): Promise<void> {
    log.debug("driver_location_updated", { driverId, location });
  },

  async updateStatus(driverId: string, status: Driver["status"]): Promise<void> {
    log.info("driver_status_updated", { driverId, status });
  },
};

// ── Dispatch Engine Adapter ──
export const dispatchEngine: DispatchEnginePort = {
  async findBestDriver(pickup: GeoPoint, mode: DeliveryJob["mode"]): Promise<Driver | null> {
    const result = await delRepo.invokeDispatchDelivery({
      action: "find_driver",
      pickup,
      mode,
    });
    return result?.driver ?? null;
  },

  async calculateETA(from: GeoPoint, to: GeoPoint): Promise<number> {
    // Simple Haversine approximation — real ETA from engine
    const R = 6371;
    const dLat = ((to.lat - from.lat) * Math.PI) / 180;
    const dLon = ((to.lng - from.lng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((from.lat * Math.PI) / 180) * Math.cos((to.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.max(5, Math.round(dist * 3)); // ~3 min per km
  },

  async calculateFee(from: GeoPoint, to: GeoPoint, mode: DeliveryJob["mode"]): Promise<Money> {
    const eta = await this.calculateETA(from, to);
    const baseRates: Record<string, number> = { food: 500, grocery: 600, parcel: 800, errand: 1000 };
    return { amount: (baseRates[mode] ?? 500) + eta * 50, currency: "XOF" };
  },
};

// ── Mapper ──
function mapJob(row: any): DeliveryJob {
  return {
    id: row.id,
    orderId: row.order_id ?? "",
    driverId: row.rider_user_id,
    pickup: { lat: row.pickup_lat ?? 0, lng: row.pickup_lng ?? 0 },
    dropoff: { lat: row.dropoff_lat ?? 0, lng: row.dropoff_lng ?? 0 },
    status: row.status ?? "pending",
    mode: row.job_type ?? "food",
    estimatedMinutes: row.estimated_minutes,
    fee: { amount: row.current_price ?? 0, currency: row.currency ?? "XOF" },
    createdAt: row.created_at,
  };
}

export { deliveryEvents };
