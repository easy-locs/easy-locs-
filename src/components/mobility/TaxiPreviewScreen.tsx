/**
 * TaxiPreviewScreen — Step 2: map + route + fare + confirm.
 * Only shown AFTER pickup & dropoff are set.
 */
import React, { useState, useEffect } from "react";
import { useTaxiFlowStore } from "@/stores/taxiFlowStore";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { loadRidePreview, type RidePreviewData } from "@/lib/mobility/load-ride-preview";
import { toast } from "sonner";
import { tc } from "@/lib/i18n-canonical";
import { cn } from "@/lib/utils";
import { ArrowLeft, Navigation, Clock, Car, DollarSign, Zap, Signal, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const INITIAL_PREVIEW: RidePreviewData = {
  ready: false,
  waitMinutes: null,
  etaMinutes: null,
  distanceKm: null,
  estimatedFare: null,
  trafficLevel: "unknown",
  zoneKey: null,
  nearbyDrivers: null,
  surgeMultiplier: 1,
};

export function TaxiPreviewScreen() {
  const { pickup, dropoff, serviceLevel, bookingMode, scheduledDate, scheduledTime, seats, setStep, setActiveJobId, reset } = useTaxiFlowStore();
  const createJob = useCustomerMobilityStore(s => s.createJob);

  const [preview, setPreview] = useState<RidePreviewData>(INITIAL_PREVIEW);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load preview on mount
  useEffect(() => {
    if (!pickup || !dropoff) return;
    let cancelled = false;
    setPreviewLoading(true);
    loadRidePreview({
      pickup: { lat: pickup.lat, lng: pickup.lng },
      dropoff: { lat: dropoff.lat, lng: dropoff.lng },
      serviceLevel,
    })
      .then(d => { if (!cancelled) setPreview(d); })
      .catch(() => { if (!cancelled) setPreview(INITIAL_PREVIEW); })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });
    return () => { cancelled = true; };
  }, [pickup, dropoff, serviceLevel]);

  const handleConfirm = async () => {
    if (!pickup || !dropoff || submitting) return;
    setSubmitting(true);
    try {
      const scheduledFor = bookingMode === "scheduled" && scheduledDate && scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : undefined;

      const job = await createJob({
        jobType: "taxi",
        serviceLevel,
        bookingMode,
        scheduledFor,
        pickupLabel: pickup.label,
        pickupAddress: pickup.formatted_address,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropoffLabel: dropoff.label,
        dropoffAddress: dropoff.formatted_address,
        dropoffLat: dropoff.lat,
        dropoffLng: dropoff.lng,
        seatsRequested: seats,
        quotedPrice: preview.estimatedFare ?? 0,
        currency: "AED",
      });
      setActiveJobId(job.id);
      setStep("active_ride");
      toast.success(bookingMode === "scheduled"
        ? tc("mobility.ride_scheduled") || "Ride scheduled!"
        : tc("mobility.ride_requested") || "Taxi requested!");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to request ride");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      key="taxi-preview"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-4"
    >
      {/* Back button */}
      <button
        type="button"
        onClick={() => setStep("search")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Edit trip
      </button>

      {/* Route summary */}
      <div className="rounded-2xl border border-border/30 bg-card p-4 space-y-2">
        <div className="flex items-start gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
          <span className="text-sm text-foreground truncate">{pickup?.label || "Pickup"}</span>
        </div>
        <div className="ml-1 border-l-2 border-dashed border-border/40 h-4" />
        <div className="flex items-start gap-2.5">
          <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
          <span className="text-sm text-foreground truncate">{dropoff?.label || "Dropoff"}</span>
        </div>
      </div>

      {/* Preview card */}
      {previewLoading ? (
        <div className="rounded-xl border border-border/20 bg-muted/20 p-6 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">{tc("mobility.computing_route") || "Computing route…"}</span>
        </div>
      ) : preview.ready ? (
        <div className="rounded-2xl border border-border/30 bg-card p-4 space-y-3">
          {/* Fare hero */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">{tc("ride.fare") || "Estimated fare"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold text-foreground">{preview.estimatedFare} AED</span>
              {preview.surgeMultiplier > 1 && (
                <span className="flex items-center gap-0.5 text-xs text-amber-500 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                  <Zap className="w-3 h-3" /> ×{preview.surgeMultiplier.toFixed(1)}
                </span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center bg-muted/30 rounded-lg py-2 px-1">
              <Navigation className="w-3.5 h-3.5 text-primary mb-0.5" />
              <span className="text-xs font-bold text-foreground">{preview.distanceKm?.toFixed(1)} km</span>
              <span className="text-[9px] text-muted-foreground">Distance</span>
            </div>
            <div className="flex flex-col items-center bg-muted/30 rounded-lg py-2 px-1">
              <Clock className="w-3.5 h-3.5 text-sky-500 mb-0.5" />
              <span className="text-xs font-bold text-foreground">{preview.etaMinutes} min</span>
              <span className="text-[9px] text-muted-foreground">ETA</span>
            </div>
            <div className="flex flex-col items-center bg-muted/30 rounded-lg py-2 px-1">
              <Car className="w-3.5 h-3.5 text-emerald-500 mb-0.5" />
              <span className="text-xs font-bold text-foreground">{preview.waitMinutes} min</span>
              <span className="text-[9px] text-muted-foreground">Wait</span>
            </div>
          </div>

          {/* Zone info */}
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Signal className="w-3 h-3" />
              <span>{preview.nearbyDrivers ?? 0} drivers nearby</span>
            </div>
            <span className={cn(
              "px-2 py-0.5 rounded-full font-semibold capitalize",
              preview.trafficLevel === "low" ? "bg-emerald-500/10 text-emerald-600" :
              preview.trafficLevel === "moderate" ? "bg-amber-500/10 text-amber-600" :
              preview.trafficLevel === "heavy" ? "bg-orange-500/10 text-orange-600" :
              "bg-muted text-muted-foreground"
            )}>
              {preview.trafficLevel}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">Could not compute route preview</p>
        </div>
      )}

      {/* Confirm button */}
      <div className="mobility-submit-sticky">
        <button
          type="button"
          disabled={!preview.ready || submitting}
          onClick={handleConfirm}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
        >
          {submitting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> {tc("mobility.requesting") || "Requesting..."}</>
            : <>🚀 {bookingMode === "scheduled" ? tc("mobility.reserve_ride") || "Reserve ride" : tc("mobility.request_taxi") || "Request taxi"}</>}
        </button>
      </div>
    </motion.div>
  );
}
