/**
 * RealtimeBridge — Connects realtime data sources to map layers via platformBus.
 * Zero business logic. Pure data routing.
 * Uses canonical realtime channel factory.
 */
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { platformBus } from "@/lib/shared/platform-bus";
import { shouldThrottleRealtimeUpdate } from "../engine/performance-engine";

const MAP_RT_EVENTS = {
  DRIVERS_UPDATED: "map.rt.drivers.updated",
  ORDERS_UPDATED: "map.rt.orders.updated",
  MERCHANTS_UPDATED: "map.rt.merchants.updated",
  WEATHER_UPDATED: "map.rt.weather.updated",
} as const;

let channels: any[] = [];

export function startMapRealtimeBridge() {
  const driverChannel = createRealtimeChannel("map-drivers-rt")
    .on("postgres_changes", {
      event: "*", schema: "public", table: "rider_presence",
    }, (payload) => {
      if (shouldThrottleRealtimeUpdate("map-drivers", 300)) return;
      platformBus.emit(MAP_RT_EVENTS.DRIVERS_UPDATED as any, payload, "map");
    })
    .subscribe();
  channels.push(driverChannel);

  const orderChannel = createRealtimeChannel("map-orders-rt")
    .on("postgres_changes", {
      event: "*", schema: "public", table: "trip_live_state",
    }, (payload) => {
      if (shouldThrottleRealtimeUpdate("map-orders", 500)) return;
      platformBus.emit(MAP_RT_EVENTS.ORDERS_UPDATED as any, payload, "map");
    })
    .subscribe();
  channels.push(orderChannel);
}

export function stopMapRealtimeBridge() {
  channels.forEach(ch => removeRealtimeChannel(ch));
  channels = [];
}