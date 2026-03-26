/**
 * DeliveryErrandPage — Custom errand flow.
 * Describe task → pickup → dropoff → price estimate → dispatch.
 */
import { useState } from "react";
import { ArrowLeft, MapPin, Navigation, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CanonicalAddressInput } from "@/components/address/CanonicalAddressInput";
import type { CanonicalPlace } from "@/lib/address/canonical-place";

export default function DeliveryErrandPage() {
  const navigate = useNavigate();
  const [pickup, setPickup] = useState<CanonicalPlace | null>(null);
  const [dropoff, setDropoff] = useState<CanonicalPlace | null>(null);
  const [taskDescription, setTaskDescription] = useState("");

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/mobility/delivery")} className="p-1.5 rounded-xl hover:bg-muted/60">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Custom Errand</h1>
            <p className="text-xs text-muted-foreground">Tell us what you need done</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="text-center py-4">
          <Sparkles className="h-10 w-10 text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Describe your task and we'll handle the logistics</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">What do you need?</p>
          <textarea
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            placeholder="e.g. Pick up my dry cleaning at XYZ store, buy groceries from the list I'll share, collect documents from the office..."
            className="w-full p-3 rounded-xl border border-border/30 bg-card text-sm text-foreground placeholder:text-muted-foreground resize-none h-28 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Pickup / Task location
            </p>
            <CanonicalAddressInput value={pickup} onChange={setPickup} placeholder="Where should the rider go?" contextType="parcel_pickup" allowSavedPlaces />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <Navigation className="h-3 w-3" /> Deliver to (optional)
            </p>
            <CanonicalAddressInput value={dropoff} onChange={setDropoff} placeholder="Where should it be delivered?" contextType="parcel_dropoff" allowSavedPlaces />
          </div>
        </div>

        <button
          disabled={!pickup || !taskDescription.trim()}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 transition-all active:scale-[0.98]"
        >
          Get Price Estimate
        </button>
      </div>
    </div>
  );
}
