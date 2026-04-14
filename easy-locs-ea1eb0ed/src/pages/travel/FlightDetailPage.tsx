import { motion } from "framer-motion";
import { Plane, Clock, Luggage, Shield, ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobilePageHeader } from "@/components/ui/mobile-page-header";
import SubPageShell from "@/components/layout/SubPageShell";
import { useFlightFlow } from "@/hooks/useFlightFlow";
import { useUiEngine } from "@/hooks/useUiEngine";

const NAVY = "hsl(225 22% 16%)";
const GOLD = "hsl(var(--accent))";

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso.slice(11, 16);
  }
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m > 0 ? `${m}m` : ""}`.trim();
}

export default function FlightDetailPage() {
  useUiEngine("travel-flightdetailpage");
  const { selectedOffer, priceCheck, proceedToPassengers, loading, error } = useFlightFlow();

  if (!selectedOffer) {
    return (
      <SubPageShell noContentPad>
        <MobilePageHeader title="Flight Details" backTo="/travel/flight-results" />
        <div className="text-center py-16 px-4">
          <p className="text-sm font-semibold text-foreground">No flight selected</p>
        </div>
      </SubPageShell>
    );
  }

  const offer = selectedOffer;
  const firstSeg = offer.segments[0];
  const lastSeg = offer.segments[offer.segments.length - 1];

  return (
    <SubPageShell noContentPad>
      <MobilePageHeader title="Flight Details" backTo="/travel/flight-results" />

      <div className="px-4 space-y-4 pt-2">
        {priceCheck?.priceChanged && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl flex items-center gap-2"
            style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}25` }}
          >
            <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: GOLD }} />
            <div className="flex-1">
              <p className="text-[11px] font-bold text-foreground">Price updated</p>
              <p className="text-[10px] text-muted-foreground">
                Was {offer.currency} {priceCheck.oldPrice.toFixed(0)} → now {offer.currency} {priceCheck.newPrice.toFixed(0)}
              </p>
            </div>
          </motion.div>
        )}

        <div className="p-4 rounded-2xl" style={{ background: `${NAVY}06`, border: `1px solid ${NAVY}10` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{firstSeg.origin}</p>
              <p className="text-[10px] text-muted-foreground">{firstSeg.originCity}</p>
              <p className="text-xs font-bold text-foreground mt-1 tabular-nums">{formatTime(firstSeg.departureTime)}</p>
            </div>
            <div className="flex-1 flex flex-col items-center gap-0.5 px-3">
              <p className="text-[10px] text-muted-foreground tabular-nums">{formatDuration(offer.totalDuration)}</p>
              <div className="w-full flex items-center gap-1">
                <div className="flex-1 h-px" style={{ background: `${GOLD}40` }} />
                <Plane className="h-3 w-3 rotate-90" style={{ color: GOLD }} />
                <div className="flex-1 h-px" style={{ background: `${GOLD}40` }} />
              </div>
              <p className="text-[10px] font-semibold" style={{ color: offer.stops === 0 ? "hsl(142 71% 45%)" : GOLD }}>
                {offer.stops === 0 ? "Direct" : `${offer.stops} stop${offer.stops > 1 ? "s" : ""}`}
              </p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{lastSeg.destination}</p>
              <p className="text-[10px] text-muted-foreground">{lastSeg.destinationCity}</p>
              <p className="text-xs font-bold text-foreground mt-1 tabular-nums">{formatTime(lastSeg.arrivalTime)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: `${NAVY}10` }}>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${NAVY}10` }}>
              <Plane className="h-3 w-3" style={{ color: NAVY }} />
            </div>
            <span className="text-xs font-semibold text-foreground">{firstSeg.airline}</span>
            <span className="text-[10px] text-muted-foreground">· {firstSeg.flightNumber}</span>
          </div>
        </div>

        {offer.segments.length > 1 && (
          <div>
            <h2 className="text-sm font-bold text-foreground mb-2">Segments</h2>
            <div className="space-y-2">
              {offer.segments.map((seg, i) => (
                <div key={seg.segmentId} className="p-3 rounded-xl border border-border/15 bg-card/50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-muted-foreground">Segment {i + 1}</span>
                    <span className="text-[10px] text-muted-foreground">· {seg.flightNumber}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold tabular-nums">{formatTime(seg.departureTime)}</span>
                    <span className="text-muted-foreground">{seg.origin}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-bold tabular-nums">{formatTime(seg.arrivalTime)}</span>
                    <span className="text-muted-foreground">{seg.destination}</span>
                    <span className="text-muted-foreground ml-auto tabular-nums">{formatDuration(seg.duration)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-bold text-foreground mb-2">Fare Details</h2>
          <div className="space-y-2">
            {[
              { label: "Cabin class", value: offer.cabinClass.replace("_", " ") },
              { label: "Aircraft", value: firstSeg.aircraft ?? "—" },
              { label: "Airline", value: firstSeg.airline },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold text-foreground capitalize">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {firstSeg.baggageAllowance && (
          <div>
            <h2 className="text-sm font-bold text-foreground mb-2">Baggage</h2>
            <div className="space-y-1.5">
              {[
                {
                  type: "Cabin bag",
                  detail: `${firstSeg.baggageAllowance.cabinBag.quantity}× ${firstSeg.baggageAllowance.cabinBag.weight ?? 8}kg`,
                  included: true,
                },
                {
                  type: "Checked bag",
                  detail: `${firstSeg.baggageAllowance.checkedBag.quantity}× ${firstSeg.baggageAllowance.checkedBag.weight ?? 23}kg`,
                  included: firstSeg.baggageAllowance.checkedBag.quantity > 0,
                },
              ].map((b) => (
                <div key={b.type} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/10">
                  <Luggage className="h-3.5 w-3.5" style={{ color: NAVY }} />
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-foreground">{b.type}</span>
                    <span className="text-[10px] text-muted-foreground ml-1.5">{b.detail}</span>
                  </div>
                  {b.included && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "hsl(142 71% 45% / 0.1)", color: "hsl(142 71% 45%)" }}>
                      Included
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {(offer.refundable || offer.changeable) && (
          <div className="p-3 rounded-xl" style={{ background: "hsl(142 71% 45% / 0.05)", border: "1px solid hsl(142 71% 45% / 0.2)" }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Shield className="h-3.5 w-3.5" style={{ color: "hsl(142 71% 45%)" }} />
              <span className="text-xs font-bold" style={{ color: "hsl(142 71% 45%)" }}>
                {offer.refundable ? "Flexible ticket" : "Changeable ticket"}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {offer.refundable && "Refundable. "}
              {offer.changeable && `Change fee: ${offer.changeFeePct ?? 0}%.`}
            </p>
          </div>
        )}

        <div className="p-3 rounded-xl border border-border/15 bg-card/50 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Base fare</span>
            <span className="text-foreground font-semibold tabular-nums">{offer.currency} {offer.basePrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Taxes & fees</span>
            <span className="text-foreground font-semibold tabular-nums">{offer.currency} {(offer.taxes + offer.fees).toFixed(2)}</span>
          </div>
          <div className="border-t border-border/20 pt-1.5 flex justify-between text-sm">
            <span className="font-bold text-foreground">Total</span>
            <span className="font-extrabold tabular-nums" style={{ color: NAVY }}>{offer.currency} {offer.totalPrice.toFixed(2)}</span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl text-xs font-semibold" style={{ background: "hsl(0 72% 58% / 0.08)", color: "hsl(0 72% 58%)" }}>
            {error}
          </div>
        )}
      </div>

      <div className="fixed bottom-20 left-0 right-0 px-4 pb-2 z-40">
        <div className="flex items-center justify-between p-3 rounded-2xl bg-card border border-border/20 shadow-lg backdrop-blur-sm">
          <div>
            <p className="text-lg font-extrabold tabular-nums" style={{ color: NAVY }}>{offer.currency} {offer.totalPrice.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">per passenger</p>
          </div>
          <Button
            onClick={proceedToPassengers}
            disabled={loading}
            className="font-bold"
            style={{ background: NAVY, color: "#fff" }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
          </Button>
        </div>
      </div>
    </SubPageShell>
  );
}
