import type { Story } from "./story-types";
import { CATEGORY_TREE } from "@/lib/taxonomy/category-tree";
import { isQuarantined } from "@/lib/data-quality/quarantine";
import { isSuppressedFromSurface } from "@/lib/data-quality/engines/live-surface-sanitizer-engine";

export type StoryIntentType =
  | "buy"
  | "rent"
  | "invest"
  | "book"
  | "order"
  | "discover"
  | "locate"
  | "ride"
  | "shop";

export type StoryMediaFamily =
  | "property_buy"
  | "property_rent"
  | "property_project"
  | "stay_hotel"
  | "stay_resort"
  | "stay_holiday_rental"
  | "stay_serviced_apartment"
  | "food_restaurant"
  | "food_cuisine"
  | "grocery_product"
  | "grocery_store"
  | "utility_atm"
  | "utility_fuel"
  | "utility_pharmacy"
  | "utility_parking"
  | "utility_laundry"
  | "utility_car_wash"
  | "utility_ev_charging"
  | "utility_emergency"
  | "utility_services"
  | "utility_education"
  | "utility_worship"
  | "utility_leisure"
  | "utility_shopping"
  | "mobility_taxi"
  | "mobility_chauffeur"
  | "mobility_delivery"
  | "mobility_rental"
  | "shops_fashion"
  | "shops_electronics"
  | "shops_home"
  | "shops_beauty_retail"
  | "shops_luxury"
  | "shops_specialty"
  | "shops_mall"
  | "services_repair"
  | "services_home"
  | "services_beauty"
  | "services_professional"
  | "deal_food"
  | "deal_stay"
  | "deal_property"
  | "travel_flights"
  | "travel_leisure"
  | "pharmacy_medical"
  | "beauty_booking"
  | "delivery_dispatch";

export type StorySurface =
  | "dashboard"
  | "property_hub"
  | "stay_hub"
  | "food_hub"
  | "grocery_hub"
  | "utility_hub"
  | "mobility_hub"
  | "shops_hub"
  | "services_hub"
  | "radar"
  | "search";

const VERTICAL_ALLOWED_ENTITY_TYPES: Record<string, string[]> = {
  property: ["property"],
  stay: ["stay"],
  food: ["merchant", "product"],
  grocery: ["merchant", "product"],
  utility: ["atm", "fuel", "service", "parking", "pharmacy", "hospital"],
  mobility: ["driver", "fleet", "vehicle"],
  shops: ["merchant", "product"],
  services: ["merchant", "provider"],
  healthcare: ["merchant", "service"],
  experiences: ["merchant", "service"],
};

const CLUSTER_TO_MEDIA_FAMILY: Record<string, Record<string, StoryMediaFamily>> = {
  food: {
    restaurant: "food_restaurant",
    fast_food: "food_restaurant",
    cuisine: "food_cuisine",
    cafe: "food_restaurant",
    bakery: "food_restaurant",
    desserts: "food_cuisine",
  },
  grocery: {
    market: "grocery_store",
    specialty: "grocery_product",
    fresh: "grocery_product",
  },
  shops: {
    fashion: "shops_fashion",
    beauty_retail: "shops_beauty_retail",
    luxury: "shops_luxury",
    electronics: "shops_electronics",
    home: "shops_home",
    specialty: "shops_specialty",
    mall: "shops_mall",
  },
  services: {
    home: "services_home",
    repair: "services_repair",
    professional: "services_professional",
    beauty: "services_beauty",
  },
  property: {
    buy: "property_buy",
    rent: "property_rent",
    rent_commercial: "property_rent",
    new_projects: "property_project",
  },
  stay: {
    hospitality: "stay_hotel",
  },
  utility: {
    finance: "utility_atm",
    vehicle: "utility_fuel",
    services: "utility_services",
    emergency: "utility_emergency",
    health: "utility_pharmacy",
    leisure: "utility_leisure",
    education: "utility_education",
    worship: "utility_worship",
    shopping: "utility_shopping",
  },
  mobility: {
    transport: "mobility_taxi",
    dispatch: "mobility_delivery",
  },
  healthcare: {
    medical: "pharmacy_medical",
  },
  experiences: {
    travel: "travel_flights",
    leisure: "travel_leisure",
  },
  beauty: {
    beauty: "beauty_booking",
  },
  delivery: {
    dispatch: "delivery_dispatch",
  },
};

