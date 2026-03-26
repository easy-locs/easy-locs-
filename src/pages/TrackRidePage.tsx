/**
 * TrackRidePage — /track/:rideRequestId — Premium live ride tracking.
 *
 * Source of truth: mobility_jobs (realtime) + trip_live_state (GPS)
 * Components: RideStatusHero, RideTimeline, RideDriverCard, RideFareCard, RideCompletedCard
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackCard } from "@/components/ui/back-card";
import DriverMap from "@/components/radar/DriverMap";
import { supabase } from "@/integrations/supabase/client";
import { useTripTrackingStore } from "@/stores/tripTrackingStore";
import { useRideLiveETA } from "@/hooks/useRideLiveETA";
import { Button } from "@/components/ui/button";
import { tc } from "@/lib/i18n-canonical";
import { isActiveRideStatus, isFinalStatus, canCancel } from "@/lib/mobility/status-machine";
import { RideStatusHero } from "@/components/mobility/RideStatusHero";
import { RideTimeline } from "@/components/mobility/RideTimeline";
import { RideDriverCard } from "@/components/mobility/RideDriverCard";
import { RideFareCard } from "@/components/mobility/RideFareCard";
import { RideCompletedCard } from "@/components/mobility/RideCompletedCard";
import { motion, AnimatePresence } from "framer-motion";
import { XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function TrackRidePage() {
  const { rideRequestId: jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<Record<string, any> | null>(null);
  const [riderProfile, setRiderProfile] = useState<Record<string, any> | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const { livePosition, startTracking, stopTracking } = useTripTrackingStore();
  const status = job?.status ?? "loading";
  const isActive = isActiveRideStatus(status);
  const isFinal = isFinalStatus(status);
  const eta = useRideLiveETA(jobId ?? null, isActive);

  // ── Fetch job ──
  useEffect(() => {
    if (!jobId) return;
    supabase.from("mobility_jobs").select("*").eq("id", jobId).single()
      .then(({ data }) => { if (data) setJob(data as any); });
  }, [jobId]);

  // ── Single realtime channel for job ──
  useEffect(() => {
    if (!jobId) return;
    const ch = supabase
      .channel(`track-job-${jobId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "mobility_jobs", filter: `id=eq.${jobId}` },
        (payload) => setJob(payload.new as any))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [jobId]);

  // ── Trip tracking (GPS subscription) ──
  useEffect(() => {
    if (isActive && jobId) startTracking(jobId);
    else stopTracking();
    return () => stopTracking();
  }, [isActive, jobId]);

  // ── Fetch rider profile on assignment ──
  useEffect(() => {
    const riderId = job?.rider_user_id;
    if (!riderId) { setRiderProfile(null); return; }
    supabase.from("rider_profiles")
      .select("id, display_name, vehicle_type, vehicle_plate, vehicle_model, rating, photo_url, phone")
      .eq("user_id", riderId).maybeSingle()
      .then(({ data }) => setRiderProfile(data as any));
  }, [job?.rider_user_id]);

  // ── Find ride conversation ──
  useEffect(() => {
    if (!job?.rider_user_id || !job?.customer_user_id) return;
    supabase.from("conversations_v2").select("id")
      .eq("type", "ride")
      .contains("participants", [job.customer_user_id, job.rider_user_id])
      .limit(1).maybeSingle()
      .then(({ data }) => setConversationId(data?.id ?? null));
  }, [job?.rider_user_id, job?.customer_user_id]);

  // ── Cancel handler ──
  const handleCancel = async () => {
    if (!jobId || !canCancel(status)) return;
    const { error } = await supabase.from("mobility_jobs").update({ status: "cancelled" } as any).eq("id", jobId);
    if (error) toast.error(tc("ride.cancel_failed"));
    else toast.success(tc("ride.cancelled"));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto">
        {/* ── Map ── */}
        <div className="relative h-56">
          <DriverMap
            driverId={job?.rider_user_id ?? undefined}
            pickupLat={job?.pickup_lat}
            pickupLng={job?.pickup_lng}
            dropoffLat={job?.dropoff_lat}
            dropoffLng={job?.dropoff_lng}
          />
          <div className="absolute top-3 left-3 z-10">
            <BackCard />
          </div>
          {/* Live ETA badge on map */}
          {eta && !isFinal && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute bottom-3 right-3 z-10 bg-card/95 backdrop-blur border border-border rounded-xl px-3 py-2 shadow-lg"
            >
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-bold text-foreground">
                  {eta.etaPickupMinutes ?? eta.etaDestinationMinutes ?? "—"} min
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                {tc("ride.traffic")}: {tc(`ride.traffic_${eta.trafficLevel}`)}
              </p>
            </motion.div>
          )}
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* ── Status Hero ── */}
          <RideStatusHero status={status} eta={eta} jobType={job?.job_type} />

          {/* ── Timeline ── */}
          <RideTimeline status={status} />

          {/* ── Driver Card ── */}
          <AnimatePresence>
            {riderProfile && (
              <RideDriverCard
                driver={riderProfile}
                conversationId={conversationId}
                phone={riderProfile?.phone}
              />
            )}
          </AnimatePresence>

          {/* ── Fare Card ── */}
          <RideFareCard
            pickupLabel={job?.pickup_label || job?.pickup_address}
            dropoffLabel={job?.dropoff_label || job?.dropoff_address}
            fare={job?.current_price ?? job?.quoted_price}
            currency={job?.currency}
            surgeMultiplier={job?.surge_multiplier}
          />

          {/* ── Live position indicator ── */}
          {isActive && livePosition?.lat && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 bg-primary/5 rounded-xl px-3 py-2 border border-primary/10"
            >
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-primary font-medium">
                {tc("ride.driver_live")}
                {livePosition.speed != null && (
                  <span className="opacity-70"> · {livePosition.speed.toFixed(0)} km/h</span>
                )}
              </span>
            </motion.div>
          )}

          {/* ── Completed state ── */}
          {status === "completed" && jobId && (
            <RideCompletedCard
              jobId={jobId}
              fare={job?.current_price ?? job?.quoted_price}
              currency={job?.currency}
            />
          )}

          {/* ── Cancel button ── */}
          {!isFinal && canCancel(status) && (
            <Button
              variant="ghost"
              className="w-full h-10 text-xs rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
              onClick={handleCancel}
            >
              <XCircle className="h-3.5 w-3.5" /> {tc("ride.cancel_ride")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
