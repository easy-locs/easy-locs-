/**
 * useDeliveryCommandCenter — Fetches all delivery missions + available drivers
 * for the Command Center dispatcher view with realtime updates.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { DeliveryJob } from "@/hooks/useDriverMissions";
import type { DriverSession } from "@/hooks/useDriverSession";
import { haversineDistance, estimateETA } from "@/lib/delivery/geo-utils";
import type { MissionFilter } from "@/lib/delivery/mission-config";
import { filterMissions } from "@/lib/delivery/mission-config";

export interface DriverWithDistance extends DriverSession {
  distanceToPickup?: number;
  etaToPickup?: number;
}

export function useDeliveryCommandCenter() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<DeliveryJob[]>([]);
  const [drivers, setDrivers] = useState<DriverSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<MissionFilter>("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [mRes, dRes] = await Promise.all([
      supabase
        .from("delivery_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("driver_sessions")
        .select("*")
        .in("status", ["online", "on_delivery"]),
    ]);
    if (mRes.data) setMissions(mRes.data as DeliveryJob[]);
    if (dRes.data) setDrivers(dRes.data as DriverSession[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime for missions
  useEffect(() => {
    const ch = supabase
      .channel("cmd-delivery-jobs")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_jobs" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchData]);

  // Realtime for driver positions
  useEffect(() => {
    const ch = supabase
      .channel("cmd-driver-sessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "driver_sessions" }, () => fetchData())
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

  const availableDrivers = useMemo(() => drivers.filter((d) => d.status === "online"), [drivers]);

  /** Drivers sorted by proximity to a pickup location */
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

  // Stats
  const stats = useMemo(() => {
    const active = missions.filter((m) =>
      ["assigned", "accepted", "arriving_pickup", "picked_up", "on_the_way", "arriving_dropoff"].includes(m.status)
    );
    const deliveredToday = missions.filter((m) => {
      if (m.status !== "completed") return false;
      if (!m.delivered_at) return false;
      return new Date(m.delivered_at).toDateString() === new Date().toDateString();
    });
    const avgETA = active.length > 0 ? Math.round(active.reduce((s, m) => s + 15, 0) / active.length) : 0;
    return {
      activeMissions: active.length,
      availableDrivers: availableDrivers.length,
      deliveredToday: deliveredToday.length,
      avgETA,
    };
  }, [missions, availableDrivers]);

  // Actions
  const assignDriver = useCallback(async (jobId: string, driverId: string) => {
    await supabase.from("delivery_jobs").update({
      driver_id: driverId,
      status: "assigned",
      assigned_at: new Date().toISOString(),
    }).eq("id", jobId);
    await fetchData();
  }, [fetchData]);

  const updateMissionStatus = useCallback(async (jobId: string, status: string) => {
    const updates: Record<string, any> = { status };
    if (status === "picked_up") updates.picked_up_at = new Date().toISOString();
    if (status === "delivered" || status === "completed") {
      updates.delivered_at = new Date().toISOString();
      updates.status = "completed";
    }
    if (status === "accepted") updates.accepted_at = new Date().toISOString();
    if (status === "cancelled") updates.cancelled_at = new Date().toISOString();
    await supabase.from("delivery_jobs").update(updates).eq("id", jobId);
    await fetchData();
  }, [fetchData]);

  const cancelMission = useCallback(async (jobId: string, reason?: string) => {
    await supabase.from("delivery_jobs").update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason || "Cancelled by dispatcher",
      cancelled_by: user?.id,
    }).eq("id", jobId);
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
