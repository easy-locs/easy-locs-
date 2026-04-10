/**
 * useBatchDispatch — Multi-job batch assignment engine.
 * CANONICAL: via mobility.repository.
 */
import { useState, useCallback } from "react";
import * as repo from "@/repositories/mobility.repository";
import type { DeliveryJob } from "@/hooks/useDriverMissions";
import type { NearbyDriver } from "@/hooks/useSellerDelivery";

export interface BatchAssignment {
  jobId: string; driverId: string; driverInfo: NearbyDriver;
  status: "pending" | "assigning" | "success" | "failed"; error?: string;
}

export interface BatchResult {
  total: number; success: number; failed: number; assignments: BatchAssignment[];
}

export function useBatchDispatch() {
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [assignments, setAssignments] = useState<Map<string, BatchAssignment>>(new Map());
  const [discovering, setDiscovering] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);

  const toggleJob = useCallback((jobId: string) => {
    setSelectedJobIds(prev => { const next = new Set(prev); if (next.has(jobId)) next.delete(jobId); else next.add(jobId); return next; });
  }, []);

  const selectAll = useCallback((jobs: DeliveryJob[]) => {
    setSelectedJobIds(new Set(jobs.filter(j => j.status === "pending").map(j => j.id)));
  }, []);

  const clearSelection = useCallback(() => { setSelectedJobIds(new Set()); setAssignments(new Map()); setResult(null); }, []);

  const discoverDrivers = useCallback(async (maxDistanceKm = 15) => {
    if (selectedJobIds.size === 0) return;
    setDiscovering(true);
    const newAssignments = new Map<string, BatchAssignment>();
    const usedDrivers = new Set<string>();
    for (const jobId of selectedJobIds) {
      try {
        const data = await repo.invokeDispatchDelivery({ action: "find_drivers", job_id: jobId, max_distance_km: maxDistanceKm });
        const drivers = (data?.drivers || []) as NearbyDriver[];
        const bestDriver = drivers.find(d => !usedDrivers.has(d.user_id));
        if (bestDriver) {
          usedDrivers.add(bestDriver.user_id);
          newAssignments.set(jobId, { jobId, driverId: bestDriver.user_id, driverInfo: bestDriver, status: "pending" });
        } else {
          newAssignments.set(jobId, { jobId, driverId: "", driverInfo: {} as NearbyDriver, status: "failed", error: "Aucun chauffeur disponible" });
        }
      } catch (err: any) {
        newAssignments.set(jobId, { jobId, driverId: "", driverInfo: {} as NearbyDriver, status: "failed", error: err.message || "Erreur recherche" });
      }
    }
    setAssignments(newAssignments);
    setDiscovering(false);
  }, [selectedJobIds]);

  const executeDispatch = useCallback(async () => {
    const pending = Array.from(assignments.entries()).filter(([, a]) => a.status === "pending");
    if (pending.length === 0) return;
    setDispatching(true);
    let success = 0, failed = 0;
    for (const [jobId, assignment] of pending) {
      setAssignments(prev => { const next = new Map(prev); next.set(jobId, { ...assignment, status: "assigning" }); return next; });
      try {
        await repo.invokeDispatchDelivery({ action: "assign_driver", job_id: jobId, driver_id: assignment.driverId });
        setAssignments(prev => { const next = new Map(prev); next.set(jobId, { ...assignment, status: "success" }); return next; });
        success++;
      } catch (err: any) {
        setAssignments(prev => { const next = new Map(prev); next.set(jobId, { ...assignment, status: "failed", error: err.message || "Erreur" }); return next; });
        failed++;
      }
    }
    setResult({ total: pending.length, success, failed, assignments: Array.from(assignments.values()) });
    setDispatching(false);
  }, [assignments]);

  return { selectedJobIds, assignments, discovering, dispatching, result, toggleJob, selectAll, clearSelection, discoverDrivers, executeDispatch };
}
