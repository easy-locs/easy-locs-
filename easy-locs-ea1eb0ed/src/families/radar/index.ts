/**
 * FAMILY: RADAR / MAP / GEO — Canonical geolocation and map logic.
 * Single source of truth for position, search, overlays, world context.
 *
 * All modules MUST import radar/geo logic from this family.
 */

// ── Core radar hook ──
export { useRadar } from "@/hooks/useRadar";
export { useRadarResults } from "@/hooks/useRadarResults";
export { useRadarLiveContext } from "@/hooks/useRadarLiveContext";
export { useRadarOpportunities } from "@/hooks/useRadarOpportunities";

// ── Ranking ──
export { useRadarRanking } from "@/hooks/radar/useRadarRanking";

// ── Geo detection ──
export { useGeoDetect } from "@/hooks/useGeoDetect";

// ── Location store ──
export { useLocationStore } from "@/stores/locationStore";

// ── Geo store ──
export { useGeoStore } from "@/lib/geo/geo-store";

// Radar family owns: geolocation, current position, search area,
// map pins, overlays, live tracking, radar feed, country/region canonicalization
