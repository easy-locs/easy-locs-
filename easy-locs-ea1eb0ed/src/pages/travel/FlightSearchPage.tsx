import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Plane, ArrowUpDown, Calendar, Users, ChevronDown, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import { useFlightFlow } from "@/hooks/useFlightFlow";
import type { FlightSearchParams, CabinClass, TripType } from "@/domains/flight/flight-types";
import { useUiEngine } from "@/hooks/useUiEngine";

const NAVY = "hsl(220 40% 18%)";
const GOLD = "hsl(38 65% 56%)";

const CABIN_OPTIONS: { value: CabinClass; label: string }[] = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium Economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First" },
];

export default function FlightSearchPage() {
  useUiEngine("travel-flightsearchpage");
  const { search, loading, error, clearError } = useFlightFlow();

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [tripType, setTripType] = useState<TripType>("round_trip");
  const [cabinClass, setCabinClass] = useState<CabinClass>("economy");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [directOnly, setDirectOnly] = useState(false);

  const swapCities = useCallback(() => {
    setOrigin(destination);
    setDestination(origin);
  }, [origin, destination]);

  const handleSearch = useCallback(() => {
    if (!origin || !destination || !departureDate) return;
    clearError();

    const params: FlightSearchParams = {
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      departureDate,
      returnDate: tripType === "round_trip" ? returnDate : undefined,
      tripType,
      cabinClass,
      passengers: { adults, children, infants },
      currency: "EUR",
      directOnly,
    };
    search(params);
  }, [origin, destination, departureDate, returnDate, tripType, cabinClass, adults, children, infants, directOnly, search, clearError]);

  const totalPassengers = adults + children + infants;

  return (
    <div className="app-mobile-page bg-background pb-24">
      <MobilePageHeader title="Search Flights" backTo="/travel" />

      <div className="px-4 space-y-4 pt-2">
        <div className="flex items-center gap-1.5 mb-1">
          {(["round_trip", "one_way"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTripType(t)}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors"
              style={{
                background: tripType === t ? NAVY : "transparent",
                color: tripType === t ? "#fff" : "var(--foreground)",
                borderColor: tripType === t ? NAVY : "var(--border)",
              }}
            >
              {t === "round_trip" ? "Round trip" : "One way"}
            </button>
          ))}
        </div>

        <div className="relative">
          <div className="space-y-2">
            <div className="relative">
              <Plane className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground rotate-45" />
              <input
                type="text"
                placeholder="From (city or airport code)"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full pl-10 pr-3 py-3 rounded-xl border border-border/30 bg-card text-sm font-semibold text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="relative">
              <Plane className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground -rotate-45" />
              <input
                type="text"
                placeholder="To (city or airport code)"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full pl-10 pr-3 py-3 rounded-xl border border-border/30 bg-card text-sm font-semibold text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <button
            onClick={swapCities}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center border border-border/30 bg-background shadow-sm active:scale-95 transition-transform z-10"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="w-full pl-10 pr-2 py-3 rounded-xl border border-border/30 bg-card text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {tripType === "round_trip" && (
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full pl-10 pr-2 py-3 rounded-xl border border-border/30 bg-card text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-xl border border-border/30 bg-card">
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-bold text-foreground">Passengers</span>
            </div>
            <div className="space-y-1.5">
              {[
                { label: "Adults", value: adults, set: setAdults, min: 1 },
                { label: "Children", value: children, set: setChildren, min: 0 },
                { label: "Infants", value: infants, set: setInfants, min: 0 },
              ].map(({ label, value, set, min }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => set(Math.max(min, value - 1))}
                      className="w-6 h-6 rounded-full border border-border/30 flex items-center justify-center text-xs font-bold active:scale-95"
                    >
                      −
                    </button>
                    <span className="text-xs font-bold tabular-nums w-4 text-center">{value}</span>
                    <button
                      onClick={() => set(Math.min(9, value + 1))}
                      className="w-6 h-6 rounded-full border border-border/30 flex items-center justify-center text-xs font-bold active:scale-95"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-border/30 bg-card">
            <div className="flex items-center gap-1.5 mb-2">
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-bold text-foreground">Cabin</span>
            </div>
            <div className="space-y-1">
              {CABIN_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCabinClass(c.value)}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-colors"
                  style={{
                    background: cabinClass === c.value ? `${GOLD}15` : "transparent",
                    color: cabinClass === c.value ? NAVY : "var(--muted-foreground)",
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 px-1 cursor-pointer">
          <input
            type="checkbox"
            checked={directOnly}
            onChange={(e) => setDirectOnly(e.target.checked)}
            className="rounded border-border accent-primary w-4 h-4"
          />
          <span className="text-xs font-semibold text-foreground">Direct flights only</span>
        </label>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl text-xs font-semibold"
            style={{ background: "hsl(0 72% 58% / 0.08)", color: "hsl(0 72% 58%)", border: "1px solid hsl(0 72% 58% / 0.2)" }}
          >
            {error}
          </motion.div>
        )}

        <Button
          onClick={handleSearch}
          disabled={loading || !origin || !destination || !departureDate}
          className="w-full h-12 rounded-xl font-bold text-sm"
          style={{ background: NAVY, color: "#fff" }}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Search className="h-4 w-4 mr-2" />
          )}
          {loading ? "Searching..." : `Search flights · ${totalPassengers} pax`}
        </Button>
      </div>
    </div>
  );
}
