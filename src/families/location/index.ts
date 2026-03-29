/**
 * FAMILY: LOCATION — Canonical live-location family.
 * Single source of truth for permissions, session, stream, message, and view.
 * Consumed by Orbit, Radar, and Dashboard — never duplicated.
 */

// ── Location Stores (shared across modules) ──
export { useLocationStore } from "@/stores/locationStore";
export type { LocationPoint, ResolvedPlace, SavedPlace, PermissionState, AccuracyLevel } from "@/stores/locationStore";

// ── Geo Store (raw GPS) ──
export { useGeoStore } from "@/lib/geo/geo-store";
export type { GeoPoint, GeoPermission } from "@/lib/geo/geo-store";

// ── Subfamilies ──
export { LocationPermissions } from "./location-permissions";
export { LocationSession } from "./location-session";
export { LocationStream } from "./location-stream";

// Location family owns: permissions, session, stream, message payload, preview.
// Orbit's send.location handles message insertion.
