/**
 * TravelFlightDetail — Full flight detail page.
 * Route, airline, airports, layovers, baggage, fare, refund policy, booking CTA.
 */
import { useParams } from "react-router-dom";
import { Plane, Clock, Luggage, Shield, ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import MobilePageHeader from "@/components/mobile/MobilePageHeader";

export default function TravelFlightDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen bg-background pb-28">
      <MobilePageHeader title="Flight Details" backTo="/travel/flights" />

      <div className="px-4 space-y-4">
        {/* Route summary */}
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
          <div className="flex items-center justify-between mb-3">
            <div className="text-center">
              <p className="text-lg font-black text-foreground">CDG</p>
              <p className="text-[10px] text-muted-foreground">Paris</p>
              <p className="text-xs font-bold text-foreground mt-1">08:30</p>
            </div>
            <div className="flex-1 flex flex-col items-center gap-0.5 px-3">
              <p className="text-[10px] text-muted-foreground">2h 15m</p>
              <div className="w-full flex items-center gap-1">
                <div className="flex-1 h-px bg-border" />
                <Plane className="h-3 w-3 text-primary rotate-90" />
                <div className="flex-1 h-px bg-border" />
              </div>
              <p className="text-[10px] text-primary font-semibold">Direct</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-foreground">BCN</p>
              <p className="text-[10px] text-muted-foreground">Barcelona</p>
              <p className="text-xs font-bold text-foreground mt-1">10:45</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-border/20">
            <div className="w-6 h-6 rounded bg-muted/30 flex items-center justify-center">
              <Plane className="h-3 w-3 text-muted-foreground" />
            </div>
            <span className="text-xs font-semibold text-foreground">Airline Name</span>
            <span className="text-[10px] text-muted-foreground">· Flight AB1234</span>
          </div>
        </div>

        {/* Fare details */}
        <div>
          <h2 className="text-sm font-bold text-foreground mb-2">Fare Details</h2>
          <div className="space-y-2">
            {[
              { label: "Fare family", value: "Economy Flex" },
              { label: "Cabin class", value: "Economy" },
              { label: "Aircraft", value: "Airbus A320" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Baggage */}
        <div>
          <h2 className="text-sm font-bold text-foreground mb-2">Baggage</h2>
          <div className="space-y-1.5">
            {[
              { type: "Cabin bag", detail: "1× 8kg included", included: true },
              { type: "Checked bag", detail: "1× 23kg included", included: true },
              { type: "Extra bag", detail: "+$35 per bag", included: false },
            ].map(b => (
              <div key={b.type} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/10">
                <Luggage className="h-3.5 w-3.5 text-primary" />
                <div className="flex-1">
                  <span className="text-xs font-semibold text-foreground">{b.type}</span>
                  <span className="text-[10px] text-muted-foreground ml-1.5">{b.detail}</span>
                </div>
                {b.included && <span className="text-[9px] font-bold text-success px-1.5 py-0.5 bg-success/10 rounded-full">Included</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Refund / Change policy */}
        <div className="p-3 rounded-xl bg-success/5 border border-success/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="h-3.5 w-3.5 text-success" />
            <span className="text-xs font-bold text-success">Flexible ticket</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Free date change up to 24h before departure. Refund with $25 fee.</p>
        </div>

        {/* Price breakdown */}
        <div className="p-3 rounded-xl border border-border/15 bg-card/50 space-y-1.5">
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Base fare (1 adult)</span><span className="text-foreground font-semibold">$120</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Taxes & fees</span><span className="text-foreground font-semibold">$35</span></div>
          <div className="border-t border-border/20 pt-1.5 flex justify-between text-sm">
            <span className="font-bold text-foreground">Total</span>
            <span className="font-black text-foreground">$155</span>
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-2 z-40">
        <div className="flex items-center justify-between p-3 rounded-2xl bg-card border border-border/20 shadow-lg backdrop-blur-sm">
          <div>
            <p className="text-lg font-black text-foreground">$155</p>
            <p className="text-[10px] text-muted-foreground">Total · 1 adult</p>
          </div>
          <Button size="sm" className="font-bold">Book Flight</Button>
        </div>
      </div>
    </div>
  );
}
