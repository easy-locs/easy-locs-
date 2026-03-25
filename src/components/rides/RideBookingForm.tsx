import React, { useState } from "react";
import { createRide } from "@/lib/rides/service";
import type { BookingMode, RideType } from "@/lib/rides/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Car, Bike, Package, MapPin, Navigation, Clock, DollarSign, StickyNote } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const RIDE_TYPES: { value: RideType; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: "taxi", label: "Taxi", icon: <Car className="h-5 w-5" />, desc: "Ride to destination" },
  { value: "delivery", label: "Delivery", icon: <Bike className="h-5 w-5" />, desc: "Send food & items" },
  { value: "courier", label: "Courier", icon: <Package className="h-5 w-5" />, desc: "Document & parcels" },
];

export function RideBookingForm() {
  const navigate = useNavigate();
  const [rideType, setRideType] = useState<RideType>("taxi");
  const [bookingMode, setBookingMode] = useState<BookingMode>("now");
  const [pickupLabel, setPickupLabel] = useState("");
  const [dropoffLabel, setDropoffLabel] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState("25");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupLabel || !dropoffLabel) { toast.error("Pickup & dropoff required"); return; }
    setLoading(true);
    try {
      const ride = await createRide({
        rideType,
        bookingMode,
        pickupLabel,
        dropoffLabel,
        scheduledFor: bookingMode === "scheduled" ? scheduledFor : null,
        estimatedPrice: Number(estimatedPrice) || 0,
        notes: notes || null,
        currency: "AED",
      });
      toast.success("Ride requested!");
      setPickupLabel(""); setDropoffLabel(""); setNotes("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create ride");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Ride type selector */}
      <div className="grid grid-cols-3 gap-2">
        {RIDE_TYPES.map(rt => (
          <button
            key={rt.value}
            type="button"
            onClick={() => setRideType(rt.value)}
            className={cn(
              "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
              rideType === rt.value
                ? "border-primary bg-primary/5 text-primary shadow-sm"
                : "border-border/40 bg-card text-muted-foreground hover:border-border"
            )}
          >
            {rt.icon}
            <span className="text-xs font-bold">{rt.label}</span>
          </button>
        ))}
      </div>

      {/* Booking mode */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setBookingMode("now")}
          className={cn(
            "flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all",
            bookingMode === "now"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border/40 bg-card text-muted-foreground"
          )}
        >
          🚀 Now
        </button>
        <button
          type="button"
          onClick={() => setBookingMode("scheduled")}
          className={cn(
            "flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all",
            bookingMode === "scheduled"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border/40 bg-card text-muted-foreground"
          )}
        >
          <Clock className="h-3 w-3 inline mr-1" /> Later
        </button>
      </div>

      {bookingMode === "scheduled" && (
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Schedule for</Label>
          <Input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className="bg-card border-border/40 rounded-xl" />
        </div>
      )}

      {/* Locations */}
      <div className="space-y-3">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
          <Input placeholder="Pickup location" value={pickupLabel} onChange={(e) => setPickupLabel(e.target.value)} className="pl-10 bg-card border-border/40 rounded-xl h-11" />
        </div>
        <div className="relative">
          <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
          <Input placeholder="Dropoff location" value={dropoffLabel} onChange={(e) => setDropoffLabel(e.target.value)} className="pl-10 bg-card border-border/40 rounded-xl h-11" />
        </div>
      </div>

      {/* Price & Notes */}
      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input type="number" placeholder="Est. price" value={estimatedPrice} onChange={(e) => setEstimatedPrice(e.target.value)} className="pl-10 bg-card border-border/40 rounded-xl h-11" />
        </div>
        <div className="relative">
          <StickyNote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="pl-10 bg-card border-border/40 rounded-xl h-11" />
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-sm font-bold shadow-lg">
        {loading ? "Requesting..." : bookingMode === "scheduled" ? "📅 Reserve ride" : "🚀 Request now"}
      </Button>
    </form>
  );
}