const INTENT_BY_VERTICAL: Record<string, StoryIntentType> = {
  food: "order",
  grocery: "shop",
  shops: "shop",
  services: "book",
  beauty: "book",
  pharmacy: "shop",
  healthcare: "book",
  property: "discover",
  stay: "book",
  utility: "locate",
  mobility: "ride",
  delivery: "discover",
  travel: "book",
  experiences: "book",
};

const INTENT_BY_CLUSTER: Record<string, StoryIntentType> = {
  buy: "buy",
  rent: "rent",
  rent_commercial: "rent",
  new_projects: "invest",
};

function buildMediaFamilyMap(): Record<string, StoryMediaFamily> {
  const map: Record<string, StoryMediaFamily> = {};
  for (const cat of CATEGORY_TREE) {
    const vertical = cat.vertical;
    const clusterMapByVertical = CLUSTER_TO_MEDIA_FAMILY[vertical];
    const clusterMapByKey = CLUSTER_TO_MEDIA_FAMILY[cat.key];
    for (const sub of cat.subcategories) {
      const key = `${vertical}:${sub.value}`;
      const family = clusterMapByVertical?.[sub.cluster] ?? clusterMapByKey?.[sub.cluster];
      if (family) {
        map[key] = family;
      }
    }
  }
  return map;
}

function buildIntentMap(): Record<string, StoryIntentType> {
  const map: Record<string, StoryIntentType> = {};
  for (const cat of CATEGORY_TREE) {
    const vertical = cat.vertical;
    for (const sub of cat.subcategories) {
      const key = `${vertical}:${sub.value}`;
      const clusterIntent = INTENT_BY_CLUSTER[sub.cluster];
      if (clusterIntent) {
        map[key] = clusterIntent;
      } else {
        const verticalIntent = INTENT_BY_VERTICAL[vertical] ?? INTENT_BY_VERTICAL[cat.key];
        if (verticalIntent) {
          map[key] = verticalIntent;
        }
      }
    }
  }
  return map;
}

const MEDIA_FAMILY_BY_VERTICAL_SUBCAT = buildMediaFamilyMap();
const INTENT_BY_VERTICAL_SUBCAT = buildIntentMap();

const FEED_ALLOWED_VERTICALS: Record<string, string[]> = {
  property_buy: ["property"],
  property_rent: ["property"],
  property_projects: ["property"],
  stay_trending: ["stay"],
  stay_hotel: ["stay"],
  stay_resort: ["stay"],
  food_nearby: ["food"],
  food_pizza: ["food"],
  food_lebanese: ["food"],
  food_burger: ["food"],
  grocery_nearby: ["grocery"],
  grocery_fruits: ["grocery"],
  grocery_frozen: ["grocery"],
  grocery_snacks: ["grocery"],
  utility_atm: ["utility"],
  utility_fuel: ["utility"],
  utility_pharmacy: ["utility"],
  utility_parking: ["utility"],
  mobility_nearby: ["mobility"],
  mobility_taxi: ["mobility"],
  shops_fashion: ["shops"],
  shops_electronics: ["shops"],
  shops_home: ["shops"],
  shops_trending: ["shops"],
  services_nearby: ["services"],
  services_repair: ["services"],
  services_beauty: ["services"],
  dashboard_for_you: ["property", "stay", "food", "grocery", "utility", "mobility", "shops", "services"],
  dashboard_trending: ["property", "stay", "food", "grocery", "utility", "mobility", "shops", "services"],
  radar_nearby: ["property", "stay", "food", "grocery", "utility", "mobility", "shops", "services"],
};

export interface StoryValidationResult {
  valid: boolean;
  storyId: string;
  violations: string[];
}

export function resolveMediaFamily(story: Story): StoryMediaFamily | null {
  const key = `${story.vertical}:${story.subcategoryKey}`;
  return MEDIA_FAMILY_BY_VERTICAL_SUBCAT[key] ?? null;
}

export function resolveIntentType(story: Story): StoryIntentType | null {
  const key = `${story.vertical}:${story.subcategoryKey}`;
  return INTENT_BY_VERTICAL_SUBCAT[key] ?? null;
}

