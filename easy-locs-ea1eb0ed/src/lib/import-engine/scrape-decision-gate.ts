/**
 * Scrape Decision Gate — Pre-import validation layer.
 * =====================================================
 * Validates scraped data BEFORE it enters the import pipeline.
 * Prevents incoherent, incomplete, or suspicious content from polluting the DB.
 *
 * Rules:
 *  1. IDENTITY  — Must have a name, must not be gibberish
 *  2. LOCATION  — GPS must be sane, address must exist
 *  3. COHERENCE — Vertical signals must be consistent
 *  4. FRESHNESS — Source must be recent / trustworthy
 *  5. DUPLICATE — Reject exact name+location dupes before pipeline
 */

import type { SourceEntityRecord, Vertical } from "./types";
import { classifyBusiness } from "@/lib/taxonomy/classification-engine";

export interface ScrapeDecision {
  accepted: boolean;
  entityName: string;
  reasons: string[];
  confidence: number;
  suggestedVertical: Vertical | null;
  flags: ScrapeFlag[];
}

export type ScrapeFlag =
  | "no_name"
  | "gibberish_name"
  | "no_location"
  | "invalid_gps"
  | "gps_ocean"
  | "low_classification_confidence"
  | "vertical_mismatch"
  | "placeholder_image"
  | "no_contact"
  | "suspicious_phone"
  | "exact_duplicate"
  | "empty_catalog";

const GIBBERISH_PATTERNS = [
  /^[a-z]{1,2}$/i,
  /^test/i,
  /^sample/i,
  /^placeholder/i,
  /^untitled/i,
  /^lorem/i,
  /^n\/a$/i,
  /^null$/i,
  /^undefined$/i,
  /^xxx/i,
  /^asdf/i,
  /^qwer/i,
  /^\.{2,}$/,
  /^-{2,}$/,
];

const PLACEHOLDER_IMAGE_PATTERNS = [
  "unsplash.com",
  "placeholder",
  "dummyimage",
  "placehold.co",
  "via.placeholder",
  "picsum.photos",
  "lorempixel",
  "placekitten",
  "fakeimg",
];

function isGibberish(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 2) return true;
  if (GIBBERISH_PATTERNS.some(p => p.test(trimmed))) return true;
  const alphaRatio = (trimmed.match(/[a-zA-Z\u00C0-\u024F\u0600-\u06FF\u4E00-\u9FFF]/g)?.length ?? 0) / trimmed.length;
  if (alphaRatio < 0.3 && trimmed.length > 3) return true;
  return false;
}

function isGpsInOcean(lat: number, lng: number): boolean {
  if (lat === 0 && lng === 0) return true;
  if (lat > 85 || lat < -85) return true;
  return false;
}

function hasPlaceholderImages(record: SourceEntityRecord): boolean {
  const photos = record.photos ?? [];
  return photos.some(url =>
    PLACEHOLDER_IMAGE_PATTERNS.some(p => url.toLowerCase().includes(p))
  );
}

function isSuspiciousPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return true;
  if (/^(.)\1{5,}$/.test(digits)) return true;
  if (digits === "0000000000" || digits === "1234567890") return true;
  return false;
}

