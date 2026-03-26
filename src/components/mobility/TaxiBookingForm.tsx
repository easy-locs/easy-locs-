/**
 * TaxiBookingForm — Customer taxi-only booking form.
 * Service levels: standard, premium, xl, moto_taxi.
 */
import React, { useState } from "react";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Car, MapPin, Navigation, Clock, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

type ServiceLevel = "taxi_standard" | "taxi_premium" | "taxi_xl" | "taxi_moto";
type BookingMode = "now" | "scheduled";

const SERVICE_LEVELS: { value: ServiceLevel; label: string; emoji: string }[] = [
  { value: "taxi_standard", label: "Standard", emoji: "🚕" },
  { value: "taxi_premium", label: "Premium", emoji: "✨" },
  { value: "taxi_xl", label: "XL", emoji: "🚐" },
  { value: "taxi_moto", label: "Moto", emoji: "🏍️" },
];

export function TaxiBookingForm() {
  const createJob = useCustomerMobilityStore(s => s.createJob);
  const [serviceLevel, setServiceLevel] = useState<ServiceLevel>("taxi_standard");
  const [bookingMode, setBookingMode] = useState<BookingMode>("now");
  const [pickupLabel, setPickupLabel] = useState("");
  const [dropoffLabel, setDropoffLabel] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState("25");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupLabel || !dropoffLabel) { toast.error("Pickup & dropoff required"); return; }
    setLoading(true);
    try {
      await createJob({
        jobType: "taxi",
        serviceLevel,
        bookingMode,
        scheduledFor: bookingMode === "scheduled" ? scheduledFor : undefined,
        pickupLabel,
        pickupAddress: pickupLabel,
        pickupLat: 25.2048,
        pickupLng: 55.2708,
        dropoffLabel,
        dropoffAddress: dropoffLabel,
        dropoffLat: 25.2148,
        dropoffLng: 55.2808,
        quotedPrice: Number(estimatedPrice) || 0,
        currency: "AED",
      });
      toast.success("Taxi requested!");
      setPickupLabel(""); setDropoffLabel("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Service level */}
      <div className="grid grid-cols-4 gap-2">
        {SERVICE_LEVELS.map(sl => (
          <button key={sl.value} type="button" onClick={() => setServiceLevel(sl.value)}
            className={cn("flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all text-center",
              serviceLevel === sl.value ? "border-primary bg-primary/5 text-primary" : "border-border/40 bg-card text-muted-foreground"
            )}>
            <span className="text-lg">{sl.emoji}</span>
            <span className="text-[10px] font-bold">{sl.label}</span>
          </button>
        ))}
      </div>

      {/* Booking mode */}
      <div className="flex gap-2">
        {(["now", "scheduled"] as const).map(m => (
          <button key={m} type="button" onClick={() => setBookingMode(m)}
            className={cn("flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all",
              bookingMode === m ? "border-primary bg-primary text-primary-foreground" : "border-border/40 bg-card text-muted-foreground"
            )}>
            {m === "now" ? "🚀 Now" : "📅 Later"}
          </button>
        ))}
      </div>

      {bookingMode === "scheduled" && (
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Schedule for</Label>
          <Input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} className="bg-card border-border/40 rounded-xl" />
        </div>
      )}

      <div className="space-y-3">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
          <Input placeholder="Pickup location" value={pickupLabel} onChange={e => setPickupLabel(e.target.value)} className="pl-10 bg-card border-border/40 rounded-xl h-11" />
        </div>
        <div className="relative">
          <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
          <Input placeholder="Dropoff location" value={dropoffLabel} onChange={e => setDropoffLabel(e.target.value)} className="pl-10 bg-card border-border/40 rounded-xl h-11" />
        </div>
      </div>

      <div className="relative">
        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input type="number" placeholder="Est. price" value={estimatedPrice} onChange={e => setEstimatedPrice(e.target.value)} className="pl-10 bg-card border-border/40 rounded-xl h-11" />
      </div>

      <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-sm font-bold shadow-lg">
        {loading ? "Requesting..." : bookingMode === "scheduled" ? "📅 Reserve taxi" : "🚀 Request taxi"}
      </Button>
    </form>
  );
}
