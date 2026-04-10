/**
 * location.radar-bridge — Canonical bridge between Orbit location and Radar.
 * Publishes live location updates to Radar-consumable format.
 * Orbit must not hardcode Radar internals.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { LocationSession } from "./location-session";

export const LocationRadarBridge = {
  /** Publish a live location update to Radar via platform bus */
  publishToRadar(lat: number, lng: number, accuracy: number | null, userId: string) {
    const session = LocationSession.useStore.getState();
    if (!session.active) return;

    platformBus.emit("location:live_update", {
      lat,
      lng,
      accuracy,
      userId,
      conversationId: session.conversationId,
      isLive: true,
      timestamp: new Date().toISOString(),
    }, "location");
  },

  /** Stop live location sync with Radar */
  stopRadarSync(userId: string) {
    platformBus.emit("location:live_stopped", {
      userId,
      timestamp: new Date().toISOString(),
    }, "location");
  },
};
