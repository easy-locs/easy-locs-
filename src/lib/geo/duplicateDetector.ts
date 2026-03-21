/**
 * duplicateDetector — Detect duplicate businesses by name similarity + geo proximity.
 * Prevents polluted rankings and map clutter.
 */
import { haversine } from "@/lib/geo/haversine";

export interface DuplicateCandidate {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  phone?: string | null;
}

export interface DuplicateResult {
  isDuplicate: boolean;
  score: number; // 0-1
  matchedId: string | null;
  reasons: string[];
}

const DUPLICATE_THRESHOLD = 0.65;

/** Normalize name for comparison */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Simple string similarity (Dice coefficient) */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigrams = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) {
    const bi = a.substring(i, i + 2);
    bigrams.set(bi, (bigrams.get(bi) || 0) + 1);
  }

  let matches = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bi = b.substring(i, i + 2);
    const count = bigrams.get(bi) || 0;
    if (count > 0) {
      matches++;
      bigrams.set(bi, count - 1);
    }
  }

  return (2 * matches) / (a.length + b.length - 2);
}

/** Check if a new entry is a duplicate of any existing entries */
export function detectDuplicate(
  candidate: DuplicateCandidate,
  existing: DuplicateCandidate[]
): DuplicateResult {
  const normName = normalizeName(candidate.name);
  let bestScore = 0;
  let bestMatch: string | null = null;
  const reasons: string[] = [];

  for (const entry of existing) {
    if (entry.id === candidate.id) continue;

    let score = 0;
    const entryReasons: string[] = [];

    // Name similarity (weight: 0.5)
    const nameSim = similarity(normName, normalizeName(entry.name));
    score += nameSim * 0.5;
    if (nameSim > 0.7) entryReasons.push(`name_match:${(nameSim * 100).toFixed(0)}%`);

    // Geo proximity (weight: 0.3) — < 50m = high match
    if (candidate.lat && candidate.lng && entry.lat && entry.lng) {
      const distKm = haversine(candidate.lat, candidate.lng, entry.lat, entry.lng);
      const distM = distKm * 1000;
      if (distM < 50) {
        score += 0.3;
        entryReasons.push(`geo_proximity:${Math.round(distM)}m`);
      } else if (distM < 200) {
        score += 0.15;
        entryReasons.push(`geo_nearby:${Math.round(distM)}m`);
      }
    }

    // Phone match (weight: 0.2)
    if (candidate.phone && entry.phone) {
      const cleanA = candidate.phone.replace(/\D/g, "").slice(-8);
      const cleanB = entry.phone.replace(/\D/g, "").slice(-8);
      if (cleanA.length >= 6 && cleanA === cleanB) {
        score += 0.2;
        entryReasons.push("phone_match");
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry.id;
      reasons.length = 0;
      reasons.push(...entryReasons);
    }
  }

  return {
    isDuplicate: bestScore >= DUPLICATE_THRESHOLD,
    score: Math.round(bestScore * 100) / 100,
    matchedId: bestScore >= DUPLICATE_THRESHOLD ? bestMatch : null,
    reasons,
  };
}
