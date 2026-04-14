import React, { useState, useEffect } from "react";
import { useTaxiFlowStore, type TaxiServiceLevel } from "@/stores/taxiFlowStore";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { loadRidePreview, type RidePreviewData } from "@/lib/mobility/load-ride-preview";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ArrowLeft, Navigation, Clock, Car, DollarSign, Zap, Signal, Loader2, ShieldCheck, Users, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { MobilityLiveMap } from "./MobilityLiveMap";

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
    } catch {
      toast.error("Failed to request ride");
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
      className="space-y-3"
    >
      <button type="button" onClick={() => setStep("search")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground active:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4 shrink-0" /> Edit trip
      </button>

      <div className="rounded-2xl overflow-hidden border border-border/20" style={{ aspectRatio: "16/9", minHeight: 140, maxHeight: 220 }}>
        <MobilityLiveMap
          mode="taxi"
          pickupLat={pickup?.lat}
          pickupLng={pickup?.lng}
          dropoffLat={dropoff?.lat}
          dropoffLng={dropoff?.lng}
          nearbyRiders={preview.nearbyDrivers ?? 4}
        />
      </div>

      <div className="rounded-2xl border border-border/20 bg-card p-3.5 space-y-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "hsl(142 71% 45%)" }} />
          <p className="text-sm text-foreground leading-snug break-words flex-1 min-w-0 line-clamp-1">{pickup?.label || "Pickup"}</p>
        </div>
        <div className="ml-[5px] border-l-2 border-dashed border-border/30 h-3" />
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "hsl(var(--accent))" }} />
          <p className="text-sm text-foreground leading-snug break-words flex-1 min-w-0 line-clamp-1">{dropoff?.label || "Dropoff"}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-foreground mb-2">Choose your ride</p>
        <div className="grid grid-cols-4 gap-2">
          {SERVICE_OPTIONS.map(opt => {
            const selected = opt.value === serviceLevel;
            return (
              <button key={opt.value} type="button" onClick={() => setServiceLevel(opt.value)}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all duration-200",
                  selected ? "shadow-md scale-[1.02]" : "border-border/20 bg-card/60"
                )}
                style={selected ? { borderColor: "hsl(var(--accent))", background: "hsl(var(--accent) / 0.08)" } : undefined}
              >
                <span className="text-xl leading-none select-none">{opt.emoji}</span>
                <span className="text-[11px] font-bold leading-none"
                  style={selected ? { color: "hsl(var(--accent))" } : undefined}>{opt.title}</span>
                <span className="text-[10px] text-muted-foreground/80 leading-none">{opt.subtitle}</span>
              </button>
            );
          })}
        </div>
      </div>

      {previewLoading ? (
        <div className="rounded-2xl border border-border/15 bg-card p-8 flex items-center justify-center gap-2.5">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: "hsl(var(--accent))" }} />
          <span className="text-xs text-muted-foreground">Computing route…</span>
        </div>
      ) : preview.ready ? (
        <div className="rounded-2xl border border-border/20 overflow-hidden">
          <div className="p-4 text-center" style={{ background: "hsl(225 22% 16%)" }}>
            <p className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: "hsl(var(--accent) / 0.7)" }}>Estimated Fare</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-bold text-white tracking-tight">{preview.estimatedFare} AED</span>
              {preview.surgeMultiplier > 1 && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-1 rounded-full"
                  style={{ background: "hsl(var(--accent) / 0.15)", color: "hsl(var(--accent))" }}>
                  <Zap className="w-3 h-3 shrink-0" /> ×{preview.surgeMultiplier.toFixed(1)}
                </span>
              )}
            </div>
          </div>

          <div className="p-3 bg-card">
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Navigation, value: `${preview.distanceKm?.toFixed(1)} km`, label: "Distance" },
                { icon: Clock, value: `${preview.etaMinutes} min`, label: "Trip time" },
                { icon: Car, value: `${preview.waitMinutes} min`, label: "Pickup ETA" },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex flex-col items-center rounded-xl py-2.5 px-2" style={{ background: "hsl(225 22% 16% / 0.04)" }}>
                  <Icon className="w-4 h-4 mb-1 shrink-0" style={{ color: "hsl(var(--accent))" }} />
                  <span className="text-xs font-bold text-foreground">{value}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">{label}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-[10px] mt-3 px-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Signal className="w-3 h-3 shrink-0" />
                <span>{preview.nearbyDrivers ?? 0} drivers nearby</span>
              </div>
              <span className={cn(
                "px-2 py-0.5 rounded-full font-bold capitalize text-[10px]",
                preview.trafficLevel === "low" ? "text-emerald-500" :
                preview.trafficLevel === "moderate" ? "text-amber-500" :
                preview.trafficLevel === "heavy" ? "text-orange-500" :
                "text-muted-foreground"
              )} style={{
                background: preview.trafficLevel === "low" ? "hsl(142 71% 45% / 0.1)" :
                  preview.trafficLevel === "moderate" ? "hsl(var(--accent) / 0.1)" :
                  preview.trafficLevel === "heavy" ? "hsl(20 80% 50% / 0.1)" :
                  "hsl(0 0% 50% / 0.1)"
              }}>
                {preview.trafficLevel}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-xs text-muted-foreground">Could not compute route preview</p>
        </div>
      )}

      <div className="flex items-center gap-3 rounded-xl border border-border/15 bg-card px-4 py-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "hsl(142 71% 45% / 0.1)" }}>
          <ShieldCheck className="w-4 h-4" style={{ color: "hsl(142 71% 45%)" }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground">Verified & tracked</p>
          <p className="text-[10px] text-muted-foreground leading-snug">Verified driver · Live tracking · Route monitoring</p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border/15 bg-card px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--accent))" }} />
          <span className="text-xs font-bold text-foreground">{seats} passenger{seats > 1 ? "s" : ""}</span>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{activeOption.subtitle}</span>
      </div>

      <div className="pt-1 pb-2">
        <button
          type="button"
          disabled={!preview.ready || submitting}
          onClick={handleConfirm}
          className="w-full h-14 rounded-2xl font-bold text-sm disabled:opacity-40 transition-all duration-200 flex items-center justify-center gap-2 text-white active:scale-[0.98]"
          style={{ background: "hsl(225 22% 16%)", boxShadow: "0 8px 25px hsl(225 22% 16% / 0.3)" }}
        >
          {submitting
            ? <><Loader2 className="w-4 h-4 animate-spin shrink-0" /> Requesting…</>
            : <>Confirm {activeOption.title} — {preview.estimatedFare ?? "?"} AED</>}
        </button>
      </div>
    </motion.div>
  );
}
