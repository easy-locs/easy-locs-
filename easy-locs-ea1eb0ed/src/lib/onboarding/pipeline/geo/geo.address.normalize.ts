/**
 * geo.address.normalize — Normalizes raw address text.
 * ONE thing: clean and standardize address string.
 */
import type { GeoNormalizedAddress } from "../contracts";

const STRIP = /deliveroo|talabat|careem|booking|noon/gi;

export function normalizeAddress(raw: string | null | undefined): GeoNormalizedAddress | null {
  if (!raw?.trim()) return null;
  const cleaned = raw
    .replace(STRIP, " ")
    .replace(/[_|•·]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  return { input: raw, normalized: cleaned, confidence: cleaned.length > 10 ? 0.8 : 0.5 };
}
