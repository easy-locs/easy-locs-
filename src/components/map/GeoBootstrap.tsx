/**
 * GeoBootstrap — Initializes GPS via unified geoService.
 * Mount once at app root. Silent — no banner on denied.
 */
import { GeoBoot } from "@/lib/geo/GeoBoot";

export function GeoBootstrap() {
  return <GeoBoot />;
}
