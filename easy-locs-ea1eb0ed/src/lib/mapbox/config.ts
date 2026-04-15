/**
 * mapbox/config.ts — Single source of truth for Mapbox access token.
 * All map components and geocoding must import from here.
 * K1 fix: Token loaded from environment variable instead of hardcoded in source.
 */
export const MAPBOX_ACCESS_TOKEN: string =
  import.meta.env.VITE_MAPBOX_TOKEN ?? "";
