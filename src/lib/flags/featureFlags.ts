/**
 * Feature Flags — Lightweight abstraction over LaunchDarkly or local defaults.
 * Safe fallback to local config if LD is not configured.
 */

type FlagValue = boolean | string | number;

/** Local fallback defaults */
const LOCAL_FLAGS: Record<string, FlagValue> = {
  "seasonal_theme_enabled": true,
  "rtl_auto_detect": true,
  "photo_harmonization": true,
  "dino_auto_fix": true,
  "dino_dashboard_visible": true,
  "journey_tracking": true,
  "messaging_automation": false,
  "category_auto_cleanup": true,
  "media_optimization": true,
};

let ldClient: any = null;
let ldReady = false;

/**
 * Initialize LaunchDarkly (optional — degrades gracefully).
 */
export async function initFeatureFlags(user?: {
  key: string;
  country?: string;
  language?: string;
  role?: string;
}) {
  const clientId = import.meta.env.VITE_LD_CLIENT_ID as string | undefined;
  if (!clientId || !user) return;

  try {
    const { initialize } = await import("launchdarkly-js-client-sdk");
    ldClient = initialize(clientId, {
      key: user.key,
      country: user.country,
      custom: { language: user.language, role: user.role },
    });
    await ldClient.waitForInitialization(5);
    ldReady = true;
  } catch {
    // Silent fallback to local flags
    ldReady = false;
  }
}

/**
 * Get a feature flag value with fallback.
 */
export function getFlag<T extends FlagValue>(key: string, fallback: T): T {
  if (ldReady && ldClient) {
    return ldClient.variation(key, fallback) as T;
  }
  return (LOCAL_FLAGS[key] as T) ?? fallback;
}

/**
 * Check if a boolean flag is on.
 */
export function isFlagEnabled(key: string): boolean {
  return getFlag(key, false);
}
