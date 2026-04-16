import React, { useState, useEffect } from "react";
import { useTaxiFlowStore, type TaxiServiceLevel } from "@/stores/taxiFlowStore";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { loadRidePreview, type RidePreviewData } from "@/lib/mobility/load-ride-preview";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ArrowLeft, Navigation, Clock, Car, Crown, Truck, Zap, Signal, Loader2, ShieldCheck, Users, Tag } from "lucide-react";
import { motion } from "framer-motion";

const INITIAL_PREVIEW: RidePreviewData = {
  ready: false, waitMinutes: null, etaMinutes: null, etaRangeMin: null, etaRangeMax: null, distanceKm: null,
  estimatedFare: null, trafficLevel: "unknown", weatherImpact: "none", badge: null, confidenceScore: null,
  zoneKey: null, nearbyDrivers: null, surgeMultiplier: 1,
};

const SERVICE_OPTIONS: { value: TaxiServiceLevel; icon: typeof Car; title: string; subtitle: string; desc: string }[] = [
  { value: "taxi_standard", icon: Car, title: "Standard", subtitle: "4 seats", desc: "Affordable everyday rides" },
  { value: "taxi_premium", icon: Crown, title: "Premium", subtitle: "Luxury", desc: "Premium comfort & style" },
  { value: "taxi_xl", icon: Truck, title: "XL", subtitle: "6+ seats", desc: "Extra space for groups" },
  { value: "taxi_moto", icon: Zap, title: "Moto", subtitle: "Fast", desc: "Quick & nimble" },
];

interface AllPreviews {
  [key: string]: RidePreviewData;
}

function estimateBaseFare(distanceKm: number, etaMinutes: number, serviceLevel: string, surge: number) {
  const base = serviceLevel === "taxi_xl" ? 18 : serviceLevel === "taxi_premium" ? 28 : serviceLevel === "taxi_moto" ? 8 : 12;
  const perKm = serviceLevel === "taxi_xl" ? 2.8 : serviceLevel === "taxi_premium" ? 4.2 : serviceLevel === "taxi_moto" ? 1.5 : 2.1;
  const perMin = serviceLevel === "taxi_xl" ? 0.55 : serviceLevel === "taxi_premium" ? 0.8 : serviceLevel === "taxi_moto" ? 0.3 : 0.4;
  const distanceFare = distanceKm * perKm;
  const timeFare = etaMinutes * perMin;
  const surgeAmount = surge > 1 ? (base + distanceFare + timeFare) * (surge - 1) : 0;
  return { base, distanceFare: Math.round(distanceFare * 10) / 10, timeFare: Math.round(timeFare * 10) / 10, surgeAmount: Math.round(surgeAmount * 10) / 10 };
}

