/**
 * Entity Resolution Engine — Determines if two source records refer to
 * the same real-world entity before merging.
 * Uses weighted multi-signal matching (name, phone, GPS, domain, address).
 */

export interface EntitySignals {
  name: string;
  phone?: string | null;
  domain?: string | null;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  brand?: string | null;
  district?: string | null;
  sourceKey?: string | null;
}

export interface ResolutionResult {
  isSameEntity: boolean;
  confidence: number; // 0-100
  signals: Record<string, { matched: boolean; weight: number }>;
  isFranchiseBranch: boolean;
}

const WEIGHTS = {
  gps: 30,
  name: 25,
  phone: 20,
  address: 10,
  sourceKey: 10,
  domain: 5,
};

const GPS_SAME_THRESHOLD_M = 150;
const AUTO_MERGE_THRESHOLD = 95;
const REVIEW_THRESHOLD = 70;

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeName(n: string): string {
  return n
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\b(restaurant|llc|inc|fzco|fze|ltd|co|company)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePhone(p: string): string {
  return p.replace(/[^0-9]/g, "").slice(-9);
}

function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  // Simple token overlap
  const ta = new Set(na.split(" "));
  const tb = new Set(nb.split(" "));
  const intersection = [...ta].filter((t) => tb.has(t)).length;
  const union = new Set([...ta, ...tb]).size;
  return union === 0 ? 0 : intersection / union;
}

export function resolveEntities(a: EntitySignals, b: EntitySignals): ResolutionResult {
  const signals: Record<string, { matched: boolean; weight: number }> = {};
  let score = 0;

  // Name
  const nameSim = nameSimilarity(a.name, b.name);
  const nameMatch = nameSim >= 0.7;
  signals.name = { matched: nameMatch, weight: WEIGHTS.name };
  if (nameMatch) score += WEIGHTS.name * nameSim;

  // Phone
  if (a.phone && b.phone) {
    const match = normalizePhone(a.phone) === normalizePhone(b.phone);
    signals.phone = { matched: match, weight: WEIGHTS.phone };
    if (match) score += WEIGHTS.phone;
  }

  // GPS
  let gpsDistance = Infinity;
  if (a.lat != null && a.lng != null && b.lat != null && b.lng != null) {
    gpsDistance = haversineDistance(a.lat, a.lng, b.lat, b.lng);
    const match = gpsDistance <= GPS_SAME_THRESHOLD_M;
    signals.gps = { matched: match, weight: WEIGHTS.gps };
    if (match) score += WEIGHTS.gps;
  }

  // Address
  if (a.address && b.address) {
    const match = normalizeName(a.address) === normalizeName(b.address);
    signals.address = { matched: match, weight: WEIGHTS.address };
    if (match) score += WEIGHTS.address;
  }

  // Source key
  if (a.sourceKey && b.sourceKey) {
    const match = a.sourceKey === b.sourceKey;
    signals.sourceKey = { matched: match, weight: WEIGHTS.sourceKey };
    if (match) score += WEIGHTS.sourceKey;
  }

  // Domain
  if (a.domain && b.domain) {
    const match = a.domain.replace(/^www\./, "") === b.domain.replace(/^www\./, "");
    signals.domain = { matched: match, weight: WEIGHTS.domain };
    if (match) score += WEIGHTS.domain;
  }

  // Franchise detection: same brand name but different location
  const isFranchiseBranch =
    nameMatch && a.brand === b.brand && !!a.brand && gpsDistance > GPS_SAME_THRESHOLD_M;

  return {
    isSameEntity: score >= AUTO_MERGE_THRESHOLD ? true : score >= REVIEW_THRESHOLD ? false : false,
    confidence: Math.min(Math.round(score), 100),
    signals,
    isFranchiseBranch,
  };
}

export { AUTO_MERGE_THRESHOLD, REVIEW_THRESHOLD };
