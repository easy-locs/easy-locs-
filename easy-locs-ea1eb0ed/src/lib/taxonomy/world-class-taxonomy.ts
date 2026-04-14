/**
 * WORLD-CLASS TAXONOMY — Lightweight core module.
 * ================================================
 * Types, RADAR constants, and strict render-path functions only.
 * All strict functions derive from CATEGORY_TREE (no enrichment dependency).
 *
 * For enriched WORLD_TAXONOMY / CANONICAL_VERTICALS with service modes,
 * time relevance, and geo hints: use loadWorldTaxonomy().
 *
 * @deprecated For NEW code, import directly from @/lib/taxonomy/category-tree.
 */
import {
  CATEGORY_TREE,
  type CategorySubcategory,
} from "@/lib/taxonomy/category-tree";

export type Vertical =
  | "food"
  | "grocery"
  | "shops"
  | "services"
  | "property"
  | "stay"
  | "healthcare"
  | "beauty"
  | "mobility"
  | "experiences"
  | "utility"
  | "education"
  | "finance";

export type RadarMainCategory =
  | "all"
  | "food"
  | "grocery"
  | "shops"
  | "services"
  | "property"
  | "utility"
  | "stay"
  | "healthcare"
  | "mobility"
  | "nightlife"
  | "experiences";

export type ServiceMode =
  | "delivery"
  | "pickup"
  | "dine_in"
  | "home_service"
  | "onsite"
  | "virtual";

export type TimePeriod =
  | "breakfast"
  | "lunch"
  | "snack"
  | "dinner"
  | "late_night";

export interface TaxonomySubcategory {
  value: string;
  label: string;
  emoji: string;
  icon: string;
  cluster: string;
  tags: string[];
  serviceModes: ServiceMode[];
  timeRelevance: TimePeriod[];
  geoHints: string[];
}

export interface TaxonomyCluster {
  value: string;
  label: string;
  emoji: string;
}

export interface TaxonomyVertical {
  value: Vertical;
  label: string;
  emoji: string;
  radarCategory: RadarMainCategory;
  clusters: TaxonomyCluster[];
  subcategories: TaxonomySubcategory[];
}

const _CATEGORY_KEY_TO_VERTICAL: Record<string, Vertical> = {
  food: "food",
  grocery: "grocery",
  shops: "shops",
  services: "services",
  pharmacy: "healthcare",
  health: "healthcare",
  beauty: "services",
  taxi: "mobility",
  delivery: "mobility",
  property: "property",
  stay: "stay",
  travel: "experiences",
  utility: "utility",
  education: "education",
  finance: "finance",
};

const _VERTICAL_TO_RADAR: Record<Vertical, RadarMainCategory> = {
  food: "food",
  grocery: "grocery",
  shops: "shops",
  services: "services",
  property: "property",
  stay: "stay",
  healthcare: "healthcare",
  mobility: "mobility",
  experiences: "experiences",
  utility: "utility",
  education: "services",
  finance: "utility",
};

type _SubLookup = { sub: CategorySubcategory; vertical: Vertical; radar: RadarMainCategory };
const _subIndex = new Map<string, _SubLookup>();
for (const primary of CATEGORY_TREE) {
  const v = _CATEGORY_KEY_TO_VERTICAL[primary.key] ?? ("services" as Vertical);
  const r = _VERTICAL_TO_RADAR[v];
  for (const sub of primary.subcategories) {
    if (!_subIndex.has(sub.value)) {
      _subIndex.set(sub.value, { sub, vertical: v, radar: r });
    }
  }
}

export interface VerticalSummary {
  value: Vertical;
  label: string;
  emoji: string;
  clusters: { value: string; label: string; emoji: string }[];
  subcategories: { value: string; label: string; emoji: string; cluster: string; tags: string[] }[];
}

