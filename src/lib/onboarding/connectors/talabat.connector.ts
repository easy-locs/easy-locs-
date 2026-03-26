/**
 * Talabat Connector — Stub for Talabat food/grocery marketplace data.
 */
import type { SourceConnector, SourceRecord } from "./connector.interface";

export const talabatConnector: SourceConnector = {
  sourceId: "talabat",
  supportedVerticals: ["food", "grocery"],

  async fetchByUrl(url: string): Promise<SourceRecord | null> {
    if (!url.includes("talabat")) return null;
    console.log(`[talabat-connector] fetchByUrl: ${url}`);
    return null;
  },

  async fetchBySearch(query: string, city: string): Promise<SourceRecord[]> {
    console.log(`[talabat-connector] search: "${query}" in ${city}`);
    return [];
  },
};
