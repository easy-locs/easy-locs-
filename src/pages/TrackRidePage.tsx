/**
 * TrackRidePage — /track/:rideRequestId — Premium live ride tracking.
 *
 * Source of truth: mobility_jobs (realtime) + trip_live_state (GPS)
 * Components: RideStatusHero, RideTimeline, RideDriverCard, RideFareCard, RideCompletedCard, RideLiveHealthBanner, RideLiveMapCard
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTripTrackingStore } from "@/stores/tripTrackingStore";
import { useRideLiveETA } from "@/hooks/useRideLiveETA";
import { useRideLiveRoute } from "@/hooks/useRideLiveRoute";
import { Button } from "@/components/ui/button";
import { tc } from "@/lib/i18n-canonical";
import { isActiveRideStatus, isFinalStatus, canCancel } from "@/lib/mobility/status-machine";
import { getGPSHealth } from "@/lib/mobility/gps-scheduler";
import { RideStatusHero } from "@/components/mobility/RideStatusHero";
import { RideTimeline } from "@/components/mobility/RideTimeline";
import { RideDriverCard } from "@/components/mobility/RideDriverCard";
import { RideFareCard } from "@/components/mobility/RideFareCard";
import { RideCompletedCard } from "@/components/mobility/RideCompletedCard";
import { RideLiveMapCard } from "@/components/mobility/RideLiveMapCard";
import { RideLiveHealthBanner } from "@/components/mobility/RideLiveHealthBanner";
import { motion, AnimatePresence } from "framer-motion";
import { XCircle } from "lucide-react";
import { toast } from "sonner";

export default function TrackRidePage() {
  const { rideRequestId: jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState<Record<string, any> | null>(null);
  const [riderProfile, setRiderProfile] = useState<Record<string, any> | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(true);

  const { livePosition, startTracking, stopTracking } = useTripTrackingStore();

  const status = job?.status ?? "searching";
  const isActive = isActiveRideStatus(status);
  const isFinal = isFinalStatus(status);

  const eta = useRideLiveETA(jobId ?? null, isActive);
  const liveRoute = useRideLiveRoute(jobId ?? null, isActive || !isFinal, status);
  const gpsHealth = getGPSHealth();

  // ── Fetch job ──
  useEffect(() => {
    if (!jobId) return;
    supabase.from("mobility_jobs").select("*").eq("id", jobId).single()
      .then(({ data }) => { if (data) setJob(data as any); });
  }, [jobId]);

  // ── Realtime subscription ──
  useEffect(() => {
    if (!jobId) return;
    const ch = supabase
      .channel(`track-job-${jobId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "mobility_jobs", filter: `id=eq.${jobId}`,
      }, (payload) => setJob(payload.new as any))
      .subscribe((st) => setRealtimeConnected(st === "SUBSCRIBED"));

    return () => { supabase.removeChannel(ch); };
  }, [jobId]);

  // ── Trip tracking (GPS subscription) ──
  useEffect(() => {
    if (isActive && jobId) startTracking(jobId);
    else stopTracking();
    return () => stopTracking();
  }, [isActive, jobId, startTracking, stopTracking]);

  // ── Fetch rider profile on assignment ──
  useEffect(() => {
    const riderId = job?.rider_user_id;
    if (!riderId) { setRiderProfile(null); return; }
    supabase.from("rider_profiles")
      .select("id,display_name,vehicle_type,vehicle_plate,vehicle_model,rating,photo_url,phone")
      .eq("user_id", riderId).maybeSingle()
      .then(({ data }) => setRiderProfile(data as any));
  }, [job?.rider_user_id]);

  // ── Find ride conversation ──
  useEffect(() => {
    if (!job?.rider_user_id || !job?.customer_user_id) return;
    supabase.from("conversations_v2").select("id")
      .eq("type", "ride").limit(1).maybeSingle()
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
      <div className="max-w-lg mx-auto space-y-4 pb-8">
        {/* ── Live Map Card ── */}
        <RideLiveMapCard route={liveRoute} />

        <div className="px-4 space-y-4">
          {/* ── GPS Health Banner ── */}
          <RideLiveHealthBanner
            gpsSignal={gpsHealth.signal}
            lastSyncAt={gpsHealth.lastSyncAt}
            staleSeconds={liveRoute?.staleSeconds}
            realtimeConnected={realtimeConnected}
          />

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
            <div className="space-y-3">
              <RideCompletedCard
                jobId={jobId}
                fare={job?.current_price ?? job?.quoted_price}
                currency={job?.currency}
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("wallet:open", {
                        detail: { context_type: "mobility_ride", context_id: jobId },
                      }),
                    );
                  }}
                >
                  {tc("ride.pay_now")}
                </button>
                <button
                  type="button"
                  className="h-11 rounded-xl border border-border/40 bg-card font-semibold text-sm"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("ride:rating:open", { detail: { jobId } }),
                    );
                  }}
                >
                  {tc("ride.rate_driver")}
                </button>
              </div>
            </div>
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

          {/* ── Back ── */}
          <button
            type="button"
            className="w-full text-center text-xs text-muted-foreground py-2"
            onClick={() => navigate(-1)}
          >
            {tc("nav.back")}
          </button>
        </div>
      </div>
    </div>
  );
}
