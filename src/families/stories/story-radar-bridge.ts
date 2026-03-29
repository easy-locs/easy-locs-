/**
 * story.radar-bridge — Canonical story-to-Radar handoff.
 * Orbit publishes, Radar consumes. No Radar internals leak into Orbit.
 */
import { platformBus } from "@/lib/shared/platform-bus";

export interface StoryRadarPayload {
  storyId: string;
  ownerId: string;
  lat: number;
  lng: number;
  label?: string;
  expiresAt: string;
  mediaUrl?: string;
  type: "text" | "media";
}

export const StoryRadarBridge = {
  /** Publish a geo-tagged story to Radar via platform bus */
  publish(payload: StoryRadarPayload): void {
    platformBus.emit("story:radar_publish", payload, "orbit", { userId: payload.ownerId });
  },

  /** Revoke a story from Radar (expired or deleted) */
  revoke(storyId: string, ownerId: string): void {
    platformBus.emit("story:radar_revoke", { storyId }, "orbit", { userId: ownerId });
  },

  /** Open a story's location in Radar */
  openInRadar(lat: number, lng: number, label?: string): void {
    platformBus.emit("radar:open_location", { lat, lng, label }, "orbit");
  },
};
