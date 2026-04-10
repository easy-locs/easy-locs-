/**
 * useDriverMissions — Fetches mobility jobs assigned to the current rider.
 * CANONICAL: reads from mobility_jobs only via mobility.repository.
 */
import { useState, useEffect, useCallback } from "react";
import * as repo from "@/repositories/mobility.repository";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DeliveryJob {
  id: string;
  job_type: string;
  service_level: string;
  customer_user_id: string;
  rider_user_id: string | null;
  merchant_id: string | null;
  status: string;
  pickup_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_address: string | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  notes: string | null;
  quoted_price: number | null;
  current_price: number | null;
  currency: string | null;
  accepted_at: string | null;
  picked_up_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string | null;
  driver_id: string | null;
  delivery_fee: number | null;
  delivered_at: string | null;
  pickup_address_compat: string;
  dropoff_address_compat: string;
  package_description: string | null;
  priority: string;
  org_id: string | null;
  seller_id: string | null;
  assigned_at: string | null;
  weight_kg: number | null;
  confirmation_code: string | null;
  scheduled_at: string | null;
  [key: string]: any;
}

function mapRow(row: any): DeliveryJob {
  return {
    ...row,
    driver_id: row.rider_user_id,
    delivery_fee: row.current_price ?? row.quoted_price,
    delivered_at: row.completed_at,
    pickup_address_compat: row.pickup_address || "Pickup",
    dropoff_address_compat: row.dropoff_address || "Dropoff",
    package_description: row.notes,
    priority: row.service_level || "standard",
    org_id: row.merchant_id,
    seller_id: row.merchant_id,
    assigned_at: row.accepted_at,
    weight_kg: null,
    confirmation_code: null,
    scheduled_at: null,
  };
}

export function useDriverMissions() {
  const { user } = useAuth();
  const [activeMissions, setActiveMissions] = useState<DeliveryJob[]>([]);
  const [completedMissions, setCompletedMissions] = useState<DeliveryJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMissions = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    const [activeData, completedData] = await Promise.all([
      repo.fetchMobilityJobs({
        riderUserId: user.id,
        statuses: ["accepted", "rider_arriving_pickup", "rider_arrived_pickup", "picked_up", "in_progress", "rider_arriving_dropoff"],
        orderBy: "created_at",
        ascending: false,
      }),
      repo.fetchMobilityJobs({
        riderUserId: user.id,
        statuses: ["completed", "cancelled"],
        orderBy: "completed_at",
        ascending: false,
        limit: 20,
      }),
    ]);

    setActiveMissions(activeData.map(mapRow));
    setCompletedMissions(completedData.map(mapRow));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchMissions(); }, [fetchMissions]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = repo.subscribeToTable(
      `rider-jobs-${user.id}`, "mobility_jobs",
      `rider_user_id=eq.${user.id}`,
      () => { fetchMissions(); }
    );
    return () => { repo.unsubscribeChannel(channel); };
  }, [user?.id, fetchMissions]);

  const acceptMission = useCallback(async (jobId: string) => {
    const data = await repo.invokeDispatchRide({ action: "accept_offer", job_id: jobId });
    await fetchMissions();
    return data;
  }, [fetchMissions]);

  const updateStatus = useCallback(async (jobId: string, status: string, reason?: string) => {
    const data = await repo.invokeDispatchRide({ action: "advance_status", job_id: jobId, new_status: status, cancel_reason: reason });
    await fetchMissions();
    return data;
  }, [fetchMissions]);

  const confirmDelivery = useCallback(async (jobId: string, _code?: string, _photoUrl?: string) => {
    const data = await repo.invokeDispatchRide({ action: "advance_status", job_id: jobId, new_status: "completed" });
    await fetchMissions();
    return data;
  }, [fetchMissions]);

  const stats = {
    active: activeMissions.length,
    completed: completedMissions.filter(m => m.status === "completed").length,
    cancelled: completedMissions.filter(m => m.status === "cancelled").length,
    totalEarnings: completedMissions
      .filter(m => m.status === "completed")
      .reduce((sum, m) => sum + (m.current_price || m.quoted_price || 0), 0),
  };

  return {
    activeMissions, completedMissions, loading, stats,
    acceptMission, updateStatus, confirmDelivery, refetch: fetchMissions,
  };
}
