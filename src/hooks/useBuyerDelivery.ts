/**
 * useBuyerDelivery — Buyer-side delivery tracking.
 * CANONICAL: via mobility.repository.
 */
import { useState, useEffect, useCallback } from "react";
import * as repo from "@/repositories/mobility.repository";
import { useAuth } from "@/contexts/AuthContext";

export interface BuyerDeliveryJob {
  id: string; status: string; job_type: string; service_level: string;
  pickup_address: string | null; dropoff_address: string | null;
  dropoff_lat: number | null; dropoff_lng: number | null;
  notes: string | null; current_price: number | null; quoted_price: number | null;
  currency: string | null; rider_user_id: string | null;
  created_at: string | null; accepted_at: string | null;
  picked_up_at: string | null; completed_at: string | null;
  order_id: string | null;
  delivery_fee: number | null; driver_id: string | null; delivered_at: string | null;
  assigned_at: string | null; package_description: string | null;
  confirmation_code: string | null; photo_proof_url: string | null;
}

export interface DriverInfo {
  lat: number | null; lng: number | null; vehicle_type: string;
  avg_rating: number | null; total_completed: number | null;
}

export type TrackingStep = { key: string; label: string; emoji: string; completed: boolean; active: boolean; timestamp?: string | null; };

const STEP_MAP: { key: string; label: string; emoji: string; statusMatch: string[]; tsField: keyof BuyerDeliveryJob }[] = [
  { key: "created", label: "Commande confirmée", emoji: "📋", statusMatch: [], tsField: "created_at" },
  { key: "accepted", label: "Chauffeur assigné", emoji: "✅", statusMatch: ["accepted", "rider_arriving_pickup"], tsField: "accepted_at" },
  { key: "picked_up", label: "Colis récupéré", emoji: "📦", statusMatch: ["picked_up", "in_progress", "rider_arriving_dropoff"], tsField: "picked_up_at" },
  { key: "delivered", label: "Livré", emoji: "🏁", statusMatch: ["completed"], tsField: "completed_at" },
];

function mapRow(row: any): BuyerDeliveryJob {
  return { ...row, delivery_fee: row.current_price ?? row.quoted_price, driver_id: row.rider_user_id, delivered_at: row.completed_at, assigned_at: row.accepted_at, package_description: row.notes, confirmation_code: null, photo_proof_url: null };
}

export function buildTrackingSteps(job: BuyerDeliveryJob): TrackingStep[] {
  const statusOrder = ["searching", "offered", "accepted", "rider_arriving_pickup", "rider_arrived_pickup", "picked_up", "in_progress", "rider_arriving_dropoff", "completed"];
  const currentIdx = statusOrder.indexOf(job.status);
  return STEP_MAP.map((step, i) => ({ key: step.key, label: step.label, emoji: step.emoji, completed: i <= Math.min(currentIdx, STEP_MAP.length - 1), active: i === Math.min(currentIdx, STEP_MAP.length - 1), timestamp: job[step.tsField] as string | null }));
}

export function getTrackingProgress(job: BuyerDeliveryJob): number {
  const order = ["searching", "offered", "accepted", "rider_arriving_pickup", "picked_up", "in_progress", "completed"];
  const idx = order.indexOf(job.status);
  return idx < 0 ? 0 : Math.round((idx / (order.length - 1)) * 100);
}

export function useBuyerDelivery(jobId?: string) {
  const { user } = useAuth();
  const [job, setJob] = useState<BuyerDeliveryJob | null>(null);
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchJob = useCallback(async () => {
    if (!jobId) { setLoading(false); return; }
    const data = await repo.fetchMobilityJobMaybe(jobId);
    if (data) {
      setJob(mapRow(data));
      if ((data as any).rider_user_id) {
        const rp = await repo.fetchRiderPresenceByUserId((data as any).rider_user_id);
        if (rp) setDriverInfo({ ...rp, avg_rating: null, total_completed: null } as DriverInfo);
      }
    }
    setLoading(false);
  }, [jobId]);

  useEffect(() => { fetchJob(); }, [fetchJob]);

  useEffect(() => {
    if (!jobId) return;
    const channel = repo.subscribeToTable(`buyer-job-${jobId}`, "mobility_jobs", `id=eq.${jobId}`, () => fetchJob());
    return () => { repo.unsubscribeChannel(channel); };
  }, [jobId, fetchJob]);

  const submitRating = useCallback(async (rating: number, comment?: string, categories?: string[]) => {
    if (!job?.rider_user_id || !user?.id) throw new Error("Missing data");
    await repo.insertDeliveryRating({ job_id: job.id, driver_id: job.rider_user_id, rated_by: user.id, rating, comment: comment || null, categories: categories || null });
  }, [job, user?.id]);

  return { job, driverInfo, loading, steps: job ? buildTrackingSteps(job) : [], progress: job ? getTrackingProgress(job) : 0, submitRating, refetch: fetchJob };
}

export function useBuyerDeliveries() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<BuyerDeliveryJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    repo.fetchMobilityJobs({ customerUserId: user.id, notStatuses: ["cancelled"], orderBy: "created_at", ascending: false, limit: 20 })
      .then(data => { setJobs(data.map(mapRow)); setLoading(false); });
  }, [user?.id]);

  return { jobs, loading };
}
