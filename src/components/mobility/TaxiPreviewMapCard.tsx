/**
 * TaxiPreviewMapCard — Route preview with ETA/distance/traffic badges.
 */
import { tc } from "@/lib/i18n-canonical";
import type { TaxiRidePreview } from "@/hooks/useTaxiRidePreview";

interface Props {
  preview: TaxiRidePreview | null;
}

export function TaxiPreviewMapCard({ preview }: Props) {
  if (!preview) return null;

  return (
    <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
      <div className="h-44 bg-muted/30 flex items-center justify-center">
        <p className="text-xs text-muted-foreground">Map preview placeholder</p>
      </div>

      <div className="flex items-center justify-center gap-3 px-4 py-2.5 border-t border-border/30">
        <span className="text-sm font-bold text-foreground">{preview.eta} min</span>
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-sm font-semibold text-foreground">{preview.distance.toFixed(1)} km</span>
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-xs font-medium text-muted-foreground capitalize">
          {tc(`ride.traffic_${preview.traffic}`)}
        </span>
      </div>
    </div>
  );
}
