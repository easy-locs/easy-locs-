/**
 * Deliveroo Connector — Stub for Deliveroo food marketplace data.
 * In production, this would call the deep-scrape edge function targeting Deliveroo.
 */
import type { SourceConnector, SourceRecord } from "./connector.interface";

export const deliverooConnector: SourceConnector = {
  sourceId: "deliveroo",
  supportedVerticals: ["food"],

  async fetchByUrl(url: string): Promise<SourceRecord | null> {
    if (!url.includes("deliveroo")) return null;
    // Stub — would invoke edge function for deep extraction
    console.log(`[deliveroo-connector] fetchByUrl: ${url}`);
    return null;
  },

  async fetchBySearch(query: string, city: string, _country: string): Promise<SourceRecord[]> {
    console.log(`[deliveroo-connector] search: "${query}" in ${city}`);
    return [];
  },
};
