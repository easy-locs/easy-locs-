/**
 * RideFareCard — Pickup/Dropoff + fare summary card.
 */
import { MapPin, Navigation, CreditCard } from "lucide-react";
import { tc } from "@/lib/i18n-canonical";

interface Props {
  pickupLabel?: string;
  dropoffLabel?: string;
  fare?: number | null;
  currency?: string;
  surgeMultiplier?: number;
  paymentStatus?: string;
}

export function RideFareCard({ pickupLabel, dropoffLabel, fare, currency = "AED", surgeMultiplier, paymentStatus }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start gap-2.5">
        <MapPin className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
        <span className="text-sm text-foreground">{pickupLabel || tc("ride.pickup")}</span>
      </div>
      <div className="flex items-start gap-2.5">
        <Navigation className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <span className="text-sm text-foreground">{dropoffLabel || tc("ride.dropoff")}</span>
      </div>
      {fare != null && (
        <div className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2 mt-2">
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{tc("ride.fare")}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-foreground">
              {fare} {currency}
            </span>
            {(surgeMultiplier ?? 1) > 1 && (
              <span className="text-xs text-amber-500 font-semibold">×{surgeMultiplier}</span>
            )}
          </div>
        </div>
      )}
      {paymentStatus && (
        <div className="text-[10px] text-muted-foreground text-right">
          {tc(`ride.payment_${paymentStatus}`) || paymentStatus}
        </div>
      )}
    </div>
  );
}
