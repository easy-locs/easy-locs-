/**
 * useSellerDelivery — Seller-side delivery management: create jobs, list, find/assign drivers.
 * PASS70-C: Seller Logistics
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { DeliveryJob } from "@/hooks/useDriverMissions";

export interface CreateJobPayload {
  pickup_address: string;
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_address: string;
  dropoff_lat?: number;
  dropoff_lng?: number;
  package_description?: string;
  weight_kg?: number;
  priority?: "standard" | "express" | "urgent";
  delivery_fee?: number;
  currency?: string;
  scheduled_at?: string;
  notes?: string;
  order_id?: string;
}

export interface NearbyDriver {
  id: string;
  user_id: string;
  vehicle_type: string;
  lat: number;
  lng: number;
  distance_km: number;
  avg_rating: number | null;
  total_completed: number | null;
  acceptance_rate: number | null;
}

export function useSellerDelivery() {
  const { user, orgId } = useAuth();
  const [jobs, setJobs] = useState<DeliveryJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    if (!user?.id || !orgId) return;
    setLoading(true);
    const { data } = await supabase
      .from("delivery_jobs")
      .select("*")
      .eq("org_id", orgId)
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) setJobs(data as DeliveryJob[]);
    setLoading(false);
  }, [user?.id, orgId]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // Realtime
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`seller-jobs-${orgId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "delivery_jobs",
        filter: `org_id=eq.${orgId}`,
      }, () => fetchJobs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, fetchJobs]);

  // Create job
  const createJob = useCallback(async (payload: CreateJobPayload) => {
    if (!orgId) throw new Error("No org");
    const { data, error } = await supabase.functions.invoke("dispatch-delivery", {
      body: { action: "create_job", org_id: orgId, ...payload },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    await fetchJobs();
    return data;
  }, [orgId, fetchJobs]);

  // Find nearby drivers
  const findDrivers = useCallback(async (jobId: string, maxDistanceKm = 15): Promise<NearbyDriver[]> => {
    const { data, error } = await supabase.functions.invoke("dispatch-delivery", {
      body: { action: "find_drivers", job_id: jobId, max_distance_km: maxDistanceKm },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return (data?.drivers || []) as NearbyDriver[];
  }, []);

  // Assign driver
  const assignDriver = useCallback(async (jobId: string, driverId: string) => {
    const { data, error } = await supabase.functions.invoke("dispatch-delivery", {
      body: { action: "assign_driver", job_id: jobId, driver_id: driverId },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    await fetchJobs();
    return data;
  }, [fetchJobs]);

  // Cancel job
  const cancelJob = useCallback(async (jobId: string, reason?: string) => {
    const { data, error } = await supabase.functions.invoke("dispatch-delivery", {
      body: { action: "update_status", job_id: jobId, status: "cancelled", cancellation_reason: reason },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    await fetchJobs();
    return data;
  }, [fetchJobs]);

  // Metrics
  const metrics = {
    total: jobs.length,
    pending: jobs.filter(j => j.status === "pending").length,
    active: jobs.filter(j => ["assigned", "accepted", "in_progress"].includes(j.status)).length,
    completed: jobs.filter(j => j.status === "completed").length,
    cancelled: jobs.filter(j => j.status === "cancelled").length,
    totalSpent: jobs.filter(j => j.status === "completed").reduce((s, j) => s + (j.delivery_fee || 0), 0),
    avgFee: (() => {
      const done = jobs.filter(j => j.status === "completed");
      return done.length ? done.reduce((s, j) => s + (j.delivery_fee || 0), 0) / done.length : 0;
    })(),
  };

  return { jobs, loading, metrics, createJob, findDrivers, assignDriver, cancelJob, refetch: fetchJobs };
}
