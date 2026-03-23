/**
 * COMMERCIAL LAYER — Type Foundations
 * ====================================
 * Future-ready interfaces for offers, passes, bundles, subscriptions.
 * NO backend required yet. Architectural preparation only.
 *
 * Layer separation:
 *   - These types describe WHAT is sold (commercial taxonomy)
 *   - System capabilities (wallet, payments) are NOT mixed in
 *   - Action model (pay, subscribe) is NOT mixed in
 */

// ═══════════════════════════════════════════════════════════
//  ENTITY TYPES
// ═══════════════════════════════════════════════════════════

/** A commercial offer attached to a vertical/category. */
export interface CategoryOffer {
  id: string;
  type: "offer";
  title: string;
  description: string;

  // Taxonomy binding
  vertical: string;
  cluster?: string | null;
  subcategory?: string | null;
  tags?: string[];

  // Scope
  scope: OfferScope;
  citySlug?: string | null;
  countryCode?: string | null;

  // Commercial
  originalPrice: number;
  offerPrice: number;
  currency: string;
  validFrom: string;
  validUntil: string;
  maxRedemptions?: number | null;

  // Ranking signals
  popularity?: number;
  partnerNetworkId?: string | null;

  active: boolean;
}

/** A subscription/pass for a category of services. */
export interface CategoryPass {
  id: string;
  type: "pass" | "subscription";
  title: string;
  description: string;

  // Taxonomy binding
  vertical: string;
  cluster?: string | null;
  subcategory?: string | null;

  // Scope
  scope: OfferScope;
  citySlug?: string | null;
  countryCode?: string | null;

  // Commercial
  pricePerMonth: number;
  currency: string;
  billingCycle: "monthly" | "quarterly" | "annual";
  trialDays?: number;

  // Access
  accessType: "unlimited" | "credits" | "discount";
  creditsPerPeriod?: number | null;
  discountPercent?: number | null;

  // Ranking signals
  subscriberCount?: number;
  rating?: number;
  partnerNetworkId?: string | null;

  active: boolean;
}

/** A bundle of multiple offers or passes. */
export interface CategoryBundle {
  id: string;
  type: "bundle";
  title: string;
  description: string;

  // Contains
  includedOfferIds?: string[];
  includedPassIds?: string[];
  includedVerticals?: string[];

  // Scope
  scope: OfferScope;
  citySlug?: string | null;
  countryCode?: string | null;

  // Commercial
  bundlePrice: number;
  currency: string;
  savingsPercent?: number;

  active: boolean;
}

/** A partner network (group of businesses in a vertical). */
export interface PartnerNetwork {
  id: string;
  name: string;
  vertical: string;
  cluster?: string | null;

  // Scope
  citySlug?: string | null;
  countryCode?: string | null;

  // Members
  memberCount: number;
  memberBusinessIds?: string[];

  // Ranking
  averageRating?: number;
  totalReviews?: number;

  active: boolean;
}

// ═══════════════════════════════════════════════════════════
//  SHARED TYPES
// ═══════════════════════════════════════════════════════════

export type OfferScope = "global" | "country" | "city" | "area";

/** Union type for all commercial entities. */
export type CommercialEntity =
  | CategoryOffer
  | CategoryPass
  | CategoryBundle;

// ═══════════════════════════════════════════════════════════
//  ADAPTERS (future use — empty for now)
// ═══════════════════════════════════════════════════════════

/** Convert a commercial entity to a RankableEntity for unified scoring. */
export function commercialToRankable(entity: CommercialEntity): {
  id: string;
  entityType: "offer" | "subscription" | "pass" | "bundle";
  vertical?: string;
  cluster?: string | null;
  subcategory?: string | null;
  tags?: string[];
  title: string;
  description: string;
} {
  return {
    id: entity.id,
    entityType: entity.type === "subscription" ? "subscription" : entity.type as any,
    vertical: entity.vertical,
    cluster: entity.cluster,
    subcategory: entity.subcategory,
    tags: "tags" in entity ? entity.tags : undefined,
    title: entity.title,
    description: entity.description,
  };
}
