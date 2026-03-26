/**
 * Google Business Connector — Stub for Google Business Profile data.
 */
import type { SourceConnector, SourceRecord } from "./connector.interface";

export const googleBusinessConnector: SourceConnector = {
  sourceId: "google_business",
  supportedVerticals: ["food", "grocery", "hotel", "services", "property"],

  async fetchByUrl(url: string): Promise<SourceRecord | null> {
    if (!url.includes("google.com/maps") && !url.includes("goo.gl")) return null;
    console.log(`[google-business-connector] fetchByUrl: ${url}`);
    return null;
  },

  async fetchBySearch(query: string, city: string): Promise<SourceRecord[]> {
    console.log(`[google-business-connector] search: "${query}" in ${city}`);
    return [];
  },
};
