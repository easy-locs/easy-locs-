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

export async function fetchIntegrationHealth(): Promise<IntegrationHealthResponse> {
  const { data, error } = await db.functions.invoke("system-router", {
    body: { action: "integration-health" },
  });

  if (error) throw error;
  return data as IntegrationHealthResponse;
}
