export type ShopAuditResult = {
  score: number;
  status: "draft" | "needs_review" | "ready" | "live";
  breakdown: Record<string, number>;
  issues: string[];
};

export function auditShop(shop: any): ShopAuditResult {
  const issues: string[] = [];
  let score = 0;

  // IDENTITY (20)
  let identity = 0;
  if (shop.name) identity += 10;
  if (shop.slug) identity += 10;
  else issues.push("Missing slug");
  score += identity;

  // PHOTOS (15)
  let photos = 0;
  if (shop.logo_url) photos += 7;
  else issues.push("Missing logo");
  if (shop.cover_url) photos += 8;
  else issues.push("Missing cover image");
  score += photos;

  // TAXONOMY (15)
  let taxonomy = 0;
  if (shop.vertical) taxonomy += 5;
  else issues.push("Missing vertical");
  if (shop.cluster) taxonomy += 5;
  else issues.push("Missing category");
  if (shop.subcategory) taxonomy += 5;
  else issues.push("Missing subcategory");
  score += taxonomy;

  // LOCATION (15)
  let location = 0;
  if (shop.country) location += 5;
  else issues.push("Missing country");
  if (shop.city) location += 5;
  else issues.push("Missing city");
  if (shop.area) location += 5;
  else issues.push("Missing district");
  score += location;

  // CONTACT (10)
  let contact = 0;
  if (shop.contact_phone) contact += 5;
  if (shop.contact_email) contact += 5;
  if (!contact) issues.push("Missing contact info");
  score += contact;

  // MENU (15)
  let menu = 0;
  if (shop.vertical === "food") {
    if (shop.has_menu) menu += 15;
    else issues.push("Missing menu");
  } else {
    menu += 15;
  }
  score += menu;

  // RATING (10)
  let rating = 0;
  if (shop.google_rating || shop.internal_rating) rating += 10;
  else issues.push("No rating");
  score += rating;

  // STATUS LOGIC
  let status: ShopAuditResult["status"] = "draft";
  if (score < 50) status = "draft";
  else if (score < 75) status = "needs_review";
  else if (score < 90) status = "ready";
  else status = "live";

  return { score, status, breakdown: { identity, photos, taxonomy, location, contact, menu, rating }, issues };
}
