/**
 * TaxiPreviewScreen — Step 2: Route + fare + ride options + confirm.
 * Map appears HERE (not before). Uses real loadRidePreview engine.
 */
import React, { useState, useEffect } from "react";
import { useTaxiFlowStore, type TaxiServiceLevel } from "@/stores/taxiFlowStore";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { loadRidePreview, type RidePreviewData } from "@/lib/mobility/load-ride-preview";
import { toast } from "sonner";
import { tc } from "@/lib/i18n-canonical";
import { cn } from "@/lib/utils";
import { ArrowLeft, Navigation, Clock, Car, DollarSign, Zap, Signal, Loader2, ShieldCheck, Users } from "lucide-react";
import { motion } from "framer-motion";

const INITIAL_PREVIEW: RidePreviewData = {
  ready: false, waitMinutes: null, etaMinutes: null, distanceKm: null,
  estimatedFare: null, trafficLevel: "unknown", zoneKey: null, nearbyDrivers: null, surgeMultiplier: 1,
};

const SERVICE_OPTIONS: { value: TaxiServiceLevel; emoji: string; title: string; subtitle: string }[] = [
  { value: "taxi_standard", emoji: "🚕", title: "Standard", subtitle: "4 seats" },
  { value: "taxi_premium", emoji: "✨", title: "Premium", subtitle: "Luxury" },
  { value: "taxi_xl", emoji: "🚐", title: "XL", subtitle: "6+ seats" },
  { value: "taxi_moto", emoji: "🏍️", title: "Moto", subtitle: "Fast" },
];

