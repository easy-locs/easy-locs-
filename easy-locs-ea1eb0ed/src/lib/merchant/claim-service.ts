/**
 * Merchant claim & activation service.
 * Handles the full lifecycle: claim verification → profile attachment → activation.
 */
import { db } from "@/services/db";

export interface ClaimableRestaurant {
  id: string;
  merchant_name: string;
  cuisine_type: string | null;
  area: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  onboarding_status: string;
  name_ar?: string | null;
  description_ar?: string | null;
}

/** Fetch a merchant profile by ID (for claim flow) */
export async function getMerchantProfile(profileId: string): Promise<ClaimableRestaurant | null> {
  const { data } = await db
    .from("merchant_onboarding_profiles")
    .select("id, merchant_name, cuisine_type, area, city, phone, email, onboarding_status, claimed_by, name_ar, description_ar")
    .eq("id", profileId)
    .maybeSingle();
  return data;
}

/** Find merchant by activation token from outreach */
export async function getMerchantByToken(token: string) {
  const { data } = await db
    .from("merchant_outreach_campaigns")
    .select("*, merchant_onboarding_profiles(*)")
    .eq("activation_token", token)
    .maybeSingle();
  return data;
}

/** Check if a restaurant is already claimed */
export async function isAlreadyClaimed(profileId: string): Promise<boolean> {
  const { data } = await db
    .from("merchant_onboarding_profiles")
    .select("onboarding_status, claimed_by")
    .eq("id", profileId)
    .maybeSingle();
  return data?.claimed_by != null || data?.onboarding_status !== "imported_not_claimed";
}

/** Rate-limit claim attempts per user — max 5 in 30 min */
export async function checkClaimRateLimit(userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data } = await db
    .from("claim_attempts")
    .select("id")
    .eq("user_id", userId)
    .gte("created_at", cutoff);

  if ((data?.length ?? 0) >= 5) {
    throw new Error("Too many claim attempts. Please wait before trying again.");
  }
}

/** Log a claim attempt for abuse tracking */
export async function logClaimAttempt(params: {
  merchantProfileId: string;
  userId: string;
  verificationMethod: string;
  verificationValue: string;
  status: "attempted" | "verified" | "claimed" | "rejected";
  flagged?: boolean;
}) {
  await db
    .from("claim_attempts")
    .insert({
      merchant_profile_id: params.merchantProfileId,
      user_id: params.userId,
      verification_method: params.verificationMethod,
      verification_value: params.verificationValue,
      status: params.status,
      flagged: params.flagged ?? false,
    });
}

/** Send OTP for phone verification (server-side via Twilio) */
export async function sendClaimOtp(
  phone: string,
  channel: "sms" | "whatsapp" = "sms"
): Promise<void> {
  const { createOtpSession } = await import("@/lib/security/otp-hardened");
  await createOtpSession("phone", phone, channel);
}

/** Verify OTP code (hardened — hash comparison, expiry, attempt limits) */
export async function verifyClaimOtp(phone: string, code: string): Promise<boolean> {
  const { verifyOtp } = await import("@/lib/security/otp-hardened");
  const result = await verifyOtp(phone, code);
  return result.valid;
}

/** Send email verification code (hardened) */
export async function sendClaimEmailCode(email: string): Promise<void> {
  const { createOtpSession } = await import("@/lib/security/otp-hardened");
  await createOtpSession("email", email);
}

/** Verify email code (hardened) */
export async function verifyClaimEmailCode(email: string, code: string): Promise<boolean> {
  const { verifyOtp } = await import("@/lib/security/otp-hardened");
  const result = await verifyOtp(email, code);
  return result.valid;
}

/** Claim a restaurant — attach it to the authenticated user (requires prior verification) */
export async function claimRestaurant(params: {
  profileId: string;
  userId: string;
  verificationMethod: "phone" | "email";
  verificationValue: string;
}) {
  // Double-check not already claimed
  const alreadyClaimed = await isAlreadyClaimed(params.profileId);
  if (alreadyClaimed) throw new Error("This restaurant has already been claimed.");

  // Rate limit check
  await checkClaimRateLimit(params.userId);

  // Log the claim attempt
  await logClaimAttempt({
    merchantProfileId: params.profileId,
    userId: params.userId,
    verificationMethod: params.verificationMethod,
    verificationValue: params.verificationValue,
    status: "claimed",
  });

  // Update the merchant profile
  const { error } = await db
    .from("merchant_onboarding_profiles")
    .update({
      claimed_by: params.userId,
      claimed_at: new Date().toISOString(),
      claim_verification_method: params.verificationMethod,
      verification_status: "verified",
      verified_at: new Date().toISOString(),
      onboarding_status: "claimed",
    })
    .eq("id", params.profileId)
    .eq("onboarding_status", "imported_not_claimed");

  if (error) throw error;

  // Update outreach if exists
  await db
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
  name_ar?: string;
  description_ar?: string;
}) {
  const { error } = await db
    .from("merchant_onboarding_profiles")
    .update(updates)
    .eq("id", profileId);
  if (error) throw error;
}

