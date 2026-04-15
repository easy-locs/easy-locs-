/**
 * AUTH DEPENDENCY: provider-health.ts
 * Contact points: useAuthProviders (hook), SocialLoginButtons, PhoneOTPFlow, AuthDiagnosticPage
 * Reads: db.auth.signInWithOAuth (dry-run), db.functions.invoke (phone probe)
 * No direct supabase.auth writes — all checks are read-only probes.
 */
import { db } from "@/services/db";
import { buildAppUrl } from "@/lib/app-domain";
import { authLog } from "@/lib/auth/auth-trace";

export interface ProviderHealthResult {
  phone: boolean;
  whatsapp: boolean;
  google: boolean;
  apple: boolean;
  checkedAt: number;
}

const CACHE_KEY = "easylocs_provider_health";
const CACHE_TTL_MS = 10 * 60 * 1000;

let cachedResult: ProviderHealthResult | null = null;
let checkInProgress: Promise<ProviderHealthResult> | null = null;

function loadFromStorage(): ProviderHealthResult | null {
  try {
    const stored = sessionStorage.getItem(CACHE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as ProviderHealthResult;
    if (Date.now() - parsed.checkedAt < CACHE_TTL_MS) {
      return parsed;
    }
    sessionStorage.removeItem(CACHE_KEY);
    return null;
  } catch {
    return null;
  }
}

function saveToStorage(result: ProviderHealthResult): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
  } catch {
    // silently ignore
  }
}

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

async function checkPhoneProvider(): Promise<{ phone: boolean; whatsapp: boolean }> {
  try {
    const result = await Promise.race([
      db.functions.invoke("send-otp", {
        body: { probe: true },
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);

    if (!result || result.error || !result.data) {
      return { phone: false, whatsapp: false };
    }

    return {
      phone: result.data.sms === true || result.data.configured === true,
      whatsapp: result.data.whatsapp === true,
    };
  } catch {
    return { phone: false, whatsapp: false };
  }
}

export async function checkAllProviders(forceRefresh = false): Promise<ProviderHealthResult> {
  if (!forceRefresh) {
    if (cachedResult && Date.now() - cachedResult.checkedAt < CACHE_TTL_MS) {
      return cachedResult;
    }

    const stored = loadFromStorage();
    if (stored) {
      cachedResult = stored;
      return stored;
    }
  }

  if (checkInProgress) {
    return checkInProgress;
  }

  checkInProgress = (async () => {
    try {
      const [phoneResult, google, apple] = await Promise.all([
        checkPhoneProvider(),
        checkOAuthProvider("google"),
        checkOAuthProvider("apple"),
      ]);

      const result: ProviderHealthResult = {
        phone: phoneResult.phone,
        whatsapp: phoneResult.whatsapp,
        google,
        apple,
        checkedAt: Date.now(),
      };

      cachedResult = result;
      saveToStorage(result);

      authLog("PROVIDER_HEALTH_CHECK_COMPLETE", {
        phone: phoneResult.phone ? "available" : "unavailable",
        whatsapp: phoneResult.whatsapp ? "available" : "unavailable",
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
  if (cachedResult) return cachedResult;
  const stored = loadFromStorage();
  if (stored) {
    cachedResult = stored;
    return stored;
  }
  return null;
}

export function invalidateProviderHealthCache(): void {
  cachedResult = null;
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // silently ignore
  }
}
