/**
 * GoVoyage Connector — Stub for GoVoyage hotel data.
 */
import type { SourceConnector, SourceRecord } from "./connector.interface";

export const govoyageConnector: SourceConnector = {
  sourceId: "govoyage",
  supportedVerticals: ["hotel"],

  async fetchByUrl(url: string): Promise<SourceRecord | null> {
    if (!url.includes("govoyage") && !url.includes("go-voyage")) return null;
    console.log(`[govoyage-connector] fetchByUrl: ${url}`);
    return null;
  },

  async fetchBySearch(query: string, city: string): Promise<SourceRecord[]> {
    console.log(`[govoyage-connector] search: "${query}" in ${city}`);
    return [];
  },
};
