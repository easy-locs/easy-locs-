/**
 * GeoPermissionRecovery — Shows when geolocation permission is denied.
 * Uses unified geoStore + geoService for retry.
 */
import { MapPin, RefreshCw } from "lucide-react";
import { useGeoStore } from "@/lib/geo/geo-store";
import { geoService } from "@/lib/geo/geo-service";
import { useState } from "react";

export function GeoPermissionRecovery() {
  const permission = useGeoStore((s) => s.permission);
  const point = useGeoStore((s) => s.point);
  const [retrying, setRetrying] = useState(false);

  if (permission !== "denied" && point) return null;
  if (permission !== "denied" && !point) return null; // still loading

  const handleRetry = async () => {
    setRetrying(true);
    geoService.forceRetry();
    // Wait briefly for result
    await new Promise((r) => setTimeout(r, 3000));
    setRetrying(false);
  };

  return (
    <div className="mx-4 my-2 rounded-xl p-3 flex items-start gap-3 bg-muted border border-border/20">
      <MapPin className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground">Location access needed</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Allow location access for this site in your phone/browser settings, then tap Retry.
        </p>
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-primary text-primary-foreground disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${retrying ? "animate-spin" : ""}`} />
          {retrying ? "Retrying..." : "Retry Location"}
        </button>
      </div>
    </div>
  );
}
