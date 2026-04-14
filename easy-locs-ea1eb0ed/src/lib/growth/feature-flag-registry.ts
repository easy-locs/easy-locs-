/**
 * Feature Flag Registry — Progressive rollout flags for platform layers.
 * DB-backed via system_feature_flags, with in-memory cache + fallback defaults.
 */

import { db } from "@/services/db";

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
  | "enable_ux_control"
  | "enable_real_estate"
  | "enable_property_crm"
  | "enable_property_automation"
  | "enable_property_workflows"
  | "enable_resilience_layer"
  | "enable_durable_workflows"
  | "enable_global_intelligence"
  | "enable_local_social_commerce"
  | "enable_intelligence_ingestion"
  | "enable_intelligence_ranking"
  | "enable_intelligence_ticker"
  | "enable_commerce_listings"
  | "enable_commerce_matching"
  | "enable_commerce_suggestions"
  | "enable_religious_utilities"
  | "enable_intelligence_shadow_validation"
  | "enable_repair_pipeline";

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
  enable_real_estate: true,      // already built
  enable_property_crm: false,
  enable_property_automation: false,
  enable_property_workflows: false,
  enable_resilience_layer: true,  // already built
  enable_durable_workflows: false,
  enable_global_intelligence: true,
  enable_local_social_commerce: false,
  enable_intelligence_ingestion: false,
  enable_intelligence_ranking: false,
  enable_intelligence_ticker: true,
  enable_commerce_listings: false,
  enable_commerce_matching: false,
  enable_commerce_suggestions: false,
  enable_religious_utilities: false,
  enable_intelligence_shadow_validation: false,
  enable_repair_pipeline: true,
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
  enable_real_estate: "Real estate vertical (marketplace, listings, property management)",
  enable_property_crm: "CRM layer for real estate (leads, pipeline, tasks)",
  enable_property_automation: "Automation engine for property flows (rent reminders, document expiry, lead scoring)",
  enable_property_workflows: "Durable workflows for property operations (create, publish, lease, payment)",
  enable_resilience_layer: "Resilience patterns (double-click guard, offline queue, session guards)",
  enable_durable_workflows: "Step-based durable workflow engine with retry/rollback/persistence",
  enable_global_intelligence: "Master gate — Global Country/City Intelligence Layer (System A)",
  enable_local_social_commerce: "Master gate — Zero-Search Local Social Commerce Engine (System B)",
  enable_intelligence_ingestion: "Feed ingestion pipeline for global intelligence data sources",
  enable_intelligence_ranking: "Feed ranking and scoring engine for intelligence items",
  enable_intelligence_ticker: "Ticker surface contribution from intelligence layer",
  enable_commerce_listings: "Local listing creation and management for social commerce",
  enable_commerce_matching: "Zero-search matching engine execution for local commerce",
  enable_commerce_suggestions: "Suggestion delivery from social commerce matching",
  enable_religious_utilities: "Religious utility modules (prayer times, mosques — requires user opt-in)",
  enable_intelligence_shadow_validation: "Shadow-mode validation for real intelligence providers (dev only, zero user impact)",
  enable_repair_pipeline: "Autonomous repair pipeline — taxonomy-first rollout (default OFF, requires activation sheet)",
};

// ── In-memory cache ──
let flagCache: Record<string, boolean> = {};
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 60_000; // 1 min

/** Load all platform flags from DB into cache */
export async function loadPlatformFlags(): Promise<Record<PlatformFlag, boolean>> {
  try {
    const { data } = await db
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
  await db
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

export type FlagTargetDimension = "country" | "vertical" | "role" | "percentage";

export interface FlagTargetRule {
  dimension: FlagTargetDimension;
  values: string[];
  operator: "include" | "exclude";
}

export interface TargetedFlag {
  flag: PlatformFlag;
  rules: FlagTargetRule[];
}

const targetedFlagRules: TargetedFlag[] = [
  {
    flag: "enable_real_estate",
    rules: [
      { dimension: "vertical", values: ["property", "real_estate"], operator: "include" },
    ],
  },
  {
    flag: "enable_property_crm",
    rules: [
      { dimension: "role", values: ["admin", "agent", "property_manager"], operator: "include" },
      { dimension: "vertical", values: ["property"], operator: "include" },
    ],
  },
  {
    flag: "enable_property_automation",
    rules: [
      { dimension: "role", values: ["admin", "property_manager"], operator: "include" },
    ],
  },
];

export function evaluateTargetedFlag(
  flag: PlatformFlag,
  context: { country?: string; vertical?: string; role?: string },
): boolean {
  const base = isPlatformFlagEnabled(flag);
  if (!base) return false;

  const targeted = targetedFlagRules.find(r => r.flag === flag);
  if (!targeted) return base;

  for (const rule of targeted.rules) {
    const contextValue = context[rule.dimension as keyof typeof context];
    if (!contextValue) continue;

    const match = rule.values.includes(contextValue);
    if (rule.operator === "include" && !match) return false;
    if (rule.operator === "exclude" && match) return false;
  }

  return true;
}

export function getFlagTargetRules(flag: PlatformFlag): FlagTargetRule[] {
  return targetedFlagRules.find(r => r.flag === flag)?.rules ?? [];
}
