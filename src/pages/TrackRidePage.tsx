/**
 * TrackRidePage — /track/:rideRequestId — Premium live ride tracking.
 *
 * Source of truth: mobility_jobs (realtime) + trip_live_state (GPS)
 * Rendering: DriverMap + status timeline + ETA + actions
 */
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackCard } from "@/components/ui/back-card";
import DriverMap from "@/components/radar/DriverMap";
import { supabase } from "@/integrations/supabase/client";
import { useTripTrackingStore } from "@/stores/tripTrackingStore";
import { useRideLiveETA } from "@/hooks/useRideLiveETA";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, MessageSquare, MapPin, Navigation, Clock, Car,
  AlertTriangle, CreditCard, Star, XCircle, Loader2, CheckCircle2,
} from "lucide-react";

// ── Status config ──
const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; step: number }> = {
  searching: { label: "Finding your driver", icon: <Loader2 className="w-4 h-4 animate-spin" />, color: "text-amber-500", step: 0 },
  offered: { label: "Matching driver", icon: <Loader2 className="w-4 h-4 animate-spin" />, color: "text-amber-500", step: 0 },
  accepted: { label: "Driver assigned", icon: <Car className="w-4 h-4" />, color: "text-primary", step: 1 },
  rider_arriving_pickup: { label: "Driver on the way", icon: <Navigation className="w-4 h-4" />, color: "text-primary", step: 1 },
  rider_arrived_pickup: { label: "Driver arrived", icon: <MapPin className="w-4 h-4" />, color: "text-emerald-500", step: 2 },
  picked_up: { label: "Picked up", icon: <CheckCircle2 className="w-4 h-4" />, color: "text-emerald-500", step: 2 },
  in_progress: { label: "Trip in progress", icon: <Navigation className="w-4 h-4" />, color: "text-sky-500", step: 3 },
  rider_arriving_dropoff: { label: "Arriving soon", icon: <Navigation className="w-4 h-4" />, color: "text-sky-500", step: 3 },
  completed: { label: "Trip completed", icon: <CheckCircle2 className="w-4 h-4" />, color: "text-emerald-500", step: 4 },
  cancelled: { label: "Trip cancelled", icon: <XCircle className="w-4 h-4" />, color: "text-destructive", step: -1 },
  failed_no_rider: { label: "No driver found", icon: <AlertTriangle className="w-4 h-4" />, color: "text-destructive", step: -1 },
};

const TIMELINE_STEPS = ["Requested", "Driver assigned", "At pickup", "In progress", "Arrived"];

