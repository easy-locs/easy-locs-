/**
 * Booking Connector — Stub for Booking.com hotel data.
 */
import type { SourceConnector, SourceRecord } from "./connector.interface";

export const bookingConnector: SourceConnector = {
  sourceId: "booking",
  supportedVerticals: ["hotel"],

  async fetchByUrl(url: string): Promise<SourceRecord | null> {
    if (!url.includes("booking.com")) return null;
    console.log(`[booking-connector] fetchByUrl: ${url}`);
    return null;
  },

  async fetchBySearch(query: string, city: string): Promise<SourceRecord[]> {
    console.log(`[booking-connector] search: "${query}" in ${city}`);
    return [];
  },
};
