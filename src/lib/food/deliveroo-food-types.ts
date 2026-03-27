/**
 * Deliveroo Food Pipeline — Canonical Types
 * Source: deliveroo | City: dubai | Vertical: food
 */

// ── Enums & Constants ──────────────────────────────────────
export const FOOD_SOURCE = "deliveroo" as const;
export const FOOD_CITY = "dubai" as const;
export const FOOD_VERTICAL = "food" as const;

export type VisibilityMode = "hidden" | "coming_soon" | "search_only" | "live";
export type PublishGateStatus = "pending" | "passed" | "failed" | "firewall_blocked";
export type PipelineStage = "intake" | "normalized" | "menu_built" | "visual_clean" | "quality_scored" | "gated" | "published" | "failed";
export type ContentStatus = "empty" | "partial" | "ready" | "premium_ready";

export const BLOCKED_CATEGORIES = ["general", "other", "unknown", "null", "undefined", ""] as const;

export const QUALITY_THRESHOLDS = {
  min_for_coming_soon: 35,
  min_for_search_only: 50,
  min_for_live: 70,
  min_menu_items_food: 3,
  min_name_length: 2,
} as const;

// ── Raw Deliveroo Types ────────────────────────────────────
export interface DeliverooRawMenuItem {
  id?: string;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  image?: string;
  available?: boolean;
  modifiers?: unknown[];
}

export interface DeliverooRawMenuCategory {
  name: string;
  items: DeliverooRawMenuItem[];
}

export interface DeliverooRawMenu {
  categories: DeliverooRawMenuCategory[];
}

export interface DeliverooRawMerchant {
  source_entity_id: string;
  source_url?: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  logo?: string;
  cover_image?: string;
  gallery_images?: string[];
  category?: string;
  subcategory?: string;
  cuisine_tags?: string[];
  rating?: number;
  review_count?: number;
  delivery_time_min?: number;
  delivery_time_max?: number;
  minimum_order_amount?: number;
  halal?: boolean;
  menu?: DeliverooRawMenu;
  raw_payload?: Record<string, unknown>;
}

// ── Normalized Types ───────────────────────────────────────
export interface FoodNormalizedMenuItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  image: string | null;
  category_name: string;
  tags: string[];
  available: boolean;
}

export interface FoodNormalizedMenuCategory {
  name: string;
  slug: string;
  items: FoodNormalizedMenuItem[];
}

export interface FoodNormalizedMenu {
  categories: FoodNormalizedMenuCategory[];
  total_items: number;
}

export interface FoodNormalizedMerchant {
  id: string;
  source: typeof FOOD_SOURCE;
  source_entity_id: string;
  source_url: string | null;
  name: string;
  slug: string;
  address: string | null;
  city: typeof FOOD_CITY;
  country: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  category: string;
  subcategory: string;
  cuisine_tags: string[];
  logo_image: string | null;
  cover_image: string | null;
  gallery_images: string[];
  menu: FoodNormalizedMenu | null;
  rating: number;
  review_count: number;
}

// ── Quality / Visibility Decision ──────────────────────────
export interface FoodQualityScores {
  identity_score: number;   // /20
  location_score: number;   // /20
  visual_score: number;     // /20
  menu_score: number;       // /30
  source_score: number;     // /10
  overall: number;          // /100
}

export interface FoodQualityResult {
  scores: FoodQualityScores;
  gate_failures: string[];
  content_status: ContentStatus;
}

export interface FoodVisibilityDecision {
  visibility_mode: VisibilityMode;
  is_published: boolean;
  is_coming_soon: boolean;
  publish_gate_status: PublishGateStatus;
  blocking_reason: string | null;
  gate_failures: string[];
  visibility_decision_reason: string;
}

// ── Engine Run Report ──────────────────────────────────────
export interface FoodEngineReport {
  total_read: number;
  normalized: number;
  menus_built: number;
  visuals_cleaned: number;
  live_count: number;
  search_only_count: number;
  coming_soon_count: number;
  hidden_count: number;
  firewall_blocked_count: number;
  top_failures: string[];
}
