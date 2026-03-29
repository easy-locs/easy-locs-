/**
 * useGeoDrivers — Real-time driver location subscription.
 * Uses Supabase Realtime on concierge_services (live entities).
 * Falls back to polling if WebSocket fails.
 */
import { useEffect, useState, useRef, useCallback } from "react";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import type { Driver } from "@/lib/radar/radar-engine";

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/** Demo drivers for development — seeded near user location */
function generateDemoDrivers(userLat: number, userLng: number): Driver[] {
  const spread = 0.02; // ~2km spread
  return [
    { id: "demo-1", lat: userLat + spread * 0.3, lng: userLng - spread * 0.5, status: "available", type: "taxi", rating: 4.9, name: "Mohamed K.", vehicle: "Toyota Corolla", plate: "AB-123", avatar: "🧑‍✈️" },
    { id: "demo-2", lat: userLat - spread * 0.4, lng: userLng + spread * 0.3, status: "available", type: "taxi", rating: 4.7, name: "Fatou D.", vehicle: "Renault Clio", plate: "CD-456", avatar: "👩‍✈️" },
    { id: "demo-3", lat: userLat + spread * 0.1, lng: userLng + spread * 0.6, status: "available", type: "taxi", rating: 4.8, name: "Omar S.", vehicle: "Peugeot 308", plate: "EF-789", avatar: "🧑‍✈️" },
    { id: "demo-4", lat: userLat - spread * 0.6, lng: userLng - spread * 0.2, status: "busy", type: "taxi", rating: 4.6, name: "Amina B.", vehicle: "Dacia Logan", plate: "GH-012", avatar: "👩‍✈️" },
    { id: "demo-5", lat: userLat + spread * 0.7, lng: userLng + spread * 0.1, status: "available", type: "delivery", rating: 4.5, name: "Sarah L.", vehicle: "Scooter", plate: "SC-345", avatar: "🛵" },
    { id: "demo-6", lat: userLat - spread * 0.2, lng: userLng - spread * 0.7, status: "available", type: "delivery", rating: 4.8, name: "Ibra M.", vehicle: "Vélo cargo", plate: "—", avatar: "🚲" },
  ];
}

export function useGeoDrivers(userLat?: number | null, userLng?: number | null) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof createRealtimeChannel> | null>(null);

  // Initial fetch from concierge_services (live entities)
  const fetchDrivers = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("concierge_services")
        .select("id, title, provider_name, entity_type, live_lat, live_lng, live_updated_at, presence_mode")
        .eq("active", true)
        .eq("presence_mode", "live")
        .not("live_lat", "is", null)
        .not("live_lng", "is", null);

      if (data && data.length > 0) {
        const now = Date.now();
        const mapped: Driver[] = (data as any[])
          .filter((d: any) => {
            if (!d.live_updated_at) return false;
            return now - new Date(d.live_updated_at).getTime() < STALE_THRESHOLD_MS;
          })
          .map((d: any) => ({
            id: d.id,
            lat: d.live_lat,
            lng: d.live_lng,
            status: "available" as const,
            type: (d.entity_type === "driver" ? "taxi" : "delivery") as "taxi" | "delivery",
            rating: 4.8,
            name: d.provider_name || d.title,
            vehicle: d.entity_type,
          }));

        if (mapped.length > 0) {
          setDrivers(mapped);
          return;
        }
      }

      // Fallback: demo drivers around user
      if (userLat && userLng) {
        setDrivers(generateDemoDrivers(userLat, userLng));
      }
    } catch {
      // Fallback to demo
      if (userLat && userLng) {
        setDrivers(generateDemoDrivers(userLat, userLng));
      }
    }
  }, [userLat, userLng]);

  // Subscribe to realtime updates
  useEffect(() => {
    fetchDrivers();

    const ch = createRealtimeChannel("drivers-live-radar", {
      config: { broadcast: { self: false } },
    });

    ch.on("broadcast", { event: "driver_position" }, ({ payload }) => {
      const { id, lat, lng, status, type, name } = payload as any;
      setDrivers(prev => {
        const idx = prev.findIndex(d => d.id === id);
        const updated: Driver = {
          id,
          lat,
          lng,
          status: status || "available",
          type: type || "taxi",
          rating: 4.8,
          name,
        };
        if (idx > -1) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [...prev, updated];
      });
    }).subscribe((status) => {
      setConnected(status === "SUBSCRIBED");
    });

    channelRef.current = ch;

    // Polling fallback every 30s
    const interval = setInterval(fetchDrivers, 30_000);

    return () => {
      ch.unsubscribe();
      channelRef.current = null;
      clearInterval(interval);
    };
  }, [fetchDrivers]);

  return { drivers, connected, refresh: fetchDrivers };
}
