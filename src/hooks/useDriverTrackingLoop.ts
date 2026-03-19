/**
 * useDriverTrackingLoop — Publishes driver location periodically while mission is active.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { publishDriverLocation } from "@/lib/dispatch/dispatch-live-tracking";

interface TrackingLoopParams {
  driverProfileId: string | null;
  dispatchJobId: string | null;
  orderId: string | null;
  active: boolean;
  intervalMs?: number;
}

export function useDriverTrackingLoop({ driverProfileId, dispatchJobId, orderId, active, intervalMs = 8000 }: TrackingLoopParams) {
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPublished, setLastPublished] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const publishOnce = useCallback(async () => {
    if (!driverProfileId) return;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 })
      );
      await publishDriverLocation({
        driverProfileId,
        dispatchJobId: dispatchJobId ?? undefined,
        orderId: orderId ?? undefined,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        heading: pos.coords.heading ?? undefined,
        speedKmh: pos.coords.speed ? pos.coords.speed * 3.6 : undefined,
        accuracyM: pos.coords.accuracy ?? undefined,
      });
      setLastPublished(new Date());
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Location unavailable");
    }
  }, [driverProfileId, dispatchJobId, orderId]);

  useEffect(() => {
    if (!active || !driverProfileId) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTracking(false);
      return;
    }
    setTracking(true);
    publishOnce();
    intervalRef.current = setInterval(publishOnce, intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTracking(false);
    };
  }, [active, driverProfileId, intervalMs, publishOnce]);

  return { tracking, error, lastPublished };
}
