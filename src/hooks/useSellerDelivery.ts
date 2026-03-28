/**
 * useSellerDelivery — Seller/merchant-side delivery management.
 * CANONICAL: via mobility.repository.
 */
import { useState, useEffect, useCallback } from "react";
import * as repo from "@/repositories/mobility.repository";
import { useAuth } from "@/contexts/AuthContext";
import type { DeliveryJob } from "@/hooks/useDriverMissions";

export interface CreateJobPayload {
  pickup_address: string; pickup_lat?: number; pickup_lng?: number;
  dropoff_address: string; dropoff_lat?: number; dropoff_lng?: number;
  package_description?: string; weight_kg?: number;
  package_size?: "light" | "medium" | "heavy";
  pricing_mode?: "fixed" | "progressive";
  priority?: "standard" | "express" | "urgent";
  delivery_fee?: number; currency?: string; scheduled_at?: string;
  notes?: string; order_id?: string;
}

export interface NearbyDriver {
  id: string; user_id: string; vehicle_type: string; lat: number; lng: number;
  distance_km: number; avg_rating: number | null; total_completed: number | null;
  acceptance_rate: number | null;
}

export function useSellerDelivery() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<DeliveryJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const data = await repo.fetchMobilityJobs({ merchantId: user.id, orderBy: "created_at", ascending: false, limit: 50 });
    setJobs(data.map((row: any) => ({
      ...row, driver_id: row.rider_user_id, delivery_fee: row.current_price ?? row.quoted_price,
      delivered_at: row.completed_at, pickup_address_compat: row.pickup_address || "Pickup",
      dropoff_address_compat: row.dropoff_address || "Dropoff",
    })));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = repo.subscribeToTable(`seller-mobility-jobs-${user.id}`, "mobility_jobs", `merchant_id=eq.${user.id}`, () => fetchJobs());
    return () => { repo.unsubscribeChannel(channel); };
  }, [user?.id, fetchJobs]);

  const createJob = useCallback(async (payload: CreateJobPayload) => {
    const data = await repo.invokeDispatchRide({
      action: "create_job", job_type: "parcel_delivery",
      service_level: payload.priority === "express" ? "parcel_express" : "parcel_standard",
      pickup_address: payload.pickup_address, pickup_lat: payload.pickup_lat, pickup_lng: payload.pickup_lng,
      dropoff_address: payload.dropoff_address, dropoff_lat: payload.dropoff_lat, dropoff_lng: payload.dropoff_lng,
      notes: payload.package_description || payload.notes,
      quoted_price: payload.delivery_fee, currency: payload.currency || "AED",
    });
    await fetchJobs();
    return data;
  }, [fetchJobs]);

  const findDrivers = useCallback(async (_jobId: string): Promise<NearbyDriver[]> => {
    const data = await repo.fetchAvailableRiders(20);
    return data.map((r: any) => ({
      id: r.rider_profile_id || r.user_id, user_id: r.user_id,
      vehicle_type: r.vehicle_type || "bike", lat: r.lat || 0, lng: r.lng || 0,
      distance_km: 0, avg_rating: null, total_completed: null, acceptance_rate: null,
    }));
  }, []);

  const assignDriver = useCallback(async (jobId: string) => {
    const data = await repo.invokeDispatchRide({ action: "accept_offer", job_id: jobId });
    await fetchJobs();
    return data;
  }, [fetchJobs]);

  const cancelJob = useCallback(async (jobId: string, reason?: string) => {
    const data = await repo.invokeDispatchRide({ action: "cancel_job", job_id: jobId, cancel_reason: reason });
    await fetchJobs();
    return data;
  }, [fetchJobs]);

  const metrics = {
    total: jobs.length,
    pending: jobs.filter(j => j.status === "searching").length,
    active: jobs.filter(j => ["accepted", "rider_arriving_pickup", "picked_up", "in_progress"].includes(j.status)).length,
    completed: jobs.filter(j => j.status === "completed").length,
    cancelled: jobs.filter(j => j.status === "cancelled").length,
    totalSpent: jobs.filter(j => j.status === "completed").reduce((s, j) => s + (j.current_price || j.quoted_price || 0), 0),
    avgFee: (() => { const done = jobs.filter(j => j.status === "completed"); return done.length ? done.reduce((s, j) => s + (j.current_price || j.quoted_price || 0), 0) / done.length : 0; })(),
  };

  return { jobs, loading, metrics, createJob, findDrivers, assignDriver, cancelJob, refetch: fetchJobs };
}
