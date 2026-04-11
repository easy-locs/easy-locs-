import {
  resolveAlias,
  isValidVertical,
  isValidCategoryChain,
  getNode,
  getFamily,
  validateCanonicalNode,
  CANONICAL_REGISTRY,
  type CanonicalVertical,
} from "@/lib/taxonomy/canonical-registry";
import type {
  RawEntity,
  NormalizedEntity,
  CanonicalEntity,
  ConfidenceBand,
  ImportSourceType,
} from "@/domains/content-pipeline/types";
import { resolveSourceLabel } from "./alias-resolver";

export const MAPPER_VERSION = "1.0.0";

export interface MappingResult {
  vertical: CanonicalVertical;
  category: string;
  subcategory: string;
  canonicalType: string;
  canonicalSubtype: string | null;
  canonicalPath: string;
  confidenceScore: number;
  confidenceBand: ConfidenceBand;
  reviewRequired: boolean;
  ambiguityFlags: string[];
  mapperVersion: string;
}

function getConfidenceBand(score: number): ConfidenceBand {
  if (score >= 0.95) return "high";
  if (score >= 0.80) return "medium";
  if (score >= 0.50) return "low";
  return "rejected";
}

function inferVerticalFromSignals(text: string): { vertical: CanonicalVertical; score: number } | null {
  const lc = text.toLowerCase();

  const signals: Array<{ vertical: CanonicalVertical; patterns: RegExp[]; weight: number }> = [
    { vertical: "food", patterns: [/restaurant|cafe|coffee|bakery|pizza|burger|sushi|food|kitchen|dining|catering|bistro|brasserie|grill/i], weight: 0.7 },
    { vertical: "stay", patterns: [/hotel|resort|hostel|lodge|inn|motel|suites|serviced.?apartment|apart.?hotel|bed.?and.?breakfast/i], weight: 0.8 },
    { vertical: "health", patterns: [/clinic|hospital|dentist|dental|medical|doctor|health.?center|pharmacy|lab|diagnostic|ophthalmolog|dermatolog/i], weight: 0.8 },
    { vertical: "fitness", patterns: [/gym|fitness|crossfit|yoga|pilates|health.?club|gymnasium|workout|training.?center/i], weight: 0.8 },
    { vertical: "beauty", patterns: [/salon|barber|spa|beauty|nail|hair|skincare|waxing|makeup|aesthetic/i], weight: 0.7 },
    { vertical: "property", patterns: [/real.?estate|property|apartment|villa|rent|sale|sqft|sq\.?ft|bedroom|penthouse|townhouse|mortgage|broker/i], weight: 0.8 },
    { vertical: "grocery", patterns: [/supermarket|grocery|mini.?mart|hypermarket|organic.?store|butcher|fish.?market/i], weight: 0.7 },
    { vertical: "shops", patterns: [/shop|store|boutique|fashion|electronics|jewelry|retail|department.?store/i], weight: 0.6 },
    { vertical: "mobility", patterns: [/taxi|cab|ride|car.?rental|driver|chauffeur|transport|limousine/i], weight: 0.7 },
    { vertical: "utility", patterns: [/atm|fuel|gas.?station|petrol|parking|ev.?charger|charging.?station/i], weight: 0.7 },
    { vertical: "experiences", patterns: [/theme.?park|museum|concert|safari|tour|cinema|adventure|water.?sport|activity/i], weight: 0.7 },
    { vertical: "services", patterns: [/plumber|electrician|handyman|cleaner|laundry|repair|maintenance|tutor|lawyer|accountant|moving/i], weight: 0.6 },
  ];

  let best: { vertical: CanonicalVertical; score: number } | null = null;

  for (const sig of signals) {
    for (const pattern of sig.patterns) {
      if (pattern.test(lc)) {
        const matchCount = (lc.match(pattern) || []).length;
        const score = Math.min(1, sig.weight + (matchCount - 1) * 0.05);
        if (!best || score > best.score) {
          best = { vertical: sig.vertical, score };
        }
      }
    }
  }

  return best;
}

function inferCategoryAndType(
  vertical: CanonicalVertical,
  text: string,
): { category: string; subcategory: string; canonicalType: string; canonicalSubtype: string | null; score: number } | null {
  const family = getFamily(vertical);
  if (!family) return null;

  const lc = text.toLowerCase();
  let bestMatch: { category: string; subcategory: string; canonicalType: string; canonicalSubtype: string | null; score: number } | null = null;

  for (const cat of family.categories) {
    for (const sub of cat.subcategories) {
      for (const ct of sub.canonicalTypes) {
        let score = 0;

        for (const alias of ct.aliases) {
          if (lc.includes(alias.toLowerCase())) score += 0.3;
        }
        for (const alias of sub.aliases) {
          if (lc.includes(alias.toLowerCase())) score += 0.2;
        }
        for (const alias of cat.aliases) {
          if (lc.includes(alias.toLowerCase())) score += 0.15;
        }

        if (lc.includes(ct.key.replace(/_/g, " "))) score += 0.25;
        if (lc.includes(sub.key.replace(/_/g, " "))) score += 0.2;
        if (lc.includes(cat.key.replace(/_/g, " "))) score += 0.15;

        let bestSubtype: string | null = null;
        for (const st of ct.subtypes) {
          if (lc.includes(st.key.replace(/_/g, " "))) {
            score += 0.1;
            bestSubtype = st.key;
          }
          for (const stAlias of st.aliases) {
            if (lc.includes(stAlias.toLowerCase())) {
              score += 0.1;
              bestSubtype = st.key;
            }
          }
        }

        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = {
            category: cat.key,
            subcategory: sub.key,
            canonicalType: ct.key,
            canonicalSubtype: bestSubtype,
            score: Math.min(1, score),
          };
        }
      }
    }
  }

  return bestMatch;
}

