/**
 * CANONICAL UI ENGINE — Single source of truth for taxonomy → UI mapping.
 * =======================================================================
 * Given a vertical + optional subcategory, returns the complete visual identity:
 * routes, gradients, overlays, motion, card styles, button styles, wording.
 *
 * This engine is consumed by all discovery surfaces: VerticalHubPage, SearchResults,
 * Radar, Home recommendations, PremiumVerticalHero, PremiumMerchantCard.
 */
import { WORLD_TAXONOMY, type Vertical, type TaxonomyVertical } from "@/lib/taxonomy/world-class-taxonomy";
import { getVerticalTheme } from "@/lib/discovery/vertical-themes";
import { getSubcategoryTheme } from "@/lib/discovery/subcategory-themes";

// ═══════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════

export interface CanonicalMotion {
  /** Framer-motion entry animation for cards */
  cardEntry: "slide-up" | "slide-left" | "fade" | "scale";
  /** Hero shimmer style */
  heroShimmer: "radial" | "sweep" | "pulse";
  /** Particle count in hero */
  particleCount: number;
  /** Stagger delay between cards in ms */
  staggerMs: number;
}

export interface CanonicalCardStyle {
  /** Border radius token */
  radius: "xl" | "2xl" | "3xl";
  /** Image aspect ratio */
  imageAspect: "16/9" | "4/3" | "3/2" | "1/1" | "21/9";
  /** Show ETA chip */
  showEta: boolean;
  /** Show distance */
  showDistance: boolean;
  /** Show open/closed status */
  showStatus: boolean;
  /** Show price range */
  showPrice: boolean;
  /** Featured card image aspect */
  featuredAspect: "16/9" | "21/9" | "4/3";
}

export interface CanonicalButtonStyle {
  /** Primary CTA label */
  primaryCta: string;
  /** Secondary CTA label */
  secondaryCta?: string;
  /** CTA icon hint */
  ctaIcon: "arrow" | "cart" | "calendar" | "phone" | "map" | "heart";
}

export interface CanonicalWording {
  /** Tone description */
  tone: "warm" | "professional" | "urgent" | "luxurious" | "friendly" | "energetic";
  /** Empty state message */
  emptyTitle: string;
  emptySubtitle: string;
  /** Loading message */
  loadingText: string;
  /** Results count format */
  resultsFormat: string; // e.g. "{count} restaurants near you"
}

export interface CanonicalUISpec {
  // ── Identity ──
  vertical: Vertical;
  subcategory: string | null;
  displayTitle: string;
  emoji: string;

  // ── Route ──
  canonicalRoute: string;
  breadcrumbs: { label: string; path: string }[];

  // ── Visual ──
  gradient: string;
  heroImage: string;
  heroOverlay: string;
  accentHsl: string;
  searchPlaceholder: string;

  // ── Motion ──
  motion: CanonicalMotion;

  // ── Card ──
  card: CanonicalCardStyle;

  // ── Button ──
  button: CanonicalButtonStyle;

  // ── Wording ──
  wording: CanonicalWording;
}

// ═══════════════════════════════════════════════════════════
//  VERTICAL-LEVEL DEFAULTS
// ═══════════════════════════════════════════════════════════

const VERTICAL_MOTION: Record<string, CanonicalMotion> = {
  food:        { cardEntry: "slide-up",   heroShimmer: "radial", particleCount: 6, staggerMs: 40 },
  grocery:     { cardEntry: "fade",       heroShimmer: "sweep",  particleCount: 4, staggerMs: 35 },
  shops:       { cardEntry: "scale",      heroShimmer: "radial", particleCount: 5, staggerMs: 45 },
  services:    { cardEntry: "slide-left", heroShimmer: "pulse",  particleCount: 3, staggerMs: 50 },
  property:    { cardEntry: "fade",       heroShimmer: "sweep",  particleCount: 4, staggerMs: 55 },
  healthcare:  { cardEntry: "fade",       heroShimmer: "pulse",  particleCount: 3, staggerMs: 45 },
  mobility:    { cardEntry: "slide-left", heroShimmer: "sweep",  particleCount: 5, staggerMs: 40 },
  experiences: { cardEntry: "scale",      heroShimmer: "radial", particleCount: 7, staggerMs: 35 },
};

