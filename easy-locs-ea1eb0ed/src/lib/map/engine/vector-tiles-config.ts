/**
 * Vector tiles adaptive configuration.
 *
 * Selects best-suited vector tile sources based on:
 *   - WebGL2 capability
 *   - Device pixel ratio (HiDPI)
 *   - Network conditions (Save-Data / effective connection type)
 *   - Reduced data preference
 *
 * Sources are CDN-hosted (CartoCDN by default) and can be swapped for a
 * self-hosted Tileserver-GL via `setTilesProvider`.
 *
 * Tiles are cacheable by the service worker — we set a stable `tiles` URL
 * scheme so the SW can match on it (see `tile-cache-sw-helpers.ts`).
 */

import type { MapStylePreset } from "./types";

export interface VectorTilesProvider {
  id: string;
  styleUrls: Record<MapStylePreset, string>;
  /** Returns the high-DPI variant URL if the provider supports @2x, else null. */
  hiDpiUrl?: (url: string) => string | null;
}

const CARTO: VectorTilesProvider = {
  id: "carto",
  styleUrls: {
    dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    satellite: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
    premium: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  },
  hiDpiUrl: (url) => url,
};

let activeProvider: VectorTilesProvider = CARTO;

export function setTilesProvider(provider: VectorTilesProvider) {
  activeProvider = provider;
}

export function getTilesProvider(): VectorTilesProvider {
  return activeProvider;
}

export function isWebGL2Supported(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!canvas.getContext("webgl2");
  } catch {
    return false;
  }
}

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  downlink?: number;
}

export function getNetworkProfile(): "low" | "medium" | "high" {
  if (typeof navigator === "undefined") return "high";
  const conn = (navigator as unknown as { connection?: NetworkInformationLike })
    .connection;
  if (!conn) return "high";
  if (conn.saveData) return "low";
  switch (conn.effectiveType) {
    case "slow-2g":
    case "2g":
      return "low";
    case "3g":
      return "medium";
    case "4g":
    default:
      return "high";
  }
}

export interface AdaptiveStyleResult {
  styleUrl: string;
  /** Recommended max zoom honoring tile budget for current network. */
  maxZoom: number;
  /** Whether to enable 3D / extrusions for this session. */
  allow3D: boolean;
  /** Whether to enable terrain DEM. */
  allowTerrain: boolean;
  /** Pixel ratio cap to avoid GPU thrash on HiDPI screens. */
  pixelRatioCap: number;
  webgl2: boolean;
  network: "low" | "medium" | "high";
}

export function resolveAdaptiveStyle(
  preset: MapStylePreset,
): AdaptiveStyleResult {
  const provider = getTilesProvider();
  const baseUrl = provider.styleUrls[preset] ?? provider.styleUrls.dark;
  const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const network = getNetworkProfile();
  const webgl2 = isWebGL2Supported();

  const styleUrl = dpr >= 2 && provider.hiDpiUrl
    ? (provider.hiDpiUrl(baseUrl) ?? baseUrl)
    : baseUrl;

  return {
    styleUrl,
    maxZoom: network === "low" ? 16 : 19,
    allow3D: webgl2 && network !== "low",
    allowTerrain: webgl2 && network === "high",
    pixelRatioCap: network === "low" ? 1 : Math.min(dpr, 2),
    webgl2,
    network,
  };
}
