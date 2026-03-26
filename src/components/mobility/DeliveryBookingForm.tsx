/**
 * DeliveryBookingForm — Professional customer delivery booking form.
 * Sub-modes: food, grocery, parcel. Parcel shows rich detail form.
 * Supports now/scheduled with proper date/time picker.
 */
import React, { useState } from "react";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MapPin, Navigation, Clock, DollarSign, StickyNote, UtensilsCrossed, ShoppingCart, Package, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { ParcelDetailsForm, INITIAL_PARCEL, type ParcelDetails } from "./ParcelDetailsForm";
import { supabase } from "@/integrations/supabase/client";

type DeliverySubMode = "food_delivery" | "grocery_delivery" | "parcel_delivery";
type BookingMode = "now" | "scheduled";

const SUB_MODES: { value: DeliverySubMode; serviceLevel: string; label: string; icon: React.ReactNode }[] = [
  { value: "food_delivery", serviceLevel: "bike_delivery", label: "Food", icon: <UtensilsCrossed className="h-5 w-5" /> },
  { value: "grocery_delivery", serviceLevel: "car_delivery", label: "Grocery", icon: <ShoppingCart className="h-5 w-5" /> },
  { value: "parcel_delivery", serviceLevel: "parcel_standard", label: "Parcel", icon: <Package className="h-5 w-5" /> },
];

export function DeliveryBookingForm() {
  const createJob = useCustomerMobilityStore(s => s.createJob);
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get("mode");
  const initialMode: DeliverySubMode = modeParam === "food" ? "food_delivery"
    : modeParam === "grocery" ? "grocery_delivery"
    : modeParam === "parcel" ? "parcel_delivery"
    : "food_delivery";

  const [subMode, setSubMode] = useState<DeliverySubMode>(initialMode);
  const [bookingMode, setBookingMode] = useState<BookingMode>("now");
  const [pickupLabel, setPickupLabel] = useState("");
  const [dropoffLabel, setDropoffLabel] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState("20");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [parcel, setParcel] = useState<ParcelDetails>(INITIAL_PARCEL);

  const selected = SUB_MODES.find(s => s.value === subMode)!;

  const getScheduledFor = (): string | undefined => {
    if (bookingMode !== "scheduled" || !scheduledDate || !scheduledTime) return undefined;
    return new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupLabel || !dropoffLabel) { toast.error("Pickup & dropoff required"); return; }
    if (bookingMode === "scheduled" && (!scheduledDate || !scheduledTime)) {
      toast.error("Please select date and time for scheduled delivery");
      return;
    }
    setLoading(true);
    try {
      const job = await createJob({
        jobType: subMode,
        serviceLevel: selected.serviceLevel,
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
        quotedPrice: Number(estimatedPrice) || 0,
        currency: "AED",
        notes: notes || undefined,
        packageSize: subMode === "parcel_delivery" ? parcel.packageSize : undefined,
      });

      // Insert parcel details if parcel delivery
      if (subMode === "parcel_delivery" && job?.id) {
        await supabase.from("parcel_job_details" as any).insert({
          job_id: job.id,
          parcel_type: parcel.parcelType,
          package_size: parcel.packageSize,
          package_weight_kg: parcel.packageWeightKg ? Number(parcel.packageWeightKg) : null,
          package_count: Number(parcel.packageCount) || 1,
          fragile: parcel.fragile,
          requires_signature: parcel.requiresSignature,
          requires_otp: parcel.requiresOtp,
          pickup_contact_name: parcel.pickupContactName || null,
          pickup_contact_phone: parcel.pickupContactPhone || null,
          dropoff_contact_name: parcel.dropoffContactName || null,
          dropoff_contact_phone: parcel.dropoffContactPhone || null,
          declared_value_amount: parcel.declaredValueAmount ? Number(parcel.declaredValueAmount) : null,
          special_instructions: parcel.specialInstructions || null,
        });
      }

      toast.success(bookingMode === "scheduled" ? "Delivery scheduled!" : "Delivery requested!");
      setPickupLabel(""); setDropoffLabel(""); setNotes("");
      setParcel(INITIAL_PARCEL);
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Sub-mode selector */}
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

      {/* Parcel details when parcel mode */}
      {subMode === "parcel_delivery" && (
        <div className="rounded-2xl border border-border/30 bg-card/50 p-3">
          <ParcelDetailsForm value={parcel} onChange={setParcel} />
        </div>
      )}

      {/* Booking mode */}
      <div className="flex gap-2">
        {(["now", "scheduled"] as const).map(m => (
          <button key={m} type="button" onClick={() => setBookingMode(m)}
            className={cn("flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-1.5",
              bookingMode === m ? "border-primary bg-primary text-primary-foreground" : "border-border/40 bg-card text-muted-foreground"
            )}>
            {m === "now" ? <><Package className="h-3.5 w-3.5" /> Now</> : <><Calendar className="h-3.5 w-3.5" /> Schedule</>}
          </button>
        ))}
      </div>

      {/* Date/Time picker for scheduled */}
      {bookingMode === "scheduled" && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 space-y-2">
          <Label className="text-xs font-bold text-primary flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Schedule pickup
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

      {/* Price + Notes */}
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input type="number" placeholder="Est. price" value={estimatedPrice} onChange={e => setEstimatedPrice(e.target.value)} className="pl-10 bg-card border-border/40 rounded-xl h-11" />
        </div>
        <div className="relative">
          <StickyNote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} className="pl-10 bg-card border-border/40 rounded-xl h-11" />
        </div>
      </div>

      {/* Price summary for parcel */}
      {subMode === "parcel_delivery" && (
        <div className="rounded-xl border border-border/20 bg-muted/20 p-3 space-y-1">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Base fare</span><span>{(Number(estimatedPrice) * 0.6).toFixed(0)} AED</span>
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Distance</span><span>{(Number(estimatedPrice) * 0.3).toFixed(0)} AED</span>
          </div>
          {parcel.fragile && (
            <div className="flex justify-between text-[11px] text-amber-600">
              <span>Fragile surcharge</span><span>+5 AED</span>
            </div>
          )}
          {bookingMode === "scheduled" && (
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Schedule fee</span><span>+0 AED</span>
            </div>
          )}
          <div className="border-t border-border/20 pt-1 flex justify-between text-xs font-bold text-foreground">
            <span>Total</span>
            <span>{(Number(estimatedPrice) + (parcel.fragile ? 5 : 0)).toFixed(0)} AED</span>
          </div>
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-sm font-bold shadow-lg">
        {loading ? "Requesting..." : bookingMode === "scheduled" ? "📅 Schedule delivery" : "🚀 Request delivery"}
      </Button>
    </form>
  );
}
