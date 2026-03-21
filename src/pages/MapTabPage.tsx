/**
 * MapTabPage — Map tab entry point with geo/auth debug overlay.
 */
import ExplorerMap from "@/components/map/ExplorerMap";
import { useAuth } from "@/contexts/AuthContext";
import { useLocationStore } from "@/stores/locationStore";
import { useState, useEffect } from "react";

export default function MapTabPage() {
  const { user, loading: authLoading, profileLoaded } = useAuth();
  const currentLocation = useLocationStore((s) => s.currentLocation);
  const permissionState = useLocationStore((s) => s.permissionState);
  const locLoading = useLocationStore((s) => s.loading);
  const isFallback = useLocationStore((s) => s.isFallback);
  const error = useLocationStore((s) => s.error);
  const [mapMounted, setMapMounted] = useState(false);

  useEffect(() => { setMapMounted(true); }, []);

  return (
    <>
      <ExplorerMap />
      {/* Debug overlay */}
      <details className="fixed bottom-20 left-2 z-[999] max-w-[260px] rounded-xl border border-border/50 bg-card/95 backdrop-blur-md shadow-lg text-[10px]">
        <summary className="cursor-pointer px-3 py-1.5 font-semibold text-muted-foreground">
          🗺️ Map debug
        </summary>
        <div className="px-3 pb-2 space-y-0.5 text-foreground leading-relaxed">
          <p><span className="text-muted-foreground">authLoading:</span> <b>{String(authLoading)}</b></p>
          <p><span className="text-muted-foreground">profileLoaded:</span> <b>{String(profileLoaded)}</b></p>
          <p><span className="text-muted-foreground">user:</span> <b>{user ? "yes" : "no"}</b></p>
          <p><span className="text-muted-foreground">mapMounted:</span> <b>{String(mapMounted)}</b></p>
          <p><span className="text-muted-foreground">geoPermission:</span> <b>{permissionState}</b></p>
          <p><span className="text-muted-foreground">geoLoading:</span> <b>{String(locLoading)}</b></p>
          <p><span className="text-muted-foreground">isFallback:</span> <b>{String(isFallback)}</b></p>
          <p><span className="text-muted-foreground">currentLocation:</span> <b>{currentLocation ? `${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)}` : "null"}</b></p>
          <p><span className="text-muted-foreground">accuracy:</span> <b>{currentLocation?.accuracy ?? "N/A"}</b></p>
          <p><span className="text-muted-foreground">error:</span> <b>{error || "none"}</b></p>
          <p className="text-muted-foreground pt-1 italic">
            💡 If map is blank: allow location in Safari Settings → easy-locs.lovable.app → Location
          </p>
        </div>
      </details>
    </>
  );
}
