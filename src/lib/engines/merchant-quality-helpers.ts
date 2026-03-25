const INVALID_CATEGORIES = ["general", "other", "unknown", "", null, undefined] as const;
const PLACEHOLDER_IMAGE_PATTERNS = [
  "placeholder",
  "default",
  "generic",
  "via.placeholder",
  "dummyimage",
  "placehold.co",
  "unsplash.com",
  "images.unsplash.com",
];

export function isInvalidCategory(category?: string | null): boolean {
  return !category || INVALID_CATEGORIES.includes(category.toLowerCase() as never);
}

export function isPlaceholderImage(url?: string | null): boolean {
  const value = (url ?? "").trim().toLowerCase();
  if (!value) return true;
  return PLACEHOLDER_IMAGE_PATTERNS.some((pattern) => value.includes(pattern));
}

export function extractMenuItems(menuJson: any): any[] {
  if (!menuJson) return [];

  if (Array.isArray(menuJson)) {
    return menuJson.flatMap((entry: any) => entry?.items || [entry]).filter(Boolean);
  }

  const items = Array.isArray(menuJson?.items) ? menuJson.items : [];
  const sections = Array.isArray(menuJson?.sections)
    ? menuJson.sections.flatMap((section: any) => section?.items || [])
    : [];

  return [...items, ...sections].filter(Boolean);
}

export function hasRealFoodMenu(menuJson: any, minItems = 3): boolean {
  return extractMenuItems(menuJson).length >= minItems;
}

export function computeMerchantQualityScore(entity: {
  cover_image?: string | null;
  menu_items_json?: any;
  vertical?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  support_phone?: string | null;
  category?: string | null;
}): number {
  let score = 0;

  if (!isPlaceholderImage(entity.cover_image)) score += 20;

  const needsMenu = (entity.vertical ?? "food") === "food";
  const menuItems = extractMenuItems(entity.menu_items_json).length;
  if ((needsMenu && menuItems >= 3) || (!needsMenu && menuItems > 0)) score += 20;

  if (entity.latitude != null && entity.longitude != null) score += 20;
  if ((entity.phone ?? entity.support_phone ?? "").trim().length >= 6) score += 20;
  if (!isInvalidCategory(entity.category)) score += 20;

  return score;
}