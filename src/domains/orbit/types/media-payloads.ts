/**
 * LocationPayload — Canonical location data model.
 * Separated from message body to avoid inline field chaos.
 */

export interface LocationPayload {
  lat: number;
  lng: number;
  accuracy?: number;
  label?: string | null;
  address?: string | null;
  placeId?: string | null;
  thumbnailUrl?: string | null;
  mode: "static" | "live";
  expiresAt?: string | null;
  liveDurationMinutes?: number | null;
}

export interface VoicePayload {
  durationSeconds: number;
  waveform?: number[] | null;
  mimeType: string;
  sampleRate?: number | null;
  localUri: string | null;
  remoteUrl: string | null;
  size: number;
}
