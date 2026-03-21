/**
 * businessLifecycle — Authoritative business status transitions and validation.
 * Statuses: onboarding_draft → draft → pending → ready → active → paused → archived
 */
import { supabase } from "@/integrations/supabase/client";

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
export function validateBusinessReadiness(shop: Record<string, any>): {
  ready: boolean;
  requirements: BusinessRequirement[];
} {
  const reqs: BusinessRequirement[] = [
    { key: "name", label: "Business name", met: !!shop.name && shop.name !== "My Business" },
    { key: "vertical", label: "Category", met: !!shop.vertical && shop.vertical !== "general" },
    { key: "city", label: "City / location", met: !!shop.city },
    { key: "phone", label: "Phone number", met: !!shop.phone },
    { key: "logo", label: "Logo / photo", met: !!shop.logo_url },
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

/** Transition to ready if all requirements met */
export async function markBusinessReady(shopId: string): Promise<boolean> {
  const { data: shop } = await (supabase as any)
    .from("storefront_pages")
    .select("*")
    .eq("id", shopId)
    .single();
  if (!shop) return false;

  const { ready } = validateBusinessReadiness(shop);
  if (!ready) return false;

  const { error } = await (supabase as any)
    .from("storefront_pages")
    .update({
      status: "ready",
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", shopId);

  return !error;
}

/** Activate business — makes it public and orderable */
export async function activateBusiness(shopId: string): Promise<boolean> {
  const { error } = await (supabase as any)
    .from("storefront_pages")
    .update({
      active: true,
      status: "active",
      shop_visibility: "public",
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", shopId);
  return !error;
}

/** Pause business — hide from public but keep data */
export async function pauseBusiness(shopId: string): Promise<boolean> {
  const { error } = await (supabase as any)
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
  const { error } = await (supabase as any)
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
