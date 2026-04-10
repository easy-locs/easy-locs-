/**
 * FAMILY: LOCATION — Canonical live-location family.
 * Single source of truth for permissions, session, stream, message, view, and radar bridge.
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
export { useLocationViewer } from "./location-viewer";
export { LocationRadarBridge } from "./location-radar-bridge";
export { buildLocationPreview, getLocationLabel } from "./location-preview";
export type { LocationPreviewData } from "./location-preview";

// Location family owns: permissions, session, stream, viewer, radar bridge, preview.
// Orbit's send.location handles message insertion.
