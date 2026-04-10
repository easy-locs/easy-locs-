/**
 * DOMAIN: MAP — Universal Root Formula
 * INTENT → ENTRY → PIPELINE → NORMALIZER → OWNER → STATE → SELECTOR → VIEW → OUTPUT
 *
 * Single source of truth for map viewport, markers, layers, search, sheet.
 * Delegates to unified mapStore as sole owner.
 */

export { mapDispatch } from "./map-dispatch";
export type { MapCommand, MapCommandResult } from "./map-dispatch";
export { selectVisiblePins, selectMapViewport } from "./selectors";
