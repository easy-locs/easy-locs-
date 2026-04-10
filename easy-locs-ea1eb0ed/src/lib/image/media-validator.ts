import { SUBCATEGORY_HERO_MAP } from "./subcategory-heroes";

export type MediaVertical = "food" | "grocery" | "shops" | "services" | "property" | "stay" | "utility" | "healthcare" | "mobility" | "experiences";

const VERTICAL_IMAGE_KEYWORDS: Record<MediaVertical, string[]> = {
  food: ["food", "restaurant", "meal", "dish", "cuisine", "pizza", "burger", "sushi", "shawarma", "cafe", "bakery", "coffee", "dessert", "kitchen", "chef", "dining"],
  grocery: ["grocery", "supermarket", "produce", "fruit", "vegetable", "dairy", "meat", "organic", "market", "store", "shelf"],
  shops: ["shop", "store", "fashion", "clothing", "electronics", "jewelry", "retail", "boutique", "mall", "perfume", "cosmetics", "furniture", "decor"],
  services: ["repair", "plumber", "electrician", "cleaning", "handyman", "salon", "barber", "spa", "mover", "tailor", "tutor", "mechanic"],
  property: ["apartment", "villa", "house", "building", "real estate", "penthouse", "townhouse", "interior", "room", "balcony", "skyline"],
  stay: ["hotel", "resort", "lobby", "pool", "beach", "accommodation", "suite", "hospitality", "check-in", "vacation"],
  utility: ["atm", "fuel", "gas station", "pharmacy", "parking", "ev charging", "hospital", "clinic"],
  healthcare: ["pharmacy", "clinic", "hospital", "doctor", "dentist", "medical", "medicine", "health"],
  mobility: ["taxi", "car", "ride", "driver", "vehicle", "delivery", "courier", "transport"],
  experiences: ["cinema", "theater", "museum", "tour", "activity", "event", "adventure", "entertainment"],
};

const INCOMPATIBLE_PAIRS: [MediaVertical, MediaVertical][] = [
  ["food", "property"],
  ["food", "services"],
  ["food", "mobility"],
  ["property", "stay"],
  ["property", "shops"],
  ["services", "food"],
  ["services", "property"],
  ["shops", "property"],
  ["stay", "property"],
  ["utility", "food"],
  ["utility", "shops"],
  ["mobility", "property"],
];

export interface MediaValidationResult {
  valid: boolean;
  entityId: string;
  entityVertical: string;
  entitySubcategory: string;
  violations: string[];
  suggestion?: string;
}

export function validateMediaEntityMatch(params: {
  entityId: string;
  entityVertical: string;
  entitySubcategory: string;
  imageUrl: string | null;
  imageSource?: string;
}): MediaValidationResult {
  const { entityId, entityVertical, entitySubcategory, imageUrl, imageSource } = params;
  const violations: string[] = [];
  let suggestion: string | undefined;

  if (!imageUrl) {
    violations.push("No image assigned");
    const subcatPool = SUBCATEGORY_HERO_MAP[entitySubcategory];
    if (subcatPool?.length) {
      suggestion = `Use subcategory hero: ${subcatPool[0]}`;
    }
  }

  if (imageUrl && imageSource === "system") {
    const isSubcatMatch = Object.entries(SUBCATEGORY_HERO_MAP).some(
      ([key, urls]) => key === entitySubcategory && urls.some(u => imageUrl.includes(u.split("?")[0]))
    );

    if (!isSubcatMatch) {
      const verticalKeywords = VERTICAL_IMAGE_KEYWORDS[entityVertical as MediaVertical] || [];
      const urlLower = imageUrl.toLowerCase();
      const hasVerticalMatch = verticalKeywords.some(kw => urlLower.includes(kw));

      if (!hasVerticalMatch) {
        for (const [v1, v2] of INCOMPATIBLE_PAIRS) {
          if (entityVertical === v1) {
            const wrongKeywords = VERTICAL_IMAGE_KEYWORDS[v2] || [];
            const hasWrongMatch = wrongKeywords.some(kw => urlLower.includes(kw));
            if (hasWrongMatch) {
              violations.push(`Image appears to belong to ${v2} vertical but entity is ${entityVertical}`);
              break;
            }
          }
        }
      }
    }
  }

  return {
    valid: violations.length === 0,
    entityId,
    entityVertical,
    entitySubcategory,
    violations,
    suggestion,
  };
}

export function validateImageSubcategoryCompatibility(
  subcategory: string,
  imageUrl: string
): boolean {
  const pool = SUBCATEGORY_HERO_MAP[subcategory];
  if (!pool) return true;
  const baseUrl = imageUrl.split("?")[0];
  return true;
}

export function getValidImageForSubcategory(subcategory: string, index = 0): string | null {
  const pool = SUBCATEGORY_HERO_MAP[subcategory];
  if (!pool?.length) return null;
  return pool[index % pool.length];
}

export function auditMediaAssignments(entities: Array<{
  id: string;
  vertical: string;
  subcategory: string;
  imageUrl: string | null;
  imageSource?: string;
}>): {
  total: number;
  valid: number;
  invalid: number;
  violations: MediaValidationResult[];
} {
  const results = entities.map(e =>
    validateMediaEntityMatch({
      entityId: e.id,
      entityVertical: e.vertical,
      entitySubcategory: e.subcategory,
      imageUrl: e.imageUrl,
      imageSource: e.imageSource,
    })
  );

  const invalid = results.filter(r => !r.valid);
  return {
    total: entities.length,
    valid: entities.length - invalid.length,
    invalid: invalid.length,
    violations: invalid,
  };
}

export function rejectIncompatibleImage(
  vertical: string,
  subcategory: string,
  proposedImageUrl: string
): { accepted: boolean; reason?: string; replacement?: string } {
  const vertKw = VERTICAL_IMAGE_KEYWORDS[vertical as MediaVertical];
  if (!vertKw) return { accepted: true };

  for (const [v1, v2] of INCOMPATIBLE_PAIRS) {
    if (vertical === v1) {
      const wrongKw = VERTICAL_IMAGE_KEYWORDS[v2];
      if (wrongKw) {
        const urlLower = proposedImageUrl.toLowerCase();
        const wrongMatch = wrongKw.find(kw => urlLower.includes(kw));
        if (wrongMatch) {
          const replacement = getValidImageForSubcategory(subcategory);
          return {
            accepted: false,
            reason: `Image contains "${wrongMatch}" which belongs to ${v2}, not ${vertical}`,
            replacement: replacement || undefined,
          };
        }
      }
    }
  }

  return { accepted: true };
}
