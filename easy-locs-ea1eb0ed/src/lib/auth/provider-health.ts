/**
 * AUTH DEPENDENCY: provider-health.ts
 * Contact points: useAuthProviders (hook), SocialLoginButtons, PhoneOTPFlow, AuthDiagnosticPage
 * Reads: db.auth.signInWithOAuth (dry-run), db.auth.signInWithOtp (dry-run error check)
 * No direct supabase.auth writes — all checks are read-only probes.
 */
import { db } from "@/services/db";
import { buildAppUrl } from "@/lib/app-domain";
import { authLog } from "@/lib/auth/auth-trace";

export interface ProviderHealthResult {
  phone: boolean;
  google: boolean;
  apple: boolean;
  checkedAt: number;
}

let cachedResult: ProviderHealthResult | null = null;
let checkInProgress: Promise<ProviderHealthResult> | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function checkOAuthProvider(provider: "google" | "apple"): Promise<boolean> {
  try {
    const redirectUrl = buildAppUrl("/auth/callback");
    const result = await Promise.race([
      db.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);
    if (!result) return false;
    return !result.error && !!result.data?.url;
  } catch {
    return false;
  }
}

const PHONE_NOT_ENABLED_PATTERNS = [
  "phone provider is not enabled",
  "unsupported provider",
  "provider is not enabled",
  "sms provider",
  "twilio",
  "phone signups are disabled",
  "phone logins are disabled",
  "not enabled",
  "provider not found",
  "validation_failed",
];

async function checkPhoneProvider(): Promise<boolean> {
  try {
    const result = await Promise.race([
      db.auth.signInWithOtp({ phone: "+15555550100" }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);
    if (!result) return false;
    if (result.error) {
      const msg = result.error.message.toLowerCase();
      const isNotEnabled = PHONE_NOT_ENABLED_PATTERNS.some((p) => msg.includes(p));
      if (isNotEnabled) return false;
      const isTransientError =
        msg.includes("network") ||
        msg.includes("fetch") ||
        msg.includes("timeout") ||
        msg.includes("500") ||
        msg.includes("503") ||
        msg.includes("rate") ||
        msg.includes("too many");
      if (isTransientError) return false;
      return true;
    }
    return true;
  } catch {
    return false;
  }
}

export async function checkAllProviders(forceRefresh = false): Promise<ProviderHealthResult> {
  if (!forceRefresh && cachedResult && Date.now() - cachedResult.checkedAt < CACHE_TTL_MS) {
    return cachedResult;
  }

  if (checkInProgress) {
    return checkInProgress;
  }

  checkInProgress = (async () => {
    try {
      const [phone, google, apple] = await Promise.all([
        checkPhoneProvider(),
        checkOAuthProvider("google"),
        checkOAuthProvider("apple"),
      ]);

      const result: ProviderHealthResult = {
        phone,
        google,
        apple,
        checkedAt: Date.now(),
      };

      cachedResult = result;

      authLog("PROVIDER_HEALTH_CHECK_COMPLETE", {
        phone: phone ? "available" : "unavailable",
        google: google ? "available" : "unavailable",
        apple: apple ? "available" : "unavailable",
      });

      return result;
    } finally {
      checkInProgress = null;
    }
  })();

  return checkInProgress;
}

export function getCachedProviderHealth(): ProviderHealthResult | null {
  return cachedResult;
}

export function invalidateProviderHealthCache(): void {
  cachedResult = null;
}
