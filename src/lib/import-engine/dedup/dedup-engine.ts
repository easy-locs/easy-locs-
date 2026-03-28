/**
 * Dedup Engine — Multi-signal entity deduplication.
 * Matches on: name, phone, address, GPS, website, images, menus.
 */
import type { SourceEntityRecord, DedupMatch } from "../types";

// ─── Normalizers ───
function normName(n: string): string {
  return n.toLowerCase()
    .replace(/deliveroo|talabat|careem|booking|noon|expedia/gi, "")
    .replace(/[()|•·'"`\-]/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normPhone(p: string): string {
  return p.replace(/[^0-9+]/g, "");
}

function normDomain(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace("www.", "");
  } catch {
    return url.toLowerCase().trim();
  }
}

function normAddress(a: string): string {
  return a.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
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

  // Name (0.30)
  if (a.name && b.name && normName(a.name) === normName(b.name)) {
    matchedOn.push("name");
    score += 0.30;
  }

  // Phone (0.20)
  if (a.phone && b.phone && normPhone(a.phone) === normPhone(b.phone)) {
    matchedOn.push("phone");
    score += 0.20;
  }

  // Address (0.10)
  if (a.address && b.address && normAddress(a.address) === normAddress(b.address)) {
    matchedOn.push("address");
    score += 0.10;
  }

  // GPS proximity < 100m (0.25)
  if (a.lat != null && a.lng != null && b.lat != null && b.lng != null) {
    const dist = haversineMeters(a.lat, a.lng, b.lat, b.lng);
    if (dist < 100) {
      matchedOn.push("geo");
      score += 0.25;
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
