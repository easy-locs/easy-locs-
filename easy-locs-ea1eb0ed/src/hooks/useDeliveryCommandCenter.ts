/**
 * useDeliveryCommandCenter — Command center dispatcher view.
 * CANONICAL: via mobility.repository.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import * as repo from "@/repositories/mobility.repository";
import { useAuth } from "@/contexts/AuthContext";
import type { DeliveryJob } from "@/hooks/useDriverMissions";
import { haversineKm as haversineDistance, estimateETA } from "@/lib/geo/distance";
import type { MissionFilter } from "@/lib/delivery/mission-config";
import { filterMissions } from "@/lib/delivery/mission-config";

export interface DriverWithDistance {
  user_id: string; vehicle_type: string; lat: number | null; lng: number | null;
  is_online: boolean; is_available: boolean; status?: string;
  distanceToPickup?: number; etaToPickup?: number; [key: string]: any;
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
    const [mData, dData] = await Promise.all([
      repo.fetchMobilityJobs({ orderBy: "created_at", ascending: false, limit: 100 }),
      repo.fetchOnlineRiders(100),
    ]);
    setMissions(mData.map((row: any) => ({
      ...row, driver_id: row.rider_user_id, delivery_fee: row.current_price ?? row.quoted_price, delivered_at: row.completed_at,
    })));
    setDrivers(dData.map((r: any) => ({ ...r, status: r.is_available ? "online" : "busy" })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const ch = repo.subscribeToTable("cmd-mobility-jobs", "mobility_jobs", "", () => fetchData());
    return () => { repo.unsubscribeChannel(ch); };
  }, [fetchData]);

  useEffect(() => {
    const ch = repo.subscribeToTable("cmd-rider-presence", "rider_presence", "", () => fetchData());
    return () => { repo.unsubscribeChannel(ch); };
  }, [fetchData]);

  const filteredMissions = useMemo(() => missions.filter(m => filterMissions(m.status, filter)), [missions, filter]);
  const selectedMission = useMemo(() => missions.find(m => m.id === selectedMissionId) ?? null, [missions, selectedMissionId]);
  const availableDrivers = useMemo(() => drivers.filter(d => d.is_available), [drivers]);

  const nearbyDrivers = useCallback((pickupLat: number, pickupLng: number): DriverWithDistance[] => {
    return availableDrivers
      .filter(d => d.lat != null && d.lng != null)
      .map(d => ({ ...d, distanceToPickup: haversineDistance(d.lat!, d.lng!, pickupLat, pickupLng), etaToPickup: estimateETA(haversineDistance(d.lat!, d.lng!, pickupLat, pickupLng)) }))
      .sort((a, b) => (a.distanceToPickup ?? 99) - (b.distanceToPickup ?? 99));
  }, [availableDrivers]);

  const stats = useMemo(() => {
    const active = missions.filter(m => ["accepted", "rider_arriving_pickup", "rider_arrived_pickup", "picked_up", "in_progress", "rider_arriving_dropoff"].includes(m.status));
    const completedToday = missions.filter(m => m.status === "completed" && m.completed_at && new Date(m.completed_at).toDateString() === new Date().toDateString());
    return { activeMissions: active.length, availableDrivers: availableDrivers.length, deliveredToday: completedToday.length, avgETA: active.length > 0 ? 15 : 0 };
  }, [missions, availableDrivers]);

  const assignDriver = useCallback(async (jobId: string, riderId: string) => {
    await repo.updateMobilityJob(jobId, { rider_user_id: riderId, status: "accepted", accepted_at: new Date().toISOString() });
    await fetchData();
  }, [fetchData]);

  const updateMissionStatus = useCallback(async (jobId: string, status: string) => {
    const updates: Record<string, any> = { status };
    if (status === "picked_up") updates.picked_up_at = new Date().toISOString();
    if (status === "completed") updates.completed_at = new Date().toISOString();
    if (status === "accepted") updates.accepted_at = new Date().toISOString();
    if (status === "cancelled") updates.cancelled_at = new Date().toISOString();
    await repo.updateMobilityJob(jobId, updates);
    await fetchData();
  }, [fetchData]);

  const cancelMission = useCallback(async (jobId: string, reason?: string) => {
    await repo.updateMobilityJob(jobId, { status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: reason || "Cancelled by dispatcher" });
    await fetchData();
  }, [fetchData]);

  return {
    missions: filteredMissions, allMissions: missions, drivers, availableDrivers, loading, stats,
    selectedMission, selectedMissionId, setSelectedMissionId, filter, setFilter,
    nearbyDrivers, assignDriver, updateMissionStatus, cancelMission, refetch: fetchData,
  };
}
