import { platformBus } from "@/lib/shared/platform-bus";

export type CatalogVertical = "food" | "hotel" | "services" | "retail" | "property" | "marketplace" | "events" | "mobility";
export type ListingStatus = "draft" | "pending_review" | "active" | "paused" | "sold" | "expired" | "removed" | "archived";

export interface CatalogItem {
  itemId: string;
  sellerId: string;
  vertical: CatalogVertical;
  status: ListingStatus;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  subcategory: string | null;
  tags: string[];
  images: string[];
  location: { lat: number; lng: number; label: string } | null;
  attributes: Record<string, unknown>;
  stock: number | null;
  rating: number | null;
  reviewCount: number;
  viewCount: number;
  favoriteCount: number;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
  expiresAt: number | null;
  seoSlug: string;
  crossListedVerticals: CatalogVertical[];
}

export interface CategoryNode {
  categoryId: string;
  vertical: CatalogVertical;
  parentId: string | null;
  name: string;
  slug: string;
  depth: number;
  sortOrder: number;
  iconName: string | null;
  itemCount: number;
}

export interface VariantOption {
  variantId: string;
  itemId: string;
  name: string;
  options: Array<{ value: string; priceModifier: number; stock: number | null; sku: string | null }>;
}

export interface InventoryAlert {
  itemId: string;
  sellerId: string;
  currentStock: number;
  threshold: number;
  alertType: "low_stock" | "out_of_stock" | "restock";
}

const VERTICAL_REQUIRED_ATTRIBUTES: Record<CatalogVertical, string[]> = {
  food: ["cuisine_type", "dietary_info", "prep_time_minutes"],
  hotel: ["star_rating", "check_in_time", "check_out_time", "amenities"],
  services: ["service_type", "duration_minutes", "availability"],
  retail: ["brand", "condition", "shipping_options"],
  property: ["property_type", "bedrooms", "bathrooms", "area_sqm"],
  marketplace: ["condition", "shipping_options"],
  events: ["event_date", "venue", "capacity"],
  mobility: ["vehicle_type", "model_year"],
};

export function getRequiredAttributes(vertical: CatalogVertical): string[] {
  return VERTICAL_REQUIRED_ATTRIBUTES[vertical] ?? [];
}

export function validateListing(item: CatalogItem): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!item.title || item.title.length < 3) errors.push("Title must be at least 3 characters");
  if (!item.description || item.description.length < 10) errors.push("Description must be at least 10 characters");
  if (item.price < 0) errors.push("Price must be non-negative");
  if (item.images.length === 0) errors.push("At least one image is required");
  const required = getRequiredAttributes(item.vertical);
  for (const attr of required) {
    if (!(attr in item.attributes)) errors.push(`Missing required attribute: ${attr}`);
  }
  return { valid: errors.length === 0, errors };
}

export function generateSEOSlug(title: string, itemId: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  return `${slug}-${itemId.slice(0, 8)}`;
}

export function checkInventory(stock: number | null, threshold: number = 5): InventoryAlert["alertType"] | null {
  if (stock === null) return null;
  if (stock === 0) return "out_of_stock";
  if (stock <= threshold) return "low_stock";
  return null;
}

export function canCrossListTo(item: CatalogItem, targetVertical: CatalogVertical): boolean {
  const crossListMap: Partial<Record<CatalogVertical, CatalogVertical[]>> = {
    retail: ["marketplace"],
    marketplace: ["retail"],
    services: ["events"],
  };
  return crossListMap[item.vertical]?.includes(targetVertical) ?? false;
}

export function emitListingPublished(item: CatalogItem): void {
  platformBus.emit("marketplace:listing_published", {
    itemId: item.itemId,
    sellerId: item.sellerId,
    vertical: item.vertical,
    title: item.title,
    price: item.price,
    currency: item.currency,
  }, "catalog-engine");
}

export function emitStockAlert(alert: InventoryAlert): void {
  platformBus.emit("marketplace:stock_updated", {
    sellerId: alert.sellerId,
    productId: alert.itemId,
    quantity: alert.currentStock,
    alertType: alert.alertType,
  }, "catalog-engine");
}

export function emitListingViewed(itemId: string, viewerId: string | null, vertical: CatalogVertical): void {
  platformBus.emit("listing:viewed", {
    itemId, viewerId, vertical, timestamp: Date.now(),
  }, "catalog-engine");
}
