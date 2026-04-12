import { isQuarantined } from "./quarantine";
import type { ProtectedSurface, EntityClassification } from "./types";
import { isSuppressedFromSurface, shouldShowOnSurface } from "./engines/live-surface-sanitizer-engine";
import { isSearchExcluded, isSearchDowngraded } from "./engines/search-hygiene-engine";
import { getEntityQualityScore, getEntityTrustLevel } from "./engines/data-quality-scoring-engine";

export interface SurfaceFilterOptions {
  surface: ProtectedSurface;
  minQualityScore?: number;
  allowDowngraded?: boolean;
}

export function filterForSurface<T extends { id: string }>(
  entities: T[],
  options: SurfaceFilterOptions
): T[] {
  try {
    return entities.filter((entity) => {
      if (isQuarantined(entity.id)) return false;
      if (isSuppressedFromSurface(entity.id)) return false;
      return shouldShowOnSurface(entity.id, options.surface);
    });
  } catch {
    return entities;
  }
}

export function filterForSearch<T extends { id: string }>(entities: T[]): T[] {
  try {
    return entities.filter((entity) => {
      if (isQuarantined(entity.id)) return false;
      if (isSearchExcluded(entity.id)) return false;
      return true;
    });
  } catch {
    return entities;
  }
}

export function getSearchRankingPenalty(entityId: string): number {
  try {
    if (isSearchDowngraded(entityId)) return 0.5;
    const score = getEntityQualityScore(entityId);
    if (score < 50) return 0.3;
    if (score < 70) return 0.7;
    return 1.0;
  } catch {
    return 1.0;
  }
}

export function isEntitySafeForDisplay(entityId: string): boolean {
  try {
    if (isQuarantined(entityId)) return false;
    if (isSuppressedFromSurface(entityId)) return false;
    const trust = getEntityTrustLevel(entityId);
    return trust !== "quarantined" && trust !== "untrusted";
  } catch {
    return true;
  }
}

export function getEntityDisplayStatus(entityId: string): {
  safe: boolean;
  quarantined: boolean;
  suppressed: boolean;
  searchExcluded: boolean;
  qualityScore: number;
  trustLevel: string;
} {
  try {
    return {
      safe: isEntitySafeForDisplay(entityId),
      quarantined: isQuarantined(entityId),
      suppressed: isSuppressedFromSurface(entityId),
      searchExcluded: isSearchExcluded(entityId),
      qualityScore: getEntityQualityScore(entityId),
      trustLevel: getEntityTrustLevel(entityId),
    };
  } catch {
    return {
      safe: true,
      quarantined: false,
      suppressed: false,
      searchExcluded: false,
      qualityScore: 100,
      trustLevel: "unknown",
    };
  }
}
