import { db } from "@/services/db";

export interface ServiceHealth {
  status: "ok" | "error" | "not_configured";
  latencyMs?: number;
  error?: string;
  version?: string;
}

export interface IntegrationHealthResponse {
  status: "ok" | "degraded" | "partial";
  services: {
    plaid: ServiceHealth;
    livekit: ServiceHealth;
    meilisearch: ServiceHealth;
  };
  latencyMs: number;
  timestamp: string;
}

export interface HealthLogPoint {
  id: string;
  overall_status: string;
  plaid_status: string;
  plaid_latency_ms: number | null;
  livekit_status: string;
  livekit_latency_ms: number | null;
  meilisearch_status: string;
  meilisearch_latency_ms: number | null;
  total_latency_ms: number;
  checked_at: string;
}

export type HealthRange = "24h" | "7d" | "30d";

export interface IntegrationHealthHistoryResponse {
  range: HealthRange;
  total: number;
  uptime: Record<string, number | null>;
  points: HealthLogPoint[];
}

export async function fetchIntegrationHealth(): Promise<IntegrationHealthResponse> {
  const { data, error } = await db.functions.invoke("system-router", {
    body: { action: "integration-health" },
  });

  if (error) throw error;
  return data as IntegrationHealthResponse;
}

export async function fetchIntegrationHealthHistory(
  range: HealthRange = "24h",
): Promise<IntegrationHealthHistoryResponse> {
  const { data, error } = await db.functions.invoke("system-router", {
    body: { action: "integration-health-history", range },
  });

  if (error) throw error;
  return data as IntegrationHealthHistoryResponse;
}