export function mapRawToCanonical(
  rawName: string,
  rawCategory: string | null,
  rawSubcategory: string | null,
  rawDescription: string | null,
  rawAddress: string | null,
): MappingResult | null {
  const ambiguityFlags: string[] = [];
  const searchText = [rawName, rawCategory, rawSubcategory, rawDescription].filter(Boolean).join(" ");

  const aliasResult = resolveSourceLabel(searchText);
  if (aliasResult && aliasResult.confidence >= 0.9) {
    const node = getNode(aliasResult.canonicalPath);
    if (node) {
      return {
        vertical: node.vertical,
        category: node.category,
        subcategory: node.subcategory,
        canonicalType: node.canonicalType,
        canonicalSubtype: node.canonicalSubtype,
        canonicalPath: node.path,
        confidenceScore: aliasResult.confidence,
        confidenceBand: getConfidenceBand(aliasResult.confidence),
        reviewRequired: false,
        ambiguityFlags: [],
        mapperVersion: MAPPER_VERSION,
      };
    }
  }

  const verticalInference = inferVerticalFromSignals(searchText);
  if (!verticalInference) {
    return null;
  }

  const categoryInference = inferCategoryAndType(verticalInference.vertical, searchText);
  if (!categoryInference) {
    const family = getFamily(verticalInference.vertical);
    if (family && family.categories.length > 0) {
      const defaultCat = family.categories[0];
      const defaultSub = defaultCat.subcategories[0];
      if (defaultSub && defaultSub.canonicalTypes.length > 0) {
        const defaultType = defaultSub.canonicalTypes[0];
        const score = verticalInference.score * 0.5;
        ambiguityFlags.push("default_category_used", "low_category_confidence");
        return {
          vertical: verticalInference.vertical,
          category: defaultCat.key,
          subcategory: defaultSub.key,
          canonicalType: defaultType.key,
          canonicalSubtype: null,
          canonicalPath: `${verticalInference.vertical}.${defaultCat.key}.${defaultSub.key}.${defaultType.key}`,
          confidenceScore: score,
          confidenceBand: getConfidenceBand(score),
          reviewRequired: true,
          ambiguityFlags,
          mapperVersion: MAPPER_VERSION,
        };
      }
    }
    return null;
  }

  const combinedScore = Math.min(1, verticalInference.score * 0.6 + categoryInference.score * 0.4);

  const validation = validateCanonicalNode({
    vertical: verticalInference.vertical,
    category: categoryInference.category,
    subcategory: categoryInference.subcategory,
    canonicalType: categoryInference.canonicalType,
    canonicalSubtype: categoryInference.canonicalSubtype,
  });

  if (!validation.valid) {
    ambiguityFlags.push(...validation.errors);
  }

  const canonicalPath = [
    verticalInference.vertical,
    categoryInference.category,
    categoryInference.subcategory,
    categoryInference.canonicalType,
    categoryInference.canonicalSubtype,
  ].filter(Boolean).join(".");

  const band = getConfidenceBand(combinedScore);
  const reviewRequired = band !== "high" || ambiguityFlags.length > 0;

  return {
    vertical: verticalInference.vertical,
    category: categoryInference.category,
    subcategory: categoryInference.subcategory,
    canonicalType: categoryInference.canonicalType,
    canonicalSubtype: categoryInference.canonicalSubtype,
    canonicalPath,
    confidenceScore: combinedScore,
    confidenceBand: band,
    reviewRequired,
    ambiguityFlags,
    mapperVersion: MAPPER_VERSION,
  };
}

export function buildCanonicalEntity(
  normalized: NormalizedEntity,
  mapping: MappingResult,
): Omit<CanonicalEntity, "id"> {
  const now = new Date().toISOString();
  return {
    normalizedEntityId: normalized.id,
    vertical: mapping.vertical,
    category: mapping.category,
    subcategory: mapping.subcategory,
    canonicalType: mapping.canonicalType,
    canonicalSubtype: mapping.canonicalSubtype,
    canonicalPath: mapping.canonicalPath,
    confidenceScore: mapping.confidenceScore,
    confidenceBand: mapping.confidenceBand,
    mapperVersion: mapping.mapperVersion,
    validationStatus: mapping.reviewRequired ? "needs_review" : "classified",
    publishStatus: "raw",
    reviewRequired: mapping.reviewRequired,
    name: normalized.normalizedName,
    description: normalized.normalizedDescription,
    address: normalized.normalizedAddress,
    city: normalized.normalizedCity,
    country: normalized.normalizedCountry,
    countryCode: normalized.normalizedCountryCode,
    phone: normalized.normalizedPhone,
    email: normalized.normalizedEmail,
    website: normalized.normalizedWebsite,
    lat: normalized.normalizedLat,
    lng: normalized.normalizedLng,
    metadata: {},
    sourceProvenance: {
      ...normalized.sourceProvenance,
      normalizedAt: normalized.createdAt,
      classifiedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
}
