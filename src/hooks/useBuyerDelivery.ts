/**
 * useBuyerDelivery — Buyer-side delivery tracking, confirmation, and rating.
 * PASS70-D: Buyer Tracking UI
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface BuyerDeliveryJob {
  id: string;
  status: string;
  priority: string;
  pickup_address: string;
  dropoff_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  package_description: string | null;
  delivery_fee: number | null;
  currency: string | null;
  confirmation_code: string | null;
  notes: string | null;
  driver_id: string | null;
  created_at: string | null;
  assigned_at: string | null;
  accepted_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  photo_proof_url: string | null;
  order_id: string | null;
}

export interface DriverInfo {
  lat: number | null;
  lng: number | null;
  vehicle_type: string;
  avg_rating: number | null;
  total_completed: number | null;
}

export type TrackingStep = {
  key: string;
  label: string;
  emoji: string;
  completed: boolean;
  active: boolean;
  timestamp?: string | null;
};

const STEP_MAP: { key: string; label: string; emoji: string; statusMatch: string[]; tsField: keyof BuyerDeliveryJob }[] = [
  { key: "created", label: "Commande confirmée", emoji: "📋", statusMatch: [], tsField: "created_at" },
  { key: "assigned", label: "Chauffeur assigné", emoji: "👤", statusMatch: ["assigned"], tsField: "assigned_at" },
  { key: "accepted", label: "Mission acceptée", emoji: "✅", statusMatch: ["accepted"], tsField: "accepted_at" },
  { key: "picked_up", label: "Colis récupéré", emoji: "📦", statusMatch: ["in_progress"], tsField: "picked_up_at" },
  { key: "delivered", label: "Livré", emoji: "🏁", statusMatch: ["completed"], tsField: "delivered_at" },
];

export function buildTrackingSteps(job: BuyerDeliveryJob): TrackingStep[] {
  const statusOrder = ["pending", "assigned", "accepted", "in_progress", "completed"];
  const currentIdx = statusOrder.indexOf(job.status);

  return STEP_MAP.map((step, i) => ({
    key: step.key,
    label: step.label,
    emoji: step.emoji,
    completed: i <= currentIdx,
    active: i === currentIdx,
    timestamp: job[step.tsField] as string | null,
  }));
}

export function getTrackingProgress(job: BuyerDeliveryJob): number {
  const order = ["pending", "assigned", "accepted", "in_progress", "completed"];
  const idx = order.indexOf(job.status);
  if (idx < 0) return 0;
  return Math.round((idx / (order.length - 1)) * 100);
}

export function useBuyerDelivery(jobId?: string) {
  const { user } = useAuth();
  const [job, setJob] = useState<BuyerDeliveryJob | null>(null);
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchJob = useCallback(async () => {
    if (!jobId) { setLoading(false); return; }
    const { data } = await supabase
      .from("delivery_jobs")
      .select("*")
      .eq("id", jobId)
      .single();
    if (data) {
      setJob(data as BuyerDeliveryJob);
      // Fetch driver info if assigned
      if (data.driver_id) {
        const { data: ds } = await supabase
          .from("driver_sessions")
          .select("lat, lng, vehicle_type, avg_rating, total_completed")
          .eq("user_id", data.driver_id)
          .maybeSingle();
        if (ds) setDriverInfo(ds as DriverInfo);
      }
    }
    setLoading(false);
  }, [jobId]);

  useEffect(() => { fetchJob(); }, [fetchJob]);

  // Realtime
  useEffect(() => {
    if (!jobId) return;
    const channel = supabase
      .channel(`buyer-job-${jobId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "delivery_jobs",
        filter: `id=eq.${jobId}`,
      }, () => fetchJob())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [jobId, fetchJob]);

  // Submit rating
  const submitRating = useCallback(async (rating: number, comment?: string, categories?: string[]) => {
    if (!job?.driver_id || !user?.id) throw new Error("Missing data");
    const { error } = await supabase.from("delivery_ratings").insert({
      job_id: job.id,
      driver_id: job.driver_id,
      rated_by: user.id,
      rating,
      comment: comment || null,
      categories: categories || null,
    });
    if (error) throw error;
  }, [job, user?.id]);

  return {
    job,
    driverInfo,
    loading,
    steps: job ? buildTrackingSteps(job) : [],
    progress: job ? getTrackingProgress(job) : 0,
    submitRating,
    refetch: fetchJob,
  };
}

/** Fetch all delivery jobs for a buyer (by order_id or recent) */
export function useBuyerDeliveries() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<BuyerDeliveryJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    // Buyer sees jobs where they placed the order (seller_id is the shop, not the buyer)
    // For now, show all jobs in orgs they belong to — can be refined
    const fetch = async () => {
      const { data } = await supabase
        .from("delivery_jobs")
        .select("*")
        .not("status", "eq", "cancelled")
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setJobs(data as BuyerDeliveryJob[]);
      setLoading(false);
    };
    fetch();
  }, [user?.id]);

  return { jobs, loading };
}
