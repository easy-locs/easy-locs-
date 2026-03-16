/**
 * useDriverMissions — Fetches delivery jobs assigned to the current driver.
 * PASS70-B: Driver Dashboard
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DeliveryJob {
  id: string;
  org_id: string;
  seller_id: string;
  status: string;
  priority: string;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  package_description: string | null;
  weight_kg: number | null;
  delivery_fee: number | null;
  currency: string | null;
  confirmation_code: string | null;
  notes: string | null;
  scheduled_at: string | null;
  assigned_at: string | null;
  accepted_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  created_at: string | null;
}

export function useDriverMissions() {
  const { user } = useAuth();
  const [activeMissions, setActiveMissions] = useState<DeliveryJob[]>([]);
  const [completedMissions, setCompletedMissions] = useState<DeliveryJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMissions = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    const [activeRes, completedRes] = await Promise.all([
      supabase
        .from("delivery_jobs")
        .select("*")
        .eq("driver_id", user.id)
        .in("status", ["assigned", "accepted", "in_progress"])
        .order("created_at", { ascending: false }),
      supabase
        .from("delivery_jobs")
        .select("*")
        .eq("driver_id", user.id)
        .in("status", ["completed", "cancelled"])
        .order("delivered_at", { ascending: false })
        .limit(20),
    ]);

    if (activeRes.data) setActiveMissions(activeRes.data as DeliveryJob[]);
    if (completedRes.data) setCompletedMissions(completedRes.data as DeliveryJob[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchMissions(); }, [fetchMissions]);

  // Realtime subscription for job updates
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`driver-jobs-${user.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "delivery_jobs",
        filter: `driver_id=eq.${user.id}`,
      }, () => { fetchMissions(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, fetchMissions]);

  // Accept a mission
  const acceptMission = useCallback(async (jobId: string) => {
    const { data, error } = await supabase.functions.invoke("dispatch-delivery", {
      body: { action: "accept_job", job_id: jobId },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    await fetchMissions();
    return data;
  }, [fetchMissions]);

  // Update mission status
  const updateStatus = useCallback(async (jobId: string, status: string, reason?: string) => {
    const { data, error } = await supabase.functions.invoke("dispatch-delivery", {
      body: { action: "update_status", job_id: jobId, status, cancellation_reason: reason },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    await fetchMissions();
    return data;
  }, [fetchMissions]);

  // Confirm delivery with code
  const confirmDelivery = useCallback(async (jobId: string, code: string, photoUrl?: string) => {
    const { data, error } = await supabase.functions.invoke("dispatch-delivery", {
      body: { action: "confirm_delivery", job_id: jobId, confirmation_code: code, photo_proof_url: photoUrl },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    await fetchMissions();
    return data;
  }, [fetchMissions]);

  // Stats
  const stats = {
    active: activeMissions.length,
    completed: completedMissions.filter(m => m.status === "completed").length,
    cancelled: completedMissions.filter(m => m.status === "cancelled").length,
    totalEarnings: completedMissions
      .filter(m => m.status === "completed")
      .reduce((sum, m) => sum + (m.delivery_fee || 0), 0),
  };

  return {
    activeMissions,
    completedMissions,
    loading,
    stats,
    acceptMission,
    updateStatus,
    confirmDelivery,
    refetch: fetchMissions,
  };
}
