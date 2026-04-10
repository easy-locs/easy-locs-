/**
 * CustomerLiveLocationPage — Uses canonical locationStore for live position.
 */
import { useNavigate } from "react-router-dom";
import { useLocationStore } from "@/stores/locationStore";

export default function CustomerLiveLocationPage() {
  const navigate = useNavigate();
  const loc = useLocationStore((s) => s.currentLocation);
  const error = useLocationStore((s) => s.error);

  return (
    <div className="app-mobile-page app-mobile-content bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate(-1 as any)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Live Location</h1>
          <p className="text-xs text-muted-foreground">Share your real-time position</p>
        </div>
      </div>

      <div className="px-4">
        {error ? (
          <p className="py-8 text-center text-sm text-destructive">{error}</p>
        ) : loc ? (
          <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-2">
            <p className="text-sm text-foreground">Latitude: <span className="font-bold">{loc.lat.toFixed(6)}</span></p>
            <p className="text-sm text-foreground">Longitude: <span className="font-bold">{loc.lng.toFixed(6)}</span></p>
            {loc.accuracy != null && (
              <p className="text-xs text-muted-foreground">Accuracy: {Math.round(loc.accuracy)}m</p>
            )}
          </div>
        ) : (
          <div className="mx-auto h-16 rounded-2xl bg-muted animate-pulse" />
        )}
      </div>
    </div>
  );
}
