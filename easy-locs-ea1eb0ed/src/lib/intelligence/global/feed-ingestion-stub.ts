import type { CanonicalGlobalFeedItem, GlobalFeedCategory } from "@/domains/shared/canonical-types";
import { isPlatformFlagEnabled } from "@/lib/growth/feature-flag-registry";
import type { PlatformFlag } from "@/lib/growth/feature-flag-registry";

const MASTER_FLAG: PlatformFlag = "enable_global_intelligence";
const INGESTION_FLAG: PlatformFlag = "enable_intelligence_ingestion";

export function ingestFeedItem(_item: CanonicalGlobalFeedItem): { accepted: false; reason: string } {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return { accepted: false, reason: "master_flag_off" };
  if (!isPlatformFlagEnabled(INGESTION_FLAG)) return { accepted: false, reason: "ingestion_flag_off" };
  return { accepted: false, reason: "stub_not_implemented" };
}

export function ingestBatch(_items: CanonicalGlobalFeedItem[]): { accepted: 0; rejected: number; reason: string } {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return { accepted: 0, rejected: _items.length, reason: "master_flag_off" };
  if (!isPlatformFlagEnabled(INGESTION_FLAG)) return { accepted: 0, rejected: _items.length, reason: "ingestion_flag_off" };
  return { accepted: 0, rejected: _items.length, reason: "stub_not_implemented" };
}

export function checkDeduplication(_contentHash: string): { isDuplicate: false } {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return { isDuplicate: false };
  return { isDuplicate: false };
}

export function getFeedByCountry(_country: string, _category?: GlobalFeedCategory): CanonicalGlobalFeedItem[] {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return [];
  return [];
}

export function getTickerContributions(_country: string): [] {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return [];
  if (!isPlatformFlagEnabled("enable_intelligence_ticker")) return [];
  return [];
}
