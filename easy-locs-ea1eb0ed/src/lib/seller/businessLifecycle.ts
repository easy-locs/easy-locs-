/**
 * businessLifecycle — Authoritative business status transitions and validation.
 * Statuses: onboarding_draft → draft → pending → ready → active → paused → archived
 * Activation respects launch control via platform_settings.
 */
import { db } from "@/services/db";

export type BusinessStatus =
  | "onboarding_draft"
  | "draft"
  | "pending"
  | "ready"
  | "active"
  | "paused"
  | "archived";

export const STATUS_ORDER: BusinessStatus[] = [
  "onboarding_draft", "draft", "pending", "ready", "active", "paused", "archived",
];

export const PUBLIC_STATUSES: BusinessStatus[] = ["active"];

export interface BusinessRequirement {
  key: string;
  label: string;
  met: boolean;
}

/** Check which fields are complete for launch readiness */
export function validateBusinessReadiness(shop: Record<string, any>, extras?: {
  categoryCount?: number;
  itemCount?: number;
}): {
  ready: boolean;
  requirements: BusinessRequirement[];
} {
  const hasCoords = typeof shop.latitude === "number" && typeof shop.longitude === "number"
    && shop.latitude !== 0 && shop.longitude !== 0;

  const reqs: BusinessRequirement[] = [
    { key: "name", label: "Business name", met: !!shop.name && shop.name !== "My Business" },
    { key: "vertical", label: "Category / vertical", met: !!shop.vertical && shop.vertical !== "general" },
    { key: "city", label: "City / location", met: !!shop.city },
    { key: "phone", label: "Phone number", met: !!shop.phone },
    { key: "logo", label: "Logo / photo", met: !!shop.logo_url },
    { key: "coordinates", label: "Map coordinates", met: hasCoords },
    { key: "categories", label: "At least 1 menu category", met: (extras?.categoryCount ?? 0) >= 1 },
    { key: "items", label: "At least 1 menu item", met: (extras?.itemCount ?? 0) >= 1 },
  ];
  return { ready: reqs.every((r) => r.met), requirements: reqs };
}

/** Resolve display status from storefront_pages data */
export function resolveBusinessStatus(shop: Record<string, any>): BusinessStatus {
  if (shop.status === "archived") return "archived";
  if (shop.status === "paused") return "paused";
  if (shop.active && (shop.status === "active" || shop.status === "published")) return "active";
  if (shop.status === "ready") return "ready";
  if (shop.status === "pending" || shop.status === "pending_review") return "pending";
  if (shop.onboarding_completed === false && shop.shop_visibility === "private" && !shop.active) return "onboarding_draft";
  return "draft";
}

/** Check if global or zone launch control allows activation */
export async function checkLaunchControl(shopCity?: string | null): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  // Check global launch flag
  const { data: globalSetting } = await db
    .from("platform_settings")
    .select("value")
    .eq("key", "global_launch_enabled")
    .maybeSingle();

  const globalLaunched = globalSetting?.value === "true" || globalSetting?.value === true;

  if (globalLaunched) return { allowed: true };

  // Check zone-level launch if city is provided
  if (shopCity) {
    const { data: zone } = await db
      .from("zones")
      .select("is_launched")
      .eq("city", shopCity)
      .eq("level", "city")
      .maybeSingle();

    if (zone?.is_launched) return { allowed: true };
  }

  return { allowed: false, reason: "Launch control: zone not yet live" };
}

/** Transition to ready if all requirements met */
export async function markBusinessReady(shopId: string): Promise<{
  success: boolean;
  requirements?: BusinessRequirement[];
}> {
  const { data: shop } = await db
    .from("storefront_pages")
    .select("*")
    .eq("id", shopId)
    .single();
  if (!shop) return { success: false };

  // Count categories and items
  const [catRes, itemRes] = await Promise.all([
    db
      .from("storefront_catalog_categories")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shopId),
    db
      .from("catalog_items")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shopId),
  ]);

  const { ready, requirements } = validateBusinessReadiness(shop, {
    categoryCount: catRes.count ?? 0,
    itemCount: itemRes.count ?? 0,
  });

  if (!ready) return { success: false, requirements };

  const { error } = await db
    .from("storefront_pages")
    .update({
      status: "ready",
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", shopId);

  return { success: !error, requirements };
}

/** Activate business — respects launch control before making public */
export async function activateBusiness(shopId: string): Promise<{
  success: boolean;
  reason?: string;
  status?: "active" | "ready";
}> {
  // First verify readiness
  const readiness = await markBusinessReady(shopId);
  if (!readiness.success) {
    return { success: false, reason: "Business requirements not met", status: "ready" };
  }

  // Get shop for city check
  const { data: shop } = await db
    .from("storefront_pages")
    .select("city")
    .eq("id", shopId)
    .single();

  // Check launch control
  const launch = await checkLaunchControl(shop?.city);
  if (!launch.allowed) {
    // Mark as ready but locked — not active
    await db
      .from("storefront_pages")
      .update({
        status: "ready",
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", shopId);

    return { success: false, reason: launch.reason, status: "ready" };
  }

  const { error } = await db
    .from("storefront_pages")
    .update({
      active: true,
      status: "active",
      shop_visibility: "public",
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", shopId);

  return { success: !error, status: "active" };
}

/** Pause business — hide from public but keep data */
export async function pauseBusiness(shopId: string): Promise<boolean> {
  const { error } = await db
    .from("storefront_pages")
    .update({
      active: false,
      status: "paused",
      shop_visibility: "private",
      updated_at: new Date().toISOString(),
    })
    .eq("id", shopId);
  return !error;
}

/** Archive business */
export async function archiveBusiness(shopId: string): Promise<boolean> {
  const { error } = await db
    .from("storefront_pages")
    .update({
      active: false,
      status: "archived",
      shop_visibility: "private",
      updated_at: new Date().toISOString(),
    })
    .eq("id", shopId);
  return !error;
}
