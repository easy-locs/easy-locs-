/**
 * Source Fetcher — Queries all allowed connectors for a given vertical.
 * ONE responsibility: fetch raw SourceEntityRecords from external sources.
 */
import { getPolicy } from "../source-policy.engine";
import { CONNECTOR_REGISTRY } from "../connectors/index";
import type { SourceEntityRecord, Vertical } from "../types";
import type { PipelineInput, SourceFetchResult } from "./pipeline.types";

export async function fetchFromSources(input: PipelineInput): Promise<SourceFetchResult> {
  const t0 = performance.now();
  const policy = getPolicy(input.vertical);

  const connectors = CONNECTOR_REGISTRY.filter((c) =>
    (policy.allowedSources as string[]).includes(c.source),
  );

  const records: SourceEntityRecord[] = [];
  const sourcesQueried: string[] = [];
  const errors: Array<{ source: string; error: string }> = [];

  for (const connector of connectors) {
    sourcesQueried.push(connector.source);
    try {
      const rows = await connector.search({
        vertical: input.vertical,
        query: input.query,
        name: input.name,
        city: input.city,
        district: input.district,
        country: input.country,
        website: input.website,
        phone: input.phone,
      });
      records.push(...rows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push({ source: connector.source, error: msg });
      console.error(`[source.fetcher] ${connector.source} failed: ${msg}`);
    }
  }

  return {
    records,
    sourcesQueried,
    errors,
    durationMs: Math.round(performance.now() - t0),
  };
}
