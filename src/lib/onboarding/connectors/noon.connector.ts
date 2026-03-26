/**
 * Noon Connector — Stub for Noon grocery/food marketplace data.
 */
import type { SourceConnector, SourceRecord } from "./connector.interface";

export const noonConnector: SourceConnector = {
  sourceId: "noon",
  supportedVerticals: ["food", "grocery"],

  async fetchByUrl(url: string): Promise<SourceRecord | null> {
    if (!url.includes("noon")) return null;
    console.log(`[noon-connector] fetchByUrl: ${url}`);
    return null;
  },

  async fetchBySearch(query: string, city: string): Promise<SourceRecord[]> {
    console.log(`[noon-connector] search: "${query}" in ${city}`);
    return [];
  },
};
