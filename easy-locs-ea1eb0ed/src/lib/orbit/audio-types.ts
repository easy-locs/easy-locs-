/**
 * Orbit Audio — Canonical type definitions.
 */

export type AudioPlaybackStatus = "idle" | "loading" | "playing" | "paused";

export interface AudioTrack {
  messageId: string;
  url: string;
  durationSeconds?: number;
}
