/**
 * CATEGORY BRAIN — Single source of truth for category-specific behavior.
 * 
 * Owns:
 * - Per-category flow logic (food, grocery, taxi, parcel, services, property, travel)
 * - Radar behavior per vertical
 * - Fulfillment mode per category
 * - ETA floor/relevance per category
 * - UI structure per category
 * 
 * Delegates to:
 * - category-radar-behavior.ts (radar display rules)
 * - category-fulfillment-resolver.ts (fulfillment modes)
 * - category-tree.ts (taxonomy)
 * 
 * No component may hardcode category-specific logic.
 */
import { getRadarBehavior, type RadarCategoryBehavior } from "@/lib/radar/category-radar-behavior";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CATEGORY BRAIN STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type CategoryKey = "food" | "grocery" | "taxi" | "parcel" | "services" | "property" | "travel";

export interface CategoryBrainState {
  key: CategoryKey;
  /** Radar display behavior */
  radar: RadarCategoryBehavior;
  /** ETA relevance & floor */
  eta: { relevant: boolean; floorMinutes: number; label: string };
  /** Whether delivery/mobility is involved */
  mobility: { needsRider: boolean; needsMerchant: boolean; needsVehicle: boolean };
  /** Fulfillment mode */
  fulfillmentMode: string;
  /** Quick-action config */
  quickAction: { icon: string; label: string; subLabel: string };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CATEGORY CONFIG (canonical, no duplication)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CATEGORY_ETA: Record<CategoryKey, { relevant: boolean; floorMinutes: number; label: string }> = {
  food:     { relevant: true,  floorMinutes: 8,  label: "Delivery" },
  grocery:  { relevant: true,  floorMinutes: 12, label: "Delivery" },
  taxi:     { relevant: true,  floorMinutes: 3,  label: "Pickup" },
  parcel:   { relevant: true,  floorMinutes: 10, label: "Pickup" },
  services: { relevant: false, floorMinutes: 0,  label: "Appointment" },
  property: { relevant: false, floorMinutes: 0,  label: "Visit" },
  travel:   { relevant: false, floorMinutes: 0,  label: "Check-in" },
};

const CATEGORY_MOBILITY: Record<CategoryKey, { needsRider: boolean; needsMerchant: boolean; needsVehicle: boolean }> = {
  food:     { needsRider: true,  needsMerchant: true,  needsVehicle: false },
  grocery:  { needsRider: true,  needsMerchant: true,  needsVehicle: false },
  taxi:     { needsRider: true,  needsMerchant: false, needsVehicle: true },
  parcel:   { needsRider: true,  needsMerchant: false, needsVehicle: false },
  services: { needsRider: false, needsMerchant: true,  needsVehicle: false },
  property: { needsRider: false, needsMerchant: false, needsVehicle: false },
  travel:   { needsRider: false, needsMerchant: false, needsVehicle: false },
};

const CATEGORY_QUICK_ACTION: Record<CategoryKey, { icon: string; label: string; subLabel: string }> = {
  food:     { icon: "🍕", label: "Order food",      subLabel: "restaurants" },
  grocery:  { icon: "🛒", label: "Grocery",         subLabel: "stores" },
  taxi:     { icon: "🚕", label: "Book ride",       subLabel: "nearby" },
  parcel:   { icon: "📦", label: "Send package",    subLabel: "express" },
  services: { icon: "🔧", label: "Book service",    subLabel: "professionals" },
  property: { icon: "🏠", label: "Find property",   subLabel: "listings" },
  travel:   { icon: "✈️", label: "Plan travel",     subLabel: "stays" },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GET: Category brain state
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function getCategoryBrain(category: CategoryKey): CategoryBrainState {
  return {
    key: category,
    radar: getRadarBehavior(category),
    eta: CATEGORY_ETA[category],
    mobility: CATEGORY_MOBILITY[category],
    fulfillmentMode: resolveFulfillmentMode(category),
    quickAction: CATEGORY_QUICK_ACTION[category],
  };
}

/** Get all active delivery categories for quick-action display */
export function getDeliveryCategories(): CategoryBrainState[] {
  return (["food", "grocery", "parcel"] as CategoryKey[]).map(getCategoryBrain);
}

/** Get all mobility categories */
export function getMobilityCategories(): CategoryBrainState[] {
  return (["food", "grocery", "taxi", "parcel"] as CategoryKey[]).map(getCategoryBrain);
}
