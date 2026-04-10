/**
 * Dedup Engine — Multi-signal entity deduplication.
 * Matches on: name, phone, address, GPS, website, images, menus.
 * Enhanced with fuzzy matching, n-gram similarity, and country-specific normalization.
 */
import type { SourceEntityRecord, DedupMatch } from "../types";

// ─── Normalizers ───
const PROVIDER_NOISE = /deliveroo|talabat|careem|booking|noon|expedia|zomato|uber\s*eats|just\s*eat|grubhub|doordash|glovo|foodpanda|swiggy|bolt\s*food|wolt/gi;
const PUNCTUATION = /[()|•·'"`\-—–_\/\\]/g;
const ARABIC_ARTICLE = /^(ال|مطعم|مقهى|صيدلية|بقالة)\s*/;
const ARTICLES = /^(the|le|la|les|el|al|das|der|die|il|lo)\s+/i;

function normName(n: string): string {
  return n.toLowerCase()
    .replace(PROVIDER_NOISE, "")
    .replace(PUNCTUATION, " ")
    .replace(ARABIC_ARTICLE, "")
    .replace(ARTICLES, "")
    .replace(/[^a-z0-9\s\u0600-\u06FF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normPhone(p: string): string {
  let cleaned = p.replace(/[^0-9+]/g, "");
  cleaned = cleaned.replace(/^\+971/, "0").replace(/^\+33/, "0").replace(/^\+44/, "0")
    .replace(/^\+1/, "").replace(/^\+49/, "0").replace(/^\+91/, "0")
    .replace(/^\+966/, "0").replace(/^\+20/, "0").replace(/^\+234/, "0");
  return cleaned;
}

function normDomain(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace("www.", "");
  } catch {
    return url.toLowerCase().trim();
  }
}

function normAddress(a: string): string {
  return a.toLowerCase()
    .replace(PROVIDER_NOISE, "")
    .replace(/[^a-z0-9\u0600-\u06FF]/g, "")
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  if (a.length > 50 || b.length > 50) {
    return a === b ? 0 : Math.max(a.length, b.length);
  }

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[b.length][a.length];
}

function nameSimilarity(a: string, b: string): number {
  const na = normName(a);
  const nb = normName(b);
  if (na === nb) return 1.0;
  if (!na || !nb) return 0;

  if (na.includes(nb) || nb.includes(na)) return 0.85;

  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 0;
  const dist = levenshteinDistance(na, nb);
  const similarity = 1 - dist / maxLen;
  return Math.max(0, similarity);
}

// ─── Geo ───
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Image fingerprint (URL-based) ───
function normImageUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function imageOverlap(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a.map(normImageUrl));
  const overlap = b.filter(img => setA.has(normImageUrl(img))).length;
  return overlap / Math.min(a.length, b.length);
}

// ─── Menu fingerprint ───
function menuFingerprint(items: Array<Record<string, unknown>>): Set<string> {
  return new Set(items.map(i => normName(String(i.name || ""))).filter(Boolean));
}

function menuOverlap(a: Array<Record<string, unknown>>, b: Array<Record<string, unknown>>): number {
  const fpA = menuFingerprint(a);
  const fpB = menuFingerprint(b);
  if (!fpA.size || !fpB.size) return 0;
  let overlap = 0;
  for (const item of fpA) {
    if (fpB.has(item)) overlap++;
  }
  return overlap / Math.min(fpA.size, fpB.size);
}

// ─── Core Dedup ───
export function computeDedupScore(a: SourceEntityRecord, b: SourceEntityRecord): DedupMatch | null {
  const matchedOn: string[] = [];
  let score = 0;

  // Name — exact match (0.30) or fuzzy match (0.15–0.25)
  if (a.name && b.name) {
    const sim = nameSimilarity(a.name, b.name);
    if (sim >= 0.95) {
      matchedOn.push("name");
      score += 0.30;
    } else if (sim >= 0.75) {
      matchedOn.push("name");
      score += 0.15 + (sim - 0.75) * 0.4;
    }
  }

  // Phone — country-normalized (0.20)
  if (a.phone && b.phone) {
    const pa = normPhone(a.phone);
    const pb = normPhone(b.phone);
    if (pa.length >= 7 && pb.length >= 7 && pa === pb) {
      matchedOn.push("phone");
      score += 0.20;
    } else if (pa.length >= 7 && pb.length >= 7 && (pa.endsWith(pb.slice(-7)) || pb.endsWith(pa.slice(-7)))) {
      matchedOn.push("phone_partial");
      score += 0.12;
    }
  }

  // Address — normalized (0.10)
  if (a.address && b.address) {
    const aa = normAddress(a.address);
    const ab = normAddress(b.address);
    if (aa === ab) {
      matchedOn.push("address");
      score += 0.10;
    } else if (aa.length > 10 && ab.length > 10 && (aa.includes(ab.slice(0, 15)) || ab.includes(aa.slice(0, 15)))) {
      matchedOn.push("address_partial");
      score += 0.05;
    }
  }

  // GPS proximity: < 50m (0.25), < 100m (0.20), < 200m (0.10)
  if (a.lat != null && a.lng != null && b.lat != null && b.lng != null) {
    const dist = haversineMeters(a.lat, a.lng, b.lat, b.lng);
    if (dist < 50) {
      matchedOn.push("geo");
      score += 0.25;
    } else if (dist < 100) {
      matchedOn.push("geo");
      score += 0.20;
    } else if (dist < 200) {
      matchedOn.push("geo");
      score += 0.10;
    }
  }

  // Website (0.10)
  if (a.website && b.website && normDomain(a.website) === normDomain(b.website)) {
    matchedOn.push("website");
    score += 0.10;
  }

  // Images overlap > 30% (0.05)
  if ((a.photos?.length ?? 0) > 0 && (b.photos?.length ?? 0) > 0) {
    if (imageOverlap(a.photos!, b.photos!) > 0.3) {
      matchedOn.push("images");
      score += 0.05;
    }
  }

  // Menu overlap > 40% (0.05)
  if ((a.menuItems?.length ?? 0) > 0 && (b.menuItems?.length ?? 0) > 0) {
    if (menuOverlap(a.menuItems!, b.menuItems!) > 0.4) {
      matchedOn.push("menu");
      score += 0.05;
    }
  }

  if (score >= 0.45) {
    return {
      entityA: a.sourceEntityId,
      entityB: b.sourceEntityId,
      confidence: Math.min(1, score),
      matchedOn,
    };
  }
  return null;
}

/**
 * Detect all duplicate pairs in a set of records.
 */
export function detectDuplicates(records: SourceEntityRecord[]): DedupMatch[] {
  const matches: DedupMatch[] = [];
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const match = computeDedupScore(records[i], records[j]);
      if (match) matches.push(match);
    }
  }
  return matches;
}

/**
 * Group records into clusters based on dedup matches.
 */
export function groupByDuplicates(records: SourceEntityRecord[], matches: DedupMatch[]): SourceEntityRecord[][] {
  const idToGroup = new Map<string, number>();
  const groups: SourceEntityRecord[][] = [];

  for (const r of records) {
    if (!idToGroup.has(r.sourceEntityId)) {
      idToGroup.set(r.sourceEntityId, groups.length);
      groups.push([r]);
    }
  }

  for (const m of matches) {
    const gA = idToGroup.get(m.entityA);
    const gB = idToGroup.get(m.entityB);
    if (gA !== undefined && gB !== undefined && gA !== gB) {
      groups[gA].push(...groups[gB]);
      for (const r of groups[gB]) {
        idToGroup.set(r.sourceEntityId, gA);
      }
      groups[gB] = [];
    }
  }

  return groups.filter(g => g.length > 0);
}
