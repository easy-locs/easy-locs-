/**
 * GeoBootstrap — Initializes GPS and populates locationStore (single source of truth).
 * Mount once at app root or on pages needing live location.
 */
import { useCurrentLocation } from "@/hooks/useCurrentLocation";

export function GeoBootstrap() {
  useCurrentLocation({ watch: true });
  return null;
}
