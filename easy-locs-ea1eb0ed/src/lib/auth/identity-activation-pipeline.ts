/**
 * AUTH DEPENDENCY: identity-activation-pipeline.ts — Post-auth identity setup pipeline.
 * Contact points:
 *   - Login.tsx: runIdentityActivation called after phone OTP verification
 *   - Calls: auth/profile.ensureUserProfile, orbit/ensureOrbitProfile
 *   - Writes: db.from("profiles") (upsert phone_verified), db.from("orbit_profiles_v2") (verification_level)
 *   - Writes: db.rpc("ensure_wallet_account") for wallet creation
 *   - Writes: db.from("identity_activations") for audit logging
 *   - Uses: withRetry with exponential backoff for non-critical steps (orbit, wallet)
 *   - Non-critical failures (orbit, wallet) are logged but never block dashboard access
 */
import { db } from "@/services/db";
import { ensureOrbitProfile, invalidateOrbitProfileCache } from "@/lib/orbit/ensureOrbitProfile";
import { ensureUserProfile } from "@/lib/auth/profile";
import { normalizePhone } from "@/lib/auth/phone-identity";
import { platformBus } from "@/lib/shared/platform-bus";
import { structuredLogger } from "@/lib/observability/structured-logger";
import { recordAction } from "@/lib/control-plane/domain-health";
import { authLog, authWarn } from "@/lib/auth/auth-trace";

export interface ActivationResult {
  success: boolean;
  userId: string;
  orbitId: string | null;
  walletReady: boolean;
  contactsSyncAvailable: boolean;
  error?: string;
  stepResults?: Record<string, { success: boolean; error?: string; retries?: number }>;
}

export interface ActivationInput {
  userId: string;
  phone: string;
  displayName?: string;
  avatarUrl?: string;
  isNewUser: boolean;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries: number = 2,
  baseDelayMs: number = 500,
): Promise<{ result: T | null; success: boolean; error?: string; retries: number }> {
  let lastError: string | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      if (attempt > 0) {
        authLog("IDENTITY_ACTIVATION_RETRY", { step: label, attempt, status: "recovered" });
      }
      return { result, success: true, retries: attempt };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        authWarn("IDENTITY_ACTIVATION_RETRY", {
          step: label,
          attempt: attempt + 1,
          maxRetries,
          nextDelayMs: delay,
          error: lastError,
        });
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  return { result: null, success: false, error: lastError, retries: maxRetries };
}

export async function runIdentityActivation(input: ActivationInput): Promise<ActivationResult> {
  const { userId, phone, displayName, avatarUrl, isNewUser } = input;
  const normalized = normalizePhone(phone);
  let orbitId: string | null = null;
  let walletReady = false;
  const stepResults: Record<string, { success: boolean; error?: string; retries?: number }> = {};

  const pipelineStart = performance.now();
  structuredLogger.info("identity", "activation.start", `Identity activation started for ${isNewUser ? "new" : "returning"} user`, { is_new_user: isNewUser });
  authLog("IDENTITY_ACTIVATION_STEP", { step: "start", userId, isNewUser });

  try {
    const profileStep = await withRetry(
      () => ensureUserProfile(userId, { fullName: displayName || undefined, phone: normalized }),
      "ensure_user_profile",
    );
    stepResults["ensure_user_profile"] = profileStep;
    authLog("IDENTITY_ACTIVATION_STEP", { step: "ensure_user_profile", ...profileStep });

    const phoneUpdateStep = await withRetry(
      async () => {
        const { error } = await db
          .from("profiles")
          .upsert(
            {
              id: userId,
              phone: normalized,
              phone_verified: true,
              phone_verified_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" },
          );
        if (error) throw error;
      },
      "phone_verified_update",
    );
    stepResults["phone_verified_update"] = phoneUpdateStep;
    authLog("IDENTITY_ACTIVATION_STEP", { step: "phone_verified_update", ...phoneUpdateStep });

    invalidateOrbitProfileCache(userId);
    const orbitStep = await withRetry(
      () =>
        ensureOrbitProfile({
          userId,
          phone: normalized,
          displayName: displayName || undefined,
          avatarUrl: avatarUrl || undefined,
        }),
      "ensure_orbit_profile",
    );
    stepResults["ensure_orbit_profile"] = orbitStep;
    orbitId = orbitStep.result?.orbit_id ?? null;
    authLog("IDENTITY_ACTIVATION_STEP", { step: "ensure_orbit_profile", success: orbitStep.success, orbitId });

    if (!orbitStep.success) {
      structuredLogger.warn("identity", "activation.orbit_deferred", "Orbit profile creation deferred — non-blocking", {
        error: orbitStep.error,
      });
    }

    const verificationStep = await withRetry(
      async () => {
        const { error } = await db
          .from("orbit_profiles_v2")
          .update({
            verification_level: 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
        if (error) throw error;
      },
      "verification_level_update",
    );
    stepResults["verification_level_update"] = verificationStep;

    if (isNewUser) {
      await withRetry(
        async () => {
          const { error } = await db
            .from("profiles")
            .update({
              phone: normalized,
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId);
          if (error) throw error;
        },
        "new_user_phone_update",
      ).then((r) => {
        stepResults["new_user_phone_update"] = r;
      });
    }

    const walletStep = await withRetry(
      async () => {
        const { data: walletAccount, error: walletCheckError } = await db
          .from("wallet_accounts")
          .select("id")
          .eq("owner_user_id", userId)
          .maybeSingle();

        if (walletCheckError) throw walletCheckError;
        if (walletAccount) return true;

        const { error: rpcError } = await db.rpc("ensure_wallet_account", {
          target_user_id: userId,
          target_currency: "EUR",
        });
        if (rpcError) throw rpcError;
        return true;
      },
      "wallet_creation",
      2,
      1000,
    );
    stepResults["wallet_creation"] = walletStep;
    walletReady = walletStep.success;
    authLog("IDENTITY_ACTIVATION_STEP", { step: "wallet_creation", success: walletStep.success });

    if (!walletStep.success) {
      structuredLogger.warn("wallet", "activation.wallet_deferred", "Wallet creation deferred during activation — non-blocking", {
        error: walletStep.error,
      });
    }

    await logActivation(userId, normalized, isNewUser);

    const elapsed = Math.round(performance.now() - pipelineStart);
    recordAction("identity", "activation.complete", true, elapsed);
    structuredLogger.info("identity", "activation.complete", "Identity activation succeeded", {
      orbit_id: orbitId,
      wallet_ready: walletReady,
      is_new_user: isNewUser,
      elapsed_ms: elapsed,
    });

    platformBus.emit("identity:activated", {
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
      stepResults,
    };
  } catch (err) {
    const elapsed = Math.round(performance.now() - pipelineStart);
    const errorMsg = err instanceof Error ? err.message : String(err);
    recordAction("identity", "activation.complete", false, elapsed);
    structuredLogger.error("identity", "activation.failed", `Identity activation failed: ${errorMsg}`, {
      is_new_user: isNewUser,
      elapsed_ms: elapsed,
      error_code: errorMsg,
    });
    return {
      success: false,
      userId,
      orbitId,
      walletReady,
      contactsSyncAvailable: false,
      error: errorMsg,
      stepResults,
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
  }
}

export async function checkPhoneAvailability(phone: string): Promise<{
  available: boolean;
  existingUserId?: string;
}> {
  const normalized = normalizePhone(phone);
  const { data } = await db
    .from("profiles")
    .select("id")
    .eq("phone", normalized)
    .maybeSingle();

  if (data?.id) {
    return { available: false, existingUserId: data.id };
  }
  return { available: true };
}