export function TaxiPreviewScreen() {
  const {
    pickup, dropoff, serviceLevel, bookingMode, scheduledDate, scheduledTime, seats,
    setServiceLevel, setStep, setActiveJobId,
  } = useTaxiFlowStore();
  const createJob = useCustomerMobilityStore(s => s.createJob);

  const [preview, setPreview] = useState<RidePreviewData>(INITIAL_PREVIEW);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load preview
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
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString() : undefined;

      const job = await createJob({
        jobType: "taxi", serviceLevel, bookingMode, scheduledFor,
        pickupLabel: pickup.label, pickupAddress: pickup.formatted_address,
        pickupLat: pickup.lat, pickupLng: pickup.lng,
        dropoffLabel: dropoff.label, dropoffAddress: dropoff.formatted_address,
        dropoffLat: dropoff.lat, dropoffLng: dropoff.lng,
        seatsRequested: seats,
        quotedPrice: preview.estimatedFare ?? 0, currency: "AED",
      });
      setActiveJobId(job.id);
      setStep("requesting");
      toast.success(tc("mobility.ride_requested") || "Taxi requested!");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to request ride");
    } finally {
      setSubmitting(false);
    }
  };

  const activeOption = SERVICE_OPTIONS.find(o => o.value === serviceLevel) ?? SERVICE_OPTIONS[0];

  return (
    <motion.div
      key="taxi-preview"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-4"
    >
      {/* Back */}
      <button type="button" onClick={() => setStep("search")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4 shrink-0" /> Edit trip
      </button>

      {/* Route map placeholder */}
      <div className="rounded-2xl border border-border/30 bg-muted/20 overflow-hidden">
        <div className="h-44 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">Route preview map</p>
        </div>
        {/* Route summary */}
        <div className="p-3 border-t border-border/20 space-y-1.5">
          <div className="flex items-start gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
            <span className="text-sm text-foreground break-words line-clamp-2">{pickup?.label || "Pickup"}</span>
          </div>
          <div className="ml-1 border-l-2 border-dashed border-border/40 h-3" />
          <div className="flex items-start gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
            <span className="text-sm text-foreground break-words line-clamp-2">{dropoff?.label || "Dropoff"}</span>
          </div>
        </div>
      </div>

      {/* Wait time info */}
      {preview.ready && !previewLoading && (
        <div className="flex items-center gap-3 rounded-xl bg-muted/30 px-4 py-2.5">
          <span className="text-lg shrink-0">⏱️</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">Wait time in your area</p>
            <p className="text-[11px] text-muted-foreground">
              {activeOption.title} rides arriving in ~{preview.waitMinutes ?? "?"} min
            </p>
          </div>
        </div>
      )}

      {/* Ride options */}
      <div>
        <p className="text-xs font-bold text-foreground mb-2">Choose your ride</p>
        <div className="grid grid-cols-4 gap-1.5">
          {SERVICE_OPTIONS.map(opt => {
            const selected = opt.value === serviceLevel;
            return (
              <button key={opt.value} type="button" onClick={() => setServiceLevel(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-0.5 p-2 rounded-xl border-2 transition-all text-center min-w-0 overflow-hidden",
                  selected ? "border-primary bg-primary/5 text-primary" : "border-border/40 bg-card text-muted-foreground"
                )}>
                <span className="text-base leading-none">{opt.emoji}</span>
                <span className="text-[10px] font-bold leading-tight w-full break-words">{opt.title}</span>
                <span className="text-[8px] text-muted-foreground leading-tight w-full break-words">{opt.subtitle}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fare & stats */}
      {previewLoading ? (
        <div className="rounded-xl border border-border/20 bg-muted/20 p-6 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
          <span className="text-xs text-muted-foreground">{tc("mobility.computing_route") || "Computing route…"}</span>
        </div>
      ) : preview.ready ? (
        <div className="rounded-2xl border border-border/30 bg-card p-4 space-y-3">
          {/* Fare */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <DollarSign className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground">Estimated fare</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xl font-bold text-foreground">{preview.estimatedFare} AED</span>
              {preview.surgeMultiplier > 1 && (
                <span className="flex items-center gap-0.5 text-xs font-semibold bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full">
                  <Zap className="w-3 h-3 shrink-0" /> ×{preview.surgeMultiplier.toFixed(1)}
                </span>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center bg-muted/30 rounded-lg py-2 px-1 min-w-0">
              <Navigation className="w-3.5 h-3.5 text-primary mb-0.5 shrink-0" />
              <span className="text-xs font-bold text-foreground">{preview.distanceKm?.toFixed(1)} km</span>
              <span className="text-[9px] text-muted-foreground">Distance</span>
            </div>
            <div className="flex flex-col items-center bg-muted/30 rounded-lg py-2 px-1 min-w-0">
              <Clock className="w-3.5 h-3.5 text-primary mb-0.5 shrink-0" />
              <span className="text-xs font-bold text-foreground">{preview.etaMinutes} min</span>
              <span className="text-[9px] text-muted-foreground">ETA</span>
            </div>
            <div className="flex flex-col items-center bg-muted/30 rounded-lg py-2 px-1 min-w-0">
              <Car className="w-3.5 h-3.5 text-primary mb-0.5 shrink-0" />
              <span className="text-xs font-bold text-foreground">{preview.waitMinutes} min</span>
              <span className="text-[9px] text-muted-foreground">Wait</span>
            </div>
          </div>

          {/* Zone context */}
          <div className="flex items-center justify-between gap-2 text-[10px] flex-wrap">
            <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
              <Signal className="w-3 h-3 shrink-0" />
              <span>{preview.nearbyDrivers ?? 0} drivers nearby</span>
            </div>
            <span className={cn(
              "px-2 py-0.5 rounded-full font-semibold capitalize shrink-0",
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

      {/* Safety badge */}
      <div className="flex items-center gap-3 rounded-xl bg-muted/20 px-4 py-2.5">
        <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">Safer and smarter</p>
          <p className="text-[11px] text-muted-foreground leading-snug">Verified driver, live tracking, route visibility</p>
        </div>
      </div>

      {/* Seats info */}
      <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/20 px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">Seats</p>
            <p className="text-[11px] text-muted-foreground">{seats} passenger{seats > 1 ? "s" : ""}</p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{activeOption.subtitle}</span>
      </div>

      {/* Confirm */}
      <div className="mobility-submit-sticky">
        <button
          type="button"
          disabled={!preview.ready || submitting}
          onClick={handleConfirm}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
        >
          {submitting
            ? <><Loader2 className="w-4 h-4 animate-spin shrink-0" /> Requesting...</>
            : <>🚀 Request {activeOption.title}</>}
        </button>
      </div>
    </motion.div>
  );
}
