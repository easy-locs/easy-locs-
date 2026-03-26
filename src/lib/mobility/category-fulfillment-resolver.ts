/**
 * Category Fulfillment Resolver — DB-driven + canonical category-tree fallback.
 * Single source of truth: category_fulfillment_rules table → category-tree.ts fallback.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  CATEGORY_TREE,
  getCategoryByVertical,
  getPrimaryCategory,
  isVehicleEligible,
  type MobilityJobType,
} from "@/lib/taxonomy/category-tree";

export interface FulfillmentCapabilities {
  can_taxi: boolean;
  can_food_delivery: boolean;
  can_grocery_delivery: boolean;
  can_parcel_delivery: boolean;
  can_pickup: boolean;
  can_scheduled: boolean;
  allowed_vehicle_types: string[];
  allowed_service_levels: string[];
  merchant_required: boolean;
  rider_required: boolean;
  requires_merchant_acceptance: boolean;
  requires_preparation_time: boolean;
  supports_tracking: boolean;
  supports_orbit_chat: boolean;
  supports_wallet_hold: boolean;
  supports_tip: boolean;
  supports_multi_stop: boolean;
  supports_return_flow: boolean;
  fulfillment_mode: string;
  pricing_strategy: string;
}

const DEFAULT_CAPABILITIES: FulfillmentCapabilities = {
  can_taxi: false, can_food_delivery: false, can_grocery_delivery: false,
  can_parcel_delivery: false, can_pickup: false, can_scheduled: false,
  allowed_vehicle_types: [], allowed_service_levels: [],
  merchant_required: false, rider_required: false,
  requires_merchant_acceptance: false, requires_preparation_time: false,
  supports_tracking: false, supports_orbit_chat: false,
  supports_wallet_hold: false, supports_tip: false,
  supports_multi_stop: false, supports_return_flow: false,
  fulfillment_mode: "none", pricing_strategy: "fixed",
};

let rulesCache: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function loadRules(): Promise<any[]> {
  if (rulesCache && Date.now() - cacheTimestamp < CACHE_TTL) return rulesCache;
  const { data, error } = await (supabase as any)
    .from("category_fulfillment_rules")
    .select("*")
    .order("vertical", { ascending: true });
  if (error) {
    console.error("[fulfillment-resolver] Failed to load rules:", error.message);
    return rulesCache ?? [];
  }
  rulesCache = data ?? [];
  cacheTimestamp = Date.now();
  return rulesCache;
}

/**
 * Resolve fulfillment capabilities — DB rules first, then category-tree fallback.
 */
