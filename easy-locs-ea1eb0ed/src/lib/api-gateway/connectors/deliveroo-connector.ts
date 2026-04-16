import { BaseConnector } from "./base-connector";
import type { ConnectorConfig, NormalizedDataPoint } from "../types";
import { supabase } from "@/integrations/supabase/client";

const DELIVEROO_CONFIG: ConnectorConfig = {
  id: "deliveroo_partner",
  name: "Deliveroo",
  description: "Deliveroo Partner API for restaurant and menu data with Firecrawl scraping fallback",
  type: "rest",
  domain: "food_delivery",
  pollingIntervalMs: 1_800_000,
  authMethod: "bearer",
  baseUrl: "https://api.deliveroo.com/partner/v1",
  healthCheckUrl: "https://api.deliveroo.com/partner/v1/status",
  readOnlyEndpoints: [
    "/restaurants",
    "/restaurants/{id}/menu",
    "/restaurants/{id}/orders",
    "/restaurants/{id}/reviews",
  ],
  enabled: true,
  tags: ["food-delivery", "marketplace", "partner-api"],
  fallbackConnectorId: "deliveroo_scraper",
  quotaLimit: 500,
  quotaWindowMs: 3_600_000,
  timeoutMs: 10_000,
  retryCount: 2,
};

export class DeliverooConnector extends BaseConnector {
  constructor() {
    super(DELIVEROO_CONFIG);
  }

  protected async doFetch(): Promise<NormalizedDataPoint[]> {
    const { data, error } = await supabase.functions.invoke("gateway-marketplace-sync", {
      body: { source: "deliveroo", action: "fetch" },
    });

    if (error) {
      throw new Error(`Deliveroo sync via edge function failed: ${error.message}`);
    }

    const records = Array.isArray(data?.records) ? data.records : [];
    const now = Date.now();
    const usedFallback = data?.usedFallback === true;

    this.markFallback(usedFallback);

    return records.map((item: Record<string, unknown>) => ({
      connectorId: this.config.id,
      domain: this.config.domain,
      timestamp: now,
      data: {
        source: usedFallback ? "deliveroo_firecrawl_fallback" : "deliveroo_api",
        ...item,
      },
      rawSize: JSON.stringify(item).length,
      normalizedAt: now,
    }));
  }

  protected async doHealthCheck(): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke("gateway-marketplace-sync", {
        body: { source: "deliveroo", action: "health" },
      });
      if (error) return false;
      return data?.healthy === true;
    } catch {
      return false;
    }
  }
}

export const deliverooConnector = new DeliverooConnector();
