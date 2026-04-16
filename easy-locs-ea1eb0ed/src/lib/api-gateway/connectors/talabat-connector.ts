import { BaseConnector } from "./base-connector";
import type { ConnectorConfig, NormalizedDataPoint } from "../types";
import { supabase } from "@/integrations/supabase/client";

const TALABAT_CONFIG: ConnectorConfig = {
  id: "talabat_partner",
  name: "Talabat",
  description: "Talabat Affiliate API for restaurant and menu data with Firecrawl scraping fallback",
  type: "rest",
  domain: "food_delivery",
  pollingIntervalMs: 1_800_000,
  authMethod: "api_key",
  baseUrl: "https://api.talabat.com/partner/v1",
  healthCheckUrl: "https://api.talabat.com/partner/v1/status",
  readOnlyEndpoints: [
    "/vendors",
    "/vendors/{id}/menu",
    "/vendors/{id}/reviews",
  ],
  enabled: true,
  tags: ["food-delivery", "marketplace", "partner-api", "mena"],
  fallbackConnectorId: "talabat_scraper",
  quotaLimit: 500,
  quotaWindowMs: 3_600_000,
  timeoutMs: 10_000,
  retryCount: 2,
};

export class TalabatConnector extends BaseConnector {
  constructor() {
    super(TALABAT_CONFIG);
  }

  protected async doFetch(): Promise<NormalizedDataPoint[]> {
    const { data, error } = await supabase.functions.invoke("gateway-marketplace-sync", {
      body: { source: "talabat", action: "fetch" },
    });

    if (error) {
      throw new Error(`Talabat sync via edge function failed: ${error.message}`);
    }

    const records = Array.isArray(data?.records) ? data.records : [];
    const now = Date.now();
    const usedFallback = data?.usedFallback === true;

    if (usedFallback) {
      this.markFallback(true);
    } else {
      this.markFallback(false);
    }

    return records.map((item: Record<string, unknown>) => ({
      connectorId: this.config.id,
      domain: this.config.domain,
      timestamp: now,
      data: {
        source: usedFallback ? "talabat_firecrawl_fallback" : "talabat_api",
        ...item,
      },
      rawSize: JSON.stringify(item).length,
      normalizedAt: now,
    }));
  }

  protected async doHealthCheck(): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke("gateway-marketplace-sync", {
        body: { source: "talabat", action: "health" },
      });
      if (error) return false;
      return data?.healthy === true;
    } catch {
      return false;
    }
  }
}

export const talabatConnector = new TalabatConnector();
