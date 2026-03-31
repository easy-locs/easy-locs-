/**
 * DOMAIN: RADAR — Universal Root Formula
 * INTENT → ENTRY → PIPELINE → NORMALIZER → OWNER → STATE → SELECTOR → VIEW → OUTPUT
 *
 * Single source of truth for radar feeds, zones, alerts.
 * Delegates to existing radarStore as owner.
 */

export { radarDispatch } from "./radar-dispatch";
export type { RadarCommand, RadarCommandResult } from "./radar-dispatch";
export { selectRadarFeed, selectRadarCategory } from "./selectors";
