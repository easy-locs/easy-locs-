/**
 * matching-service-stub — Social commerce matching (buyer ↔ seller).
 * Gated behind feature flags. Returns typed empty results when disabled.
 * Backed by Supabase `local_matches` + `local_intents` tables when enabled.
 */
import type { CanonicalLocalMatch, CanonicalLocalIntent } from "@/domains/shared/canonical-types";
import { isPlatformFlagEnabled } from "@/lib/growth/feature-flag-registry";
import type { PlatformFlag } from "@/lib/growth/feature-flag-registry";

const MASTER_FLAG: PlatformFlag = "enable_local_social_commerce";
const MATCHING_FLAG: PlatformFlag = "enable_commerce_matching";
const SUGGESTIONS_FLAG: PlatformFlag = "enable_commerce_suggestions";

function gated(...flags: PlatformFlag[]): string | null {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return "local_social_commerce_disabled";
  for (const f of flags) {
    if (!isPlatformFlagEnabled(f)) return `${f}_disabled`;
  }
  return null;
}

export function registerIntent(_intent: Omit<CanonicalLocalIntent, "id" | "createdAt">): { registered: false; reason: string } {
  return { registered: false, reason: gated(MATCHING_FLAG) ?? "awaiting_backend_integration" };
}

export function findCandidateMatches(_intentId: string): CanonicalLocalMatch[] {
  if (gated(MATCHING_FLAG)) return [];
  return [];
}

export function scoreMatch(_listingId: string, _intentId: string): { score: 0; reason: string } {
  return { score: 0, reason: gated(MATCHING_FLAG) ?? "awaiting_backend_integration" };
}

export function getSuggestionsForUser(_userId: string): CanonicalLocalMatch[] {
  if (gated(SUGGESTIONS_FLAG)) return [];
  return [];
}

export function getMatchesByListing(_listingId: string): CanonicalLocalMatch[] {
  if (gated(MATCHING_FLAG)) return [];
  return [];
}

export function getActiveIntentsByUser(_userId: string): CanonicalLocalIntent[] {
  if (gated()) return [];
  return [];
}
