/**
 * claimService — Manages claim tokens, verification, and ownership transfer
 * for imported/staged businesses.
 * 
 * Flow:
 * 1. Admin generates claim token for a draft storefront
 * 2. Token is sent to restaurant owner (WhatsApp/SMS/email link)
 * 3. Owner opens claim page → verifies identity → claims business
 * 4. Business moves to claimed state, owner can edit + activate
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface ClaimToken {
  id: string;
  storefront_id: string;
  token: string;
  expires_at: string;
  claimed_by?: string;
  claimed_at?: string;
  status: "pending" | "claimed" | "expired";
}

/** Generate a unique claim token for a storefront */
export async function generateClaimToken(
  storefrontId: string,
  expiresInDays = 30
): Promise<{ token: string; claimUrl: string } | null> {
  // Generate secure random token
  const token = `claim_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
  const expiresAt = new Date(Date.now() + expiresInDays * 86400_000).toISOString();

  // Store in merchant_onboarding_sources as claim metadata
  const { error } = await db.from("merchant_onboarding_sources").insert({
    source_type: "claim_token",
    source_name: "claim",
    source_external_id: token,
    status: "pending_claim",
    payload: {
      storefront_id: storefrontId,
      token,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    },
  });

  if (error) {
    console.error("[claimService] Failed to create claim token:", error.message);
    return null;
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "https://easy-locs.lovable.app";
  return {
    token,
    claimUrl: `${origin}/claim/${token}`,
  };
}

/** Verify a claim token and return storefront info */
export async function verifyClaimToken(token: string): Promise<{
  valid: boolean;
  storefrontId?: string;
  storefront?: any;
  reason?: string;
}> {
  const { data: source } = await db
    .from("merchant_onboarding_sources")
    .select("id, status, payload")
    .eq("source_external_id", token)
    .eq("source_type", "claim_token")
    .maybeSingle();

  if (!source) return { valid: false, reason: "Token not found" };
  if (source.status === "claimed") return { valid: false, reason: "Already claimed" };

  const payload = source.payload || {};
  const expiresAt = payload.expires_at;
  if (expiresAt && new Date(expiresAt) < new Date()) {
    return { valid: false, reason: "Token expired" };
  }

  const storefrontId = payload.storefront_id;
  if (!storefrontId) return { valid: false, reason: "No storefront linked" };

  // Fetch storefront info
  const { data: shop } = await db
    .from("storefront_pages")
    .select("id, name, slug, city, country, vertical, logo_url, contact_phone, latitude, longitude")
    .eq("id", storefrontId)
    .maybeSingle();

  if (!shop) return { valid: false, reason: "Storefront not found" };

  return { valid: true, storefrontId, storefront: shop };
}

/** Execute the claim: transfer ownership to the authenticated user */
export async function executeClaim(
  token: string,
  userId: string,
  orgId: string
): Promise<{ success: boolean; storefrontId?: string; error?: string }> {
  const verification = await verifyClaimToken(token);
  if (!verification.valid) {
    return { success: false, error: verification.reason };
  }

  const storefrontId = verification.storefrontId!;

  // Transfer ownership
  const { error: updateErr } = await db.from("storefront_pages").update({
    user_id: userId,
    org_id: orgId,
    is_claimed: true,
    status: "claimed_pending_activation",
    updated_at: new Date().toISOString(),
  }).eq("id", storefrontId);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  // Mark token as claimed
  await db.from("merchant_onboarding_sources")
    .update({
      status: "claimed",
      payload: db.rpc ? undefined : undefined, // Can't easily merge JSONB on client
    })
    .eq("source_external_id", token)
    .eq("source_type", "claim_token");

  // Audit
  await db.from("audit_logs").insert({
    action: "business_claimed",
    user_id: userId,
    metadata_json: {
      storefront_id: storefrontId,
      token,
      timestamp: new Date().toISOString(),
    },
  }).catch(() => {});

  return { success: true, storefrontId };
}

/** Generate outreach message for a storefront */
export function generateOutreachMessage(
  storefront: { name: string; city?: string },
  claimUrl: string,
  lang: "en" | "fr" | "ar" = "en"
): { subject: string; body: string } {
  const msgs = {
    en: {
      subject: `${storefront.name} — Your store is ready on Easy Locs`,
      body: `Hi,\n\nYour restaurant "${storefront.name}" ${storefront.city ? `in ${storefront.city} ` : ""}is already listed on Easy Locs.\n\n✅ Activate your store in 2 minutes\n🆓 0% commission for the first 30 days\n💰 Only 5% after — cheaper than any competitor\n\nClaim your store now:\n${claimUrl}\n\n— Easy Locs Team`,
    },
    fr: {
      subject: `${storefront.name} — Votre restaurant est prêt sur Easy Locs`,
      body: `Bonjour,\n\nVotre restaurant "${storefront.name}" ${storefront.city ? `à ${storefront.city} ` : ""}est déjà listé sur Easy Locs.\n\n✅ Activez votre boutique en 2 minutes\n🆓 0% de commission pendant 30 jours\n💰 Seulement 5% après — moins cher que la concurrence\n\nRéclamez votre boutique :\n${claimUrl}\n\n— L'équipe Easy Locs`,
    },
    ar: {
      subject: `${storefront.name} — متجرك جاهز على Easy Locs`,
      body: `مرحباً،\n\nمطعمك "${storefront.name}" ${storefront.city ? `في ${storefront.city} ` : ""}مدرج بالفعل على Easy Locs.\n\n✅ فعّل متجرك في دقيقتين\n🆓 0% عمولة لأول 30 يوم\n💰 فقط 5% بعد ذلك — أرخص من أي منافس\n\nاطلب ملكية متجرك:\n${claimUrl}\n\n— فريق Easy Locs`,
    },
  };
  return msgs[lang] || msgs.en;
}
