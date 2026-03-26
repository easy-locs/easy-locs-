/**
 * TaxiConfirmActionBar — Confirm ride button after preview.
 */
import { tc } from "@/lib/i18n-canonical";
import { eventBus } from "@/lib/core/event-bus";
import type { TaxiRidePreview } from "@/hooks/useTaxiRidePreview";

interface Props {
  preview: TaxiRidePreview | null;
}

export function TaxiConfirmActionBar({ preview }: Props) {
  if (!preview) return null;

  const confirmRide = () => {
    void eventBus.emit("ride.requested", {
      pickup_lat: preview.pickup.lat,
      pickup_lng: preview.pickup.lng,
      dropoff_lat: preview.dropoff.lat,
      dropoff_lng: preview.dropoff.lng,
      pickup_label: preview.pickup.label ?? "",
      dropoff_label: preview.dropoff.label ?? "",
    });
  };

  return (
    <div className="sticky bottom-0 px-4 py-3 bg-background/95 backdrop-blur border-t border-border/30">
      <button
        type="button"
        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
        onClick={confirmRide}
      >
        {tc("ride.confirm_ride")}
      </button>
    </div>
  );
}
