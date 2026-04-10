/**
 * MICRON: normalizePosition — Standardizes a geo position to canonical format.
 */
import type { CanonicalGeoPosition } from "@/domains/shared/canonical-types";
import { isValidCoordinate } from "../atoms/clamp-zoom.atom";

export function normalizePosition(lat: number, lng: number, accuracy?: number | null): CanonicalGeoPosition {
  if (!isValidCoordinate(lat, lng)) {
    throw new Error(`Invalid coordinates: ${lat}, ${lng}`);
  }
  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    accuracy: accuracy ?? null,
    updatedAt: new Date().toISOString(),
  };
}
