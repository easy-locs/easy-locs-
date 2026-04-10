import { db } from "@/services/db";

export interface ShopQualityResult {
  score: number;
  issues: QualityIssue[];
  globalQualityScore: number;
  qualityClass: "excellent" | "good" | "fair" | "poor" | "unknown";
  coherence: {
    score: number;
    issues: string[];
    status: "pass" | "warn" | "fail";
    entity_menu_match_score: number;
  };
}

interface QualityIssue {
  field: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

export async function runShopQualityCheck(shopId: string): Promise<ShopQualityResult> {
  const { data: shop } = await db
    .from("storefront_pages")
    .select("name, slug, vertical, category, subcategory, address, city, banner_url, logo_url, rating, reviews_count, description, phone, email")
    .eq("id", shopId)
    .maybeSingle();

  if (!shop) {
    return {
      score: 0, issues: [{ field: "shop", severity: "critical", message: "Shop not found" }],
      globalQualityScore: 0, qualityClass: "unknown",
      coherence: { score: 0, issues: ["Shop not found"], status: "fail", entity_menu_match_score: 0 },
    };
  }

  const issues: QualityIssue[] = [];
  let score = 100;

  if (!shop.banner_url) { issues.push({ field: "banner_url", severity: "warning", message: "Missing banner image" }); score -= 15; }
  if (!shop.logo_url) { issues.push({ field: "logo_url", severity: "warning", message: "Missing logo" }); score -= 10; }
  if (!shop.description || shop.description.length < 20) { issues.push({ field: "description", severity: "warning", message: "Description too short or missing" }); score -= 10; }
  if (!shop.address) { issues.push({ field: "address", severity: "info", message: "No address provided" }); score -= 5; }
  if (!shop.phone && !shop.email) { issues.push({ field: "contact", severity: "warning", message: "No contact info" }); score -= 10; }
  if ((shop.reviews_count ?? 0) < 3) { issues.push({ field: "reviews", severity: "info", message: "Less than 3 reviews" }); score -= 5; }
  if ((shop.rating ?? 0) < 3.5 && (shop.reviews_count ?? 0) > 0) { issues.push({ field: "rating", severity: "warning", message: "Rating below 3.5" }); score -= 10; }

  const { count: menuCount } = await db
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId);

  if ((menuCount ?? 0) === 0) { issues.push({ field: "menu", severity: "critical", message: "No menu items" }); score -= 20; }
  else if ((menuCount ?? 0) < 3) { issues.push({ field: "menu", severity: "warning", message: "Less than 3 menu items" }); score -= 10; }

  const menuMatchScore = (menuCount ?? 0) > 0 && shop.vertical ? 80 + Math.min(20, (menuCount ?? 0) * 2) : 0;
  const coherenceIssues: string[] = [];
  if (!shop.vertical) coherenceIssues.push("No vertical assigned");
  if (!shop.category) coherenceIssues.push("No category assigned");
  const coherenceScore = Math.max(0, 100 - coherenceIssues.length * 30 - (menuMatchScore < 50 ? 20 : 0));

  score = Math.max(0, Math.min(100, score));
  const qualityClass = score >= 85 ? "excellent" : score >= 70 ? "good" : score >= 50 ? "fair" : "poor";

  return {
    score,
    issues,
    globalQualityScore: score,
    qualityClass,
    coherence: {
      score: coherenceScore,
      issues: coherenceIssues,
      status: coherenceScore >= 70 ? "pass" : coherenceScore >= 40 ? "warn" : "fail",
      entity_menu_match_score: menuMatchScore,
    },
  };
}
