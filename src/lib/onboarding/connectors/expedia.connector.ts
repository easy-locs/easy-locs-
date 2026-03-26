/**
 * Expedia Connector — Stub for Expedia hotel data.
 */
import type { SourceConnector, SourceRecord } from "./connector.interface";

export const expediaConnector: SourceConnector = {
  sourceId: "expedia",
  supportedVerticals: ["hotel"],

  async fetchByUrl(url: string): Promise<SourceRecord | null> {
    if (!url.includes("expedia")) return null;
    console.log(`[expedia-connector] fetchByUrl: ${url}`);
    return null;
  },

  async fetchBySearch(query: string, city: string): Promise<SourceRecord[]> {
    console.log(`[expedia-connector] search: "${query}" in ${city}`);
    return [];
  },
};
