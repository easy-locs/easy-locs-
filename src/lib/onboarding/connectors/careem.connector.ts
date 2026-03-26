/**
 * Careem Connector — Stub for Careem food marketplace data.
 */
import type { SourceConnector, SourceRecord } from "./connector.interface";

export const careemConnector: SourceConnector = {
  sourceId: "careem",
  supportedVerticals: ["food", "grocery"],

  async fetchByUrl(url: string): Promise<SourceRecord | null> {
    if (!url.includes("careem")) return null;
    console.log(`[careem-connector] fetchByUrl: ${url}`);
    return null;
  },

  async fetchBySearch(query: string, city: string): Promise<SourceRecord[]> {
    console.log(`[careem-connector] search: "${query}" in ${city}`);
    return [];
  },
};
