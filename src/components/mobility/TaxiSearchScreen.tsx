/**
 * TaxiSearchScreen — Step 1: Destination search. NO map.
 * Clean focused UX: service level → mode → pickup/dropoff → continue.
 * Premium first-class mobile layout — no truncation, proper spacing.
 */
import React from "react";
import { useTaxiFlowStore } from "@/stores/taxiFlowStore";
import { CanonicalAddressInput } from "@/components/address/CanonicalAddressInput";
import { Car, Calendar, Users, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { tc } from "@/lib/i18n-canonical";
import { motion } from "framer-motion";
import { MobilityLiveMap } from "./MobilityLiveMap";

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
      className="space-y-5"
    >
      {/* Service level chips — generous sizing, no truncation */}
      <div className="grid grid-cols-4 gap-2">
        {SERVICE_LEVELS.map(sl => (
          <button
            key={sl.value}
            type="button"
            onClick={() => setServiceLevel(sl.value)}
            className={cn(
              "flex flex-col items-center gap-1 py-3 px-1.5 rounded-2xl border-2 transition-all",
              serviceLevel === sl.value
                ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                : "border-border/30 bg-card"
            )}
          >
            <span className="text-xl leading-none">{sl.emoji}</span>
            <span className={cn(
              "text-[11px] font-bold leading-tight",
              serviceLevel === sl.value ? "text-primary" : "text-foreground"
            )}>{sl.label}</span>
            <span className="text-[9px] text-muted-foreground leading-tight">{sl.desc}</span>
          </button>
        ))}
      </div>

      {/* Booking mode — clear separation */}
      <div className="flex gap-2.5">
        {(["now", "scheduled"] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setBookingMode(m)}
            className={cn(
              "flex-1 py-3 rounded-2xl text-sm font-bold border-2 transition-all flex items-center justify-center gap-2",
              bookingMode === m
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border/30 bg-card text-muted-foreground"
            )}
          >
            {m === "now"
              ? <><Car className="h-4 w-4 shrink-0" /> <span>{tc("mobility.now") || "Now"}</span></>
              : <><Calendar className="h-4 w-4 shrink-0" /> <span>{tc("mobility.schedule") || "Schedule"}</span></>}
          </button>
        ))}
      </div>

      {/* Schedule picker */}
      {bookingMode === "scheduled" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3 overflow-hidden"
        >
          <Label className="text-xs font-bold text-primary flex items-center gap-1.5">
            📅 {tc("mobility.schedule_ride") || "Schedule your ride"}
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" min={today} value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="bg-card border-border/30 rounded-xl h-11 text-sm" />
            <Input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="bg-card border-border/30 rounded-xl h-11 text-sm" />
          </div>
        </motion.div>
      )}

      {/* Address inputs — proper labels, no truncation */}
      <div className="space-y-3">
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

      {/* Seats — larger touch target */}
      <div className="relative">
        <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground pointer-events-none" />
        <Input
          type="number" min="1" max="7"
          placeholder={tc("mobility.seats") || "Passengers"}
          value={seats}
          onChange={e => setSeats(Number(e.target.value) || 1)}
          className="pl-11 bg-card border-border/30 rounded-xl h-12 text-sm"
        />
      </div>

      {/* Live Map */}
      <MobilityLiveMap
        pickupLat={pickup ? 25.2048 : null}
        pickupLng={pickup ? 55.2708 : null}
        mode="taxi"
        nearbyRiders={5}
      />

      {/* Continue — larger, bolder CTA */}
      <button
        type="button"
        disabled={!canContinue}
        onClick={() => setStep("preview")}
        className={cn(
          "w-full h-14 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2",
          canContinue
            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 active:scale-[0.98]"
            : "bg-muted text-muted-foreground"
        )}
      >
        {canContinue ? (
          <>🗺️ See route & fare <ChevronRight className="h-4 w-4" /></>
        ) : (
          "Select pickup & dropoff"
        )}
      </button>
    </motion.div>
  );
}
