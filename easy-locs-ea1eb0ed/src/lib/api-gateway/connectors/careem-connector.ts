import { BaseConnector } from "./base-connector";
import type { ConnectorConfig, NormalizedDataPoint } from "../types";
import { supabase } from "@/integrations/supabase/client";

const CAREEM_CONFIG: ConnectorConfig = {
  id: "careem_partner",
  name: "Careem",
  description: "Careem Now Partner API for food delivery data with Firecrawl scraping fallback",
  type: "rest",
  domain: "food_delivery",
  pollingIntervalMs: 1_800_000,
  authMethod: "bearer",
  baseUrl: "https://api.careem.com/partner/v1",
  healthCheckUrl: "https://api.careem.com/partner/v1/status",
  readOnlyEndpoints: [
    "/vendors",
    "/vendors/{id}/menu",
    "/vendors/{id}/orders",
  ],
  enabled: true,
  tags: ["food-delivery", "marketplace", "partner-api", "mena"],
  fallbackConnectorId: "careem_scraper",
  quotaLimit: 500,
  quotaWindowMs: 3_600_000,
  timeoutMs: 10_000,
  retryCount: 2,
};

export class CareemConnector extends BaseConnector {
  constructor() {
    super(CAREEM_CONFIG);
  }

  protected async doFetch(): Promise<NormalizedDataPoint[]> {
    const { data, error } = await supabase.functions.invoke("gateway-marketplace-sync", {
      body: { source: "careem", action: "fetch" },
    });

    if (error) {
      throw new Error(`Careem sync via edge function failed: ${error.message}`);
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
        source: usedFallback ? "careem_firecrawl_fallback" : "careem_api",
        ...item,
      },
      rawSize: JSON.stringify(item).length,
      normalizedAt: now,
    }));
  }

  protected async doHealthCheck(): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke("gateway-marketplace-sync", {
        body: { source: "careem", action: "health" },
      });
      if (error) return false;
      return data?.healthy === true;
    } catch {
      return false;
    }
  }
}

export const careemConnector = new CareemConnector();
