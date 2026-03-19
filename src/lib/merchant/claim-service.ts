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
  name_ar?: string | null;
  description_ar?: string | null;
}

/** Fetch a merchant profile by ID (for claim flow) */
export async function getMerchantProfile(profileId: string): Promise<ClaimableRestaurant | null> {
  const { data } = await (supabase as any)
    .from("merchant_onboarding_profiles")
    .select("id, merchant_name, cuisine_type, area, city, phone, email, onboarding_status, claimed_by, name_ar, description_ar")
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

/** Check if a restaurant is already claimed */
export async function isAlreadyClaimed(profileId: string): Promise<boolean> {
  const { data } = await (supabase as any)
    .from("merchant_onboarding_profiles")
    .select("onboarding_status, claimed_by")
    .eq("id", profileId)
    .maybeSingle();
  return data?.claimed_by != null || data?.onboarding_status !== "imported_not_claimed";
}

/** Rate-limit claim attempts per user — max 5 in 30 min */
export async function checkClaimRateLimit(userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data } = await (supabase as any)
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
  await (supabase as any)
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

/** Send OTP for phone verification */
export async function sendClaimOtp(phone: string): Promise<string> {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  
  // Store OTP session
  await (supabase as any)
    .from("phone_otp_sessions")
    .insert({ phone, otp_hash: otp, status: "pending" });

  // Send via edge function
  await supabase.functions.invoke("send-otp", {
    body: { phone, otp },
  });

  return otp; // In production, don't return OTP — it's sent via SMS only
}

/** Verify OTP code */
export async function verifyClaimOtp(phone: string, code: string): Promise<boolean> {
  const { data } = await (supabase as any)
    .from("phone_otp_sessions")
    .select("id, otp_hash")
    .eq("phone", phone)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return false;

  const isValid = data.otp_hash === code;

  await (supabase as any)
    .from("phone_otp_sessions")
    .update({ status: isValid ? "verified" : "failed" })
    .eq("id", data.id);

  return isValid;
}

/** Send email verification code */
export async function sendClaimEmailCode(email: string): Promise<string> {
  const code = String(Math.floor(100000 + Math.random() * 900000));

  // Store the code
  await (supabase as any)
    .from("phone_otp_sessions")
    .insert({ phone: email, otp_hash: code, status: "pending" });

  // In production, send via email edge function
  console.log(`[EMAIL VERIFY] Code ${code} sent to ${email}`);
  
  return code;
}

/** Verify email code */
export async function verifyClaimEmailCode(email: string, code: string): Promise<boolean> {
  return verifyClaimOtp(email, code); // Same logic, reuse phone_otp_sessions
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
  const { error } = await (supabase as any)
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
  name_ar?: string;
  description_ar?: string;
}) {
  const { error } = await (supabase as any)
    .from("merchant_onboarding_profiles")
    .update(updates)
    .eq("id", profileId);
  if (error) throw error;
}

/** Set merchant open/closed status */
export async function setMerchantOpenStatus(profileId: string, isOpen: boolean) {
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
