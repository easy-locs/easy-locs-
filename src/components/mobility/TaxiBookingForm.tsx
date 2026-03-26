/**
 * TaxiBookingForm — Premium customer taxi booking form.
 * Integrates loadRidePreview for live ETA/fare/driver preview BEFORE submission.
 * Uses CanonicalAddressInput for pickup/dropoff → zone intelligence propagation.
 */
import React, { useState, useCallback, useEffect } from "react";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { loadRidePreview, type RidePreviewData } from "@/lib/mobility/load-ride-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Car, MapPin, Navigation, Clock, DollarSign, Calendar, Users, Zap, Loader2, Signal } from "lucide-react";
import { cn } from "@/lib/utils";
import { CanonicalAddressInput } from "@/components/address/CanonicalAddressInput";
import type { CanonicalPlace } from "@/lib/address/canonical-place";
import { tc } from "@/lib/i18n-canonical";
import { motion, AnimatePresence } from "framer-motion";

type ServiceLevel = "taxi_standard" | "taxi_premium" | "taxi_xl" | "taxi_moto";
type BookingMode = "now" | "scheduled";

const SERVICE_LEVELS: { value: ServiceLevel; label: string; emoji: string; desc: string }[] = [
  { value: "taxi_standard", label: "Standard", emoji: "🚕", desc: "4 seats" },
  { value: "taxi_premium", label: "Premium", emoji: "✨", desc: "Luxury" },
  { value: "taxi_xl", label: "XL", emoji: "🚐", desc: "6+ seats" },
  { value: "taxi_moto", label: "Moto", emoji: "🏍️", desc: "Fast" },
];

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

