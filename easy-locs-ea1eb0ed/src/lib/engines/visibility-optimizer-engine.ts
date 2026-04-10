import { db } from "@/services/db";

interface VisibilityAction {
  shopId: string;
  shopName: string;
  action: "promote" | "demote" | "maintain";
  reason: string;
  newPriority: number;
}

export async function runVisibilityOptimizer(orgId?: string) {
  let query = db
    .from("storefront_pages")
    .select("id, name, rating, reviews_count, display_priority, banner_url, logo_url, description, status")
    .limit(200);

  if (orgId) query = query.eq("org_id", orgId);
  const { data: shops } = await query;

  if (!shops || shops.length === 0) {
    return { status: "completed", results: [], promoted: 0, demoted: 0 };
  }

  const results: VisibilityAction[] = [];
  let promoted = 0;
  let demoted = 0;

  for (const shop of shops) {
    let score = 50;
    if (shop.banner_url) score += 15;
    if (shop.logo_url) score += 10;
    if (shop.description && shop.description.length > 20) score += 10;
    if ((shop.rating ?? 0) >= 4.0) score += 10;
    if ((shop.reviews_count ?? 0) >= 5) score += 5;
    score = Math.min(100, score);

    const current = shop.display_priority ?? 0;

    if (score >= 80 && current < 10) {
      results.push({ shopId: shop.id, shopName: shop.name, action: "promote", reason: `Quality ${score} — promoting`, newPriority: 10 });
      promoted++;
    } else if (score < 40 && current > 0) {
      results.push({ shopId: shop.id, shopName: shop.name, action: "demote", reason: `Quality ${score} — reducing`, newPriority: 0 });
      demoted++;
    } else {
      results.push({ shopId: shop.id, shopName: shop.name, action: "maintain", reason: `Quality ${score}`, newPriority: current });
    }
  }

  return { status: "completed", results, promoted, demoted };
}
