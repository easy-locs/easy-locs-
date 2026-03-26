/**
 * DeliveryBookingForm — Customer delivery booking form.
 * Sub-modes: food, grocery, parcel.
 */
import React, { useState } from "react";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MapPin, Navigation, Clock, DollarSign, StickyNote, UtensilsCrossed, ShoppingCart, Package } from "lucide-react";
import { cn } from "@/lib/utils";

type DeliverySubMode = "food_delivery" | "grocery_delivery" | "parcel_delivery";
type BookingMode = "now" | "scheduled";

const SUB_MODES: { value: DeliverySubMode; serviceLevel: string; label: string; icon: React.ReactNode }[] = [
  { value: "food_delivery", serviceLevel: "bike_delivery", label: "Food", icon: <UtensilsCrossed className="h-5 w-5" /> },
  { value: "grocery_delivery", serviceLevel: "car_delivery", label: "Grocery", icon: <ShoppingCart className="h-5 w-5" /> },
  { value: "parcel_delivery", serviceLevel: "parcel_standard", label: "Parcel", icon: <Package className="h-5 w-5" /> },
];

export function DeliveryBookingForm() {
  const createJob = useCustomerMobilityStore(s => s.createJob);
  const [subMode, setSubMode] = useState<DeliverySubMode>("food_delivery");
  const [bookingMode, setBookingMode] = useState<BookingMode>("now");
  const [pickupLabel, setPickupLabel] = useState("");
  const [dropoffLabel, setDropoffLabel] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState("20");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const selected = SUB_MODES.find(s => s.value === subMode)!;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupLabel || !dropoffLabel) { toast.error("Pickup & dropoff required"); return; }
    setLoading(true);
    try {
      await createJob({
        jobType: subMode,
        serviceLevel: selected.serviceLevel,
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
        notes: notes || undefined,
      });
      toast.success("Delivery requested!");
      setPickupLabel(""); setDropoffLabel(""); setNotes("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Sub-mode */}
      <div className="grid grid-cols-3 gap-2">
        {SUB_MODES.map(sm => (
          <button key={sm.value} type="button" onClick={() => setSubMode(sm.value)}
            className={cn("flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
              subMode === sm.value ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-border/40 bg-card text-muted-foreground"
            )}>
            {sm.icon}
            <span className="text-xs font-bold">{sm.label}</span>
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

      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input type="number" placeholder="Est. price" value={estimatedPrice} onChange={e => setEstimatedPrice(e.target.value)} className="pl-10 bg-card border-border/40 rounded-xl h-11" />
        </div>
        <div className="relative">
          <StickyNote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} className="pl-10 bg-card border-border/40 rounded-xl h-11" />
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-sm font-bold shadow-lg">
        {loading ? "Requesting..." : bookingMode === "scheduled" ? "📅 Schedule delivery" : "🚀 Request delivery"}
      </Button>
    </form>
  );
}