export default function TrackRidePage() {
  const { rideRequestId: jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<Record<string, any> | null>(null);
  const [riderProfile, setRiderProfile] = useState<Record<string, any> | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const { livePosition, startTracking, stopTracking } = useTripTrackingStore();
  const status = job?.status ?? "loading";
  const isActive = ["accepted", "rider_arriving_pickup", "rider_arrived_pickup", "picked_up", "in_progress", "rider_arriving_dropoff"].includes(status);
  const isFinal = ["completed", "cancelled", "failed_no_rider"].includes(status);
  const eta = useRideLiveETA(jobId ?? null, isActive);
  const statusConfig = STATUS_CONFIG[status] ?? { label: status, icon: null, color: "text-muted-foreground", step: -1 };

  // Fetch job
  useEffect(() => {
    if (!jobId) return;
    supabase.from("mobility_jobs").select("*").eq("id", jobId).single()
      .then(({ data }) => { if (data) setJob(data as any); });
  }, [jobId]);

  // Realtime job updates
  useEffect(() => {
    if (!jobId) return;
    const ch = supabase
      .channel(`track-job-${jobId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "mobility_jobs", filter: `id=eq.${jobId}` },
        (payload) => setJob(payload.new as any))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [jobId]);

  // Start trip tracking when active
  useEffect(() => {
    if (isActive && jobId) startTracking(jobId);
    else stopTracking();
    return () => stopTracking();
  }, [isActive, jobId]);

  // Fetch rider profile when driver assigned
  useEffect(() => {
    const riderId = job?.rider_user_id;
    if (!riderId) { setRiderProfile(null); return; }
    supabase.from("rider_profiles").select("id, display_name, vehicle_type, vehicle_plate, vehicle_model, rating, photo_url")
      .eq("user_id", riderId).maybeSingle()
      .then(({ data }) => setRiderProfile(data as any));
  }, [job?.rider_user_id]);

  // Find ride conversation
  useEffect(() => {
    if (!job?.rider_user_id || !job?.customer_user_id) return;
    supabase.from("conversations_v2").select("id")
      .eq("type", "ride")
      .contains("participants", [job.customer_user_id, job.rider_user_id])
      .limit(1).maybeSingle()
      .then(({ data }) => setConversationId(data?.id ?? null));
  }, [job?.rider_user_id, job?.customer_user_id]);

  const handleCancel = async () => {
    if (!jobId) return;
    await supabase.from("mobility_jobs").update({ status: "cancelled" }).eq("id", jobId);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto">
        {/* Map */}
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
          {/* Live ETA badge */}
          {eta && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute bottom-3 right-3 z-10 bg-card/95 backdrop-blur border border-border rounded-xl px-3 py-2 shadow-lg"
            >
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-bold text-foreground">
                  {eta.etaPickupMinutes != null ? `${eta.etaPickupMinutes} min` : eta.etaDestinationMinutes != null ? `${eta.etaDestinationMinutes} min` : "—"}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                Traffic: {eta.trafficLevel}
              </p>
            </motion.div>
          )}
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Status header */}
          <motion.div
            key={status}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-muted/50", statusConfig.color)}>
              {statusConfig.icon}
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{statusConfig.label}</h1>
              <p className="text-xs text-muted-foreground">
                {eta?.etaPickupMinutes != null && isActive && status !== "in_progress"
                  ? `ETA: ${eta.etaPickupMinutes} min · ${eta.distancePickupKm ?? "—"} km`
                  : eta?.etaDestinationMinutes != null
                    ? `Arriving in ${eta.etaDestinationMinutes} min`
                    : job?.job_type?.replace(/_/g, " ") ?? ""}
              </p>
            </div>
          </motion.div>

          {/* Timeline */}
          <div className="flex items-center gap-1">
            {TIMELINE_STEPS.map((step, i) => (
              <div key={step} className="flex-1 flex flex-col items-center gap-1">
                <div className={cn(
                  "w-full h-1 rounded-full transition-colors",
                  i <= statusConfig.step ? "bg-primary" : "bg-muted"
                )} />
                <span className="text-[9px] text-muted-foreground">{step}</span>
              </div>
            ))}
          </div>

          {/* Driver card */}
          <AnimatePresence>
            {riderProfile && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-foreground">
                    {riderProfile.display_name?.[0]?.toUpperCase() ?? "D"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {riderProfile.display_name ?? "Your driver"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {riderProfile.vehicle_model ?? riderProfile.vehicle_type ?? "Vehicle"} · {riderProfile.vehicle_plate ?? ""}
                    </p>
                    {riderProfile.rating && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-xs font-medium text-foreground">{Number(riderProfile.rating).toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10 rounded-xl"
                      onClick={() => {
                        if (conversationId) navigate(`/messages/${conversationId}`);
                        else navigate("/messages");
                      }}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10 rounded-xl"
                      onClick={() => window.open(`tel:+000`, "_self")}
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Locations + Price */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <span className="text-sm text-foreground">{job?.pickup_label || job?.pickup_address || "Pickup"}</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Navigation className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span className="text-sm text-foreground">{job?.dropoff_label || job?.dropoff_address || "Dropoff"}</span>
            </div>
            {(job?.current_price ?? job?.quoted_price) != null && (
              <div className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2 mt-2">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Fare</span>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {job.current_price ?? job.quoted_price} {job.currency ?? "AED"}
                  {(job.surge_multiplier ?? 1) > 1 && (
                    <span className="ml-1 text-xs text-amber-500">×{job.surge_multiplier}</span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Live position debug (only in tracking states) */}
          {isActive && livePosition?.lat && (
            <div className="flex items-center gap-2 bg-primary/5 rounded-xl px-3 py-2 border border-primary/10">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-primary font-medium">
                Driver position: {livePosition.lat.toFixed(4)}, {livePosition.lng?.toFixed(4)}
                {livePosition.speed != null && <span className="opacity-70"> · {livePosition.speed.toFixed(0)} km/h</span>}
              </span>
            </div>
          )}

          {/* Completed state */}
          {status === "completed" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className="text-center py-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                <p className="text-lg font-bold text-foreground">Trip completed!</p>
                <p className="text-sm text-muted-foreground">Thank you for riding with us</p>
              </div>
              <div className="flex gap-2">
                {jobId && (
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={() => navigate(`/mobility/receipt/${jobId}`)}>
                    🧾 Receipt
                  </Button>
                )}
                <Button className="flex-1 rounded-xl" onClick={() => navigate("/mobility/taxi")}>
                  Book again
                </Button>
              </div>
            </motion.div>
          )}

          {/* Cancel button */}
          {!isFinal && !["in_progress", "rider_arriving_dropoff", "completed"].includes(status) && (
            <Button
              variant="ghost"
              className="w-full h-10 text-xs rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
              onClick={handleCancel}
            >
              <XCircle className="h-3.5 w-3.5" /> Cancel ride
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
