/**
 * TaxiSearchScreen — Step 1: Premium booking form.
 * Full-width cards, no truncation, immersive mobile layout.
 */
import React from "react";
import { useTaxiFlowStore } from "@/stores/taxiFlowStore";
import { CanonicalAddressInput } from "@/components/address/CanonicalAddressInput";
import { Car, Crown, Truck, Zap, Calendar, Users, ChevronRight, MapPin, Navigation, Minus, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const SERVICE_LEVELS = [
  { value: "taxi_standard" as const, label: "Standard", icon: Car, desc: "4 seats" },
  { value: "taxi_premium" as const, label: "Premium", icon: Crown, desc: "Luxury" },
  { value: "taxi_xl" as const, label: "XL", icon: Truck, desc: "6+ seats" },
  { value: "taxi_moto" as const, label: "Moto", icon: Zap, desc: "Fast" },
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
      {/* Service level — premium icon grid */}
      <div className="grid grid-cols-4 gap-2.5">
        {SERVICE_LEVELS.map(sl => {
          const active = serviceLevel === sl.value;
          const Icon = sl.icon;
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
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                active ? "bg-primary/15" : "bg-muted/30"
              )}>
                <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
              </div>
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
            <Calendar className="h-3.5 w-3.5" /> Schedule your ride
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" min={today} value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="bg-card border-border/20 rounded-xl h-11 text-sm" />
            <Input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="bg-card border-border/20 rounded-xl h-11 text-sm" />
          </div>
        </motion.div>
      )}

      {/* Address inputs — clean, no redundant labels */}
      <div className="space-y-3">
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 z-10" />
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
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-primary/20 z-10" />
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

      {/* Passengers — horizontal layout, stepper buttons */}
      <div className="flex items-center gap-3 rounded-2xl border border-border/20 bg-card/60 px-4 py-3">
        <Users className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-semibold text-foreground flex-1">Passengers</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSeats(Math.max(1, seats - 1))}
            className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center text-muted-foreground hover:bg-muted/60 active:scale-95 transition-all"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-8 text-center text-sm font-bold text-foreground tabular-nums">{seats}</span>
          <button
            type="button"
            onClick={() => setSeats(Math.min(7, seats + 1))}
            className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center text-muted-foreground hover:bg-muted/60 active:scale-95 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
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
