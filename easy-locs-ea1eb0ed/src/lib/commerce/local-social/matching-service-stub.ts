import type { CanonicalLocalMatch, CanonicalLocalIntent } from "@/domains/shared/canonical-types";
import { isPlatformFlagEnabled } from "@/lib/growth/feature-flag-registry";
import type { PlatformFlag } from "@/lib/growth/feature-flag-registry";

const MASTER_FLAG: PlatformFlag = "enable_local_social_commerce";
const MATCHING_FLAG: PlatformFlag = "enable_commerce_matching";
const SUGGESTIONS_FLAG: PlatformFlag = "enable_commerce_suggestions";

export function registerIntent(_intent: Omit<CanonicalLocalIntent, "id" | "createdAt">): { registered: false; reason: string } {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return { registered: false, reason: "master_flag_off" };
  if (!isPlatformFlagEnabled(MATCHING_FLAG)) return { registered: false, reason: "matching_flag_off" };
  return { registered: false, reason: "stub_not_implemented" };
}

export function findCandidateMatches(_intentId: string): CanonicalLocalMatch[] {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return [];
  if (!isPlatformFlagEnabled(MATCHING_FLAG)) return [];
  return [];
}

export function scoreMatch(_listingId: string, _intentId: string): { score: 0; reason: string } {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return { score: 0, reason: "master_flag_off" };
  if (!isPlatformFlagEnabled(MATCHING_FLAG)) return { score: 0, reason: "matching_flag_off" };
  return { score: 0, reason: "stub_not_implemented" };
}

export function getSuggestionsForUser(_userId: string): CanonicalLocalMatch[] {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return [];
  if (!isPlatformFlagEnabled(SUGGESTIONS_FLAG)) return [];
  return [];
}

export function getMatchesByListing(_listingId: string): CanonicalLocalMatch[] {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return [];
  if (!isPlatformFlagEnabled(MATCHING_FLAG)) return [];
  return [];
}

export function getActiveIntentsByUser(_userId: string): CanonicalLocalIntent[] {
  if (!isPlatformFlagEnabled(MASTER_FLAG)) return [];
  return [];
}
