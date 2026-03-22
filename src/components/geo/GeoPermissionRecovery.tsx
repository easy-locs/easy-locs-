/**
 * GeoPermissionRecovery — Shows when geolocation permission is denied.
 * Provides instructions to re-enable and a retry button.
 */
import { MapPin, RefreshCw } from "lucide-react";
import { useLocationStore } from "@/stores/locationStore";
import { requestLocation } from "@/lib/location/requestLocation";
import { useState } from "react";

export function GeoPermissionRecovery() {
  const permissionState = useLocationStore((s) => s.permissionState);
  const isFallback = useLocationStore((s) => s.isFallback);
  const setCurrentLocation = useLocationStore((s) => s.setCurrentLocation);
  const setPermissionState = useLocationStore((s) => s.setPermissionState);
  const setIsFallback = useLocationStore((s) => s.setIsFallback);
  const setError = useLocationStore((s) => s.setError);
  const [retrying, setRetrying] = useState(false);

  if (permissionState !== "denied" && !isFallback) return null;

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const pos = await getCurrentPositionHighAccuracy();
      setCurrentLocation(pos);
      setIsFallback(false);
      setPermissionState("granted");
      setError(null);
      console.log("[GeoRecovery] retry success", pos);
    } catch (err: any) {
      console.warn("[GeoRecovery] retry failed", { code: err?.code, message: err?.message });
      if (err?.code === 1) {
        setPermissionState("denied");
      }
      setError(err?.message || "Location unavailable");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="mx-4 my-2 rounded-xl p-3 flex items-start gap-3 bg-muted border border-border/20">
      <MapPin className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground">Location access needed</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {permissionState === "denied"
            ? "Allow location access for this site in your phone/browser settings, then tap Retry."
            : "Precise GPS is not active yet. Tap Retry after enabling location on your phone."}
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
