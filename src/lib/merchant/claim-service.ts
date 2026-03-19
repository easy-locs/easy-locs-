/**
 * Merchant claim & activation service.
 * Handles the full lifecycle: claim verification → profile attachment → activation.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ClaimableRestaurant {
  id: string;
  merchant_name: string;
  cuisine_type: string | null;
  area: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  onboarding_status: string;
}

/** Fetch a merchant profile by ID (for claim flow) */
export async function getMerchantProfile(profileId: string): Promise<ClaimableRestaurant | null> {
  const { data } = await (supabase as any)
    .from("merchant_onboarding_profiles")
    .select("id, merchant_name, cuisine_type, area, city, phone, email, onboarding_status, claimed_by")
    .eq("id", profileId)
    .maybeSingle();
  return data;
}

/** Find merchant by activation token from outreach */
export async function getMerchantByToken(token: string) {
  const { data } = await (supabase as any)
    .from("merchant_outreach_campaigns")
    .select("*, merchant_onboarding_profiles(*)")
    .eq("activation_token", token)
    .maybeSingle();
  return data;
}

/** Claim a restaurant — attach it to the authenticated user */
export async function claimRestaurant(params: {
  profileId: string;
  userId: string;
  verificationMethod: "phone" | "email";
  verificationValue: string;
}) {
  // Update the merchant profile
  const { error } = await (supabase as any)
    .from("merchant_onboarding_profiles")
    .update({
      claimed_by: params.userId,
      claimed_at: new Date().toISOString(),
      claim_verification_method: params.verificationMethod,
      onboarding_status: "claimed",
    })
    .eq("id", params.profileId)
    .eq("onboarding_status", "imported_not_claimed");

  if (error) throw error;

  // Update outreach if exists
  await (supabase as any)
    .from("merchant_outreach_campaigns")
    .update({ claimed_at: new Date().toISOString(), status: "claimed" })
    .eq("merchant_profile_id", params.profileId);

  return true;
}

/** Update merchant info post-claim */
export async function updateMerchantInfo(profileId: string, updates: {
  merchant_name?: string;
  phone?: string;
  email?: string;
  area?: string;
  cuisine_type?: string;
}) {
  const { error } = await (supabase as any)
    .from("merchant_onboarding_profiles")
    .update(updates)
    .eq("id", profileId);
  if (error) throw error;
}

/** Set merchant open/closed status */
export async function setMerchantOpenStatus(profileId: string, isOpen: boolean) {
  // Update the associated storefront page
  const { data: profile } = await (supabase as any)
    .from("merchant_onboarding_profiles")
    .select("id")
    .eq("id", profileId)
    .single();

  if (!profile) return;

  await (supabase as any)
    .from("storefront_pages")
    .update({ active: isOpen, shop_visibility: isOpen ? "public" : "hidden" })
    .eq("merchant_profile_id", profileId);
}

/** Final activation: claimed → active */
export async function activateMerchant(profileId: string) {
  const { error } = await (supabase as any)
    .from("merchant_onboarding_profiles")
    .update({ onboarding_status: "active" })
    .eq("id", profileId);
  if (error) throw error;

  // Make storefront visible
  await (supabase as any)
    .from("storefront_pages")
    .update({ active: true, shop_visibility: "public" })
    .eq("merchant_profile_id", profileId);

  // Update outreach
  await (supabase as any)
    .from("merchant_outreach_campaigns")
    .update({ activated_at: new Date().toISOString(), status: "activated" })
    .eq("merchant_profile_id", profileId);

  return true;
}
