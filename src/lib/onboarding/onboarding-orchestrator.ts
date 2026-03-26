/**
 * Onboarding Orchestrator — Master pipeline coordinator.
 * Runs the full vertical-aware multi-source onboarding sequence.
 */
import { getPolicy } from "./source-policy.engine";
import { CONNECTOR_REGISTRY } from "./connectors/index";
import { groupEntities } from "./entity-resolution.engine";
import { mergeEntityRecords } from "./field-merge.engine";
import { fillMissingWithWebFallback } from "./web-fallback.engine";
import { scoreOnboardingQuality } from "./onboarding-quality.engine";
import { evaluatePublishGate } from "./publish-gate.engine";
import type {
  CanonicalOnboardingRecord,
  SourceEntityRecord,
  Vertical,
} from "./types";

export interface OnboardingRequest {
  vertical: Vertical;
  name?: string;
  city?: string;
  district?: string;
  country?: string;
  website?: string;
  phone?: string;
  query?: string;
}

export interface OnboardingPipelineResult {
  canonical: CanonicalOnboardingRecord[];
  publish: Array<{
    entityId: string;
    allowed: boolean;
    targetVisibility: "draft" | "public";
    reasons: string[];
    qualityScore: number;
  }>;
}

function normalizeText(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value
    .replace(/deliveroo|talabat|careem|booking|noon/gi, " ")
    .replace(/[_|]+/g, " ")
    .replace(/[•·]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return null;

  return normalized
    .split(" ")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function dedupePhotos(photos: string[]) {
  const seen = new Set<string>();
  return photos.filter((photo) => {
    const key = photo.replace(/[?#].*$/, "").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeNamedItems(items: Array<Record<string, unknown>>) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const rawName = [item.name, item.title, item.label, item.room_type]
      .find((value) => typeof value === "string" && value.trim().length > 0);
    const normalizedName = typeof rawName === "string" ? normalizeText(rawName)?.toLowerCase() : null;
    if (!normalizedName || normalizedName.length < 2 || /^(item|menu|product|test|undefined|null)$/i.test(normalizedName) || seen.has(normalizedName)) return false;
    seen.add(normalizedName);

    if (typeof item.name === "string") item.name = normalizeText(item.name) ?? item.name;
    if (typeof item.title === "string") item.title = normalizeText(item.title) ?? item.title;
    if (typeof item.label === "string") item.label = normalizeText(item.label) ?? item.label;
    if (typeof item.room_type === "string") item.room_type = normalizeText(item.room_type) ?? item.room_type;
    return true;
  });
}

function sanitizeCanonicalRecord(record: CanonicalOnboardingRecord): CanonicalOnboardingRecord {
  return {
    ...record,
    canonicalName: normalizeText(record.canonicalName),
    branchName: normalizeText(record.branchName),
    address: normalizeText(record.address),
    city: normalizeText(record.city),
    district: normalizeText(record.district),
    country: normalizeText(record.country),
    photos: dedupePhotos(record.photos),
    categories: Array.from(new Set(record.categories.map((item) => normalizeText(item) ?? "").filter(Boolean))),
    subcategories: Array.from(new Set(record.subcategories.map((item) => normalizeText(item) ?? "").filter(Boolean))),
    menuItems: dedupeNamedItems([...record.menuItems]),
    hotelInventory: dedupeNamedItems([...record.hotelInventory]),
    serviceItems: dedupeNamedItems([...record.serviceItems]),
  };
}

export async function runOnboardingPipeline(
  input: OnboardingRequest,
): Promise<OnboardingPipelineResult> {
  const policy = getPolicy(input.vertical);

  const primaryConnectors = CONNECTOR_REGISTRY.filter((c) =>
    (policy.allowedSources as string[]).includes(c.source),
  );

  const rawRecords: SourceEntityRecord[] = [];

  for (const connector of primaryConnectors) {
    const rows = await connector.search({
      vertical: input.vertical,
      query: input.query,
      name: input.name,
      city: input.city,
      district: input.district,
      country: input.country,
      website: input.website,
      phone: input.phone,
    });
    rawRecords.push(...rows);
  }

  const grouped = groupEntities(rawRecords);
  const canonicalResults: CanonicalOnboardingRecord[] = [];

  for (const group of grouped) {
    const mergedInitial = mergeEntityRecords(input.vertical, group);

    let completedGroup = [...group];

    if (mergedInitial.missingFields.length > 0) {
      const fallbackRows = await fillMissingWithWebFallback(input.vertical, {
        name: mergedInitial.canonicalName,
        city: mergedInitial.city,
        district: mergedInitial.district,
        country: mergedInitial.country,
        website: mergedInitial.website,
        phone: mergedInitial.phone,
      });
      completedGroup = [...completedGroup, ...fallbackRows];
    }

    const mergedFinal = mergeEntityRecords(input.vertical, completedGroup);
    canonicalResults.push(sanitizeCanonicalRecord(mergedFinal));
  }

  const publish = canonicalResults.map((record) => {
    const quality = scoreOnboardingQuality(record);
    const gate = evaluatePublishGate(record, quality);

    return {
      entityId: record.entityId,
      allowed: gate.allowed,
      targetVisibility: gate.targetVisibility,
      reasons: gate.reasons,
      qualityScore: quality.score,
    };
  });

  return { canonical: canonicalResults, publish };
}
