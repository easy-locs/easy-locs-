/**
 * Web Fallback Engine — Completes missing fields from official website / Google Business.
 * ONLY after primary sources have been consumed. Never replaces existing data.
 */
import type { SourceEntityRecord, Vertical } from "./types";
import { officialWebConnector } from "./connectors/official-web.connector";
import { googleBusinessConnector } from "./connectors/google-business.connector";

export async function fillMissingWithWebFallback(
  vertical: Vertical,
  seed: {
    name?: string | null;
    city?: string | null;
    district?: string | null;
    country?: string | null;
    website?: string | null;
    phone?: string | null;
  },
): Promise<SourceEntityRecord[]> {
  const results: SourceEntityRecord[] = [];

  if (seed.website) {
    const official = await officialWebConnector.search({
      vertical,
      name: seed.name ?? undefined,
      city: seed.city ?? undefined,
      district: seed.district ?? undefined,
      country: seed.country ?? undefined,
      website: seed.website ?? undefined,
      phone: seed.phone ?? undefined,
    });
    results.push(...official);
  }

  const gmb = await googleBusinessConnector.search({
    vertical,
    name: seed.name ?? undefined,
    city: seed.city ?? undefined,
    district: seed.district ?? undefined,
    country: seed.country ?? undefined,
    website: seed.website ?? undefined,
    phone: seed.phone ?? undefined,
  });
  results.push(...gmb);

  return results;
}
