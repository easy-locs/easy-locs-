import React from "react";
import { useTaxiFlowStore } from "@/stores/taxiFlowStore";
import { CanonicalAddressInput } from "@/components/address/CanonicalAddressInput";
import { Car, Crown, Truck, Zap, Calendar, Users, ChevronRight, Minus, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const SERVICE_LEVELS = [
  { value: "taxi_standard" as const, label: "Standard", icon: Car, desc: "4 seats", estimate: "12 AED" },
  { value: "taxi_premium" as const, label: "Premium", icon: Crown, desc: "Luxury", estimate: "25 AED" },
  { value: "taxi_xl" as const, label: "XL", icon: Truck, desc: "6+ seats", estimate: "35 AED" },
  { value: "taxi_moto" as const, label: "Moto", icon: Zap, desc: "Fast", estimate: "8 AED" },
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
      <div className="grid grid-cols-4 gap-2 p-1">
        {SERVICE_LEVELS.map(sl => {
          const active = serviceLevel === sl.value;
          const Icon = sl.icon;
          return (
            <button
              key={sl.value}
              type="button"
              onClick={() => setServiceLevel(sl.value)}
              className={cn(
                "relative flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-2 transition-all duration-200 overflow-visible",
                active
                  ? "border-primary bg-primary/8 shadow-md shadow-primary/15"
                  : "border-border/20 bg-card/60 hover:border-border/40"
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0",
                active ? "bg-primary/15" : "bg-muted/30"
              )}>
                <Icon className={cn("h-4.5 w-4.5", active ? "text-primary" : "text-muted-foreground")} />
              </div>
              <span className={cn(
                "text-[11px] font-bold leading-tight text-center w-full px-0.5",
                active ? "text-primary" : "text-foreground"
              )}>{sl.label}</span>
              <span className="text-[10px] text-muted-foreground/80 leading-tight text-center w-full px-0.5">{sl.desc}</span>
              <span className={cn(
                "text-[10px] font-semibold leading-tight text-center w-full",
                active ? "text-primary/70" : "text-muted-foreground/50"
              )}>{sl.estimate}</span>
            </button>
          );
        })}
      </div>

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
            <Input type="date" min={today} value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="bg-card border-border/20 rounded-xl h-12 text-sm px-3 min-w-0" />
            <Input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="bg-card border-border/20 rounded-xl h-12 text-sm px-3 min-w-0" />
          </div>
        </motion.div>
      )}

      <div className="space-y-3">
        <div className="relative flex items-center gap-3 min-w-0">
          <div className="shrink-0 flex flex-col items-center gap-0.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
            <div className="w-px h-5 bg-border/40" />
          </div>
          <div className="flex-1 min-w-0">
            <CanonicalAddressInput
              value={pickup}
              onChange={setPickup}
              placeholder="Pickup location"
              contextType="taxi_pickup"
              allowAirport
              allowSavedPlaces
              hideSearchIcon
            />
          </div>
        </div>
        <div className="relative flex items-center gap-3 min-w-0">
          <div className="shrink-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-primary ring-2 ring-primary/20" />
          </div>
          <div className="flex-1 min-w-0">
            <CanonicalAddressInput
              value={dropoff}
              onChange={setDropoff}
              placeholder="Where to?"
              contextType="taxi_dropoff"
              allowAirport
              allowSavedPlaces
              hideSearchIcon
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-border/20 bg-card/60 px-4 py-3.5">
        <Users className="h-4.5 w-4.5 text-primary shrink-0" />
        <span className="text-sm font-semibold text-foreground flex-1">Passengers</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSeats(Math.max(1, seats - 1))}
            className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground hover:bg-muted/60 active:scale-95 transition-all"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center text-base font-bold text-foreground tabular-nums">{seats}</span>
          <button
            type="button"
            onClick={() => setSeats(Math.min(7, seats + 1))}
            className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground hover:bg-muted/60 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <button
        type="button"
        disabled={!canContinue}
        onClick={() => setStep("preview")}
        className={cn(
          "w-full h-14 rounded-2xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2",
          canContinue
            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 active:scale-[0.98]"
            : "bg-muted/30 text-muted-foreground/60 border border-border/20"
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