export function TaxiPreviewScreen() {
  const {
    pickup, dropoff, serviceLevel, bookingMode, scheduledDate, scheduledTime, seats,
    setServiceLevel, setStep, setActiveJobId,
  } = useTaxiFlowStore();
  const createJob = useCustomerMobilityStore(s => s.createJob);

  const [allPreviews, setAllPreviews] = useState<AllPreviews>({});
  const [loadingAll, setLoadingAll] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [promoCode, setPromoCode] = useState("");

  useEffect(() => {
    if (!pickup || !dropoff) return;
    let cancelled = false;
    setLoadingAll(true);

    const levels: TaxiServiceLevel[] = ["taxi_standard", "taxi_premium", "taxi_xl", "taxi_moto"];
    Promise.all(
      levels.map(sl =>
        loadRidePreview({
          pickup: { lat: pickup.lat, lng: pickup.lng },
          dropoff: { lat: dropoff.lat, lng: dropoff.lng },
          serviceLevel: sl,
        }).then(d => ({ sl, data: d })).catch(() => ({ sl, data: INITIAL_PREVIEW }))
      )
    ).then(results => {
      if (cancelled) return;
      const map: AllPreviews = {};
      results.forEach(r => { map[r.sl] = r.data; });
      setAllPreviews(map);
      setLoadingAll(false);
    });

    return () => { cancelled = true; };
  }, [pickup, dropoff]);

  const preview = allPreviews[serviceLevel] ?? INITIAL_PREVIEW;

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

  const fareBreakdown = preview.ready && preview.distanceKm && preview.etaMinutes
    ? estimateBaseFare(preview.distanceKm, preview.etaMinutes, serviceLevel, preview.surgeMultiplier)
    : null;

  return (
    <div className="space-y-3">
      <button type="button" onClick={() => setStep("search")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground active:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4 shrink-0" /> Edit trip
      </button>

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
        {loadingAll ? (
          <div className="rounded-2xl border border-border/15 bg-card p-8 flex items-center justify-center gap-2.5">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: "hsl(var(--accent))" }} />
            <span className="text-xs text-muted-foreground">Loading all ride options…</span>
          </div>
        ) : (
          <div className="space-y-2">
            {SERVICE_OPTIONS.map(opt => {
              const selected = opt.value === serviceLevel;
              const p = allPreviews[opt.value];
              const Icon = opt.icon;
              return (
                <button key={opt.value} type="button" onClick={() => setServiceLevel(opt.value)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-200 text-left",
                    selected ? "shadow-lg" : "border-border/10 bg-card/60"
                  )}
                  style={selected ? { borderColor: "hsl(var(--accent) / 0.3)", background: "hsl(var(--accent) / 0.06)", boxShadow: "0 0 0 1px hsl(var(--accent) / 0.1), 0 4px 12px hsl(var(--accent) / 0.08)" } : undefined}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                    selected ? "" : "bg-muted/30"
                  )} style={selected ? { background: "hsl(var(--accent) / 0.15)" } : undefined}>
                    <Icon className="h-6 w-6" style={selected ? { color: "hsl(var(--accent))" } : { color: "var(--muted-foreground)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-bold", selected ? "" : "text-foreground")}
                        style={selected ? { color: "hsl(var(--accent))" } : undefined}>{opt.title}</span>
                      <span className="text-[0.625rem] text-muted-foreground">{opt.subtitle}</span>
                    </div>
                    <p className="text-[0.625rem] text-muted-foreground mt-0.5">{opt.desc}</p>
                    {p?.ready && (
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[0.625rem] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> {p.waitMinutes}min pickup
                        </span>
                        <span className="text-[0.625rem] text-muted-foreground flex items-center gap-0.5">
                          <Navigation className="w-2.5 h-2.5" /> {p.distanceKm?.toFixed(1)}km
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {p?.ready ? (
                      <>
                        <span className={cn("text-lg font-bold", selected ? "" : "text-foreground")}
                          style={selected ? { color: "hsl(var(--accent))" } : undefined}>
                          {p.estimatedFare}
                        </span>
                        <span className="text-[0.625rem] text-muted-foreground ml-0.5">AED</span>
                        {p.surgeMultiplier > 1 && (
                          <div className="flex items-center justify-end gap-0.5 mt-0.5">
                            <Zap className="w-2.5 h-2.5" style={{ color: "hsl(var(--accent))" }} />
                            <span className="text-[0.625rem] font-bold" style={{ color: "hsl(var(--accent))" }}>
                              x{p.surgeMultiplier.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {preview.ready && fareBreakdown && (
        <div className="rounded-2xl border border-border/20 bg-card p-3.5 space-y-2">
          <p className="text-xs font-bold text-foreground">Fare breakdown</p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Base fare</span>
              <span className="text-foreground font-medium">{fareBreakdown.base.toFixed(1)} AED</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Distance ({preview.distanceKm?.toFixed(1)} km)</span>
              <span className="text-foreground font-medium">{fareBreakdown.distanceFare.toFixed(1)} AED</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Time ({preview.etaMinutes} min)</span>
              <span className="text-foreground font-medium">{fareBreakdown.timeFare.toFixed(1)} AED</span>
            </div>
            {fareBreakdown.surgeAmount > 0 && (
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1" style={{ color: "hsl(var(--accent))" }}>
                  <Zap className="w-3 h-3" /> Surge (x{preview.surgeMultiplier.toFixed(1)})
                </span>
                <span className="font-medium" style={{ color: "hsl(var(--accent))" }}>+{fareBreakdown.surgeAmount.toFixed(1)} AED</span>
              </div>
            )}
            <div className="border-t border-border/15 pt-1.5 flex justify-between text-sm">
              <span className="font-bold text-foreground">Total</span>
              <span className="font-bold text-foreground">{preview.estimatedFare} AED</span>
            </div>
          </div>
        </div>
      )}

      {preview.ready && (
        <div className="rounded-2xl border border-border/20 bg-card p-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Navigation, value: `${preview.distanceKm?.toFixed(1)} km`, label: "Distance" },
              { icon: Clock, value: preview.etaRangeMin && preview.etaRangeMax ? `${preview.etaRangeMin}–${preview.etaRangeMax} min` : `${preview.etaMinutes} min`, label: "Trip time" },
              { icon: Car, value: `${preview.waitMinutes} min`, label: "Pickup ETA" },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex flex-col items-center rounded-xl py-2.5 px-2" style={{ background: "hsl(226 24% 14% / 0.04)" }}>
                <Icon className="w-4 h-4 mb-1 shrink-0" style={{ color: "hsl(var(--accent))" }} />
                <span className="text-xs font-bold text-foreground">{value}</span>
                <span className="text-[0.625rem] text-muted-foreground mt-0.5">{label}</span>
              </div>
            ))}
          </div>

          {preview.badge && (
            <div className="mt-2 px-3 py-1.5 rounded-lg text-[0.625rem] font-bold text-center"
              style={{ background: "hsl(var(--accent) / 0.08)", color: "hsl(var(--accent))" }}>
              {preview.badge}
            </div>
          )}

          <div className="flex items-center justify-between text-[0.625rem] mt-3 px-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Signal className="w-3 h-3 shrink-0" />
              <span>{preview.nearbyDrivers ?? 0} drivers nearby</span>
            </div>
            <span className={cn(
              "px-2 py-0.5 rounded-full font-bold capitalize text-[0.625rem]",
              preview.trafficLevel === "low" ? "text-emerald-500" :
              preview.trafficLevel === "moderate" ? "text-amber-500" :
              preview.trafficLevel === "heavy" ? "text-orange-500" :
              preview.trafficLevel === "gridlock" ? "text-red-500" :
              "text-muted-foreground"
            )} style={{
              background: preview.trafficLevel === "low" ? "hsl(142 71% 45% / 0.1)" :
                preview.trafficLevel === "moderate" ? "hsl(var(--accent) / 0.1)" :
                preview.trafficLevel === "heavy" ? "hsl(20 80% 50% / 0.1)" :
                preview.trafficLevel === "gridlock" ? "hsl(0 80% 50% / 0.1)" :
                "hsl(0 0% 50% / 0.1)"
            }}>
              {preview.trafficLevel}
            </span>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border/15 bg-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <Tag className="w-3.5 h-3.5" style={{ color: "hsl(var(--accent))" }} />
          <span className="text-xs font-bold text-foreground">Promo code</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={e => setPromoCode(e.target.value.toUpperCase())}
            placeholder="Enter promo code"
            className="flex-1 px-3 py-2 rounded-xl border border-border/20 bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="button"
            disabled={!promoCode.trim()}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-all"
            style={{ background: "hsl(226 24% 14%)" }}
            onClick={() => toast.info("Promo code applied")}
          >
            Apply
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-border/15 bg-card px-4 py-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "hsl(142 71% 45% / 0.1)" }}>
          <ShieldCheck className="w-4 h-4" style={{ color: "hsl(142 71% 45%)" }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground">Verified & tracked</p>
          <p className="text-[0.625rem] text-muted-foreground leading-snug">Verified driver · Live tracking · Route monitoring</p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border/15 bg-card px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--accent))" }} />
          <span className="text-xs font-bold text-foreground">{seats} passenger{seats > 1 ? "s" : ""}</span>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">{SERVICE_OPTIONS.find(o => o.value === serviceLevel)?.subtitle}</span>
      </div>

      <div className="pt-1 pb-2">
        <button
          type="button"
          disabled={!preview.ready || submitting}
          onClick={handleConfirm}
          className="w-full h-14 rounded-2xl font-bold text-sm disabled:opacity-40 transition-all duration-200 flex items-center justify-center gap-2 text-white active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, hsl(226 24% 14%), hsl(226 22% 18%))", boxShadow: "0 8px 32px hsl(226 24% 14% / 0.4), 0 2px 8px hsl(0 0% 0% / 0.2)" }}
        >
          {submitting
            ? <><Loader2 className="w-4 h-4 animate-spin shrink-0" /> Requesting…</>
            : <>Confirm {SERVICE_OPTIONS.find(o => o.value === serviceLevel)?.title} — {preview.estimatedFare ?? "?"} AED</>}
        </button>
      </div>
    </div>
  );
}
