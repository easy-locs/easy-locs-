/**
 * geo-conflict-engine — Detects and resolves geo conflicts
 * when multiple sources provide different coordinates for the same entity.
 * Single writer strategy: best source wins.
 */
import type { CanonicalGeoEntity } from "@/lib/domains/canonical-entities";

export interface GeoCandidate {
  source: string;
  geo: CanonicalGeoEntity;
}

/** Source priority (higher = more trusted) */
const SOURCE_PRIORITY: Record<string, number> = {
  gps: 100,
  manual_pin: 90,
  google_places: 85,
  osm: 75,
  deliveroo: 70,
  talabat: 65,
  careem: 60,
  noon: 55,
  web: 50,
  ip_fallback: 10,
  default: 0,
};

function getPriority(source: string): number {
  return SOURCE_PRIORITY[source] ?? 30;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export interface GeoConflictResult {
  winner: CanonicalGeoEntity;
  conflictsDetected: number;
  maxDeviationKm: number;
  sources: string[];
}

/** Resolve geo from multiple candidates. Best source + highest confidence wins. */
export function resolveGeoConflict(candidates: GeoCandidate[]): GeoConflictResult {
  if (!candidates.length) {
    throw new Error("No geo candidates provided");
  }
  if (candidates.length === 1) {
    return {
      winner: candidates[0].geo,
      conflictsDetected: 0,
      maxDeviationKm: 0,
      sources: [candidates[0].source],
    };
  }

  // Sort by priority desc, then confidence desc
  const sorted = [...candidates].sort((a, b) => {
    const pa = getPriority(a.source);
    const pb = getPriority(b.source);
    if (pb !== pa) return pb - pa;
    return b.geo.confidence - a.geo.confidence;
  });

  const winner = sorted[0].geo;

  // Compute max deviation
  let maxDev = 0;
  for (let i = 1; i < sorted.length; i++) {
    const d = haversineKm(winner, sorted[i].geo);
    if (d > maxDev) maxDev = d;
  }

  // Conflicts = entries > 500m from winner
  const conflicts = sorted.filter((c, i) =>
    i > 0 && haversineKm(winner, c.geo) > 0.5
  ).length;

  return {
    winner: {
      ...winner,
      sourceProvenance: sorted[0].source,
    },
    conflictsDetected: conflicts,
    maxDeviationKm: Math.round(maxDev * 100) / 100,
    sources: sorted.map(s => s.source),
  };
}
