/**
 * Health-check aggregator. Each integration exposes its own `getHealth()`
 * returning `{ ok, reason? }`; this module collects them so the admin
 * diagnostics page (and ops alerting) can render a single status surface.
 *
 * `getHealth()` implementations MUST be cheap and synchronous-ish (an awaitable
 * Promise resolving in <500ms). Anything heavier — like reaching out to AWS or
 * Plaid — is owned by an edge function and surfaced separately on the existing
 * `AdminIntegrationHealthPage` (Plaid / LiveKit / Meilisearch).
 */

import { INTEGRATION_REGISTRY, snapshotEnv, type IntegrationId } from "./registry";
import { getSentryHealth } from "@/lib/analytics/sentry";
import { getPostHogHealth } from "@/lib/analytics/posthog";
import { getMaplibreHealth, getMapboxHealth } from "@/lib/maplibre/config";
import { getAwsClientHealth } from "@/lib/aws/aws-health";
import { getCapacitorHealth } from "@/lib/native/native-plugins";

export interface IntegrationHealth {
  ok: boolean;
  reason?: string;
}

export interface IntegrationHealthEntry {
  id: IntegrationId;
  label: string;
  description: string;
  health: IntegrationHealth;
  envPresence: Record<string, boolean>;
  optionalEnvPresence: Record<string, boolean>;
  /**
   * Each entry is a group of env var names where at least one must be set
   * (e.g. legacy aliases). Diagnostics renders these grouped so operators
   * understand which alternative satisfies the requirement.
   */
  requiredAnyOfPresence: { names: string[]; satisfied: boolean }[];
}

function getSupabaseHealth(): IntegrationHealth {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const url = env?.VITE_SUPABASE_URL;
  const key = env?.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url) return { ok: false, reason: "VITE_SUPABASE_URL is not set" };
  if (!key) return { ok: false, reason: "VITE_SUPABASE_PUBLISHABLE_KEY is not set" };
  if (!/^https?:\/\//i.test(url)) {
    return { ok: false, reason: "VITE_SUPABASE_URL is not a valid URL" };
  }
  return { ok: true };
}

const HEALTH_PROBES: Record<IntegrationId, () => IntegrationHealth | Promise<IntegrationHealth>> = {
  supabase: getSupabaseHealth,
  maplibre: getMaplibreHealth,
  mapbox: getMapboxHealth,
  aws: getAwsClientHealth,
  sentry: getSentryHealth,
  posthog: getPostHogHealth,
  capacitor: getCapacitorHealth,
};

export async function getIntegrationHealthEntry(id: IntegrationId): Promise<IntegrationHealthEntry> {
  const def = INTEGRATION_REGISTRY[id];
  let health: IntegrationHealth;
  try {
    health = await HEALTH_PROBES[id]();
  } catch (err) {
    health = { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
  const requiredAnyOfPresence = (def.requiredEnvAnyOf ?? []).map((group) => {
    const presence = snapshotEnv(group);
    return { names: group, satisfied: group.some((k) => presence[k]) };
  });
  return {
    id: def.id,
    label: def.label,
    description: def.description,
    health,
    envPresence: snapshotEnv(def.requiredEnv),
    optionalEnvPresence: snapshotEnv(def.optionalEnv),
    requiredAnyOfPresence,
  };
}

export async function getAllIntegrationHealth(): Promise<IntegrationHealthEntry[]> {
  const ids = Object.keys(INTEGRATION_REGISTRY) as IntegrationId[];
  return Promise.all(ids.map(getIntegrationHealthEntry));
}
