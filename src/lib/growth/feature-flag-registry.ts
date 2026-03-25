/**
 * Feature Flag Registry — Progressive rollout flags for platform layers.
 * DB-backed via system_feature_flags, with in-memory cache + fallback defaults.
 */

import { supabase } from "@/integrations/supabase/client";

export type PlatformFlag =
  | "enable_super_app"
  | "enable_domination"
  | "enable_wallet"
  | "enable_ai_radar"
  | "enable_orbit_actions"
  | "enable_monetization"
  | "enable_growth_scraper"
  | "enable_seo_mass"
  | "enable_smart_invitations"
  | "enable_realtime_layer"
  | "enable_ai_brain"
  | "enable_money_engine"
  | "enable_personal_radar"
  | "enable_ux_control";

/** Default values — all off for safety, rollout one by one */
const FLAG_DEFAULTS: Record<PlatformFlag, boolean> = {
  enable_super_app: false,
  enable_domination: false,
  enable_wallet: true,           // already built
  enable_ai_radar: true,         // already built
  enable_orbit_actions: true,    // already built
  enable_monetization: false,
  enable_growth_scraper: false,
  enable_seo_mass: false,
  enable_smart_invitations: false,
  enable_realtime_layer: true,   // already wired
  enable_ai_brain: false,
  enable_money_engine: false,
  enable_personal_radar: true,   // already built
  enable_ux_control: true,       // already built
};

const FLAG_DESCRIPTIONS: Record<PlatformFlag, string> = {
  enable_super_app: "Master switch for Super App layer (Orbit+Wallet+Radar fusion)",
  enable_domination: "Growth domination engine (auto-acquisition, SEO mass, invitations)",
  enable_wallet: "Wallet & payment flows",
  enable_ai_radar: "AI-powered radar with smart suggestions",
  enable_orbit_actions: "Chat-to-action flows (pay/order/book from Orbit)",
  enable_monetization: "Sponsored boost, dynamic ranking, smart ads",
  enable_growth_scraper: "Auto-acquisition scraper (Deliveroo/Google/Booking)",
  enable_seo_mass: "SEO mass page generation engine",
  enable_smart_invitations: "Smart invitation engine (WhatsApp/email outreach)",
  enable_realtime_layer: "Real-time event reactions (<300ms)",
  enable_ai_brain: "AI brain decisions (behavior, prediction, next-best-action)",
  enable_money_engine: "Autonomous revenue engine (boost, ads, subscriptions)",
  enable_personal_radar: "Personalized radar (For You, Best Now, Hidden Gems)",
  enable_ux_control: "UX control engine (overlap/overflow detection, auto-fix)",
};

// ── In-memory cache ──
let flagCache: Record<string, boolean> = {};
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 60_000; // 1 min

/** Load all platform flags from DB into cache */
export async function loadPlatformFlags(): Promise<Record<PlatformFlag, boolean>> {
  try {
    const { data } = await (supabase as any)
      .from("system_feature_flags")
      .select("flag_key, flag_value")
      .like("flag_key", "enable_%");

    const result = { ...FLAG_DEFAULTS };
    for (const row of data ?? []) {
      if (row.flag_key in result) {
        (result as any)[row.flag_key] = row.flag_value === true || row.flag_value === "true";
      }
    }
    flagCache = result;
    cacheLoadedAt = Date.now();
    return result;
  } catch {
    return { ...FLAG_DEFAULTS };
  }
}

/** Check a single flag (cache-first) */
export function isPlatformFlagEnabled(flag: PlatformFlag): boolean {
  if (Date.now() - cacheLoadedAt > CACHE_TTL_MS) {
    // Async reload, return cached/default in the meantime
    void loadPlatformFlags();
  }
  return flagCache[flag] ?? FLAG_DEFAULTS[flag];
}

/** Toggle a flag (writes to DB) */
export async function togglePlatformFlag(flag: PlatformFlag, enabled: boolean) {
  await (supabase as any)
    .from("system_feature_flags")
    .upsert(
      {
        workspace_id: null,
        flag_key: flag,
        flag_value: enabled,
        description: FLAG_DESCRIPTIONS[flag] ?? flag,
      },
      { onConflict: "workspace_id,flag_key" }
    );
  flagCache[flag] = enabled;
}

/** Get all flags with descriptions for cockpit display */
export function getAllPlatformFlags(): Array<{
  key: PlatformFlag;
  enabled: boolean;
  description: string;
}> {
  return (Object.keys(FLAG_DEFAULTS) as PlatformFlag[]).map((key) => ({
    key,
    enabled: flagCache[key] ?? FLAG_DEFAULTS[key],
    description: FLAG_DESCRIPTIONS[key],
  }));
}