export function validateStoryTaxonomy(story: Story): StoryValidationResult {
  const violations: string[] = [];

  const allowedEntityTypes = VERTICAL_ALLOWED_ENTITY_TYPES[story.vertical];
  if (!allowedEntityTypes) {
    violations.push(`Unknown vertical: ${story.vertical}`);
  } else if (!allowedEntityTypes.includes(story.entityType)) {
    violations.push(
      `Entity type "${story.entityType}" not allowed in vertical "${story.vertical}" (allowed: ${allowedEntityTypes.join(", ")})`
    );
  }

  if (story.vertical !== story.categoryKey && story.storyType !== "deal") {
    violations.push(
      `Category key "${story.categoryKey}" must match vertical "${story.vertical}"`
    );
  }

  if (story.storyType === "deal") {
    if (!story.vertical) {
      violations.push("Deal stories must declare a vertical");
    }
  }

  const mediaFamily = resolveMediaFamily(story);
  if (!mediaFamily && story.storyType !== "deal") {
    violations.push(
      `No media family resolved for ${story.vertical}:${story.subcategoryKey}`
    );
  }

  const intent = resolveIntentType(story);
  if (!intent && story.storyType !== "deal") {
    violations.push(
      `No intent resolved for ${story.vertical}:${story.subcategoryKey}`
    );
  }

  const CROSS_DOMAIN_BLOCKS: [string, string][] = [
    ["property", "stay"],
    ["property", "merchant"],
    ["stay", "property"],
    ["food", "property"],
    ["food", "stay"],
    ["shops", "property"],
    ["shops", "stay"],
    ["services", "property"],
    ["services", "stay"],
    ["mobility", "property"],
    ["mobility", "merchant"],
    ["grocery", "property"],
    ["grocery", "stay"],
  ];
  for (const [vert, entity] of CROSS_DOMAIN_BLOCKS) {
    if (story.vertical === vert && story.entityType === entity) {
      violations.push(`CRITICAL: ${entity} entity in ${vert} vertical — domain contamination`);
    }
  }

  return {
    valid: violations.length === 0,
    storyId: story.id,
    violations,
  };
}

export function validateFeedPurity(feedKey: string, stories: Story[]): StoryValidationResult[] {
  const allowedVerticals = FEED_ALLOWED_VERTICALS[feedKey];
  if (!allowedVerticals) return [];

  return stories
    .map((story) => {
      const violations: string[] = [];
      if (!allowedVerticals.includes(story.vertical)) {
        violations.push(
          `Story "${story.id}" vertical "${story.vertical}" not allowed in feed "${feedKey}" (allowed: ${allowedVerticals.join(", ")})`
        );
      }
      return { valid: violations.length === 0, storyId: story.id, violations };
    })
    .filter((r) => !r.valid);
}

export function filterValidStories(stories: Story[], feedKey?: string): Story[] {
  let result = stories.filter((story) => {
    if (isQuarantined(story.id) || isQuarantined(story.entityId)) {
      return false;
    }
    if (isSuppressedFromSurface(story.id) || isSuppressedFromSurface(story.entityId)) {
      return false;
    }
    const validation = validateStoryTaxonomy(story);
    if (!validation.valid) {
      console.warn(`[story-taxonomy] BLOCKED story ${story.id}:`, validation.violations);
      return false;
    }
    return true;
  });

  if (feedKey) {
    const allowedVerticals = FEED_ALLOWED_VERTICALS[feedKey];
    if (allowedVerticals) {
      result = result.filter((story) => {
        const allowed = allowedVerticals.includes(story.vertical);
        if (!allowed) {
          console.warn(
            `[story-taxonomy] FEED BLOCKED story ${story.id}: vertical "${story.vertical}" not in feed "${feedKey}"`
          );
        }
        return allowed;
      });
    }
  }

  return result;
}

export function auditAllStories(stories: Story[]): {
  total: number;
  valid: number;
  blocked: number;
  violations: StoryValidationResult[];
} {
  const results = stories.map(validateStoryTaxonomy);
  const blocked = results.filter((r) => !r.valid);
  return {
    total: stories.length,
    valid: stories.length - blocked.length,
    blocked: blocked.length,
    violations: blocked,
  };
}

export function getTaxonomyCoverage(): {
  totalSubcategories: number;
  mappedMediaFamily: number;
  mappedIntent: number;
  unmappedMediaFamily: string[];
  unmappedIntent: string[];
} {
  const allKeys: string[] = [];
  for (const cat of CATEGORY_TREE) {
    for (const sub of cat.subcategories) {
      allKeys.push(`${cat.vertical}:${sub.value}`);
    }
  }
  const unmappedMedia = allKeys.filter(k => !MEDIA_FAMILY_BY_VERTICAL_SUBCAT[k]);
  const unmappedIntent = allKeys.filter(k => !INTENT_BY_VERTICAL_SUBCAT[k]);
  return {
    totalSubcategories: allKeys.length,
    mappedMediaFamily: allKeys.length - unmappedMedia.length,
    mappedIntent: allKeys.length - unmappedIntent.length,
    unmappedMediaFamily: unmappedMedia,
    unmappedIntent: unmappedIntent,
  };
}
