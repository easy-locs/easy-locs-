/**
 * Shop Audit Engine — Full publication gatekeeper.
 * Validates completeness, taxonomy coherence, per-vertical rules.
 * Integrates source-based visibility caps.
 * Returns score, status, blockers, warnings, and gate flags.
 */
import {
  normalizeVertical,
  getCanonicalVertical,
  getClusterForSubcategory,
  type Vertical,
} from "@/lib/taxonomy/world-class-taxonomy";
import { applySourceVisibility } from "@/lib/source/source-hygiene";

export type ShopAuditResult = {
  score: number;
  status: "draft" | "needs_review" | "ready" | "live";
  isPublishable: boolean;
  isSearchable: boolean;
  isMapVisible: boolean;
  isOrderable: boolean;
  isBookable: boolean;
  breakdown: {
    identity: number;
    photos: number;
    taxonomy: number;
    location: number;
    contact: number;
    catalog: number;
    rating: number;
  };
  blockers: string[];
  warnings: string[];
  issues: string[];
};

// ── Per-vertical rules ──
type VerticalRule = {
  requiresCatalog: boolean;
  requiresMenu: boolean;
  requiresBooking: boolean;
  requiresPhoto: boolean;
  minProducts: number;
};

const VERTICAL_RULES: Record<string, VerticalRule> = {
  food:        { requiresCatalog: true,  requiresMenu: true,  requiresBooking: false, requiresPhoto: true,  minProducts: 3 },
  grocery:     { requiresCatalog: true,  requiresMenu: false, requiresBooking: false, requiresPhoto: true,  minProducts: 5 },
  shops:       { requiresCatalog: true,  requiresMenu: false, requiresBooking: false, requiresPhoto: true,  minProducts: 1 },
  services:    { requiresCatalog: false, requiresMenu: false, requiresBooking: true,  requiresPhoto: false, minProducts: 0 },
  property:    { requiresCatalog: false, requiresMenu: false, requiresBooking: true,  requiresPhoto: true,  minProducts: 0 },
  healthcare:  { requiresCatalog: false, requiresMenu: false, requiresBooking: true,  requiresPhoto: false, minProducts: 0 },
  mobility:    { requiresCatalog: false, requiresMenu: false, requiresBooking: false, requiresPhoto: false, minProducts: 0 },
  experiences: { requiresCatalog: false, requiresMenu: false, requiresBooking: true,  requiresPhoto: true,  minProducts: 0 },
};

function getVerticalRule(vertical?: string): VerticalRule {
  const norm = vertical ? normalizeVertical(vertical) : "services";
  return VERTICAL_RULES[norm] ?? VERTICAL_RULES.services;
}

// ── Unified photo check ──
function hasAnyPhoto(shop: any): boolean {
  return !!(shop.logo_owner_url || shop.logo_auto_url || shop.logo_url || shop.logo_image || shop.cover_owner_url || shop.cover_auto_url || shop.cover_url || shop.banner_url || shop.cover_image);
}

function hasLogo(shop: any): boolean {
  return !!(shop.logo_owner_url || shop.logo_auto_url || shop.logo_url || shop.logo_image);
}

function hasCover(shop: any): boolean {
  return !!(shop.cover_owner_url || shop.cover_auto_url || shop.cover_url || shop.banner_url || shop.cover_image);
}

function getProductCount(shop: any): number {
  return shop.products_count ?? 0;
}

function hasMenu(shop: any): boolean {
  return !!(shop.has_menu || getProductCount(shop) > 0);
}

// ── Taxonomy validation ──
function validateTaxonomy(shop: any): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!shop.vertical) return { valid: false, issues: ["Missing vertical"] };

  const norm = normalizeVertical(shop.vertical);
  const verticalDef = getCanonicalVertical(norm);
  if (!verticalDef) {
    issues.push(`Unknown vertical: ${shop.vertical}`);
    return { valid: false, issues };
  }

  if (shop.subcategory) {
    const expectedCluster = getClusterForSubcategory(shop.subcategory);
    if (expectedCluster && shop.cluster && shop.cluster !== expectedCluster) {
      issues.push(`Taxonomy mismatch: subcategory "${shop.subcategory}" belongs to cluster "${expectedCluster}" not "${shop.cluster}"`);
    }
    const subExists = verticalDef.subcategories.some(s => s.value === shop.subcategory);
    if (!subExists) {
      issues.push(`Subcategory "${shop.subcategory}" not found in vertical "${norm}"`);
    }
  }

  if (shop.cluster) {
    const clusterExists = verticalDef.clusters.some(c => c.value === shop.cluster);
    if (!clusterExists) {
      issues.push(`Cluster "${shop.cluster}" not found in vertical "${norm}"`);
    }
  }

  return { valid: issues.length === 0, issues };
}

// ══════════════════════════════════════════════════════
//  MAIN AUDIT
// ══════════════════════════════════════════════════════