export async function resolveCategoryFulfillment(
  vertical: string,
  category?: string,
  subcategory?: string,
): Promise<FulfillmentCapabilities> {
  const rules = await loadRules();

  let rule = subcategory
    ? rules.find(r => r.vertical === vertical && r.category === category && r.subcategory === subcategory)
    : null;
  if (!rule && category) {
    rule = rules.find(r => r.vertical === vertical && r.category === category && !r.subcategory);
  }
  if (!rule) {
    rule = rules.find(r => r.vertical === vertical && !r.category && !r.subcategory);
  }

  // If DB rule found, use it
  if (rule) {
    const deliveryKind = rule.delivery_kind ?? "";
    const vehicleTypes = rule.default_vehicle_types
      ? (Array.isArray(rule.default_vehicle_types) ? rule.default_vehicle_types : [rule.default_vehicle_types])
      : [];
    return {
      can_taxi: vertical === "mobility" && deliveryKind === "taxi",
      can_food_delivery: rule.is_deliverable && deliveryKind === "food_delivery",
      can_grocery_delivery: rule.is_deliverable && deliveryKind === "grocery_delivery",
      can_parcel_delivery: rule.is_deliverable && deliveryKind === "parcel_delivery",
      can_pickup: vertical !== "mobility",
      can_scheduled: rule.allows_scheduled ?? false,
      allowed_vehicle_types: vehicleTypes,
      allowed_service_levels: [],
      merchant_required: rule.requires_merchant_acceptance ?? false,
      rider_required: rule.is_deliverable || deliveryKind === "taxi",
      requires_merchant_acceptance: rule.requires_merchant_acceptance ?? false,
      requires_preparation_time: rule.requires_preparation_time ?? false,
      supports_tracking: rule.supports_tracking ?? false,
      supports_orbit_chat: rule.supports_orbit_chat ?? false,
      supports_wallet_hold: rule.supports_wallet_hold ?? false,
      supports_tip: rule.supports_tip ?? false,
      supports_multi_stop: rule.supports_multi_stop ?? false,
      supports_return_flow: rule.supports_return_flow ?? false,
      fulfillment_mode: deliveryKind || "none",
      pricing_strategy: rule.pricing_strategy ?? "fixed",
    };
  }

  // Fallback: derive from canonical category-tree
  const cat = getCategoryByVertical(vertical) || getPrimaryCategory(category ?? "");
  if (!cat) return DEFAULT_CAPABILITIES;

  const caps = cat.capabilities;
  return {
    can_taxi: cat.fulfillment === "taxi",
    can_food_delivery: cat.fulfillment === "food_delivery",
    can_grocery_delivery: cat.fulfillment === "grocery_delivery",
    can_parcel_delivery: cat.fulfillment === "parcel_delivery",
    can_pickup: caps.can_pickup,
    can_scheduled: caps.can_schedule,
    allowed_vehicle_types: [],
    allowed_service_levels: [],
    merchant_required: caps.requires_ready_state,
    rider_required: caps.can_delivery || cat.fulfillment === "taxi",
    requires_merchant_acceptance: caps.requires_ready_state,
    requires_preparation_time: caps.requires_ready_state,
    supports_tracking: caps.supports_tracking,
    supports_orbit_chat: cat.orbitContext !== "none",
    supports_wallet_hold: cat.walletFlow === "fare_hold" || cat.walletFlow === "order_payment",
    supports_tip: cat.fulfillment === "taxi" || cat.fulfillment === "food_delivery",
    supports_multi_stop: false,
    supports_return_flow: false,
    fulfillment_mode: cat.fulfillment,
    pricing_strategy: cat.fulfillment === "taxi" ? "dynamic" : "fixed",
  };
}

/**
 * Resolve rider eligibility for a given job.
 */
export function resolveRiderEligibility(
  job: { job_type: string; customer_user_id: string },
  riderPresence: { user_id: string; is_online: boolean; is_available: boolean },
  vehicleProfile?: { vehicle_type?: string; service_modes?: string[] },
): { eligible: boolean; reason?: string } {
  if (!riderPresence.is_online) return { eligible: false, reason: "Rider is offline" };
  if (!riderPresence.is_available) return { eligible: false, reason: "Rider is busy" };
  if (riderPresence.user_id === job.customer_user_id) return { eligible: false, reason: "Self-acceptance prevented" };

  // Vehicle compatibility via canonical tree
  if (vehicleProfile?.vehicle_type) {
    if (!isVehicleEligible(vehicleProfile.vehicle_type, job.job_type as MobilityJobType)) {
      return { eligible: false, reason: `Vehicle ${vehicleProfile.vehicle_type} cannot handle ${job.job_type}` };
    }
  }

  // Service mode check
  if (vehicleProfile?.service_modes?.length) {
    const jobTypeToMode: Record<string, string> = {
      taxi: "taxi", food_delivery: "food_delivery",
      grocery_delivery: "grocery_delivery", parcel_delivery: "parcel_delivery",
    };
    const requiredMode = jobTypeToMode[job.job_type];
    if (requiredMode && !vehicleProfile.service_modes.includes(requiredMode)) {
      return { eligible: false, reason: `Vehicle does not support ${job.job_type}` };
    }
  }

  return { eligible: true };
}

export function invalidateFulfillmentCache() {
  rulesCache = null;
  cacheTimestamp = 0;
}
