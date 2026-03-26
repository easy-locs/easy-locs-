/**
 * useDeliveryCommandCenter — Command center dispatcher view.
 * CANONICAL: reads from mobility_jobs + rider_presence only.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { DeliveryJob } from "@/hooks/useDriverMissions";
import { haversineKm as haversineDistance, estimateETA } from "@/lib/geo/distance";
import type { MissionFilter } from "@/lib/delivery/mission-config";
import { filterMissions } from "@/lib/delivery/mission-config";

export interface DriverWithDistance {
  user_id: string;
  vehicle_type: string;
  lat: number | null;
  lng: number | null;
  is_online: boolean;
  is_available: boolean;
  status?: string;
  distanceToPickup?: number;
  etaToPickup?: number;
  [key: string]: any;
}

export function useDeliveryCommandCenter() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<DeliveryJob[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<MissionFilter>("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [mRes, dRes] = await Promise.all([
      supabase
        .from("mobility_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("rider_presence")
        .select("*")
        .eq("is_online", true),
    ]);
    if (mRes.data) setMissions(mRes.data.map((row: any) => ({
      ...row,
      driver_id: row.rider_user_id,
      delivery_fee: row.current_price ?? row.quoted_price,
      delivered_at: row.completed_at,
    })));
    if (dRes.data) setDrivers(dRes.data.map((r: any) => ({
      ...r,
      status: r.is_available ? "online" : "busy",
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const ch = supabase
      .channel("cmd-mobility-jobs")
      .on("postgres_changes", { event: "*", schema: "public", table: "mobility_jobs" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchData]);

  useEffect(() => {
    const ch = supabase
      .channel("cmd-rider-presence")
      .on("postgres_changes", { event: "*", schema: "public", table: "rider_presence" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchData]);

  const filteredMissions = useMemo(
    () => missions.filter((m) => filterMissions(m.status, filter)),
    [missions, filter]
  );

  const selectedMission = useMemo(
    () => missions.find((m) => m.id === selectedMissionId) ?? null,
    [missions, selectedMissionId]
  );

  const availableDrivers = useMemo(() => drivers.filter((d) => d.is_available), [drivers]);

  const nearbyDrivers = useCallback(
    (pickupLat: number, pickupLng: number): DriverWithDistance[] => {
      return availableDrivers
        .filter((d) => d.lat != null && d.lng != null)
        .map((d) => {
          const dist = haversineDistance(d.lat!, d.lng!, pickupLat, pickupLng);
          return { ...d, distanceToPickup: dist, etaToPickup: estimateETA(dist) };
        })
        .sort((a, b) => (a.distanceToPickup ?? 99) - (b.distanceToPickup ?? 99));
    },
    [availableDrivers]
  );

  const stats = useMemo(() => {
    const active = missions.filter((m) =>
      ["accepted", "rider_arriving_pickup", "rider_arrived_pickup", "picked_up", "in_progress", "rider_arriving_dropoff"].includes(m.status)
    );
    const completedToday = missions.filter((m) => {
      if (m.status !== "completed") return false;
      if (!m.completed_at) return false;
      return new Date(m.completed_at).toDateString() === new Date().toDateString();
    });
    return {
      activeMissions: active.length,
      availableDrivers: availableDrivers.length,
      deliveredToday: completedToday.length,
      avgETA: active.length > 0 ? 15 : 0,
    };
  }, [missions, availableDrivers]);

  const assignDriver = useCallback(async (jobId: string, riderId: string) => {
    await supabase.from("mobility_jobs").update({
      rider_user_id: riderId,
      status: "accepted",
      accepted_at: new Date().toISOString(),
    } as any).eq("id", jobId);
    await fetchData();
  }, [fetchData]);

  const updateMissionStatus = useCallback(async (jobId: string, status: string) => {
    const updates: Record<string, any> = { status };
    if (status === "picked_up") updates.picked_up_at = new Date().toISOString();
    if (status === "completed") updates.completed_at = new Date().toISOString();
    if (status === "accepted") updates.accepted_at = new Date().toISOString();
    if (status === "cancelled") updates.cancelled_at = new Date().toISOString();
    await supabase.from("mobility_jobs").update(updates as any).eq("id", jobId);
    await fetchData();
  }, [fetchData]);

  const cancelMission = useCallback(async (jobId: string, reason?: string) => {
    await supabase.from("mobility_jobs").update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason || "Cancelled by dispatcher",
    } as any).eq("id", jobId);
    await fetchData();
  }, [fetchData, user?.id]);

  return {
    missions: filteredMissions,
    allMissions: missions,
    drivers,
    availableDrivers,
    loading,
    stats,
    selectedMission,
    selectedMissionId,
    setSelectedMissionId,
    filter,
    setFilter,
    nearbyDrivers,
    assignDriver,
    updateMissionStatus,
    cancelMission,
    refetch: fetchData,
  };
}
