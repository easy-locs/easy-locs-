/**
 * TaxiSearchScreen — Step 1: Destination search. NO map.
 * Clean focused UX: service level → mode → pickup/dropoff → continue.
 */
import React from "react";
import { useTaxiFlowStore } from "@/stores/taxiFlowStore";
import { CanonicalAddressInput } from "@/components/address/CanonicalAddressInput";
import { Car, Calendar, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { tc } from "@/lib/i18n-canonical";
import { motion } from "framer-motion";

const SERVICE_LEVELS = [
  { value: "taxi_standard" as const, label: "Standard", emoji: "🚕", desc: "4 seats" },
  { value: "taxi_premium" as const, label: "Premium", emoji: "✨", desc: "Luxury" },
  { value: "taxi_xl" as const, label: "XL", emoji: "🚐", desc: "6+ seats" },
  { value: "taxi_moto" as const, label: "Moto", emoji: "🏍️", desc: "Fast" },
];

export function TaxiSearchScreen() {
  const {
    pickup, dropoff, serviceLevel, bookingMode, scheduledDate, scheduledTime, seats,
    setPickup, setDropoff, setServiceLevel, setBookingMode, setScheduledDate, setScheduledTime, setSeats, setStep,
  } = useTaxiFlowStore();

  const canContinue = !!pickup && !!dropoff;
  const today = new Date().toISOString().split("T")[0];

  return (
    <motion.div
      key="taxi-search"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-4"
    >
      {/* Service level chips */}
      <div className="grid grid-cols-4 gap-2">
        {SERVICE_LEVELS.map(sl => (
          <button
            key={sl.value}
            type="button"
            onClick={() => setServiceLevel(sl.value)}
            className={cn(
              "flex flex-col items-center gap-0.5 p-2.5 rounded-xl border-2 transition-all text-center",
              serviceLevel === sl.value
                ? "border-primary bg-primary/5 text-primary"
                : "border-border/40 bg-card text-muted-foreground"
            )}
          >
            <span className="text-lg">{sl.emoji}</span>
            <span className="text-[10px] font-bold">{sl.label}</span>
            <span className="text-[8px] text-muted-foreground">{sl.desc}</span>
          </button>
        ))}
      </div>

      {/* Booking mode */}
      <div className="flex gap-2">
        {(["now", "scheduled"] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setBookingMode(m)}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all flex items-center justify-center gap-1.5",
              bookingMode === m
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/40 bg-card text-muted-foreground"
            )}
          >
            {m === "now"
              ? <><Car className="h-3.5 w-3.5" /> {tc("mobility.now") || "Now"}</>
              : <><Calendar className="h-3.5 w-3.5" /> {tc("mobility.schedule") || "Schedule"}</>}
          </button>
        ))}
      </div>

      {/* Schedule picker */}
      {bookingMode === "scheduled" && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 space-y-2">
          <Label className="text-xs font-bold text-primary">
            📅 {tc("mobility.schedule_ride") || "Schedule your ride"}
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" min={today} value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="bg-card border-border/40 rounded-xl h-10 text-sm" />
            <Input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="bg-card border-border/40 rounded-xl h-10 text-sm" />
          </div>
        </div>
      )}

      {/* Address inputs */}
      <div className="space-y-2">
        <CanonicalAddressInput
          value={pickup}
          onChange={setPickup}
          placeholder={tc("ride.pickup") || "Pickup location"}
          contextType="taxi_pickup"
          contextLabel={tc("ride.pickup") || "Pickup"}
          allowAirport
          allowSavedPlaces
        />
        <CanonicalAddressInput
          value={dropoff}
          onChange={setDropoff}
          placeholder={tc("ride.dropoff") || "Where to?"}
          contextType="taxi_dropoff"
          contextLabel={tc("ride.dropoff") || "Dropoff"}
          allowAirport
          allowSavedPlaces
        />
      </div>

      {/* Seats */}
      <div className="relative">
        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="number" min="1" max="7"
          placeholder={tc("mobility.seats") || "Seats"}
          value={seats}
          onChange={e => setSeats(Number(e.target.value) || 1)}
          className="pl-10 bg-card border-border/40 rounded-xl h-11"
        />
      </div>

      {/* Continue */}
      <button
        type="button"
        disabled={!canContinue}
        onClick={() => setStep("preview")}
        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 transition-opacity"
      >
        {canContinue ? "🗺️ See route & fare" : "Select pickup & dropoff"}
      </button>
    </motion.div>
  );
}
