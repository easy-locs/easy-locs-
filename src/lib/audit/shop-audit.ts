/**
 * Shop Audit Engine — Evaluates completeness, quality, and publish-readiness.
 * Returns score, status, blockers, warnings, and capability flags.
 */

export type ShopAuditResult = {
  score: number;
  status: "draft" | "needs_review" | "ready" | "live";
  isPublishable: boolean;
  isSearchable: boolean;
  isOrderable: boolean;
  breakdown: {
    identity: number;
    photos: number;
    taxonomy: number;
    location: number;
    contact: number;
    menu: number;
    rating: number;
  };
  blockers: string[];
  warnings: string[];
  issues: string[];
};

export function auditShop(shop: any): ShopAuditResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const issues: string[] = [];
  let score = 0;

  // ---- IDENTITY (20) ----
  let identity = 0;
  if (shop.name) identity += 10;
  else blockers.push("Missing name");
  if (shop.slug) identity += 10;
  else blockers.push("Missing slug");
  score += identity;

  // ---- PHOTOS (15) ----
  let photos = 0;
  const hasLogo = !!(shop.logo_url || shop.logo_image);
  const hasCover = !!(shop.cover_url || shop.banner_url || shop.cover_image);
  if (hasLogo) photos += 7;
  else warnings.push("Missing logo");
  if (hasCover) photos += 8;
  else blockers.push("Missing cover image");
  score += photos;

  // ---- TAXONOMY (15) ----
  let taxonomy = 0;
  if (shop.vertical) taxonomy += 5;
  else blockers.push("Missing vertical");
  if (shop.cluster) taxonomy += 5;
  else warnings.push("Missing category cluster");
  if (shop.subcategory) taxonomy += 5;
  else warnings.push("Missing subcategory");
  if (!shop.vertical || !shop.cluster || !shop.subcategory) {
    issues.push("Incomplete taxonomy");
  }
  score += taxonomy;

  // ---- LOCATION (15) ----
  let location = 0;
  if (shop.country) location += 5;
  else blockers.push("Missing country");
  if (shop.city) location += 5;
  else blockers.push("Missing city");
  if (shop.area) location += 5;
  else warnings.push("Missing district");
  score += location;

  // ---- CONTACT (10) ----
  let contact = 0;
  if (shop.contact_phone) contact += 5;
  if (shop.contact_email) contact += 5;
  if (!contact) warnings.push("Missing contact info");
  score += contact;

  // ---- MENU / CATALOG (15) ----
  let menu = 0;
  if (shop.vertical === "food") {
    if (shop.has_menu || (shop.products_count && shop.products_count > 0)) {
      menu += 15;
    } else {
      blockers.push("Food shop without menu");
    }
  } else {
    menu += 15;
  }
  score += menu;

  // ---- RATING (10) ----
  let rating = 0;
  if (shop.google_rating || shop.internal_rating || shop.rating) rating += 10;
  else warnings.push("No rating");
  score += rating;

  // ---- STATUS + GATE LOGIC ----
  let status: ShopAuditResult["status"] = "draft";

  if (blockers.length > 0) {
    status = score >= 60 ? "needs_review" : "draft";
  } else if (score >= 90) {
    status = "live";
  } else if (score >= 75) {
    status = "ready";
  } else if (score >= 50) {
    status = "needs_review";
  } else {
    status = "draft";
  }

  const isPublishable = blockers.length === 0 && score >= 75;
  const isSearchable = blockers.length === 0 && score >= 50;
  const isOrderable = isPublishable && shop.vertical === "food" ? (shop.has_menu || shop.products_count > 0) : isPublishable;

  // Merge blockers + warnings into issues for backward compat
  issues.push(...blockers, ...warnings.filter(w => !issues.includes(w)));

  return {
    score,
    status,
    isPublishable,
    isSearchable,
    isOrderable,
    breakdown: { identity, photos, taxonomy, location, contact, menu, rating },
    blockers,
    warnings,
    issues,
  };
}
