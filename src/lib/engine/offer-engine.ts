/**
 * OFFER ENGINE — Category-based subscriptions, passes, bundles.
 * ==============================================================
 * Provides the scoring and matching logic for commercial products.
 * Uses entity_id to link offers to businesses.
 *
 * Layer: System Capabilities.
 * Consumes: Business Taxonomy (vertical/cluster/subcategory).
 * Consumes: Commercial Layer types.
 * Does NOT mix with: Action Model, Wallet (wallet handles payment execution).
 */

import type { CategoryOffer, CategoryPass, CategoryBundle, CommercialEntity } from "@/lib/taxonomy/commercial-layer";
import { hierarchyMatchScore } from "@/lib/taxonomy/world-class-taxonomy";

// ═══════════════════════════════════════════════════════════
//  OFFER MATCHING
// ═══════════════════════════════════════════════════════════

export interface OfferMatchContext {
  /** User's current vertical interest */
  vertical?: string | null;
  subcategory?: string | null;
  /** User's location */
  city?: string | null;
  districtCode?: string | null;
  countryCode?: string | null;
  /** Entity being viewed (for entity-scoped offers) */
  entityId?: string | null;
}

/**
 * Score an offer's relevance to the user's current context.
 * Returns 0–1.
 */
export function scoreOffer(offer: CommercialEntity, ctx: OfferMatchContext): number {
  let score = 0;

  // Hierarchy match (0–1)
  const hierarchy = hierarchyMatchScore(
    offer.subcategory,
    ctx.subcategory,
    ctx.vertical
  ) / 3;
  score += hierarchy * 0.4;

  // Geo match (cascading specificity)
  if (offer.scope === "entity") {
    // Entity-scoped: only relevant when viewing that entity
    score += 0.05; // low base — must match entityId in filter layer
  } else if (offer.scope === "district" && (offer as any).districtCode === ctx.districtCode) {
    score += 0.25;
  } else if (offer.scope === "city" && offer.citySlug === ctx.city) {
    score += 0.3;
  } else if (offer.scope === "country" && offer.countryCode === ctx.countryCode) {
    score += 0.2;
  } else if (offer.scope === "global") {
    score += 0.1;
  }

  // Active and valid
  if (offer.active) score += 0.1;

  // Type-specific scoring
  if (offer.type === "pass" || offer.type === "subscription") {
    // Subscriptions are high-value — slight boost
    score += 0.1;
  }

  if (offer.type === "bundle") {
    score += 0.05;
  }

  return Math.min(1, score);
}

/**
 * Filter and rank offers relevant to a user's context.
 */
export function matchOffers(
  offers: CommercialEntity[],
  ctx: OfferMatchContext
): CommercialEntity[] {
  return offers
    .filter((o) => o.active)
    .map((o) => ({ offer: o, score: scoreOffer(o, ctx) }))
    .filter(({ score }) => score > 0.15) // minimum relevance threshold
    .sort((a, b) => b.score - a.score)
    .map(({ offer }) => offer);
}

// ═══════════════════════════════════════════════════════════
//  OFFER ADAPTERS (empty for now — future backend plug-in)
// ═══════════════════════════════════════════════════════════

export interface OfferAdapter {
  /** Fetch offers for a city/country/vertical */
  fetchOffers(ctx: OfferMatchContext): Promise<CommercialEntity[]>;
  /** Fetch passes/subscriptions a user owns */
  fetchUserPasses(userId: string): Promise<CategoryPass[]>;
  /** Check if user has active pass for a subcategory */
  hasActivePass(userId: string, subcategory: string): Promise<boolean>;
}

/** Safe empty adapter — no offers until backend is ready. */
export const emptyOfferAdapter: OfferAdapter = {
  fetchOffers: async () => [],
  fetchUserPasses: async () => [],
  hasActivePass: async () => false,
};

let currentAdapter: OfferAdapter = emptyOfferAdapter;

export function setOfferAdapter(adapter: OfferAdapter): void {
  currentAdapter = adapter;
}

export function getOfferAdapter(): OfferAdapter {
  return currentAdapter;
}
