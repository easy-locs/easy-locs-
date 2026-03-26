import React from "react";
import type {
  UnifiedETAResult,
  UnifiedPricingResult,
  MobilityContext,
} from "@/lib/mobility/unified-mobility.types";

const CONTEXT_LABELS: Record<MobilityContext, string> = {
  taxi: "Taxi",
  food_delivery: "Food Delivery",
  grocery_delivery: "Grocery Delivery",
  parcel: "Parcel",
  errand: "Errand",
};

export function UnifiedMobilityPreviewCard({
  context,
  pricing,
  eta,
}: {
  context: MobilityContext;
  pricing: UnifiedPricingResult;
  eta: UnifiedETAResult;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <h3 className="text-lg font-semibold text-card-foreground">
        {CONTEXT_LABELS[context] ?? context}
      </h3>

      {/* ETA row */}
      <div className="flex gap-4">
        <div className="flex-1 rounded-lg bg-muted p-3 text-center">
          <p className="text-xs text-muted-foreground">Pickup ETA</p>
          <p className="text-xl font-bold text-foreground">
            {eta.etaPickupMinutes != null ? `${eta.etaPickupMinutes} min` : "--"}
          </p>
        </div>
        <div className="flex-1 rounded-lg bg-muted p-3 text-center">
          <p className="text-xs text-muted-foreground">Total ETA</p>
          <p className="text-xl font-bold text-foreground">
            {eta.totalEtaMinutes != null ? `${eta.totalEtaMinutes} min` : "--"}
          </p>
        </div>
      </div>

      {/* Pricing breakdown */}
      <div className="space-y-1 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Base</span>
          <span>{pricing.baseFare} AED</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Distance</span>
          <span>{pricing.distanceFare.toFixed(0)} AED</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Time</span>
          <span>{pricing.timeFare.toFixed(0)} AED</span>
        </div>
        {pricing.merchantPrepFee > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Prep</span>
            <span>{pricing.merchantPrepFee.toFixed(0)} AED</span>
          </div>
        )}
        <div className="flex justify-between text-muted-foreground">
          <span>Traffic</span>
          <span>x{pricing.trafficMultiplier}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Demand</span>
          <span>x{pricing.demandMultiplier}</span>
        </div>
        {pricing.surgeMultiplier > 1 && (
          <div className="flex justify-between text-amber-600 font-medium">
            <span>Surge</span>
            <span>x{pricing.surgeMultiplier}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-foreground pt-2 border-t border-border">
          <span>Total</span>
          <span>{pricing.finalPrice} AED</span>
        </div>
      </div>
    </div>
  );
}
