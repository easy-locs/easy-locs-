import { useEffect } from "react";
import { useRiderDispatchStore } from "@/stores/riderDispatchStore";
import { Check, X, Package, Truck, MapPin } from "lucide-react";
import { toast } from "sonner";

export function DriverJobsPanel() {
  const offers = useRiderDispatchStore((s) => s.offers);
  const activeJobId = useRiderDispatchStore((s) => s.activeJobId);
  const acceptOffer = useRiderDispatchStore((s) => s.acceptOffer);
  const rejectOffer = useRiderDispatchStore((s) => s.rejectOffer);
  const advanceJobStatus = useRiderDispatchStore((s) => s.advanceJobStatus);
  const hydrateOffers = useRiderDispatchStore((s) => s.hydrateOffers);

  useEffect(() => { hydrateOffers(); }, []);

  if (offers.length === 0 && !activeJobId) {
    return (
      <div className="p-4 rounded-xl bg-card border border-border">
        <h3 className="text-sm font-semibold text-foreground mb-2">Driver Jobs</h3>
        <p className="text-xs text-muted-foreground">No assigned jobs</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Driver Jobs</h3>
      {offers.map((offer) => (
        <div key={offer.id} className="p-3 rounded-xl bg-card border border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground">{offer.job?.job_type?.replace(/_/g, ' ') ?? "Job"}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {offer.status}
            </span>
          </div>
          {offer.job && (
            <p className="text-xs text-muted-foreground">
              Fare: {offer.fare_at_offer ?? 0} {offer.job.currency} • {offer.distance_km ?? 0} km
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { acceptOffer(offer.id).catch((e: any) => toast.error(e.message)); }}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors active:scale-[0.97]"
            >
              <Check className="w-3.5 h-3.5" /> Accept
            </button>
            <button
              onClick={() => { rejectOffer(offer.id).catch((e: any) => toast.error(e.message)); }}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors active:scale-[0.97]"
            >
              <X className="w-3.5 h-3.5" /> Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
