/**
 * Easy-Locs Category Configuration System
 * Data-driven behavior per category — no hardcoded UI logic.
 */

export type PresenceMode = "off" | "pin" | "live";
export type EntityType = "fixed_store" | "mobile_seller" | "mobile_service" | "driver";
export type CoverageMode = "point" | "radius" | "live_radius";
export type ListingType = "sale" | "service" | "shop";
export type ListingStatus = "draft" | "active" | "expired" | "archived" | "disabled";
export type LocationSource = "address" | "manual_pin" | "gps_live";

export interface CategoryConfig {
  id: string;
  slug: string;
  name: string;
  icon: string;
  /** Default entity type when this category is selected */
  entityTypeDefault: EntityType;
  /** Which presence modes are allowed */
  allowedPresenceModes: PresenceMode[];
  /** Default presence mode */
  defaultPresenceMode: PresenceMode;
  /** Which listing types are allowed */
  allowedListingTypes: ListingType[];
  /** Default listing type */
  defaultListingType: ListingType;
  /** Feature flags */
  supportsRadius: boolean;
  supportsLive: boolean;
  supportsBooking: boolean;
  supportsDelivery: boolean;
  supportsPrice: boolean;
  supportsInventory: boolean;
  /** CTA priority order for action engine */
  ctaPriority: string[];
}

/**
 * Canonical category registry.
 * Add new categories here — the form, map, and action engine adapt automatically.
 */
export const CATEGORY_REGISTRY: CategoryConfig[] = [
  {
    id: "food",
    slug: "food",
    name: "Food & Restaurant",
    icon: "🍽️",
    entityTypeDefault: "fixed_store",
    allowedPresenceModes: ["off", "pin", "live"],
    defaultPresenceMode: "pin",
    allowedListingTypes: ["shop", "service"],
    defaultListingType: "shop",
    supportsRadius: true,
    supportsLive: false,
    supportsBooking: true,
    supportsDelivery: true,
    supportsPrice: true,
    supportsInventory: false,
    ctaPriority: ["open", "order", "pay", "chat"],
  },
  {
    id: "grocery",
    slug: "grocery",
    name: "Grocery & Market",
    icon: "🛒",
    entityTypeDefault: "fixed_store",
    allowedPresenceModes: ["off", "pin", "live"],
    defaultPresenceMode: "pin",
    allowedListingTypes: ["shop"],
    defaultListingType: "shop",
    supportsRadius: true,
    supportsLive: true,
    supportsBooking: false,
    supportsDelivery: true,
    supportsPrice: true,
    supportsInventory: true,
    ctaPriority: ["open", "buy", "pay", "chat"],
  },
  {
    id: "services",
    slug: "services",
    name: "Services",
    icon: "🔧",
    entityTypeDefault: "mobile_service",
    allowedPresenceModes: ["off", "pin", "live"],
    defaultPresenceMode: "pin",
    allowedListingTypes: ["service"],
    defaultListingType: "service",
    supportsRadius: true,
    supportsLive: true,
    supportsBooking: true,
    supportsDelivery: false,
    supportsPrice: true,
    supportsInventory: false,
    ctaPriority: ["book", "request", "chat", "pay"],
  },
  {
    id: "beauty",
    slug: "beauty",
    name: "Beauty & Wellness",
    icon: "💆",
    entityTypeDefault: "fixed_store",
    allowedPresenceModes: ["off", "pin", "live"],
    defaultPresenceMode: "pin",
    allowedListingTypes: ["service", "shop"],
    defaultListingType: "service",
    supportsRadius: true,
    supportsLive: true,
    supportsBooking: true,
    supportsDelivery: false,
    supportsPrice: true,
    supportsInventory: false,
    ctaPriority: ["book", "open", "chat", "pay"],
  },
  {
    id: "property",
    slug: "property",
    name: "Property & Real Estate",
    icon: "🏠",
    entityTypeDefault: "fixed_store",
    allowedPresenceModes: ["off", "pin"],
    defaultPresenceMode: "pin",
    allowedListingTypes: ["sale", "service"],
    defaultListingType: "sale",
    supportsRadius: true,
    supportsLive: false,
    supportsBooking: true,
    supportsDelivery: false,
    supportsPrice: true,
    supportsInventory: false,
    ctaPriority: ["open", "request", "chat", "pay"],
  },
  {
    id: "automotive",
    slug: "automotive",
    name: "Automotive",
    icon: "🚗",
    entityTypeDefault: "fixed_store",
    allowedPresenceModes: ["off", "pin"],
    defaultPresenceMode: "pin",
    allowedListingTypes: ["sale", "service"],
    defaultListingType: "sale",
    supportsRadius: false,
    supportsLive: false,
    supportsBooking: false,
    supportsDelivery: false,
    supportsPrice: true,
    supportsInventory: true,
    ctaPriority: ["open", "buy", "chat", "pay"],
  },
  {
    id: "delivery",
    slug: "delivery",
    name: "Delivery & Courier",
    icon: "📦",
    entityTypeDefault: "driver",
    allowedPresenceModes: ["off", "pin", "live"],
    defaultPresenceMode: "live",
    allowedListingTypes: ["service"],
    defaultListingType: "service",
    supportsRadius: true,
    supportsLive: true,
    supportsBooking: true,
    supportsDelivery: true,
    supportsPrice: true,
    supportsInventory: false,
    ctaPriority: ["request", "track", "chat", "pay"],
  },
  {
    id: "taxi",
    slug: "taxi",
    name: "Taxi & Transport",
    icon: "🚕",
    entityTypeDefault: "driver",
    allowedPresenceModes: ["off", "live"],
    defaultPresenceMode: "live",
    allowedListingTypes: ["service"],
    defaultListingType: "service",
    supportsRadius: true,
    supportsLive: true,
    supportsBooking: true,
    supportsDelivery: false,
    supportsPrice: true,
    supportsInventory: false,
    ctaPriority: ["request", "track", "navigate", "chat"],
  },
  {
    id: "hotel",
    slug: "hotel",
    name: "Hotel & Accommodation",
    icon: "🏨",
    entityTypeDefault: "fixed_store",
    allowedPresenceModes: ["off", "pin"],
    defaultPresenceMode: "pin",
    allowedListingTypes: ["shop", "service"],
    defaultListingType: "shop",
    supportsRadius: true,
    supportsLive: false,
    supportsBooking: true,
    supportsDelivery: false,
    supportsPrice: true,
    supportsInventory: true,
    ctaPriority: ["book", "open", "chat", "pay"],
  },
  {
    id: "home",
    slug: "home",
    name: "Home & Garden",
    icon: "🏡",
    entityTypeDefault: "mobile_service",
    allowedPresenceModes: ["off", "pin", "live"],
    defaultPresenceMode: "pin",
    allowedListingTypes: ["service", "sale"],
    defaultListingType: "service",
    supportsRadius: true,
    supportsLive: true,
    supportsBooking: true,
    supportsDelivery: false,
    supportsPrice: true,
    supportsInventory: false,
    ctaPriority: ["book", "request", "chat", "pay"],
  },
  {
    id: "repair",
    slug: "repair",
    name: "Repair & Maintenance",
    icon: "🔩",
    entityTypeDefault: "mobile_service",
    allowedPresenceModes: ["off", "pin", "live"],
    defaultPresenceMode: "live",
    allowedListingTypes: ["service"],
    defaultListingType: "service",
    supportsRadius: true,
    supportsLive: true,
    supportsBooking: true,
    supportsDelivery: false,
    supportsPrice: true,
    supportsInventory: false,
    ctaPriority: ["book", "request", "chat", "pay"],
  },
  {
    id: "electronics",
    slug: "electronics",
    name: "Electronics & Tech",
    icon: "📱",
    entityTypeDefault: "fixed_store",
    allowedPresenceModes: ["off", "pin"],
    defaultPresenceMode: "pin",
    allowedListingTypes: ["sale", "shop"],
    defaultListingType: "sale",
    supportsRadius: false,
    supportsLive: false,
    supportsBooking: false,
    supportsDelivery: true,
    supportsPrice: true,
    supportsInventory: true,
    ctaPriority: ["buy", "open", "chat", "pay"],
  },
  {
    id: "fashion",
    slug: "fashion",
    name: "Fashion & Clothing",
    icon: "👗",
    entityTypeDefault: "fixed_store",
    allowedPresenceModes: ["off", "pin"],
    defaultPresenceMode: "pin",
    allowedListingTypes: ["sale", "shop"],
    defaultListingType: "sale",
    supportsRadius: false,
    supportsLive: false,
    supportsBooking: false,
    supportsDelivery: true,
    supportsPrice: true,
    supportsInventory: true,
    ctaPriority: ["buy", "open", "chat", "pay"],
  },
  {
    id: "events",
    slug: "events",
    name: "Events & Tickets",
    icon: "🎫",
    entityTypeDefault: "fixed_store",
    allowedPresenceModes: ["off", "pin"],
    defaultPresenceMode: "pin",
    allowedListingTypes: ["sale", "service"],
    defaultListingType: "sale",
    supportsRadius: true,
    supportsLive: false,
    supportsBooking: true,
    supportsDelivery: false,
    supportsPrice: true,
    supportsInventory: true,
    ctaPriority: ["buy", "book", "open", "chat"],
  },
  {
    id: "other",
    slug: "other",
    name: "Other",
    icon: "📦",
    entityTypeDefault: "fixed_store",
    allowedPresenceModes: ["off", "pin", "live"],
    defaultPresenceMode: "off",
    allowedListingTypes: ["sale", "service", "shop"],
    defaultListingType: "sale",
    supportsRadius: true,
    supportsLive: true,
    supportsBooking: true,
    supportsDelivery: true,
    supportsPrice: true,
    supportsInventory: true,
    ctaPriority: ["open", "chat", "pay", "buy"],
  },
];

