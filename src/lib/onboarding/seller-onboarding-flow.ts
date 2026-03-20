/**
 * Seller onboarding draft flow.
 * Creates a PRIVATE onboarding_draft entity only on explicit user action.
 * Never creates public/active listings automatically.
 */
import { supabase } from "@/integrations/supabase/client";

export type OnboardingStatus = "onboarding_draft" | "draft" | "pending" | "active";

export const PUBLIC_STATUSES: OnboardingStatus[] = ["active"];
export const SELLER_VISIBLE_STATUSES: OnboardingStatus[] = ["onboarding_draft", "draft", "pending", "active"];

export function isPublicStatus(status: string): boolean {
  return PUBLIC_STATUSES.includes(status as OnboardingStatus);
}

export function isSellerVisibleStatus(status: string): boolean {
  return SELLER_VISIBLE_STATUSES.includes(status as OnboardingStatus);
}

/**
 * Create a new onboarding draft storefront.
 * Called ONLY when user explicitly clicks "Start Business" / "Create Business".
 */
export async function createOnboardingDraft(params: {
  userId: string;
  name?: string;
  category?: string;
}) {
  const { data, error } = await (supabase as any)
    .from("storefront_pages")
    .insert({
      user_id: params.userId,
      name: params.name || "My Business",
      slug: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      vertical: params.category || "general",
      shop_visibility: "private",
      active: false,
      onboarding_completed: false,
      // Custom status field for lifecycle
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a marketplace service onboarding draft.
 */
export async function createServiceOnboardingDraft(params: {
  userId: string;
  orgId: string;
  title?: string;
  category?: string;
}) {
  const { data, error } = await supabase
    .from("marketplace_services")
    .insert({
      user_id: params.userId,
      org_id: params.orgId,
      title: params.title || "My Service",
      category: params.category || "general",
      listing_type: "service",
      status: "draft" as any,
      active: false,
    } as any)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/**
 * Required fields check before allowing publish/pending.
 */
export interface ValidationResult {
  valid: boolean;
  missing: string[];
}

export function validateForPublish(data: {
  name?: string | null;
  category?: string | null;
  address?: string | null;
  phone?: string | null;
  photo_url?: string | null;
}): ValidationResult {
  const missing: string[] = [];
  if (!data.name?.trim()) missing.push("Business name");
  if (!data.category?.trim()) missing.push("Category");
  if (!data.address?.trim()) missing.push("Address");
  if (!data.phone?.trim()) missing.push("Phone number");
  if (!data.photo_url?.trim()) missing.push("Main photo");
  return { valid: missing.length === 0, missing };
}

/**
 * Move listing from draft to pending (requires validation).
 */
export async function submitForReview(params: {
  table: "storefront_pages" | "marketplace_services";
  id: string;
  validationData: Parameters<typeof validateForPublish>[0];
}): Promise<ValidationResult & { submitted: boolean }> {
  const result = validateForPublish(params.validationData);
  if (!result.valid) return { ...result, submitted: false };

  if (params.table === "storefront_pages") {
    await (supabase as any)
      .from(params.table)
      .update({ shop_visibility: "private", active: false })
      .eq("id", params.id);
  } else {
    await supabase
      .from(params.table)
      .update({ status: "pending_review" as any, active: false } as any)
      .eq("id", params.id);
  }

  return { ...result, submitted: true };
}

/**
 * Activate a listing (admin or auto-approval).
 */
export async function activateListing(params: {
  table: "storefront_pages" | "marketplace_services";
  id: string;
}) {
  if (params.table === "storefront_pages") {
    await (supabase as any)
      .from(params.table)
      .update({ shop_visibility: "public", active: true, onboarding_completed: true })
      .eq("id", params.id);
  } else {
    await supabase
      .from(params.table)
      .update({ status: "published" as any, active: true } as any)
      .eq("id", params.id);
  }
}