export function TaxiBookingForm() {
  const createJob = useCustomerMobilityStore(s => s.createJob);
  const [serviceLevel, setServiceLevel] = useState<ServiceLevel>("taxi_standard");
  const [bookingMode, setBookingMode] = useState<BookingMode>("now");
  const [pickup, setPickup] = useState<CanonicalPlace | null>(null);
  const [dropoff, setDropoff] = useState<CanonicalPlace | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [seats, setSeats] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<RidePreviewData>(INITIAL_PREVIEW);
  const [previewLoading, setPreviewLoading] = useState(false);

  const canPreview = !!pickup && !!dropoff;
  const canSubmit = canPreview && preview.ready && !submitting;

  const getScheduledFor = (): string | undefined => {
    if (bookingMode !== "scheduled" || !scheduledDate || !scheduledTime) return undefined;
    return new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
  };

  const handlePickupChange = useCallback((place: CanonicalPlace | null) => {
    setPickup(place);
  }, []);

  const handleDropoffChange = useCallback((place: CanonicalPlace | null) => {
    setDropoff(place);
  }, []);

  // ── Load ride preview when pickup+dropoff are set (NOT creating a job) ──
  useEffect(() => {
    if (!pickup || !dropoff) {
      setPreview(INITIAL_PREVIEW);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    loadRidePreview({
      pickup: { lat: pickup.lat, lng: pickup.lng },
      dropoff: { lat: dropoff.lat, lng: dropoff.lng },
      serviceLevel,
    })
      .then((data) => { if (!cancelled) setPreview(data); })
      .catch(() => { if (!cancelled) setPreview(INITIAL_PREVIEW); })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });
    return () => { cancelled = true; };
  }, [pickup, dropoff, serviceLevel, bookingMode]);

  // ── Submit: only on explicit user action ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup || !dropoff || !preview.ready || submitting) return;
    if (bookingMode === "scheduled" && (!scheduledDate || !scheduledTime)) {
      toast.error(tc("mobility.select_date_time") || "Please select date and time");
      return;
    }
    setSubmitting(true);
    try {
      await createJob({
        jobType: "taxi",
        serviceLevel,
        bookingMode,
        scheduledFor: getScheduledFor(),
        pickupLabel: pickup.label,
        pickupAddress: pickup.formatted_address,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropoffLabel: dropoff.label,
        dropoffAddress: dropoff.formatted_address,
        dropoffLat: dropoff.lat,
        dropoffLng: dropoff.lng,
        seatsRequested: Number(seats) || 1,
        quotedPrice: preview.estimatedFare ?? 0,
        currency: "AED",
      });
      toast.success(bookingMode === "scheduled" ? tc("mobility.ride_scheduled") || "Ride scheduled!" : tc("mobility.ride_requested") || "Taxi requested!");
      setPickup(null);
      setDropoff(null);
      setPreview(INITIAL_PREVIEW);
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Service level */}
      <div className="grid grid-cols-4 gap-2">
        {SERVICE_LEVELS.map(sl => (
          <button key={sl.value} type="button" onClick={() => setServiceLevel(sl.value)}
            className={cn("flex flex-col items-center gap-0.5 p-2.5 rounded-xl border-2 transition-all text-center",
              serviceLevel === sl.value ? "border-primary bg-primary/5 text-primary" : "border-border/40 bg-card text-muted-foreground"
            )}>
            <span className="text-lg">{sl.emoji}</span>
            <span className="text-[10px] font-bold">{sl.label}</span>
            <span className="text-[8px] text-muted-foreground">{sl.desc}</span>
          </button>
        ))}
      </div>

      {/* Booking mode */}
      <div className="flex gap-2">
        {(["now", "scheduled"] as const).map(m => (
          <button key={m} type="button" onClick={() => setBookingMode(m)}
            className={cn("flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-1.5",
              bookingMode === m ? "border-primary bg-primary text-primary-foreground" : "border-border/40 bg-card text-muted-foreground"
            )}>
            {m === "now" ? <><Car className="h-3.5 w-3.5" /> {tc("mobility.now") || "Now"}</> : <><Calendar className="h-3.5 w-3.5" /> {tc("mobility.schedule") || "Schedule"}</>}
          </button>
        ))}
      </div>

      {/* Date/Time picker for scheduled */}
      {bookingMode === "scheduled" && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 space-y-2">
          <Label className="text-xs font-bold text-primary flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> {tc("mobility.schedule_ride") || "Schedule your ride"}
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">{tc("common.date") || "Date"}</Label>
              <Input type="date" min={today} value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="bg-card border-border/40 rounded-xl h-10 text-sm" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">{tc("common.time") || "Time"}</Label>
              <Input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="bg-card border-border/40 rounded-xl h-10 text-sm" />
            </div>
          </div>
          {scheduledDate && scheduledTime && (
            <p className="text-[11px] text-primary font-medium">
              📅 {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString(undefined, {
                weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
              })}
            </p>
          )}
        </div>
      )}

      {/* Locations — canonical address inputs */}
      <div className="space-y-2">
        <CanonicalAddressInput
          value={pickup}
          onChange={handlePickupChange}
          placeholder={tc("ride.pickup") || "Pickup location"}
          contextType="taxi_pickup"
          contextLabel={tc("ride.pickup") || "Pickup"}
          allowAirport
          allowSavedPlaces
        />
        <CanonicalAddressInput
          value={dropoff}
          onChange={handleDropoffChange}
          placeholder={tc("ride.dropoff") || "Dropoff location"}
          contextType="taxi_dropoff"
          contextLabel={tc("ride.dropoff") || "Dropoff"}
          allowAirport
          allowSavedPlaces
        />
      </div>

      {/* Seats */}
      <div className="relative">
        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input type="number" min="1" max="7" placeholder={tc("mobility.seats") || "Seats"} value={seats} onChange={e => setSeats(e.target.value)} className="pl-10 bg-card border-border/40 rounded-xl h-11" />
      </div>

      {/* ── Ride Preview Card ── */}
      <AnimatePresence mode="wait">
        {previewLoading && canPreview && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-xl border border-border/20 bg-muted/20 p-4 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">{tc("mobility.computing_route") || "Computing route…"}</span>
          </motion.div>
        )}

        {preview.ready && !previewLoading && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-border/30 bg-card p-4 space-y-3"
          >
            {/* Fare hero */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">{tc("ride.fare") || "Estimated fare"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold text-foreground">
                  {preview.estimatedFare} AED
                </span>
                {preview.surgeMultiplier > 1 && (
                  <span className="flex items-center gap-0.5 text-xs text-amber-500 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                    <Zap className="w-3 h-3" /> ×{preview.surgeMultiplier.toFixed(1)}
                  </span>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center bg-muted/30 rounded-lg py-2 px-1">
                <Navigation className="w-3.5 h-3.5 text-primary mb-0.5" />
                <span className="text-xs font-bold text-foreground">{preview.distanceKm?.toFixed(1)} km</span>
                <span className="text-[9px] text-muted-foreground">{tc("mobility.distance") || "Distance"}</span>
              </div>
              <div className="flex flex-col items-center bg-muted/30 rounded-lg py-2 px-1">
                <Clock className="w-3.5 h-3.5 text-sky-500 mb-0.5" />
                <span className="text-xs font-bold text-foreground">{preview.etaMinutes} min</span>
                <span className="text-[9px] text-muted-foreground">ETA</span>
              </div>
              <div className="flex flex-col items-center bg-muted/30 rounded-lg py-2 px-1">
                <Car className="w-3.5 h-3.5 text-emerald-500 mb-0.5" />
                <span className="text-xs font-bold text-foreground">{preview.waitMinutes} min</span>
                <span className="text-[9px] text-muted-foreground">{tc("mobility.wait") || "Wait"}</span>
              </div>
            </div>

            {/* Zone context */}
            <div className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Signal className="w-3 h-3" />
                <span>{preview.nearbyDrivers ?? 0} {tc("ride.riders") || "drivers"} {tc("mobility.nearby") || "nearby"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "px-2 py-0.5 rounded-full font-semibold capitalize",
                  preview.trafficLevel === "low" ? "bg-emerald-500/10 text-emerald-600" :
                  preview.trafficLevel === "moderate" ? "bg-amber-500/10 text-amber-600" :
                  preview.trafficLevel === "heavy" ? "bg-orange-500/10 text-orange-600" :
                  "bg-muted text-muted-foreground"
                )}>
                  {tc(`ride.traffic_${preview.trafficLevel}`) || preview.trafficLevel}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No preview yet prompt */}
      {!canPreview && (
        <div className="text-center py-3">
          <p className="text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 inline mr-1" />
            {tc("mobility.select_both_locations") || "Select pickup & dropoff to see route preview"}
          </p>
        </div>
      )}

      <Button
        type="submit"
        disabled={!canSubmit}
        className="w-full h-12 rounded-xl text-sm font-bold shadow-lg"
      >
        {submitting ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {tc("mobility.requesting") || "Requesting..."}</>
        ) : bookingMode === "scheduled" ? (
          <>📅 {tc("mobility.reserve_ride") || "Reserve ride"}</>
        ) : (
          <>🚀 {tc("mobility.request_taxi") || "Request taxi"}</>
        )}
      </Button>
    </form>
  );
}
