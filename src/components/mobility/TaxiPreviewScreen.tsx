/**
 * TaxiPreviewScreen — Step 2: Route preview + fare + confirm.
 * Premium first-class design — no text clipping, proper spacing.
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
      toast.success("Taxi requested!");
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
        className="flex items-center gap-1.5 text-sm text-muted-foreground active:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4 shrink-0" /> Edit trip
      </button>

      {/* Route map placeholder */}
      <div className="rounded-2xl border border-border/20 bg-card/40 overflow-hidden">
        <div className="h-44 flex items-center justify-center bg-muted/10">
          <p className="text-xs text-muted-foreground/60">Route preview map</p>
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0 ring-2 ring-emerald-500/20" />
            <p className="text-sm text-foreground leading-snug break-words">{pickup?.label || "Pickup"}</p>
          </div>
          <div className="ml-[5px] border-l-2 border-dashed border-border/30 h-4" />
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1 shrink-0 ring-2 ring-primary/20" />
            <p className="text-sm text-foreground leading-snug break-words">{dropoff?.label || "Dropoff"}</p>
          </div>
        </div>
      </div>

      {/* Wait time */}
      {preview.ready && !previewLoading && (
        <div className="flex items-center gap-3 rounded-2xl border border-border/15 bg-card/40 px-4 py-3">
          <div className="w-9 h-9 rounded-full bg-muted/40 flex items-center justify-center shrink-0">
            <span className="text-base">⏱️</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground">Wait time in your area</p>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {activeOption.title} rides arriving in ~{preview.waitMinutes ?? "?"} min
            </p>
          </div>
        </div>
      )}

      {/* Ride options */}
      <div>
        <p className="text-xs font-bold text-foreground mb-2.5">Choose your ride</p>
        <div className="grid grid-cols-4 gap-2.5">
          {SERVICE_OPTIONS.map(opt => {
            const selected = opt.value === serviceLevel;
            return (
              <button key={opt.value} type="button" onClick={() => setServiceLevel(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 py-3.5 rounded-2xl border-2 transition-all duration-200",
                  selected
                    ? "border-primary bg-primary/8 shadow-md shadow-primary/15 scale-[1.02]"
                    : "border-border/20 bg-card/60"
                )}>
                <span className="text-2xl leading-none select-none">{opt.emoji}</span>
                <span className={cn(
                  "text-[11px] font-bold leading-none",
                  selected ? "text-primary" : "text-foreground"
                )}>{opt.title}</span>
                <span className="text-[9px] text-muted-foreground/80 leading-none">{opt.subtitle}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fare card */}
      {previewLoading ? (
        <div className="rounded-2xl border border-border/15 bg-card/40 p-8 flex items-center justify-center gap-2.5">
          <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
          <span className="text-xs text-muted-foreground">Computing route…</span>
        </div>
      ) : preview.ready ? (
        <div className="rounded-2xl border border-border/15 bg-card/40 p-4 space-y-4">
          {/* Fare header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground font-medium">Estimated fare</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground tracking-tight">{preview.estimatedFare} AED</span>
              {preview.surgeMultiplier > 1 && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-500 px-2 py-1 rounded-full">
                  <Zap className="w-3 h-3 shrink-0" /> ×{preview.surgeMultiplier.toFixed(1)}
                </span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Navigation, value: `${preview.distanceKm?.toFixed(1)} km`, label: "Distance" },
              { icon: Clock, value: `${preview.etaMinutes} min`, label: "ETA" },
              { icon: Car, value: `${preview.waitMinutes} min`, label: "Wait" },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex flex-col items-center bg-muted/20 rounded-xl py-3 px-2">
                <Icon className="w-4 h-4 text-primary mb-1 shrink-0" />
                <span className="text-xs font-bold text-foreground">{value}</span>
                <span className="text-[9px] text-muted-foreground mt-0.5">{label}</span>
              </div>
            ))}
          </div>

          {/* Zone context */}
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Signal className="w-3 h-3 shrink-0" />
              <span>{preview.nearbyDrivers ?? 0} drivers nearby</span>
            </div>
            <span className={cn(
              "px-2.5 py-1 rounded-full font-bold capitalize text-[10px]",
              preview.trafficLevel === "low" ? "bg-emerald-500/10 text-emerald-500" :
              preview.trafficLevel === "moderate" ? "bg-amber-500/10 text-amber-500" :
              preview.trafficLevel === "heavy" ? "bg-orange-500/10 text-orange-500" :
              "bg-muted text-muted-foreground"
            )}>
              {preview.trafficLevel}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-xs text-muted-foreground">Could not compute route preview</p>
        </div>
      )}

      {/* Safety */}
      <div className="flex items-center gap-3 rounded-2xl border border-border/15 bg-card/40 px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground">Safer and smarter</p>
          <p className="text-[11px] text-muted-foreground leading-snug">Verified driver, live tracking, route visibility</p>
        </div>
      </div>

      {/* Confirm CTA */}
      <div className="pt-1 pb-2">
        <button
          type="button"
          disabled={!preview.ready || submitting}
          onClick={handleConfirm}
          className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98]"
        >
          {submitting
            ? <><Loader2 className="w-4 h-4 animate-spin shrink-0" /> Requesting…</>
            : <>🚀 Request {activeOption.title}</>}
        </button>
      </div>

      {/* Seats */}
      <div className="flex items-center justify-between rounded-2xl border border-border/15 bg-card/40 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Users className="w-4 h-4 text-primary shrink-0" />
          <div>
            <p className="text-xs font-bold text-foreground">Seats</p>
            <p className="text-[11px] text-muted-foreground">{seats} passenger{seats > 1 ? "s" : ""}</p>
          </div>
        </div>
        <span className="text-xs font-medium text-muted-foreground shrink-0">{activeOption.subtitle}</span>
      </div>
    </motion.div>
  );
}