/** Lookup by id/slug — O(1) after first call */
const _byId = new Map<string, CategoryConfig>();
const _bySlug = new Map<string, CategoryConfig>();
CATEGORY_REGISTRY.forEach((c) => {
  _byId.set(c.id, c);
  _bySlug.set(c.slug, c);
});

export function getCategoryConfig(idOrSlug: string): CategoryConfig {
  return _byId.get(idOrSlug) || _bySlug.get(idOrSlug) || CATEGORY_REGISTRY[CATEGORY_REGISTRY.length - 1];
}

/** Get all categories as select options */
export function getCategoryOptions() {
  return CATEGORY_REGISTRY.map((c) => ({
    value: c.id,
    label: c.name,
    icon: c.icon,
  }));
}

/** Get allowed listing types for a category */
export function getAllowedListingTypes(categoryId: string): ListingType[] {
  return getCategoryConfig(categoryId).allowedListingTypes;
}

/** Get allowed presence modes for a category */
export function getAllowedPresenceModes(categoryId: string): PresenceMode[] {
  return getCategoryConfig(categoryId).allowedPresenceModes;
}

/** Check if a category supports a feature */
export function categorySupports(categoryId: string, feature: keyof Pick<CategoryConfig, "supportsRadius" | "supportsLive" | "supportsBooking" | "supportsDelivery" | "supportsPrice" | "supportsInventory">): boolean {
  return getCategoryConfig(categoryId)[feature];
}
