/**
 * feed-ingestion-stub — Global intelligence feed ingestion pipeline.
 * Gated behind feature flags. Feed items flow through validation → dedup → storage.
 * Backed by Supabase `global_feed_items` table when flags are enabled.
 */
import type { CanonicalGlobalFeedItem, GlobalFeedCategory } from "@/domains/shared/canonical-types";
import { isPlatformFlagEnabled } from "@/lib/growth/feature-flag-registry";
import type { PlatformFlag } from "@/lib/growth/feature-flag-registry";

const MASTER_FLAG: PlatformFlag = "enable_global_intelligence";
const INGESTION_FLAG: PlatformFlag = "enable_intelligence_ingestion";

function gated(...extra: PlatformFlag[]): string | null {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return "global_intelligence_disabled";
  for (const f of extra) {
    if (!isPlatformFlagEnabled(f)) return `${f}_disabled`;
  }
  return null;
}

export function ingestFeedItem(_item: CanonicalGlobalFeedItem): { accepted: false; reason: string } {
  return { accepted: false, reason: gated(INGESTION_FLAG) ?? "awaiting_backend_integration" };
}

export function ingestBatch(_items: CanonicalGlobalFeedItem[]): { accepted: 0; rejected: number; reason: string } {
  return { accepted: 0, rejected: _items.length, reason: gated(INGESTION_FLAG) ?? "awaiting_backend_integration" };
}

export function checkDeduplication(_contentHash: string): { isDuplicate: false } {
  return { isDuplicate: false };
}

export function getFeedByCountry(_country: string, _category?: GlobalFeedCategory): CanonicalGlobalFeedItem[] {
  if (gated()) return [];
  return [];
}

export function getTickerContributions(_country: string): [] {
  if (gated()) return [];
  if (!isPlatformFlagEnabled("enable_intelligence_ticker" as PlatformFlag)) return [];
  return [];
}
