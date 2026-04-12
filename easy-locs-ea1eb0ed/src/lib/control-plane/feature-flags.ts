import { structuredLogger } from "@/lib/observability/structured-logger";
import type { ControlDomain, FeatureFlag } from "./types";

const featureFlags = new Map<string, FeatureFlag>();

const ENV = typeof window !== "undefined"
  ? (window as any).__ENV__ || "development"
  : process.env.NODE_ENV || "development";

const DEFAULT_FLAGS: Omit<FeatureFlag, "id">[] = [
  { name: "orbit_enabled", domain: "orbit", enabled: true, rollout_percentage: 100, environments: ["development", "staging", "production"] },
  { name: "orbit_calls_enabled", domain: "orbit_call", enabled: true, rollout_percentage: 100, environments: ["development", "staging", "production"] },
  { name: "orbit_video_calls_enabled", domain: "orbit_call", enabled: true, rollout_percentage: 50, environments: ["development", "staging"] },
  { name: "wallet_enabled", domain: "wallet", enabled: true, rollout_percentage: 100, environments: ["development", "staging", "production"] },
  { name: "wallet_qr_pay_enabled", domain: "payment", enabled: true, rollout_percentage: 100, environments: ["development", "staging", "production"] },
  { name: "wallet_invisible_pay_enabled", domain: "payment", enabled: false, rollout_percentage: 0, environments: ["development"] },
  { name: "radar_enabled", domain: "radar", enabled: true, rollout_percentage: 100, environments: ["development", "staging", "production"] },
  { name: "radar_osm_enrichment", domain: "radar", enabled: true, rollout_percentage: 100, environments: ["development", "staging", "production"] },
  { name: "scraping_publish_enabled", domain: "scraping", enabled: true, rollout_percentage: 100, environments: ["development", "staging", "production"] },
  { name: "provider_publish_enabled", domain: "listing", enabled: true, rollout_percentage: 100, environments: ["development", "staging", "production"] },
  { name: "food_enabled", domain: "food", enabled: true, rollout_percentage: 100, environments: ["development", "staging", "production"] },
  { name: "hotel_enabled", domain: "hotel", enabled: true, rollout_percentage: 100, environments: ["development", "staging", "production"] },
  { name: "services_enabled", domain: "services", enabled: true, rollout_percentage: 100, environments: ["development", "staging", "production"] },
  { name: "flights_enabled", domain: "flights", enabled: false, rollout_percentage: 0, environments: ["development"] },
  { name: "property_management_enabled", domain: "property", enabled: true, rollout_percentage: 100, environments: ["development", "staging", "production"] },
  { name: "booking_checkout_enabled", domain: "booking", enabled: true, rollout_percentage: 100, environments: ["development", "staging", "production"] },
  { name: "e2ee_enabled", domain: "orbit", enabled: true, rollout_percentage: 30, environments: ["development", "staging"] },
  { name: "ai_assistant_enabled", domain: "dashboard", enabled: true, rollout_percentage: 100, environments: ["development", "staging", "production"] },
  { name: "session_replay_enabled", domain: "dashboard", enabled: false, rollout_percentage: 0, environments: [] },
  { name: "global_intelligence_enabled", domain: "intelligence", enabled: false, rollout_percentage: 0, environments: [] },
  { name: "local_social_commerce_enabled", domain: "local_commerce", enabled: false, rollout_percentage: 0, environments: [] },
];

function initFlags(): void {
  for (const flag of DEFAULT_FLAGS) {
    const id = `ff_${flag.name}`;
    if (!featureFlags.has(flag.name)) {
      featureFlags.set(flag.name, { ...flag, id });
    }
  }
}

initFlags();

export function isEnabled(name: string, userId?: string): boolean {
  const flag = featureFlags.get(name);
  if (!flag) return true;
  if (!flag.enabled) return false;
  if (!flag.environments.includes(ENV)) return false;
  if (flag.rollout_percentage >= 100) return true;
  if (flag.rollout_percentage <= 0) return false;

  if (userId) {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
    }
    return Math.abs(hash % 100) < flag.rollout_percentage;
  }

  return Math.random() * 100 < flag.rollout_percentage;
}

export function setFlag(name: string, enabled: boolean, rollout?: number): void {
  const flag = featureFlags.get(name);
  if (flag) {
    flag.enabled = enabled;
    if (rollout != null) flag.rollout_percentage = rollout;
    structuredLogger.info(
      flag.domain as any,
      "feature_flag.updated",
      `${name}: enabled=${enabled}, rollout=${flag.rollout_percentage}%`
    );
  }
}

export function getFlag(name: string): FeatureFlag | undefined {
  return featureFlags.get(name);
}

export function getAllFlags(): FeatureFlag[] {
  return Array.from(featureFlags.values());
}

export function getFlagsByDomain(domain: ControlDomain): FeatureFlag[] {
  return Array.from(featureFlags.values()).filter((f) => f.domain === domain);
}

export function getActiveFlags(): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const [name, flag] of featureFlags) {
    result[name] = flag.enabled && flag.environments.includes(ENV);
  }
  return result;
}
