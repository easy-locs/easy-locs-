/**
 * GeoStatusIndicator — Shows real-time geolocation status with retry.
 * Canonical component — no hardcoded fallback positions.
 */
import { MapPin, MapPinOff, Loader2, RefreshCw } from "lucide-react";
import { useLocationStore, type AccuracyLevel } from "@/stores/locationStore";
import { geoService } from "@/lib/geo/geo-service";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<AccuracyLevel | "denied" | "loading" | "unavailable", {
  icon: typeof MapPin;
  label: string;
  color: string;
}> = {
  exact: { icon: MapPin, label: "Exact location", color: "text-emerald-400" },
  approximate: { icon: MapPin, label: "Approximate location", color: "text-amber-400" },
  fallback: { icon: MapPinOff, label: "Location unavailable", color: "text-muted-foreground" },
  denied: { icon: MapPinOff, label: "Location denied", color: "text-destructive" },
  loading: { icon: Loader2, label: "Locating…", color: "text-primary" },
  unavailable: { icon: MapPinOff, label: "Location unavailable", color: "text-muted-foreground" },
};

interface Props {
  compact?: boolean;
  showRetry?: boolean;
  className?: string;
}

export function GeoStatusIndicator({ compact = false, showRetry = true, className }: Props) {
  const loading = useLocationStore((s) => s.loading);
  const permission = useLocationStore((s) => s.permissionState);
  const accuracy = useLocationStore((s) => s.accuracyLevel);
  const error = useLocationStore((s) => s.error);
  const location = useLocationStore((s) => s.currentLocation);

  // Determine effective status
  let statusKey: keyof typeof STATUS_CONFIG;
  if (loading) statusKey = "loading";
  else if (permission === "denied") statusKey = "denied";
  else if (!location) statusKey = "unavailable";
  else statusKey = accuracy;

  const config = STATUS_CONFIG[statusKey];
  const Icon = config.icon;
  const canRetry = showRetry && !loading && (statusKey === "denied" || statusKey === "unavailable" || statusKey === "fallback");

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Icon className={cn(
        compact ? "h-3 w-3" : "h-3.5 w-3.5",
        config.color,
        loading && "animate-spin"
      )} />
      {!compact && (
        <span className={cn("text-[10px] font-medium", config.color)}>
          {config.label}
        </span>
      )}
      {canRetry && (
        <button
          onClick={() => geoService.forceRetry()}
          className="ml-1 p-0.5 rounded hover:bg-muted/50 active:scale-90 transition-transform"
          aria-label="Retry location"
        >
          <RefreshCw className="h-2.5 w-2.5 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
