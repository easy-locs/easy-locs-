/**
 * TaxiBookingForm — Professional customer taxi booking form.
 * Service levels: standard, premium, xl, moto_taxi.
 * Supports now/scheduled with proper date/time picker.
 */
import React, { useState } from "react";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Car, MapPin, Navigation, Clock, DollarSign, Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type ServiceLevel = "taxi_standard" | "taxi_premium" | "taxi_xl" | "taxi_moto";
type BookingMode = "now" | "scheduled";

const SERVICE_LEVELS: { value: ServiceLevel; label: string; emoji: string; desc: string }[] = [
  { value: "taxi_standard", label: "Standard", emoji: "🚕", desc: "4 seats" },
  { value: "taxi_premium", label: "Premium", emoji: "✨", desc: "Luxury" },
  { value: "taxi_xl", label: "XL", emoji: "🚐", desc: "6+ seats" },
  { value: "taxi_moto", label: "Moto", emoji: "🏍️", desc: "Fast" },
];

export function TaxiBookingForm() {
  const createJob = useCustomerMobilityStore(s => s.createJob);
  const [serviceLevel, setServiceLevel] = useState<ServiceLevel>("taxi_standard");
  const [bookingMode, setBookingMode] = useState<BookingMode>("now");
  const [pickupLabel, setPickupLabel] = useState("");
  const [dropoffLabel, setDropoffLabel] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState("25");
  const [seats, setSeats] = useState("1");
  const [loading, setLoading] = useState(false);

  const getScheduledFor = (): string | undefined => {
    if (bookingMode !== "scheduled" || !scheduledDate || !scheduledTime) return undefined;
    return new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupLabel || !dropoffLabel) { toast.error("Pickup & dropoff required"); return; }
    if (bookingMode === "scheduled" && (!scheduledDate || !scheduledTime)) {
      toast.error("Please select date and time");
      return;
    }
    setLoading(true);
    try {
      await createJob({
        jobType: "taxi",
        serviceLevel,
        bookingMode,
        scheduledFor: getScheduledFor(),
        pickupLabel,
        pickupAddress: pickupLabel,
        pickupLat: 25.2048,
        pickupLng: 55.2708,
        dropoffLabel,
        dropoffAddress: dropoffLabel,
        dropoffLat: 25.2148,
        dropoffLng: 55.2808,
        seatsRequested: Number(seats) || 1,
        quotedPrice: Number(estimatedPrice) || 0,
        currency: "AED",
      });
      toast.success(bookingMode === "scheduled" ? "Ride scheduled!" : "Taxi requested!");
      setPickupLabel(""); setDropoffLabel("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={submit} className="space-y-4">
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
            {m === "now" ? <><Car className="h-3.5 w-3.5" /> Now</> : <><Calendar className="h-3.5 w-3.5" /> Schedule</>}
          </button>
        ))}
      </div>

      {/* Date/Time picker for scheduled */}
      {bookingMode === "scheduled" && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 space-y-2">
          <Label className="text-xs font-bold text-primary flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Schedule your ride
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Date</Label>
              <Input
                type="date"
                min={today}
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
                className="bg-card border-border/40 rounded-xl h-10 text-sm"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Time</Label>
              <Input
                type="time"
                value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
                className="bg-card border-border/40 rounded-xl h-10 text-sm"
              />
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

      {/* Locations */}
      <div className="space-y-2">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
          <Input placeholder="Pickup location" value={pickupLabel} onChange={e => setPickupLabel(e.target.value)} className="pl-10 bg-card border-border/40 rounded-xl h-11" />
        </div>
        <div className="relative">
          <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
          <Input placeholder="Dropoff location" value={dropoffLabel} onChange={e => setDropoffLabel(e.target.value)} className="pl-10 bg-card border-border/40 rounded-xl h-11" />
        </div>
      </div>

      {/* Seats + Price */}
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input type="number" min="1" max="7" placeholder="Seats" value={seats} onChange={e => setSeats(e.target.value)} className="pl-10 bg-card border-border/40 rounded-xl h-11" />
        </div>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input type="number" placeholder="Est. fare" value={estimatedPrice} onChange={e => setEstimatedPrice(e.target.value)} className="pl-10 bg-card border-border/40 rounded-xl h-11" />
        </div>
      </div>

      {/* Fare summary */}
      <div className="rounded-xl border border-border/20 bg-muted/20 p-3 space-y-1">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Base fare</span><span>{(Number(estimatedPrice) * 0.6).toFixed(0)} AED</span>
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Distance</span><span>{(Number(estimatedPrice) * 0.3).toFixed(0)} AED</span>
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Time</span><span>{(Number(estimatedPrice) * 0.1).toFixed(0)} AED</span>
        </div>
        <div className="border-t border-border/20 pt-1 flex justify-between text-xs font-bold text-foreground">
          <span>Estimated total</span><span>{estimatedPrice} AED</span>
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-sm font-bold shadow-lg">
        {loading ? "Requesting..." : bookingMode === "scheduled" ? "📅 Reserve ride" : "🚀 Request taxi"}
      </Button>
    </form>
  );
}
