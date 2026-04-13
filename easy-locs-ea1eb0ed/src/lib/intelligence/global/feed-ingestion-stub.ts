/**
 * Feed Ingestion — Empty adapter (global intelligence ingestion not yet implemented).
 *
 * This module provides the feed-ingestion contract for the global intelligence system.
 * All functions are guarded by platform feature flags. When the corresponding
 * flags are enabled, the functions return safe empty results indicating the
 * feature is awaiting a backend implementation (DB tables + Edge Functions).
 *
 * To implement: connect to a `global_feed_items` table via Supabase and wire
 * ingestion, deduplication, and retrieval into the intelligence pipeline.
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
  return { accepted: false, reason: gated(INGESTION_FLAG) ?? "awaiting_backend_implementation" };
}

export function ingestBatch(_items: CanonicalGlobalFeedItem[]): { accepted: 0; rejected: number; reason: string } {
  return { accepted: 0, rejected: _items.length, reason: gated(INGESTION_FLAG) ?? "awaiting_backend_implementation" };
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
