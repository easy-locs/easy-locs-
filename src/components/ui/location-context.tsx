/**
 * LocationContext — Shows user location + distance/ETA relative to a target.
 * Reusable across all cards, pages, and detail views.
 */
import { MapPin, Navigation, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGeolocation } from "@/hooks/useGeolocation";
import { haversineDistance, estimateETA, formatDistance, formatETA } from "@/lib/delivery/geo-utils";

type ProximityLevel = "nearby" | "medium" | "far";

function getProximity(km: number): ProximityLevel {
  if (km < 1.5) return "nearby";
  if (km < 5) return "medium";
  return "far";
}

const PROXIMITY_STYLE: Record<ProximityLevel, string> = {
  nearby: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  far: "text-muted-foreground bg-muted/40 border-border/30",
};

const PROXIMITY_LABEL: Record<ProximityLevel, string> = {
  nearby: "Nearby",
  medium: "Medium",
  far: "Far",
};

interface LocationContextProps {
  /** Target location to measure distance from user */
  targetLat?: number | null;
  targetLng?: number | null;
  /** Show current city */
  showCity?: boolean;
  /** Show distance */
  showDistance?: boolean;
  /** Show ETA */
  showETA?: boolean;
  /** Show proximity badge */
  showProximity?: boolean;
  /** Compact mode for cards */
  compact?: boolean;
  className?: string;
}

export function LocationContext({
  targetLat,
  targetLng,
  showCity = true,
  showDistance = true,
  showETA = false,
  showProximity = false,
  compact = false,
  className,
}: LocationContextProps) {
  const { lat, lng, effectiveCity } = useGeolocation();

  const hasTarget = targetLat != null && targetLng != null;
  const hasUser = lat != null && lng != null;
  const distance = hasUser && hasTarget ? haversineDistance(lat, lng, targetLat!, targetLng!) : null;
  const eta = distance != null ? estimateETA(distance) : null;
  const proximity = distance != null ? getProximity(distance) : null;

  if (!effectiveCity && !distance) return null;

  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap", compact ? "text-[10px]" : "text-xs", className)}>
      {showCity && effectiveCity && (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <MapPin className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
          <span className="truncate max-w-[100px]">{effectiveCity}</span>
        </span>
      )}

      {showDistance && distance != null && (
        <>
          <span className="text-border">·</span>
          <span className="inline-flex items-center gap-0.5 text-muted-foreground">
            <Navigation className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
            {formatDistance(distance)}
          </span>
        </>
      )}

      {showETA && eta != null && (
        <>
          <span className="text-border">·</span>
          <span className="inline-flex items-center gap-0.5 text-muted-foreground">
            <Clock className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
            {formatETA(eta)}
          </span>
        </>
      )}

      {showProximity && proximity && (
        <span className={cn(
          "inline-flex items-center px-1.5 py-0.5 rounded-full border font-semibold",
          compact ? "text-[9px]" : "text-[10px]",
          PROXIMITY_STYLE[proximity]
        )}>
          {PROXIMITY_LABEL[proximity]}
        </span>
      )}
    </div>
  );
}

export default LocationContext;
