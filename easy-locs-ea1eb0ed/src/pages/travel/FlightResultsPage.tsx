import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, Clock, ArrowRight, SlidersHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import SubPageShell from "@/components/layout/SubPageShell";
import { useFlightFlow } from "@/hooks/useFlightFlow";
import type { FlightOffer } from "@/domains/flight/flight-types";
import { useUiEngine } from "@/hooks/useUiEngine";

const NAVY = "hsl(226 24% 14%)";
const GOLD = "hsl(var(--accent))";

type SortMode = "price" | "duration" | "departure";

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m > 0 ? `${m}m` : ""}`.trim();
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso.slice(11, 16);
  }
}

function FlightCard({ offer, onSelect, loading }: { offer: FlightOffer; onSelect: () => void; loading: boolean }) {
  const firstSeg = offer.segments[0];
  const lastSeg = offer.segments[offer.segments.length - 1];

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={onSelect}
      disabled={loading}
      className="w-full text-left p-3.5 rounded-2xl border border-border/15 bg-card/80 active:scale-[0.98] transition-transform"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${NAVY}10` }}
        >
          <Plane className="h-3.5 w-3.5" style={{ color: NAVY }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground line-clamp-1 break-words">{firstSeg.airline}</p>
          <p className="text-[0.625rem] text-muted-foreground">{firstSeg.flightNumber} · {firstSeg.aircraft ?? firstSeg.cabinClass}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-extrabold tabular-nums" style={{ color: NAVY }}>
            {offer.currency} {offer.totalPrice.toFixed(0)}
          </p>
          {offer.seatsRemaining && offer.seatsRemaining <= 5 && (
            <p className="text-[0.5625rem] font-bold" style={{ color: "hsl(0 72% 58%)" }}>
              {offer.seatsRemaining} left
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-center min-w-[48px]">
          <p className="text-sm font-bold text-foreground tabular-nums">{formatTime(firstSeg.departureTime)}</p>
          <p className="text-[0.625rem] text-muted-foreground">{firstSeg.origin}</p>
        </div>

        <div className="flex-1 flex flex-col items-center gap-0.5 px-1">
          <p className="text-[0.625rem] text-muted-foreground tabular-nums">{formatDuration(offer.totalDuration)}</p>
          <div className="w-full flex items-center gap-0.5">
            <div className="flex-1 h-px" style={{ background: `${GOLD}40` }} />
            {offer.stops > 0 && (
              <>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
                <div className="flex-1 h-px" style={{ background: `${GOLD}40` }} />
              </>
            )}
            <Plane className="h-2.5 w-2.5 rotate-90 shrink-0" style={{ color: GOLD }} />
          </div>
          <p className="text-[0.625rem] font-semibold" style={{ color: offer.stops === 0 ? "hsl(142 71% 45%)" : GOLD }}>
            {offer.stops === 0 ? "Direct" : `${offer.stops} stop${offer.stops > 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="text-center min-w-[48px]">
          <p className="text-sm font-bold text-foreground tabular-nums">{formatTime(lastSeg.arrivalTime)}</p>
          <p className="text-[0.625rem] text-muted-foreground">{lastSeg.destination}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/10">
        {offer.refundable && (
          <span className="text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "hsl(142 71% 45% / 0.1)", color: "hsl(142 71% 45%)" }}>
            Refundable
          </span>
        )}
        {offer.changeable && (
          <span className="text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${GOLD}15`, color: NAVY }}>
            Changeable
          </span>
        )}
        {firstSeg.baggageAllowance?.checkedBag && (
          <span className="text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full bg-muted/20 text-muted-foreground">
            {firstSeg.baggageAllowance.checkedBag.weight ?? 23}kg bag
          </span>
        )}
      </div>
    </motion.button>
  );
}

export default function FlightResultsPage() {
  useUiEngine("travel-flightresultspage");
  const { offers, searchParams, selectOffer, loading, error } = useFlightFlow();
  const [sortBy, setSortBy] = useState<SortMode>("price");

  const sorted = useMemo(() => {
    const copy = [...offers];
    switch (sortBy) {
      case "price":
        return copy.sort((a, b) => a.totalPrice - b.totalPrice);
      case "duration":
        return copy.sort((a, b) => a.totalDuration - b.totalDuration);
      case "departure":
        return copy.sort((a, b) =>
          new Date(a.segments[0].departureTime).getTime() -
          new Date(b.segments[0].departureTime).getTime()
        );
    }
  }, [offers, sortBy]);

  return (
    <SubPageShell noContentPad>
      <MobilePageHeader title="Flight Results" backTo="/travel/flights" />

      <div className="px-4 space-y-3">
        {searchParams && (
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: `${NAVY}06`, border: `1px solid ${NAVY}10` }}>
            <Plane className="h-4 w-4 shrink-0" style={{ color: NAVY }} />
            <p className="text-xs font-bold text-foreground flex-1">
              {searchParams.origin} <ArrowRight className="inline h-3 w-3 mx-0.5" /> {searchParams.destination}
            </p>
            <span className="text-[0.625rem] text-muted-foreground shrink-0 tabular-nums">
              {searchParams.departureDate}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          {(["price", "duration", "departure"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className="shrink-0 px-3 py-1.5 rounded-full text-[0.6875rem] font-semibold border transition-colors"
              style={{
                background: sortBy === s ? NAVY : "transparent",
                color: sortBy === s ? "#fff" : "var(--muted-foreground)",
                borderColor: sortBy === s ? NAVY : "var(--border)",
              }}
            >
              {s === "price" ? "Cheapest" : s === "duration" ? "Fastest" : "Earliest"}
            </button>
          ))}
          <span className="text-[0.625rem] text-muted-foreground ml-auto tabular-nums">
            {sorted.length} result{sorted.length !== 1 ? "s" : ""}
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-xl text-xs font-semibold" style={{ background: "hsl(0 72% 58% / 0.08)", color: "hsl(0 72% 58%)" }}>
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: GOLD }} />
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {sorted.map((offer) => (
            <FlightCard
              key={offer.offerId}
              offer={offer}
              onSelect={() => selectOffer(offer)}
              loading={loading}
            />
          ))}
        </AnimatePresence>

        {!loading && sorted.length === 0 && (
          <div className="text-center py-16">
            <Plane className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No flights found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your search criteria</p>
          </div>
        )}
      </div>
    </SubPageShell>
  );
}
