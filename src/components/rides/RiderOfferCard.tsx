/**
 * RiderOfferCard — Rider-only card to accept/reject an offer.
 * Does NOT show customer controls (cancel, create).
 */
import { useRiderDispatchStore, type RiderOffer } from "@/stores/riderDispatchStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, Navigation, Check, X, Clock, Zap } from "lucide-react";
import { useState } from "react";

export function RiderOfferCard({ offer }: { offer: RiderOffer }) {
  const acceptOffer = useRiderDispatchStore(s => s.acceptOffer);
  const rejectOffer = useRiderDispatchStore(s => s.rejectOffer);
  const [accepting, setAccepting] = useState(false);

  const job = offer.job;
  if (!job) return null;

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await acceptOffer(offer.id);
      toast.success("Offer accepted! Navigate to pickup.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    try {
      await rejectOffer(offer.id);
      toast.info("Offer declined");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="bg-card border border-border/30 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-border/20 bg-amber-500/5">
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs font-bold text-amber-600">New ride offer</span>
        </div>
        <div className="flex items-center gap-1.5">
          {offer.distance_km != null && (
            <Badge variant="secondary" className="text-[10px]">{offer.distance_km} km</Badge>
          )}
          {offer.eta_minutes != null && (
            <Badge variant="outline" className="text-[10px] gap-0.5">
              <Clock className="h-2.5 w-2.5" /> {offer.eta_minutes} min
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Locations */}
        <div className="space-y-2">
          <div className="flex items-start gap-2.5">
            <MapPin className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
            <span className="text-sm text-foreground">{job.pickup_address || "Pickup"}</span>
          </div>
          <div className="flex items-start gap-2.5">
            <Navigation className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span className="text-sm text-foreground">{job.dropoff_address || "Dropoff"}</span>
          </div>
        </div>

        {/* Fare */}
        {(job.fare_amount ?? job.delivery_fee) != null && (
          <div className="flex items-center justify-between bg-emerald-500/5 rounded-lg px-3 py-2">
            <span className="text-xs text-muted-foreground">You'll earn</span>
            <span className="text-sm font-bold text-emerald-600">
              {job.fare_amount ?? job.delivery_fee} AED
              {(job.surge_multiplier ?? 1) > 1 && (
                <span className="ml-1 text-xs text-amber-500">×{job.surge_multiplier} surge</span>
              )}
            </span>
          </div>
        )}

        {/* Accept / Reject */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-10 text-xs rounded-xl gap-1.5"
            onClick={handleReject}
          >
            <X className="h-3.5 w-3.5" /> Decline
          </Button>
          <Button
            size="sm"
            className="h-10 text-xs rounded-xl gap-1.5"
            onClick={handleAccept}
            disabled={accepting}
          >
            <Check className="h-3.5 w-3.5" /> {accepting ? "Accepting..." : "Accept"}
          </Button>
        </div>
      </div>
    </div>
  );
}
