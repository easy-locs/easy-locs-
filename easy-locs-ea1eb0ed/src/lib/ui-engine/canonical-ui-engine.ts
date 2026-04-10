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
import { td, getVerticalI18n, getSubcategoryI18n } from "@/lib/i18n-discovery";
import { tc } from "@/lib/i18n-canonical";

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
  /** i18n-resolved title */
  i18nTitle: string;
  /** i18n-resolved tagline */
  i18nTagline: string;
  /** i18n-resolved CTA */
  i18nCtaPrimary: string;
  i18nCtaSecondary: string;
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
  heroVideo?: string;
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
  utility:     { cardEntry: "fade",       heroShimmer: "pulse",  particleCount: 3, staggerMs: 45 },
  stay:        { cardEntry: "fade",       heroShimmer: "sweep",  particleCount: 4, staggerMs: 50 },
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
  utility:     { radius: "2xl", imageAspect: "4/3",  showEta: false, showDistance: true,  showStatus: true,  showPrice: false, featuredAspect: "16/9" },
  stay:        { radius: "2xl", imageAspect: "16/9", showEta: false, showDistance: true,  showStatus: true,  showPrice: true,  featuredAspect: "21/9" },
};

/** Build i18n-aware button styles — resolved at call time, not at module load */
function getVerticalButton(vertical: string): CanonicalButtonStyle {
  const icons: Record<string, CanonicalButtonStyle["ctaIcon"]> = {
    food: "cart", grocery: "cart", shops: "arrow", services: "phone",
    property: "calendar", healthcare: "phone", mobility: "map", experiences: "heart",
    utility: "map", stay: "calendar",
  };
  const vi = getVerticalI18n(vertical);
  return {
    primaryCta: vi.ctaPrimary,
    secondaryCta: vi.ctaSecondary,
    ctaIcon: icons[vertical] || "arrow",
  };
}

const VERTICAL_TONE: Record<string, CanonicalWording["tone"]> = {
  food: "warm", grocery: "friendly", shops: "energetic", services: "professional",
  property: "luxurious", healthcare: "professional", mobility: "urgent", experiences: "energetic",
  utility: "friendly", stay: "luxurious",
};

/** Build i18n-aware wording for a vertical + optional subcategory */
function buildWording(vertical: string, subcategory?: string | null): CanonicalWording {
  const vi = getVerticalI18n(vertical);
  const si = subcategory ? getSubcategoryI18n(subcategory) : null;
  return {
    tone: VERTICAL_TONE[vertical] || "friendly",
    emptyTitle: vi.emptyTitle,
    emptySubtitle: vi.emptySubtitle,
    loadingText: vi.loading,
    resultsFormat: td(`discovery.vertical.${vertical}.results`),
    i18nTitle: si?.title || vi.title,
    i18nTagline: si?.tagline || vi.tagline,
    i18nCtaPrimary: vi.ctaPrimary,
    i18nCtaSecondary: vi.ctaSecondary,
  };
}

// ═══════════════════════════════════════════════════════════
//  CANONICAL ROUTE MAP
// ═══════════════════════════════════════════════════════════

const VERTICAL_ROUTES: Record<string, string> = {
  food: "/food",
  grocery: "/grocery",
  shops: "/shops",
  services: "/services-hub",
  property: "/property",
  stay: "/stay",
  healthcare: "/healthcare",
  mobility: "/mobility",
  experiences: "/experiences",
  utility: "/browse/utility",
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
  const vertI18n = getVerticalI18n(vertical.value);
  const crumbs = [
    { label: tc("nav.home"), path: "/" },
    { label: vertI18n.title, path: VERTICAL_ROUTES[vertical.value] || `/${vertical.value}` },
  ];
  if (subcategory) {
    const subI18n = getSubcategoryI18n(subcategory);
    const sub = vertical.subcategories.find(s => s.value === subcategory);
    crumbs.push({
      label: subI18n?.title || sub?.label || subcategory.replace(/_/g, " "),
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
  // i18n-aware search placeholder and display title
  const subI18n = subcategoryKey ? getSubcategoryI18n(subcategoryKey) : null;
  const vertI18n = getVerticalI18n(vert.value);
  const searchPlaceholder = subI18n?.searchPlaceholder || vertI18n.searchPlaceholder || subTheme?.searchPlaceholder || baseTheme.searchPlaceholder;

  const displayTitle = subI18n?.title || subDef?.label || vertI18n.title || vert.label;
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
    heroVideo: baseTheme.heroVideo,
    heroOverlay,
    accentHsl,
    searchPlaceholder,

    motion: VERTICAL_MOTION[vert.value] || VERTICAL_MOTION.food,
    card: VERTICAL_CARD[vert.value] || VERTICAL_CARD.food,
    button: getVerticalButton(vert.value),
    wording: buildWording(vert.value, subcategoryKey),
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
