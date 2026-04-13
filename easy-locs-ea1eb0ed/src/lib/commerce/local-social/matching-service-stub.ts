/**
 * Matching Service — Empty adapter (commerce matching not yet implemented).
 *
 * This module provides the matching-service contract for local social commerce.
 * All functions are guarded by platform feature flags. When the corresponding
 * flags are enabled, the functions return safe empty results indicating the
 * feature is awaiting a backend implementation (DB tables + Edge Functions).
 *
 * To implement: connect to a `local_intents` / `local_matches` table via Supabase
 * and wire scoring logic into the matching pipeline.
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
  return { registered: false, reason: gated(MATCHING_FLAG) ?? "awaiting_backend_implementation" };
}

export function findCandidateMatches(_intentId: string): CanonicalLocalMatch[] {
  if (gated(MATCHING_FLAG)) return [];
  return [];
}

export function scoreMatch(_listingId: string, _intentId: string): { score: 0; reason: string } {
  return { score: 0, reason: gated(MATCHING_FLAG) ?? "awaiting_backend_implementation" };
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