/** Resolve storefront owner from merchant profile */
async function resolveStorefrontOwner(profileId: string): Promise<string | null> {
  const { data } = await db
    .from("merchant_onboarding_profiles")
    .select("claimed_by")
    .eq("id", profileId)
    .maybeSingle();
  return data?.claimed_by ?? null;
}

/** Set merchant open/closed status */
export async function setMerchantOpenStatus(profileId: string, isOpen: boolean) {
  const ownerId = await resolveStorefrontOwner(profileId);
  if (!ownerId) return;

  const { data: storefront } = await db
    .from("storefront_pages")
    .select("id")
    .or(`user_id.eq.${ownerId},org_id.eq.${ownerId}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (storefront) {
    await db
      .from("storefront_pages")
      .update({ readiness_status: isOpen ? "live" : "draft", shop_visibility: isOpen ? "public" : "hidden" })
      .eq("id", storefront.id);
  }
}

/** Resolve or create seed_merchants entry for a user */
async function resolveOrCreateSeedMerchant(userId: string, profile: { merchant_name?: string; cuisine_type?: string; city?: string }): Promise<string | null> {
  const { data: existing } = await db
    .from("seed_merchants")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await db
    .from("seed_merchants")
    .insert({
      user_id: userId,
      name: profile.merchant_name || "My Business",
      cuisine_type: profile.cuisine_type || null,
      city: profile.city || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[claim-service] seed_merchants creation failed:", error);
    return null;
  }
  return created.id;
}

/** Final activation: claimed → active, publish menu to seed_products */
export async function activateMerchant(profileId: string) {
  const { data: profile, error } = await db
    .from("merchant_onboarding_profiles")
    .select("claimed_by, merchant_name, cuisine_type, city")
    .eq("id", profileId)
    .maybeSingle();
  if (error) throw error;

  await db
    .from("merchant_onboarding_profiles")
    .update({ onboarding_status: "active" })
    .eq("id", profileId);

  const ownerId = profile?.claimed_by;
  if (ownerId) {
    const { data: storefront } = await db
      .from("storefront_pages")
      .select("id")
      .or(`user_id.eq.${ownerId},org_id.eq.${ownerId}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (storefront) {
      await db
        .from("storefront_pages")
        .update({ readiness_status: "live", shop_visibility: "public" })
        .eq("id", storefront.id);
    }

    const merchantId = await resolveOrCreateSeedMerchant(ownerId, {
      merchant_name: profile?.merchant_name,
      cuisine_type: profile?.cuisine_type,
      city: profile?.city,
    });

    if (merchantId) {
      const { data: menuItems } = await db
        .from("menu_items")
        .select("name, price, description, is_available, sort_order")
        .eq("merchant_profile_id", profileId);

      if (menuItems?.length) {
        const { data: existingProducts } = await db
          .from("seed_products")
          .select("id")
          .eq("merchant_id", merchantId)
          .limit(1);

        if (!existingProducts?.length) {
          const seedProducts = menuItems.map((item: { name: string; price: number | null; description: string | null; is_available: boolean; sort_order: number }) => ({
            merchant_id: merchantId,
            name: item.name,
            price: item.price,
            description: item.description || "",
            is_available: item.is_available,
            sort_order: item.sort_order,
          }));

          const { error: seedErr } = await db
            .from("seed_products")
            .insert(seedProducts);
          if (seedErr) console.error("[claim-service] seed_products insert failed:", seedErr);
        }
      }
    }
  }

  await db
    .from("merchant_outreach_campaigns")
    .update({ activated_at: new Date().toISOString(), status: "activated" })
    .eq("merchant_profile_id", profileId);

  return true;
}