const VERTICAL_CARD: Record<string, CanonicalCardStyle> = {
  food:        { radius: "2xl", imageAspect: "16/9", showEta: true,  showDistance: true,  showStatus: true,  showPrice: true,  featuredAspect: "16/9" },
  grocery:     { radius: "2xl", imageAspect: "4/3",  showEta: true,  showDistance: true,  showStatus: true,  showPrice: true,  featuredAspect: "16/9" },
  shops:       { radius: "2xl", imageAspect: "4/3",  showEta: false, showDistance: true,  showStatus: true,  showPrice: true,  featuredAspect: "16/9" },
  services:    { radius: "2xl", imageAspect: "4/3",  showEta: false, showDistance: true,  showStatus: true,  showPrice: false, featuredAspect: "16/9" },
  property:    { radius: "2xl", imageAspect: "16/9", showEta: false, showDistance: true,  showStatus: false, showPrice: true,  featuredAspect: "21/9" },
  healthcare:  { radius: "2xl", imageAspect: "4/3",  showEta: false, showDistance: true,  showStatus: true,  showPrice: false, featuredAspect: "16/9" },
  mobility:    { radius: "xl",  imageAspect: "16/9", showEta: true,  showDistance: true,  showStatus: false, showPrice: true,  featuredAspect: "16/9" },
  experiences: { radius: "3xl", imageAspect: "16/9", showEta: false, showDistance: false, showStatus: false, showPrice: true,  featuredAspect: "21/9" },
};

const VERTICAL_BUTTON: Record<string, CanonicalButtonStyle> = {
  food:        { primaryCta: "Order Now",     secondaryCta: "View Menu",    ctaIcon: "cart" },
  grocery:     { primaryCta: "Shop Now",      secondaryCta: "Browse",       ctaIcon: "cart" },
  shops:       { primaryCta: "Visit Store",   secondaryCta: "Browse",       ctaIcon: "arrow" },
  services:    { primaryCta: "Book Now",       secondaryCta: "Get Quote",   ctaIcon: "phone" },
  property:    { primaryCta: "Book Stay",      secondaryCta: "View Details", ctaIcon: "calendar" },
  healthcare:  { primaryCta: "Book Appointment", secondaryCta: "Call",      ctaIcon: "phone" },
  mobility:    { primaryCta: "Book Ride",      secondaryCta: "Get Price",   ctaIcon: "map" },
  experiences: { primaryCta: "Book Now",       secondaryCta: "Learn More",  ctaIcon: "heart" },
};

const VERTICAL_WORDING: Record<string, CanonicalWording> = {
  food: {
    tone: "warm", emptyTitle: "No restaurants nearby", emptySubtitle: "Try expanding your search radius",
    loadingText: "Finding delicious options…", resultsFormat: "{count} restaurants near you",
  },
  grocery: {
    tone: "friendly", emptyTitle: "No stores nearby", emptySubtitle: "Try a different area",
    loadingText: "Scanning nearby stores…", resultsFormat: "{count} stores near you",
  },
  shops: {
    tone: "energetic", emptyTitle: "No shops found", emptySubtitle: "Explore a different category",
    loadingText: "Discovering shops…", resultsFormat: "{count} shops near you",
  },
  services: {
    tone: "professional", emptyTitle: "No services available", emptySubtitle: "Try a wider radius",
    loadingText: "Finding trusted services…", resultsFormat: "{count} services near you",
  },
  property: {
    tone: "luxurious", emptyTitle: "No properties found", emptySubtitle: "Adjust your filters",
    loadingText: "Searching properties…", resultsFormat: "{count} properties available",
  },
  healthcare: {
    tone: "professional", emptyTitle: "No providers nearby", emptySubtitle: "Expand your search area",
    loadingText: "Finding healthcare providers…", resultsFormat: "{count} providers near you",
  },
  mobility: {
    tone: "urgent", emptyTitle: "No rides available", emptySubtitle: "Try again shortly",
    loadingText: "Searching for rides…", resultsFormat: "{count} options available",
  },
  experiences: {
    tone: "energetic", emptyTitle: "No experiences found", emptySubtitle: "Check back soon for new events",
    loadingText: "Discovering experiences…", resultsFormat: "{count} experiences near you",
  },
};

// ═══════════════════════════════════════════════════════════
//  CANONICAL ROUTE MAP
// ═══════════════════════════════════════════════════════════

