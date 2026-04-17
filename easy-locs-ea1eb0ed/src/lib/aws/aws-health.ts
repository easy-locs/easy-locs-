import { db } from "@/services/db";

export interface AwsHealthReport {
  timestamp: string;
  region: string;
  overall: string;
  services: Record<string, { configured: boolean; reachable: boolean | null; latencyMs: number | null }>;
}

export async function getAwsHealthReport(): Promise<AwsHealthReport> {
  try {
    const { data, error } = await db.functions.invoke("aws-health-check", {});

    if (error) {
      return {
        timestamp: new Date().toISOString(),
        region: "unknown",
        overall: "unavailable",
        services: {},
      };
    }

    return data as AwsHealthReport;
  } catch {
    return {
      timestamp: new Date().toISOString(),
      region: "unknown",
      overall: "unavailable",
      services: {},
    };
  }
}

/**
 * Lightweight client-side AWS health probe used by the integrations registry.
 * The real reachability check lives in the `aws-health-check` edge function
 * (see `getAwsHealthReport`) — this probe just answers "is the AWS region
 * configured at all?" so we can flag the silent "no creds" case without
 * making a round-trip on every diagnostics render. AWS region is required
 * in dev: missing region also throws at boot via `validateIntegrationsBoot`.
 */
export function getAwsClientHealth(): { ok: boolean; reason?: string } {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const region = env?.VITE_AWS_REGION;
  if (!region) {
    return { ok: false, reason: "VITE_AWS_REGION is not set" };
  }
  return { ok: true };
}
