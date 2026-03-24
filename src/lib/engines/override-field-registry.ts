/**
 * Override Field Registry — Single source of truth for all auto-piloted field keys.
 * Every engine MUST use these keys when calling canAutoUpdate/setAutoValue.
 */

export const OVERRIDE_FIELD_KEYS = {
  // Shop identity
  shop_title: "shop_title",
  shop_description: "shop_description",
  shop_logo: "shop_logo",
  shop_cover: "shop_cover",
  shop_banner: "shop_banner",
  shop_category: "shop_category",
  shop_subcategory: "shop_subcategory",
  shop_tags: "shop_tags",
  shop_slug: "shop_slug",

  // Menu structure
  menu_section_order: "menu_section_order",
  menu_item_title: "menu_item_title",
  menu_item_description: "menu_item_description",
  menu_item_image: "menu_item_image",
  menu_item_price: "menu_item_price",
  menu_item_visibility: "menu_item_visibility",

  // Categories
  category_name: "category_name",
  category_sort: "category_sort",

  // Homepage composition
  homepage_sections: "homepage_sections",
  highlighted_items: "highlighted_items",
  bestseller_flags: "bestseller_flags",

  // SEO
  seo_title: "seo_title",
  seo_description: "seo_description",
  seo_keywords: "seo_keywords",

  // Visibility
  visibility_mode: "visibility_mode",
  display_priority: "display_priority",

  // Contact
  shop_phone: "shop_phone",
  shop_email: "shop_email",
  shop_website: "shop_website",

  // Geo
  shop_address: "shop_address",
  shop_lat: "shop_lat",
  shop_lng: "shop_lng",

  // Hours
  shop_opening_hours: "shop_opening_hours",
} as const;

export type OverrideFieldKey = typeof OVERRIDE_FIELD_KEYS[keyof typeof OVERRIDE_FIELD_KEYS];

/** All valid field keys as a Set for fast validation */
export const VALID_FIELD_KEYS = new Set<string>(Object.values(OVERRIDE_FIELD_KEYS));

/** Validate that a field key is in the registry */
export function isValidFieldKey(key: string): key is OverrideFieldKey {
  return VALID_FIELD_KEYS.has(key);
}

/**
 * Fields that are ALWAYS auto-pilotable (engines can always write).
 * These are system fields that merchants shouldn't control.
 */
export const SYSTEM_ONLY_FIELDS = new Set<string>([
  "display_priority",
]);

/**
 * Fields that require merchant claim before manual override is possible.
 * Until claimed, engines have full write access.
 */
export const CLAIM_REQUIRED_FIELDS = new Set<string>(
  Object.values(OVERRIDE_FIELD_KEYS)
);

/**
 * Map of tables → piloted columns that engines must NOT write directly.
 * Used by the write-path audit to detect bypass violations.
 */
export const PILOTED_COLUMNS: Record<string, string[]> = {
  storefront_pages: [
    "name", "description", "logo_url", "cover_url", "vertical",
    "subcategory", "tags", "slug", "visibility_mode", "display_priority",
    "seo_title", "seo_description",
  ],
  seed_merchants: [
    "name", "description", "logo_url", "cover_url", "vertical",
    "subcategory", "tags", "slug", "visibility_mode", "display_priority",
  ],
  onboarding_shop_candidates: [
    "name", "description", "logo_url", "cover_url", "vertical",
    "subcategory", "tags",
  ],
};
