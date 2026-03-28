/**
 * TaxiSearchScreen — Step 1: Premium booking form.
 * Full-width cards, no truncation, immersive mobile layout.
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
      {/* Service level — premium card grid */}
      <div className="grid grid-cols-4 gap-2.5">
        {SERVICE_LEVELS.map(sl => {
          const active = serviceLevel === sl.value;
          return (
            <button
              key={sl.value}
              type="button"
              onClick={() => setServiceLevel(sl.value)}
              className={cn(
                "relative flex flex-col items-center gap-1.5 py-3.5 rounded-2xl border-2 transition-all duration-200",
                active
                  ? "border-primary bg-primary/8 shadow-md shadow-primary/15 scale-[1.02]"
                  : "border-border/20 bg-card/60 hover:border-border/40"
              )}
            >
              <span className="text-2xl leading-none select-none">{sl.emoji}</span>
              <span className={cn(
                "text-[11px] font-bold leading-none",
                active ? "text-primary" : "text-foreground"
              )}>{sl.label}</span>
              <span className="text-[9px] text-muted-foreground/80 leading-none">{sl.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Booking mode toggle */}
      <div className="flex gap-2">
        {(["now", "scheduled"] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setBookingMode(m)}
            className={cn(
              "flex-1 py-3 rounded-2xl text-sm font-bold border-2 transition-all duration-200 flex items-center justify-center gap-2",
              bookingMode === m
                ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "border-border/20 bg-card/60 text-muted-foreground"
            )}
          >
            {m === "now"
              ? <><Car className="h-4 w-4 shrink-0" /> Now</>
              : <><Calendar className="h-4 w-4 shrink-0" /> Schedule</>}
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
            📅 Schedule your ride
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" min={today} value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="bg-card border-border/20 rounded-xl h-11 text-sm" />
            <Input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="bg-card border-border/20 rounded-xl h-11 text-sm" />
          </div>
        </motion.div>
      )}

      {/* Address inputs */}
      <div className="space-y-3">
        <div>
          <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">Pickup</Label>
          <CanonicalAddressInput
            value={pickup}
            onChange={setPickup}
            placeholder="Pickup location"
            contextType="taxi_pickup"
            contextLabel="Pickup"
            allowAirport
            allowSavedPlaces
          />
        </div>
        <div>
          <Label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5 block">Dropoff</Label>
          <CanonicalAddressInput
            value={dropoff}
            onChange={setDropoff}
            placeholder="Where to?"
            contextType="taxi_dropoff"
            contextLabel="Dropoff"
            allowAirport
            allowSavedPlaces
          />
        </div>
      </div>

      {/* Seats */}
      <div className="flex items-center gap-3 rounded-2xl border border-border/20 bg-card/60 px-4 py-3">
        <Users className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground">Passengers</p>
        </div>
        <Input
          type="number" min="1" max="7"
          value={seats}
          onChange={e => setSeats(Number(e.target.value) || 1)}
          className="w-16 text-center bg-muted/30 border-border/20 rounded-xl h-9 text-sm font-bold"
        />
      </div>

      {/* CTA */}
      <button
        type="button"
        disabled={!canContinue}
        onClick={() => setStep("preview")}
        className={cn(
          "w-full h-14 rounded-2xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2",
          canContinue
            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 active:scale-[0.98]"
            : "bg-muted/50 text-muted-foreground"
        )}
      >
        {canContinue ? (
          <>See route & fare <ChevronRight className="h-4 w-4" /></>
        ) : (
          "Select pickup & dropoff"
        )}
      </button>
    </motion.div>
  );
}