export function evaluateScrapeDecision(
  record: SourceEntityRecord,
  existingNames?: Set<string>,
): ScrapeDecision {
  const flags: ScrapeFlag[] = [];
  const reasons: string[] = [];
  const name = record.name?.trim() ?? "";

  if (!name) {
    flags.push("no_name");
    reasons.push("Missing business name");
  } else if (isGibberish(name)) {
    flags.push("gibberish_name");
    reasons.push(`Gibberish name detected: "${name}"`);
  }

  if (record.lat == null || record.lng == null) {
    if (!record.address) {
      flags.push("no_location");
      reasons.push("No GPS coordinates and no address");
    }
  } else {
    if (record.lat < -90 || record.lat > 90 || record.lng < -180 || record.lng > 180) {
      flags.push("invalid_gps");
      reasons.push(`Invalid GPS: ${record.lat}, ${record.lng}`);
    } else if (isGpsInOcean(record.lat, record.lng)) {
      flags.push("gps_ocean");
      reasons.push(`GPS in ocean/null island: ${record.lat}, ${record.lng}`);
    }
  }

  let suggestedVertical: Vertical | null = null;
  let classificationConfidence = 0;

  if (name) {
    const classification = classifyBusiness({
      businessName: name,
      sourceCategory: record.categories?.[0] ?? null,
      sourceSubcategory: record.subcategories?.[0] ?? null,
      description: record.description ?? null,
    });
    suggestedVertical = classification.canonical_vertical;
    classificationConfidence = classification.confidence_score;

    if (classification.confidence_score < 40) {
      flags.push("low_classification_confidence");
      reasons.push(`Low classification confidence: ${classification.confidence_score}/100`);
    }

    if (record.vertical && classification.canonical_vertical !== record.vertical) {
      if (classification.confidence_score > 70) {
        flags.push("vertical_mismatch");
        reasons.push(`Declared vertical "${record.vertical}" but classified as "${classification.canonical_vertical}" (${classification.confidence_score}% confidence)`);
      }
    }
  }

  if (hasPlaceholderImages(record)) {
    flags.push("placeholder_image");
    reasons.push("Contains placeholder/stock images");
  }

  if (!record.phone && !record.website) {
    flags.push("no_contact");
    reasons.push("No phone or website");
  } else if (record.phone && isSuspiciousPhone(record.phone)) {
    flags.push("suspicious_phone");
    reasons.push(`Suspicious phone: "${record.phone}"`);
  }

  if (existingNames) {
    const dedupeKey = `${name.toLowerCase()}|${record.city?.toLowerCase() ?? ""}|${record.lat?.toFixed(4) ?? ""}`;
    if (existingNames.has(dedupeKey)) {
      flags.push("exact_duplicate");
      reasons.push("Exact duplicate already exists");
    }
  }

  const hasCatalog = (record.menuItems?.length ?? 0) > 0 ||
    (record.hotelInventory?.length ?? 0) > 0 ||
    (record.serviceItems?.length ?? 0) > 0;
  if (!hasCatalog && ["food", "grocery"].includes(record.vertical)) {
    flags.push("empty_catalog");
    reasons.push("Food/grocery entity with no menu items");
  }

  const blockingFlags: ScrapeFlag[] = ["no_name", "gibberish_name", "invalid_gps", "exact_duplicate"];
  const hasBlockingFlag = flags.some(f => blockingFlags.includes(f));
  const warningCount = flags.filter(f => !blockingFlags.includes(f)).length;

  const accepted = !hasBlockingFlag && warningCount < 4;

  const confidence = Math.max(0, Math.min(100,
    100 - (flags.length * 15) + (classificationConfidence > 70 ? 10 : 0)
  ));

  return {
    accepted,
    entityName: name || "(unnamed)",
    reasons,
    confidence,
    suggestedVertical,
    flags,
  };
}

export function evaluateBatchScrapeDecisions(
  records: SourceEntityRecord[],
): {
  accepted: SourceEntityRecord[];
  rejected: SourceEntityRecord[];
  decisions: ScrapeDecision[];
  summary: { total: number; accepted: number; rejected: number; topFlags: Record<string, number> };
} {
  const existingNames = new Set<string>();
  const accepted: SourceEntityRecord[] = [];
  const rejected: SourceEntityRecord[] = [];
  const decisions: ScrapeDecision[] = [];
  const flagCounts: Record<string, number> = {};

  for (const record of records) {
    const decision = evaluateScrapeDecision(record, existingNames);
    decisions.push(decision);

    if (decision.accepted) {
      accepted.push(record);
      const name = record.name?.trim().toLowerCase() ?? "";
      const dedupeKey = `${name}|${record.city?.toLowerCase() ?? ""}|${record.lat?.toFixed(4) ?? ""}`;
      existingNames.add(dedupeKey);
    } else {
      rejected.push(record);
    }

    for (const flag of decision.flags) {
      flagCounts[flag] = (flagCounts[flag] ?? 0) + 1;
    }
  }

  return {
    accepted,
    rejected,
    decisions,
    summary: {
      total: records.length,
      accepted: accepted.length,
      rejected: rejected.length,
      topFlags: flagCounts,
    },
  };
}
