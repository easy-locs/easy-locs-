/**
 * Base Connector Contract — Common interface for all onboarding source connectors.
 */
import type { SourceEntityRecord, SourceName, Vertical } from "../types";

export interface ConnectorQuery {
  vertical: Vertical;
  query?: string;
  name?: string;
  city?: string;
  district?: string;
  country?: string;
  website?: string;
  phone?: string;
}

export interface OnboardingConnector {
  source: SourceName;
  search(input: ConnectorQuery): Promise<SourceEntityRecord[]>;
}
