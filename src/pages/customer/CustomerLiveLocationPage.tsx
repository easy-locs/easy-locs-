import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CustomerLiveLocationPage() {
  const navigate = useNavigate();
  const [coords, setCoords] = useState<GeolocationCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setCoords(pos.coords),
      (err) => setError(err.message),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
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
        ) : coords ? (
          <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-2">
            <p className="text-sm text-foreground">Latitude: <span className="font-bold">{coords.latitude.toFixed(6)}</span></p>
            <p className="text-sm text-foreground">Longitude: <span className="font-bold">{coords.longitude.toFixed(6)}</span></p>
            {coords.accuracy && (
              <p className="text-xs text-muted-foreground">Accuracy: {coords.accuracy.toFixed(0)}m</p>
            )}
          </div>
        ) : (
          <div className="mx-auto h-16 rounded-2xl bg-muted animate-pulse" />
        )}
      </div>
    </div>
  );
}