export function auditShop(shop: any): ShopAuditResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const vertical = shop.vertical ? normalizeVertical(shop.vertical) : undefined;
  const rule = getVerticalRule(vertical);
  let score = 0;

  // ── IDENTITY (20) ──
  let identity = 0;
  if (shop.name) identity += 10; else blockers.push("Missing name");
  if (shop.slug) identity += 10; else blockers.push("Missing slug");
  score += identity;

  // ── PHOTOS (15) ──
  let photos = 0;
  if (hasLogo(shop)) photos += 7; else warnings.push("Missing logo");
  if (hasCover(shop)) photos += 8;
  else if (rule.requiresPhoto) blockers.push("Missing cover image");
  else warnings.push("Missing cover image");
  score += photos;

  // ── TAXONOMY (15) ──
  let taxonomy = 0;
  if (shop.vertical) taxonomy += 5; else blockers.push("Missing vertical");
  if (shop.cluster) taxonomy += 5; else warnings.push("Missing cluster");
  if (shop.subcategory) taxonomy += 5; else warnings.push("Missing subcategory");

  const taxVal = validateTaxonomy(shop);
  if (!taxVal.valid) {
    taxVal.issues.forEach(i => warnings.push(i));
  }
  score += taxonomy;

  // ── LOCATION (15) ──
  let location = 0;
  if (shop.country) location += 5; else blockers.push("Missing country");
  if (shop.city) location += 5; else blockers.push("Missing city");
  if (shop.area) location += 5; else warnings.push("Missing district");
  score += location;

  // ── CONTACT (10) ──
  let contact = 0;
  if (shop.contact_phone) contact += 5;
  if (shop.contact_email) contact += 5;
  if (!contact) warnings.push("Missing contact info");
  score += contact;

  // ── CATALOG / MENU (15) ──
  let catalog = 0;
  const prodCount = getProductCount(shop);
  const shopHasMenu = hasMenu(shop);

  if (rule.requiresMenu) {
    if (shopHasMenu && prodCount >= rule.minProducts) catalog += 15;
    else if (shopHasMenu) { catalog += 8; warnings.push(`Only ${prodCount} products (min ${rule.minProducts})`); }
    else blockers.push(`${vertical} shop without menu/catalog`);
  } else if (rule.requiresCatalog) {
    if (prodCount >= rule.minProducts) catalog += 15;
    else if (prodCount > 0) { catalog += 8; warnings.push(`Only ${prodCount} products (min ${rule.minProducts})`); }
    else warnings.push("No products in catalog");
  } else {
    catalog += 15; // not catalog-dependent
  }
  score += catalog;

  // ── RATING (10) ──
  let rating = 0;
  if (shop.google_rating || shop.internal_rating || shop.rating) rating += 10;
  else warnings.push("No rating");
  score += rating;

  // ── STATUS + GATE LOGIC ──
  let status: ShopAuditResult["status"] = "draft";
  if (blockers.length > 0) {
    status = score >= 60 ? "needs_review" : "draft";
  } else if (score >= 90) {
    status = "live";
  } else if (score >= 75) {
    status = "ready";
  } else if (score >= 50) {
    status = "needs_review";
  }

  // Raw gate flags (before source caps)
  const rawPublishable = blockers.length === 0 && score >= 75;
  const rawSearchable = blockers.length === 0 && score >= 50;
  const rawMapVisible = rawSearchable && !!(shop.city || shop.latitude);
  const rawOrderable = rawPublishable && (rule.requiresCatalog || rule.requiresMenu ? shopHasMenu : true);
  const rawBookable = rawPublishable && rule.requiresBooking;

  // Apply source-based visibility caps
  const sourceCapped = applySourceVisibility(shop.source_type, shop.is_claimed, {
    isPublishable: rawPublishable,
    isSearchable: rawSearchable,
    isOrderable: rawOrderable,
    isMapVisible: rawMapVisible,
    isBookable: rawBookable,
    status,
  });

  // Override status if source caps it
  if (sourceCapped.effectiveStatus !== status) {
    status = sourceCapped.effectiveStatus as ShopAuditResult["status"];
  }

  const issues = [...blockers, ...warnings];

  return {
    score, status,
    isPublishable: sourceCapped.isPublishable,
    isSearchable: sourceCapped.isSearchable,
    isMapVisible: sourceCapped.isMapVisible,
    isOrderable: sourceCapped.isOrderable,
    isBookable: sourceCapped.isBookable,
    breakdown: { identity, photos, taxonomy, location, contact, catalog, rating },
    blockers, warnings, issues,
  };
}

// ══════════════════════════════════════════════════════
//  BULK AUDIT
// ══════════════════════════════════════════════════════

export interface BulkAuditSummary {
  total: number;
  byStatus: Record<string, number>;
  publishable: number;
  blocked: number;
  avgScore: number;
  topBlockers: { reason: string; count: number }[];
  results: Array<{ id: string; name: string; score: number; status: string; blockers: string[] }>;
}

export function bulkAuditShops(shops: any[]): BulkAuditSummary {
  const byStatus: Record<string, number> = { draft: 0, needs_review: 0, ready: 0, live: 0 };
  let totalScore = 0;
  let publishable = 0;
  let blocked = 0;
  const blockerCounts: Record<string, number> = {};
  const results: BulkAuditSummary["results"] = [];

  for (const shop of shops) {
    const audit = auditShop(shop);
    byStatus[audit.status] = (byStatus[audit.status] || 0) + 1;
    totalScore += audit.score;
    if (audit.isPublishable) publishable++;
    if (audit.blockers.length > 0) {
      blocked++;
      audit.blockers.forEach(b => { blockerCounts[b] = (blockerCounts[b] || 0) + 1; });
    }
    results.push({ id: shop.id, name: shop.name, score: audit.score, status: audit.status, blockers: audit.blockers });
  }

  const topBlockers = Object.entries(blockerCounts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    total: shops.length,
    byStatus,
    publishable,
    blocked,
    avgScore: shops.length ? Math.round(totalScore / shops.length) : 0,
    topBlockers,
    results,
  };
}
