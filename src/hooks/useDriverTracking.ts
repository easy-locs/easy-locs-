/**
 * useDriverTracking — Track a single matched driver in real-time via broadcast.
 * Used after dispatch: follows the assigned driver's position live.
 */
import { useEffect, useState, useRef, useCallback } from "react";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";

export interface DriverPosition {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  updatedAt: number;
}

export function useDriverTracking(driverId: string | null) {
  const [position, setPosition] = useState<DriverPosition | null>(null);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const prevPositionRef = useRef<DriverPosition | null>(null);

  // Interpolated position for smooth 60fps rendering
  const getInterpolated = useCallback(
    (progress: number): DriverPosition | null => {
      if (!position) return null;
      if (!prevPositionRef.current) return position;
      const t = Math.min(1, Math.max(0, progress));
      return {
        lat: prevPositionRef.current.lat + (position.lat - prevPositionRef.current.lat) * t,
        lng: prevPositionRef.current.lng + (position.lng - prevPositionRef.current.lng) * t,
        heading: position.heading,
        speed: position.speed,
        updatedAt: position.updatedAt,
      };
    },
    [position],
  );

  useEffect(() => {
    if (!driverId) {
      setPosition(null);
      setConnected(false);
      return;
    }

    const ch = createRealtimeChannel(`driver-track:${driverId}`, {
      config: { broadcast: { self: false } },
    });

    ch.on("broadcast", { event: "driver_move" }, ({ payload }) => {
      if (payload?.id === driverId || payload?.driver_id === driverId) {
        prevPositionRef.current = position;
        setPosition({
          lat: payload.lat,
          lng: payload.lng,
          heading: payload.heading,
          speed: payload.speed,
          updatedAt: Date.now(),
        });
      }
    }).subscribe((status) => {
      setConnected(status === "SUBSCRIBED");
    });

    channelRef.current = ch;

    return () => {
      ch.unsubscribe();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId]);

  return { position, connected, getInterpolated };
}