function _buildVerticalSummaries(): VerticalSummary[] {
  const groups = new Map<Vertical, { label: string; emoji: string; subs: Map<string, { value: string; label: string; emoji: string; cluster: string; tags: string[] }> }>();
  for (const primary of CATEGORY_TREE) {
    const v = _CATEGORY_KEY_TO_VERTICAL[primary.key] ?? ("services" as Vertical);
    if (!groups.has(v)) {
      groups.set(v, { label: primary.label, emoji: primary.emoji, subs: new Map() });
    }
    const g = groups.get(v)!;
    for (const sub of primary.subcategories) {
      if (!g.subs.has(sub.value)) {
        g.subs.set(sub.value, { value: sub.value, label: sub.label, emoji: sub.emoji, cluster: sub.cluster, tags: sub.tags ?? [] });
      }
    }
  }
  return [...groups.entries()].map(([value, g]) => {
    const clusterMap = new Map<string, { value: string; label: string; emoji: string }>();
    for (const s of g.subs.values()) {
      if (!clusterMap.has(s.cluster)) {
        clusterMap.set(s.cluster, { value: s.cluster, label: s.cluster.charAt(0).toUpperCase() + s.cluster.slice(1).replace(/_/g, " "), emoji: s.emoji });
      }
    }
    return {
      value,
      label: g.label,
      emoji: g.emoji,
      clusters: [...clusterMap.values()],
      subcategories: [...g.subs.values()],
    };
  });
}

export const CANONICAL_VERTICALS: VerticalSummary[] = _buildVerticalSummaries();

export const RADAR_CATEGORIES: { value: RadarMainCategory; label: string; emoji: string }[] = [
  { value: "all", label: "All", emoji: "✨" },
  { value: "food", label: "Food", emoji: "🍽️" },
  { value: "grocery", label: "Grocery", emoji: "🛒" },
  { value: "shops", label: "Shops", emoji: "🛍️" },
  { value: "services", label: "Services", emoji: "🛠️" },
  { value: "stay", label: "Stay", emoji: "🏨" },
  { value: "healthcare", label: "Healthcare", emoji: "🏥" },
  { value: "mobility", label: "Mobility", emoji: "🚗" },
  { value: "nightlife", label: "Nightlife", emoji: "🌙" },
  { value: "experiences", label: "Experiences", emoji: "🎭" },
  { value: "property", label: "Property", emoji: "🏠" },
  { value: "utility", label: "Utility", emoji: "🏧" },
];

export const RADAR_QUICK_CATEGORIES: { id: RadarMainCategory; emoji: string; labelKey: string }[] =
  RADAR_CATEGORIES
    .filter(c => c.value !== "all" && c.value !== "utility")
    .map(c => ({ id: c.value, emoji: c.emoji, labelKey: `radar.layer_${c.value}` }));

export const loadTaxonomyAliases = () => import("./taxonomy-aliases");

export const loadWorldTaxonomy = () => import("./world-taxonomy-data");

export function strictVerticalToRadarCategory(vertical: string): RadarMainCategory {
  return _VERTICAL_TO_RADAR[vertical as Vertical] ?? "shops";
}

export function strictGetCanonicalSubcategory(value: string): { value: string; label: string; emoji: string; cluster: string; tags: string[] } | undefined {
  const entry = _subIndex.get(value);
  if (!entry) return undefined;
  return {
    value: entry.sub.value,
    label: entry.sub.label,
    emoji: entry.sub.emoji,
    cluster: entry.sub.cluster,
    tags: entry.sub.tags ?? [],
  };
}

export function strictGetParentVertical(subValue: string): { value: Vertical; label: string; emoji: string } | undefined {
  const entry = _subIndex.get(subValue);
  if (!entry) return undefined;
  for (const primary of CATEGORY_TREE) {
    const v = _CATEGORY_KEY_TO_VERTICAL[primary.key] ?? ("services" as Vertical);
    if (v === entry.vertical) {
      return { value: v, label: primary.label, emoji: primary.emoji };
    }
  }
  return undefined;
}

export function strictHierarchyMatchScore(
  pointSub: string | null | undefined,
  targetSub?: string | null,
  targetVertical?: string | null
): number {
  if (!pointSub) return 0;

  if (targetSub && pointSub === targetSub) return 3;

  const pointEntry = _subIndex.get(pointSub);
  if (!pointEntry) return 0;

  if (targetSub) {
    const targetEntry = _subIndex.get(targetSub);
    if (targetEntry && targetEntry.vertical === pointEntry.vertical && targetEntry.sub.cluster === pointEntry.sub.cluster) return 2;
  }

  if (targetVertical && pointEntry.vertical === targetVertical) return 1;

  return 0;
}

export function getSubcategoriesForRadarCategory(
  cat: RadarMainCategory
): { value: string; label: string; emoji: string; cluster: string }[] {
  if (cat === "all") return [];
  const results: { value: string; label: string; emoji: string; cluster: string }[] = [];
  for (const [, entry] of _subIndex) {
    if (entry.radar === cat) {
      results.push({
        value: entry.sub.value,
        label: entry.sub.label,
        emoji: entry.sub.emoji,
        cluster: entry.sub.cluster,
      });
    }
  }
  return results;
}
