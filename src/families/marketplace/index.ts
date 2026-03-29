/**
 * FAMILY: MARKETPLACE — Canonical marketplace logic.
 * Single source of truth for listings, services, storefronts, search, availability.
 *
 * All modules MUST import marketplace logic from this family.
 */

// ── Providers ──
export {
  fetchMyProvider,
  insertProvider,
  updateProvider,
  fetchPublicProviders,
} from "@/repositories/marketplace.repository";

// ── Services ──
export {
  fetchMyServices,
  fetchPublicServices,
} from "@/repositories/marketplace.repository";

// ── Storefront ──
export {
  fetchStorefrontPage,
} from "@/repositories/storefront.repository";

// ── Discovery ──
export {
  fetchCanonicalDiscovery,
} from "@/lib/discovery/canonical-discovery-pipeline";

// ── Vertical listings hook ──
export { useVerticalListings } from "@/hooks/useVerticalListings";

// Marketplace family owns: listings, services, seller profiles,
// storefronts, categories, search/filter, availability, onboarding outputs
