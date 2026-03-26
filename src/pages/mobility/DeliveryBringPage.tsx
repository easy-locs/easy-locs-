/**
 * DeliveryBringPage — "Bring me something" flow.
 * Pickup from any location → deliver to user.
 */
import { useState } from "react";
import { ArrowLeft, MapPin, Navigation } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CanonicalAddressInput } from "@/components/address/CanonicalAddressInput";
import type { CanonicalPlace } from "@/lib/address/canonical-place";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";

export default function DeliveryBringPage() {
  const navigate = useNavigate();
  const { location } = useCurrentLocation();
  const [pickup, setPickup] = useState<CanonicalPlace | null>(null);
  const [dropoff, setDropoff] = useState<CanonicalPlace | null>(null);
  const [notes, setNotes] = useState("");

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/mobility/delivery")} className="p-1.5 rounded-xl hover:bg-muted/60">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Bring Me Something</h1>
            <p className="text-xs text-muted-foreground">Pick up from anywhere</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Pickup from
            </p>
            <CanonicalAddressInput
              value={pickup}
              onChange={setPickup}
              placeholder="Where should we pick up?"
              contextType="parcel_pickup"
              allowAirport
              allowSavedPlaces
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <Navigation className="h-3 w-3" /> Deliver to
            </p>
            <CanonicalAddressInput
              value={dropoff}
              onChange={setDropoff}
              placeholder="Your delivery address"
              contextType="parcel_dropoff"
              allowSavedPlaces
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">What do you need?</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe what you want picked up..."
              className="w-full p-3 rounded-xl border border-border/30 bg-card text-sm text-foreground placeholder:text-muted-foreground resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <button
          disabled={!pickup || !dropoff || !notes.trim()}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 transition-all active:scale-[0.98]"
        >
          Get Price Estimate
        </button>
      </div>
    </div>
  );
}
