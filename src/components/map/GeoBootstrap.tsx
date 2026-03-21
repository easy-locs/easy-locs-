/**
 * GeoBootstrap — Initializes GPS and populates locationStore (single source of truth).
 * Mount once at app root or on pages needing live location.
 * Shows a recovery banner when geo permission is denied.
 */
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import { GeoPermissionRecovery } from "@/components/geo/GeoPermissionRecovery";

export function GeoBootstrap() {
  useCurrentLocation({ watch: true });
  return <GeoPermissionRecovery />;
}
