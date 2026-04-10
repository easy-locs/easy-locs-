import type { PropertyCategory, PropertyType, ListingType } from "./canonical-types";

export interface TaxonomyNode {
  key: string;
  labelKey: string;
  icon?: string;
  children?: TaxonomyNode[];
}

export const PROPERTY_TAXONOMY: TaxonomyNode[] = [
  {
    key: "residential",
    labelKey: "re.cat.residential",
    icon: "🏠",
    children: [
      { key: "studio", labelKey: "re.type.studio" },
      { key: "apartment", labelKey: "re.type.apartment" },
      { key: "penthouse", labelKey: "re.type.penthouse" },
      { key: "duplex", labelKey: "re.type.duplex" },
      { key: "townhouse", labelKey: "re.type.townhouse" },
      { key: "villa", labelKey: "re.type.villa" },
      { key: "compound_villa", labelKey: "re.type.compound_villa" },
      { key: "serviced_apartment", labelKey: "re.type.serviced_apartment" },
    ],
  },
  {
    key: "commercial",
    labelKey: "re.cat.commercial",
    icon: "🏢",
    children: [
      { key: "office", labelKey: "re.type.office" },
      { key: "retail", labelKey: "re.type.retail" },
      { key: "shop", labelKey: "re.type.shop" },
      { key: "warehouse", labelKey: "re.type.warehouse" },
      { key: "industrial_unit", labelKey: "re.type.industrial_unit" },
      { key: "mixed_use", labelKey: "re.type.mixed_use" },
      { key: "commercial_building", labelKey: "re.type.commercial_building" },
    ],
  },
  {
    key: "land",
    labelKey: "re.cat.land",
    icon: "🌍",
    children: [
      { key: "residential_land", labelKey: "re.type.residential_land" },
      { key: "commercial_land", labelKey: "re.type.commercial_land" },
      { key: "industrial_land", labelKey: "re.type.industrial_land" },
      { key: "agricultural_land", labelKey: "re.type.agricultural_land" },
    ],
  },
  {
    key: "hospitality",
    labelKey: "re.cat.hospitality",
    icon: "🏨",
    children: [
      { key: "hotel_unit", labelKey: "re.type.hotel_unit" },
      { key: "hotel_apartment", labelKey: "re.type.hotel_apartment" },
      { key: "resort_villa", labelKey: "re.type.resort_villa" },
      { key: "branded_residence", labelKey: "re.type.branded_residence" },
    ],
  },
];

export const LISTING_TYPES: { key: ListingType; labelKey: string; icon: string }[] = [
  { key: "sale", labelKey: "re.listing.sale", icon: "💰" },
  { key: "rent", labelKey: "re.listing.rent", icon: "🔑" },
  { key: "short_stay", labelKey: "re.listing.short_stay", icon: "🏖️" },
  { key: "long_stay", labelKey: "re.listing.long_stay", icon: "📅" },
  { key: "lease", labelKey: "re.listing.lease", icon: "📝" },
];

const TYPE_ALIAS_MAP: Record<string, PropertyType> = {
  flat: "apartment",
  condo: "apartment",
  condominium: "apartment",
  loft: "studio",
  house: "villa",
  mansion: "villa",
  bungalow: "villa",
  farm: "agricultural_land",
  plot: "residential_land",
  store: "shop",
  boutique: "shop",
  factory: "industrial_unit",
  plant: "industrial_unit",
  hostel: "hotel_unit",
  inn: "hotel_unit",
  "bed_and_breakfast": "hotel_unit",
  "apart_hotel": "hotel_apartment",
};

export function resolvePropertyType(input: string): PropertyType | null {
  const normalized = input.toLowerCase().trim().replace(/[\s-]+/g, "_");
  const allTypes = PROPERTY_TAXONOMY.flatMap(cat => (cat.children ?? []).map(c => c.key));
  if (allTypes.includes(normalized)) return normalized as PropertyType;
  return TYPE_ALIAS_MAP[normalized] ?? null;
}

export function getCategoryForType(type: PropertyType): PropertyCategory {
  for (const cat of PROPERTY_TAXONOMY) {
    if (cat.children?.some(c => c.key === type)) return cat.key as PropertyCategory;
  }
  return "residential";
}

export function getTypesByCategory(category: PropertyCategory): PropertyType[] {
  const cat = PROPERTY_TAXONOMY.find(c => c.key === category);
  return (cat?.children ?? []).map(c => c.key as PropertyType);
}

export function getAllPropertyTypes(): PropertyType[] {
  return PROPERTY_TAXONOMY.flatMap(cat => (cat.children ?? []).map(c => c.key as PropertyType));
}
