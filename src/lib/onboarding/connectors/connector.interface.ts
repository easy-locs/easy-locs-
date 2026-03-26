/**
 * Source Connector Interface — Common contract for all source connectors.
 * Each connector implements fetch logic for a specific external platform.
 */
import type { OnboardingVertical } from "../source-policy.engine";

export interface SourceRecord {
  source: string;
  sourceKey?: string;
  fields: Record<string, any>;
  confidence: number;
  fetchedAt: string;
}

export interface SourceConnector {
  readonly sourceId: string;
  readonly supportedVerticals: OnboardingVertical[];

  /** Fetch entity data by URL or search query */
  fetchByUrl(url: string): Promise<SourceRecord | null>;
  fetchBySearch(query: string, city: string, country: string): Promise<SourceRecord[]>;
}
