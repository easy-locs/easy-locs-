/**
 * Central map configuration. All map components must import their style URL
 * and token validation from this module — never hardcode.
 */

export type MapStyleVariant = "dark" | "light" | "voyager";

const FALLBACK_STYLES: Record<MapStyleVariant, string> = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  voyager: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
};

const FALLBACK_RASTER_TILES: Record<MapStyleVariant, string> = {
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  voyager: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
};

/**
 * Returns the configured MapLibre style URL. Honours the VITE_MAPLIBRE_STYLE_URL
 * env override if set; otherwise falls back to a public, no-token CartoCDN style.
 */
export function getMapStyleUrl(variant: MapStyleVariant = "dark"): string {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const override = env?.VITE_MAPLIBRE_STYLE_URL || env?.VITE_MAP_STYLE_URL;
  if (override && /^https?:\/\//i.test(override)) return override;
  return FALLBACK_STYLES[variant];
}

/** Raster fallback tile URL for Leaflet, env-overridable. */
export function getRasterTileUrl(variant: MapStyleVariant = "dark"): string {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const override = env?.VITE_MAP_RASTER_TILE_URL;
  if (override && /^https?:\/\//i.test(override)) return override;
  return FALLBACK_RASTER_TILES[variant];
}

/** Backwards-compatible default — prefer getMapStyleUrl(). */
export const DEFAULT_MAP_STYLE_URL = getMapStyleUrl("dark");

export function isWebGLSupported(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    return gl instanceof WebGLRenderingContext || gl instanceof WebGL2RenderingContext;
  } catch {
    return false;
  }
}

/**
 * Returns a user-actionable string when the map cannot init in the current
 * browser, otherwise null. Used by every map component as a pre-flight check.
 */
export function getMapTokenError(): string | null {
  if (typeof document !== "undefined" && !isWebGLSupported()) {
    return "WebGL is not supported by your browser. Maps require WebGL.";
  }
  return null;
}

export const getMapboxTokenError = getMapTokenError;

function readMapboxToken(): string {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return env?.VITE_MAPBOX_TOKEN || env?.VITE_MAPBOX_ACCESS_TOKEN || "";
}

export const MAPBOX_ACCESS_TOKEN: string = readMapboxToken();

/**
 * The app currently uses MapLibre with a no-token CartoCDN style by default;
 * a Mapbox token is only required if the consumer opts into a Mapbox style.
 */
export function hasMapboxToken(): boolean {
  return MAPBOX_ACCESS_TOKEN.length > 0;
}

let bootValidationDone = false;

/**
 * One-shot boot validation for the map subsystem. Logs an actionable warning
 * when WebGL is missing or the configured style URL is unreachable. Safe to
 * call multiple times — only runs once per page load.
 */
export function validateMapBoot(): void {
  if (bootValidationDone || typeof window === "undefined") return;
  bootValidationDone = true;

  const styleUrl = getMapStyleUrl("dark");
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const isDev = env?.DEV === true || env?.MODE === "development";

  if (!isWebGLSupported()) {
    console.warn(
      "[map.boot] WebGL is not available — maps will use the Leaflet fallback. " +
        "Enable hardware acceleration in your browser to use the high-fidelity map.",
    );
    return;
  }

  if (isDev) {
    // eslint-disable-next-line no-console
    console.info("[map.boot] OK — style:", styleUrl, "| mapbox token:", hasMapboxToken() ? "present" : "absent (using public style)");
  }

  // Probe the style URL once. Failures here usually mean DNS/CORS issues that
  // would otherwise present as a silent white map.
  fetch(styleUrl, { method: "HEAD", mode: "no-cors" }).catch((err) => {
    console.warn(
      "[map.boot] Configured map style URL is unreachable. Tiles may fail to load. " +
        "Set VITE_MAPLIBRE_STYLE_URL to a reachable style.json.",
      styleUrl,
      err,
    );
  });
}

/**
 * Health probe for the MapLibre integration. The default style is a public
 * CartoCDN URL with no token requirement, so the probe just verifies WebGL
 * support and that the configured style URL is well-formed.
 */
export function getMaplibreHealth(): { ok: boolean; reason?: string } {
  if (typeof document !== "undefined" && !isWebGLSupported()) {
    return { ok: false, reason: "WebGL is not supported by this browser" };
  }
  const styleUrl = getMapStyleUrl("dark");
  if (!/^https?:\/\//i.test(styleUrl)) {
    return { ok: false, reason: `Configured map style URL is invalid: ${styleUrl}` };
  }
  return { ok: true };
}

/**
 * Health probe for the Mapbox integration. A Mapbox token is required when
 * deployed (used by premium styles and geocoding); the registry enforces
 * this in dev so a missing token throws at boot instead of silently falling
 * back to the public CartoCDN style at runtime.
 */
export function getMapboxHealth(): { ok: boolean; reason?: string } {
  if (!hasMapboxToken()) {
    return { ok: false, reason: "VITE_MAPBOX_TOKEN is not set" };
  }
  if (MAPBOX_ACCESS_TOKEN.length < 20) {
    return { ok: false, reason: "VITE_MAPBOX_TOKEN looks malformed" };
  }
  return { ok: true };
}
