/**
 * DOMAIN: RADAR — Single source of truth for geolocation, map state, overlays, live tracking.
 *
 * Radar owns: current location, map overlays, nearby entities, live driver tracking, zones/signals.
 * INTERDIT: multiple modules storing their own geo state.
 */

// ── Canonical Types ──
export type { CanonicalGeoPosition, CanonicalRadarEntity } from "../shared/canonical-types";

// ── Atoms ──
export { clampZoom, isValidCoordinate, distanceMeters } from "./atoms/clamp-zoom.atom";

// ── Microns ──
export { normalizePosition } from "./microns/normalize-position.micron";

// ── Molecules ──
export { resolveRadarFocus } from "./molecules/resolve-radar-focus.molecule";
export type { RadarFocus } from "./molecules/resolve-radar-focus.molecule";

// ── Dispatch ──
export { radarDispatch } from "./radar-dispatch";
export type { RadarCommand, RadarCommandResult } from "./radar-dispatch";

// ── Selectors ──
export { selectRadarFeed, selectRadarCategory } from "./selectors";

// ── State Machines ──
export { DRIVER_MACHINE, transitionDriver } from "@/domains/shared/state-machines";
