import { useEffect, useRef, useState } from "react";

export function useLiveGeolocation(enabled: boolean) {
  const watchIdRef = useRef<number | null>(null);
  const [coords, setCoords] = useState<GeolocationCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setCoords(position.coords);
        setError(null);
      },
      (err) => setError(err.message || "Location error"),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [enabled]);

  return { coords, error };
}