const VERTICAL_ROUTES: Record<string, string> = {
  food: "/food",
  grocery: "/grocery",
  shops: "/shops",
  services: "/services-hub",
  property: "/real-estate",
  healthcare: "/healthcare",
  mobility: "/mobility",
  experiences: "/experiences",
};

/** Build canonical route for a vertical + optional subcategory */
function buildCanonicalRoute(vertical: string, subcategory?: string | null): string {
  const base = VERTICAL_ROUTES[vertical] || `/${vertical}`;
  if (!subcategory) return base;
  return `${base}?sub=${subcategory}`;
}

/** Build breadcrumb chain */
function buildBreadcrumbs(
  vertical: TaxonomyVertical,
  subcategory?: string | null,
): { label: string; path: string }[] {
  const crumbs = [
    { label: "Home", path: "/" },
    { label: vertical.label, path: VERTICAL_ROUTES[vertical.value] || `/${vertical.value}` },
  ];
  if (subcategory) {
    const sub = vertical.subcategories.find(s => s.value === subcategory);
    crumbs.push({
      label: sub?.label || subcategory.replace(/_/g, " "),
      path: buildCanonicalRoute(vertical.value, subcategory),
    });
  }
  return crumbs;
}

// ═══════════════════════════════════════════════════════════
//  MAIN RESOLVER
// ═══════════════════════════════════════════════════════════

/**
 * Resolve full canonical UI spec from taxonomy coordinates.
 * This is THE single function all UI surfaces should call.
 */
export function resolveCanonicalUI(
  verticalKey: string,
  subcategoryKey?: string | null,
): CanonicalUISpec {
  const verticalDef = WORLD_TAXONOMY.find(v => v.value === verticalKey);
  const fallbackVertical = WORLD_TAXONOMY[0]; // food as ultimate fallback
  const vert = verticalDef || fallbackVertical;

  const subDef = subcategoryKey
    ? vert.subcategories.find(s => s.value === subcategoryKey)
    : null;

  // Visual themes
  const baseTheme = getVerticalTheme(vert.value);
  const subTheme = subcategoryKey ? getSubcategoryTheme(subcategoryKey) : null;

  // Merge: subcategory overrides vertical
  const gradient = subTheme
    ? `linear-gradient(135deg, hsl(${subTheme.accentHsl} / 0.9) 0%, hsl(${subTheme.accentHsl} / 0.5) 100%)`
    : baseTheme.gradient;
  const heroImage = subTheme?.heroImage || baseTheme.heroImage;
  const heroOverlay = subTheme?.heroOverlay || baseTheme.heroOverlay;
  const accentHsl = subTheme?.accentHsl || baseTheme.accentHsl;
  const searchPlaceholder = subTheme?.searchPlaceholder || baseTheme.searchPlaceholder;

  const displayTitle = subDef?.label || vert.label;
  const emoji = subTheme?.emoji || subDef?.emoji || vert.emoji;

  return {
    vertical: vert.value,
    subcategory: subcategoryKey || null,
    displayTitle,
    emoji,

    canonicalRoute: buildCanonicalRoute(vert.value, subcategoryKey),
    breadcrumbs: buildBreadcrumbs(vert, subcategoryKey),

    gradient,
    heroImage,
    heroOverlay,
    accentHsl,
    searchPlaceholder,

    motion: VERTICAL_MOTION[vert.value] || VERTICAL_MOTION.food,
    card: VERTICAL_CARD[vert.value] || VERTICAL_CARD.food,
    button: VERTICAL_BUTTON[vert.value] || VERTICAL_BUTTON.food,
    wording: VERTICAL_WORDING[vert.value] || VERTICAL_WORDING.food,
  };
}

// ═══════════════════════════════════════════════════════════
//  CONVENIENCE EXPORTS
// ═══════════════════════════════════════════════════════════

export { VERTICAL_ROUTES };

/** Get all canonical vertical routes for navigation/sitemap */
export function getAllCanonicalRoutes(): { vertical: string; label: string; route: string; emoji: string }[] {
  return WORLD_TAXONOMY.map(v => ({
    vertical: v.value,
    label: v.label,
    route: VERTICAL_ROUTES[v.value] || `/${v.value}`,
    emoji: v.emoji,
  }));
}

/** Quick accent color for a vertical (CSS hsl string) */
export function getVerticalAccent(vertical: string): string {
  const theme = getVerticalTheme(vertical);
  return `hsl(${theme.accentHsl})`;
}
