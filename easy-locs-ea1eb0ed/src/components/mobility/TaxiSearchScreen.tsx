import React, { useEffect, useState } from "react";
import { useTaxiFlowStore } from "@/stores/taxiFlowStore";
import { useCustomerMobilityStore } from "@/stores/customerMobilityStore";
import { CanonicalAddressInput } from "@/components/address/CanonicalAddressInput";
import { Car, Crown, Truck, Zap, Calendar, ChevronRight, Clock, MapPin, History, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { MobilityLiveMap } from "./MobilityLiveMap";

const SERVICE_LEVELS = [
  { value: "taxi_standard" as const, label: "Standard", icon: Car, desc: "4 seats", eta: "3 min" },
  { value: "taxi_premium" as const, label: "Premium", icon: Crown, desc: "Luxury", eta: "5 min" },
  { value: "taxi_xl" as const, label: "XL", icon: Truck, desc: "6+ seats", eta: "7 min" },
  { value: "taxi_moto" as const, label: "Moto", icon: Zap, desc: "Fast", eta: "2 min" },
];

export function TaxiSearchScreen() {
  const {
    pickup, dropoff, serviceLevel, bookingMode, scheduledDate, scheduledTime,
    setPickup, setDropoff, setServiceLevel, setBookingMode, setScheduledDate, setScheduledTime, setStep,
  } = useTaxiFlowStore();
  const jobs = useCustomerMobilityStore(s => s.jobs);

  const canContinue = !!pickup && !!dropoff;
  const today = new Date().toISOString().split("T")[0];

  const recentDestinations = React.useMemo(() => {
    const seen = new Set<string>();
    return jobs
      .filter(j => j.job_type === "taxi" && j.dropoff_label && j.dropoff_lat != null)
      .filter(j => {
        const key = j.dropoff_label!;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 5)
      .map(j => ({
        label: j.dropoff_label!,
        address: j.dropoff_address || "",
        lat: j.dropoff_lat!,
        lng: j.dropoff_lng!,
      }));
  }, [jobs]);

  const handleQuickDestination = (dest: typeof recentDestinations[0]) => {
    setDropoff({
      label: dest.label,
      formatted_address: dest.address,
      lat: dest.lat,
      lng: dest.lng,
    } as any);
  };

  return (
    <motion.div
      key="taxi-search"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-4"
    >
      <div className="rounded-2xl overflow-hidden border border-border/20" style={{ height: 180 }}>
        <MobilityLiveMap mode="taxi" nearbyRiders={5} className="h-full" />
      </div>

      <div className="rounded-2xl border border-border/20 bg-card/60 p-3 space-y-2.5">
        <div className="relative flex items-center gap-3 min-w-0">
          <div className="shrink-0 flex flex-col items-center gap-0.5">
            <div className="w-3 h-3 rounded-full ring-2 ring-emerald-500/20" style={{ background: "hsl(142 71% 45%)" }} />
            <div className="w-px h-4 bg-border/40" />
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
            <div className="w-3 h-3 rounded-full ring-2 ring-primary/20" style={{ background: "hsl(38 65% 56%)" }} />
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

      {recentDestinations.length > 0 && !dropoff && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-1.5 px-1">
            <History className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Recent</span>
          </div>
          <div className="space-y-1">
            {recentDestinations.map((dest, i) => (
              <motion.button
                key={`${dest.label}-${i}`}
                type="button"
                onClick={() => handleQuickDestination(dest)}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card/60 border border-border/10 active:scale-[0.98] transition-transform text-left"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "hsl(38 65% 56% / 0.1)" }}>
                  <MapPin className="w-3.5 h-3.5" style={{ color: "hsl(38 65% 56%)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground line-clamp-1">{dest.label}</p>
                  {dest.address && <p className="text-[10px] text-muted-foreground line-clamp-1">{dest.address}</p>}
                </div>
                <Navigation className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      <div className="flex gap-2">
        {(["now", "scheduled"] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setBookingMode(m)}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all duration-200 flex items-center justify-center gap-2",
              bookingMode === m
                ? "border-primary text-primary-foreground shadow-md shadow-primary/20"
                : "border-border/20 bg-card/60 text-muted-foreground"
            )}
            style={bookingMode === m ? { background: "hsl(220 40% 18%)" } : undefined}
          >
            {m === "now"
              ? <><Car className="h-4 w-4 shrink-0" /> Now</>
              : <><Calendar className="h-4 w-4 shrink-0" /> Schedule</>}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {bookingMode === "scheduled" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl border border-primary/20 p-3.5 space-y-3 overflow-hidden"
            style={{ background: "hsl(38 65% 56% / 0.05)" }}
          >
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" style={{ color: "hsl(38 65% 56%)" }} />
              <span className="text-xs font-bold" style={{ color: "hsl(38 65% 56%)" }}>Schedule your ride</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" min={today} value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                className="bg-card border border-border/20 rounded-xl h-11 text-sm px-3 min-w-0 text-foreground" style={{ fontSize: 16 }} />
              <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)}
                className="bg-card border border-border/20 rounded-xl h-11 text-sm px-3 min-w-0 text-foreground" style={{ fontSize: 16 }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-4 gap-2">
        {SERVICE_LEVELS.map(sl => {
          const active = serviceLevel === sl.value;
          const Icon = sl.icon;
          return (
            <button
              key={sl.value}
              type="button"
              onClick={() => setServiceLevel(sl.value)}
              className={cn(
                "relative flex flex-col items-center gap-1 py-3 px-1.5 rounded-2xl border-2 transition-all duration-200",
                active
                  ? "shadow-md"
                  : "border-border/20 bg-card/60"
              )}
              style={active ? { borderColor: "hsl(38 65% 56%)", background: "hsl(38 65% 56% / 0.08)" } : undefined}
            >
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0",
                active ? "" : "bg-muted/30"
              )} style={active ? { background: "hsl(38 65% 56% / 0.15)" } : undefined}>
                <Icon className="h-4.5 w-4.5" style={active ? { color: "hsl(38 65% 56%)" } : { color: "var(--muted-foreground)" }} />
              </div>
              <span className={cn(
                "text-[11px] font-bold leading-tight text-center w-full",
                active ? "" : "text-foreground"
              )} style={active ? { color: "hsl(38 65% 56%)" } : undefined}>{sl.label}</span>
              <span className="text-[10px] text-muted-foreground/80 leading-tight text-center">{sl.desc}</span>
              <div className="flex items-center gap-0.5 mt-0.5">
                <Clock className="w-2.5 h-2.5 text-muted-foreground/50" />
                <span className="text-[10px] font-semibold text-muted-foreground/60">{sl.eta}</span>
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={!canContinue}
        onClick={() => setStep("preview")}
        className={cn(
          "w-full h-14 rounded-2xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2",
          canContinue
            ? "text-white shadow-lg active:scale-[0.98]"
            : "bg-muted/30 text-muted-foreground/60 border border-border/20"
        )}
        style={canContinue ? { background: "hsl(220 40% 18%)", boxShadow: "0 8px 25px hsl(220 40% 18% / 0.3)" } : undefined}
      >
        {canContinue ? (
          <>See price & confirm <ChevronRight className="h-4 w-4" /></>
        ) : (
          "Select pickup & destination"
        )}
      </button>
    </motion.div>
  );
}
