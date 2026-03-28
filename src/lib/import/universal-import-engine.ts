/**
 * Universal Import Engine — Taxonomy-aware pipeline.
 * SOURCE → ADAPTER → NORMALIZER → CANONICAL → DEDUP → MERGE → QUALITY → STORE → PROJECTION
 * 
 * Each source adapter is independent, versioned, and activable/deactivable.
 * The canonical entity model is the single source of truth.
 */

import type { Vertical, SourceName, SourceEntityRecord, CanonicalOnboardingRecord } from "@/lib/onboarding/types";

// ─── Canonical Universal Entity ───
export interface UniversalEntity {
  id: string;
  type: Vertical;
  name: string;
  description: string | null;
  geo: {
    lat: number | null;
    lng: number | null;
    country: string | null;
    city: string | null;
    area: string | null;
    address: string | null;
  };
  contact: {
    phone: string | null;
    email: string | null;
    website: string | null;
  };
  media: {
    images: string[];
    videos: string[];
  };
  taxonomy: {
    family: string;
    category: string | null;
    subcategory: string | null;
    subSubcategory: string | null;
    tags: string[];
  };
  catalog: Array<Record<string, unknown>>;
  rating: number | null;
  reviewCount: number | null;
  openingHours: Record<string, unknown> | null;
  priceRange: string | null;
  sourceMetadata: SourceMetadataEntry[];
  qualityScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface SourceMetadataEntry {
  source: SourceName;
  sourceEntityId: string;
  fetchedAt: string;
  confidence: number;
  url: string | null;
}

// ─── Dedup Engine ───
export interface DedupMatch {
  entityA: string;
  entityB: string;
  confidence: number;
  matchedOn: string[];
}

export function detectDuplicates(records: SourceEntityRecord[]): DedupMatch[] {
  const matches: DedupMatch[] = [];
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const a = records[i];
      const b = records[j];
      const matchedOn: string[] = [];
      let score = 0;

      // Name similarity (simple normalized comparison)
      if (a.name && b.name && normalizeName(a.name) === normalizeName(b.name)) {
        matchedOn.push("name");
        score += 0.4;
      }

      // Geo proximity (within ~100m)
      if (a.lat && a.lng && b.lat && b.lng) {
        const dist = haversineMeters(a.lat, a.lng, b.lat, b.lng);
        if (dist < 100) { matchedOn.push("geo"); score += 0.3; }
      }

      // Phone match
      if (a.phone && b.phone && normalizePhone(a.phone) === normalizePhone(b.phone)) {
        matchedOn.push("phone");
        score += 0.2;
      }

      // Website match
      if (a.website && b.website && normalizeDomain(a.website) === normalizeDomain(b.website)) {
        matchedOn.push("website");
        score += 0.1;
      }

      if (score >= 0.5) {
        matches.push({ entityA: a.sourceEntityId, entityB: b.sourceEntityId, confidence: Math.min(1, score), matchedOn });
      }
    }
  }
  return matches;
}

// ─── Merge Engine ───
export interface MergeResult {
  merged: CanonicalOnboardingRecord;
  mergeHistory: Array<{ field: string; chosenSource: string; reason: string }>;
}

export function mergeRecords(records: SourceEntityRecord[], vertical: Vertical): MergeResult {
  const history: MergeResult["mergeHistory"] = [];
  const primary = records[0];

  // Pick best value per field using source priority
  const pickBest = (field: keyof SourceEntityRecord, sources: SourceEntityRecord[]): any => {
    for (const s of sources) {
      const val = s[field];
      if (val !== null && val !== undefined && val !== "") {
        history.push({ field: String(field), chosenSource: s.source, reason: "first-non-empty" });
        return val;
      }
    }
    return null;
  };

  const merged: CanonicalOnboardingRecord = {
    entityId: primary.sourceEntityId,
    vertical,
    canonicalName: pickBest("name", records),
    branchName: pickBest("branchName", records),
    address: pickBest("address", records),
    city: pickBest("city", records),
    district: pickBest("district", records),
    country: pickBest("country", records),
    lat: pickBest("lat", records),
    lng: pickBest("lng", records),
    phone: pickBest("phone", records),
    website: pickBest("website", records),
    categories: records.flatMap(r => r.categories || []).filter((v, i, a) => a.indexOf(v) === i),
    subcategories: records.flatMap(r => r.subcategories || []).filter((v, i, a) => a.indexOf(v) === i),
    openingHours: pickBest("openingHours", records),
    menuItems: deduplicateByName(records.flatMap(r => r.menuItems || [])),
    hotelInventory: records.flatMap(r => r.hotelInventory || []),
    serviceItems: records.flatMap(r => r.serviceItems || []),
    photos: records.flatMap(r => r.photos || []).filter((v, i, a) => a.indexOf(v) === i),
    rating: Math.max(...records.map(r => r.rating || 0)),
    reviewCount: records.reduce((s, r) => s + (r.reviewCount || 0), 0),
    sourceProofs: records.map(r => ({
      source: r.source,
      field: "entity",
      value: r.sourceEntityId,
      confidence: 0.7,
      fetchedAt: new Date().toISOString(),
      url: r.sourceUrl || null,
    })),
    mergeConfidence: records.length > 1 ? 0.8 : 0.5,
    missingFields: [],
    needsReview: false,
  };

  // Compute missing fields
  const required = ["canonicalName", "city", "country"] as const;
  merged.missingFields = required.filter(f => !merged[f]);
  merged.needsReview = merged.missingFields.length > 0 || merged.mergeConfidence < 0.6;

  return { merged, mergeHistory: history };
}

// ─── Quality Scoring Engine ───
export interface QualityReport {
  score: number;
  completeness: number;
  media: number;
  location: number;
  catalog: number;
  trust: number;
  details: string[];
}

export function scoreQuality(record: CanonicalOnboardingRecord): QualityReport {
  const details: string[] = [];
  let completeness = 0, media = 0, location = 0, catalog = 0, trust = 0;

  // Completeness (0-100)
  const fields = ["canonicalName", "city", "country", "phone", "website", "address"] as const;
  const filled = fields.filter(f => !!record[f]).length;
  completeness = Math.round((filled / fields.length) * 100);

  // Media (0-100)
  media = Math.min(100, record.photos.length * 20);
  if (media === 0) details.push("No photos");

  // Location (0-100)
  if (record.lat && record.lng) location = 80;
  if (record.address) location += 10;
  if (record.city) location += 10;
  if (!record.lat) details.push("No coordinates");

  // Catalog (0-100)
  const catalogItems = record.menuItems.length + record.hotelInventory.length + record.serviceItems.length;
  catalog = Math.min(100, catalogItems * 10);
  if (catalogItems === 0) details.push("No catalog items");

  // Trust (0-100)
  trust = Math.min(100, record.sourceProofs.length * 30);
  if (record.rating && record.rating >= 4) trust += 20;

  const score = Math.round((completeness * 0.3 + media * 0.15 + location * 0.25 + catalog * 0.15 + trust * 0.15));

  return { score, completeness, media, location, catalog, trust, details };
}

// ─── Helpers ───
function normalizeName(n: string): string {
  return n.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

function normalizePhone(p: string): string {
  return p.replace(/[^0-9+]/g, "");
}

function normalizeDomain(url: string): string {
  try { return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace("www.", ""); } catch { return url; }
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function deduplicateByName(items: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = normalizeName(String(item.name || ""));
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
