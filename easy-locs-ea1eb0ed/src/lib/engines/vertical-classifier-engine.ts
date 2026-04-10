import { db } from "@/services/db";
import { WORLD_TAXONOMY } from "@/lib/taxonomy/world-class-taxonomy";

const VALID_VERTICALS = WORLD_TAXONOMY.map(v => v.key);

export async function runVerticalClassifier() {
  const { data: shops } = await db
    .from("storefront_pages")
    .select("id, name, vertical, category, subcategory, description")
    .limit(500);

  if (!shops || shops.length === 0) {
    return { status: "completed", results: [], classified: 0 };
  }

  const results: { shopId: string; name: string; currentVertical: string; suggestedVertical: string; confidence: number }[] = [];
  let classified = 0;

  for (const shop of shops) {
    if (!shop.vertical || !VALID_VERTICALS.includes(shop.vertical)) {
      const suggested = inferVertical(shop.name, shop.description, shop.category);
      if (suggested) {
        results.push({
          shopId: shop.id,
          name: shop.name,
          currentVertical: shop.vertical || "none",
          suggestedVertical: suggested,
          confidence: shop.category ? 0.8 : 0.5,
        });
        classified++;
      }
    }
  }

  return { status: "completed", results, classified };
}

function inferVertical(name: string, description: string, category: string): string | null {
  const text = `${name} ${description || ""} ${category || ""}`.toLowerCase();
  if (/restaurant|food|pizza|sushi|burger|cuisine|kitchen/i.test(text)) return "food";
  if (/grocery|supermarket|market|organic/i.test(text)) return "grocery";
  if (/hotel|stay|resort|hostel|airbnb|lodge/i.test(text)) return "stay";
  if (/plumber|cleaning|repair|service|electrician/i.test(text)) return "services";
  if (/property|real.?estate|apartment|villa|house/i.test(text)) return "property";
  if (/shop|store|boutique|retail|fashion/i.test(text)) return "shops";
  if (/taxi|ride|delivery|logistics|transport/i.test(text)) return "mobility";
  if (/health|clinic|doctor|pharmacy|medical/i.test(text)) return "healthcare";
  if (/event|concert|tour|experience|activity/i.test(text)) return "experiences";
  return null;
}
