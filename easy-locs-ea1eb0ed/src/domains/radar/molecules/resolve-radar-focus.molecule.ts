/**
 * MOLECULE: resolveRadarFocus — Computes a focused radar view for an entity.
 */
import { normalizePosition } from "../microns/normalize-position.micron";
import { clampZoom } from "../atoms/clamp-zoom.atom";
import type { CanonicalGeoPosition } from "@/domains/shared/canonical-types";

export interface RadarFocus {
  center: CanonicalGeoPosition;
  zoom: number;
  label: string;
}

export function resolveRadarFocus(lat: number, lng: number, label: string, zoom = 14): RadarFocus {
  return {
    center: normalizePosition(lat, lng),
    zoom: clampZoom(zoom),
    label,
  };
}
