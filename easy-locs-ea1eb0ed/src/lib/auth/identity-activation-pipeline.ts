import { supabase } from "@/integrations/supabase/client";
import { db } from "@/services/db";
import { ensureOrbitProfile, invalidateOrbitProfileCache } from "@/lib/orbit/ensureOrbitProfile";
import { ensureUserProfile } from "@/lib/auth/profile";
import { normalizePhone } from "@/lib/auth/phone-identity";
import { platformBus } from "@/lib/shared/platform-bus";

export interface ActivationResult {
  success: boolean;
  userId: string;
  orbitId: string | null;
  walletReady: boolean;
  contactsSyncAvailable: boolean;
  error?: string;
}

export interface ActivationInput {
  userId: string;
  phone: string;
  displayName?: string;
  avatarUrl?: string;
  isNewUser: boolean;
}

export async function runIdentityActivation(input: ActivationInput): Promise<ActivationResult> {
  const { userId, phone, displayName, avatarUrl, isNewUser } = input;
  const normalized = normalizePhone(phone);
  let orbitId: string | null = null;
  let walletReady = false;

  try {
    await ensureUserProfile(userId, {
      fullName: displayName || undefined,
      phone: normalized,
    });

    await db
      .from("profiles")
      .upsert(
        {
          id: userId,
          phone: normalized,
          phone_verified: true,
          phone_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    invalidateOrbitProfileCache(userId);
    const orbitProfile = await ensureOrbitProfile({
      userId,
      phone: normalized,
      displayName: displayName || undefined,
      avatarUrl: avatarUrl || undefined,
    });
    orbitId = orbitProfile?.orbit_id ?? null;

    if (isNewUser) {
      await db
        .from("orbit_profiles_v2")
        .update({
          phone: normalized,
          phone_verified: true,
          verification_level: "phone_verified",
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    } else {
      await db
        .from("orbit_profiles_v2")
        .update({
          phone_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    }

    try {
      const { data: walletAccount } = await db
        .from("wallet_accounts")
        .select("id")
        .eq("owner_user_id", userId)
        .maybeSingle();

      if (walletAccount) {
        walletReady = true;
      } else {
        try {
          await supabase.rpc("ensure_wallet_account", {
            target_user_id: userId,
            target_currency: "EUR",
          });
          walletReady = true;
        } catch (walletErr) {
          console.warn("[IdentityActivation] Wallet creation deferred:", walletErr);
          walletReady = false;
        }
      }
    } catch {
      walletReady = false;
    }

    await logActivation(userId, normalized, isNewUser);

    platformBus.emit("identity:activated" as any, {
      userId,
      phone: normalized,
      orbitId,
      walletReady,
      isNewUser,
      timestamp: Date.now(),
    });

    return {
      success: true,
      userId,
      orbitId,
      walletReady,
      contactsSyncAvailable: true,
    };
  } catch (err) {
    console.error("[IdentityActivation] Pipeline failed:", err);
    return {
      success: false,
      userId,
      orbitId,
      walletReady,
      contactsSyncAvailable: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function logActivation(userId: string, phone: string, isNewUser: boolean) {
  try {
    await db.from("identity_activations").insert({
      user_id: userId,
      phone,
      activation_type: isNewUser ? "signup" : "login",
      activated_at: new Date().toISOString(),
      metadata: {
        method: "phone_otp",
        platform: navigator.userAgent?.includes("Mobile") ? "mobile" : "desktop",
      },
    });
  } catch {
    // Non-blocking: activation logging is best-effort
  }
}

export async function checkPhoneAvailability(phone: string): Promise<{
  available: boolean;
  existingUserId?: string;
}> {
  const normalized = normalizePhone(phone);
  const { data } = await db
    .from("orbit_profiles_v2")
    .select("id")
    .eq("phone", normalized)
    .maybeSingle();

  if (data?.id) {
    return { available: false, existingUserId: data.id };
  }
  return { available: true };
}
