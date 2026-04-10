import { db } from "@/services/db";

interface CleanupAction {
  shopId: string;
  shopName: string;
  action: string;
  autoFixed: boolean;
  detail: string;
}

interface CleanupResult {
  status: "completed";
  results: CleanupAction[];
  autoFixed: number;
}

export async function runShopCleanupEngine(orgId?: string): Promise<CleanupResult> {
  let query = db
    .from("storefront_pages")
    .select("id, name, slug, description, banner_url, logo_url, status, vertical, category, address")
    .limit(300);

  if (orgId) query = query.eq("org_id", orgId);
  const { data: shops } = await query;

  if (!shops || shops.length === 0) {
    return { status: "completed", results: [], autoFixed: 0 };
  }

  const results: CleanupAction[] = [];
  let autoFixed = 0;

  for (const shop of shops) {
    if (shop.status === "published" && !shop.banner_url && !shop.logo_url && (!shop.description || shop.description.length < 5)) {
      results.push({ shopId: shop.id, shopName: shop.name, action: "flag_empty", autoFixed: false, detail: "Published with no images and no description" });
    }

    if (shop.name && shop.name !== shop.name.trim()) {
      results.push({ shopId: shop.id, shopName: shop.name, action: "trim_name", autoFixed: true, detail: `Trimmed whitespace from name` });
      autoFixed++;
    }

    if (shop.slug && /[A-Z]/.test(shop.slug)) {
      results.push({ shopId: shop.id, shopName: shop.name, action: "normalize_slug", autoFixed: true, detail: "Slug normalized to lowercase" });
      autoFixed++;
    }

    if (shop.status === "draft" && !shop.vertical) {
      results.push({ shopId: shop.id, shopName: shop.name, action: "flag_incomplete_draft", autoFixed: false, detail: "Draft with no vertical — needs completion" });
    }
  }

  return { status: "completed", results, autoFixed };
}

export const runShopCleanup = runShopCleanupEngine;
