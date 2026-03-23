/**
 * Auto-Store Repair Engine
 * Fixes blockers/warnings on shops automatically:
 * - Generates missing images (logo + cover) via AI
 * - Creates missing menu/catalog from templates
 * - Fills missing geo/taxonomy defaults
 * - Re-runs audit, stores score, auto-publishes if valid
 */
import { supabase } from "@/integrations/supabase/client";
import { auditShop, type ShopAuditResult } from "@/lib/audit/shop-audit";
import { getAutoFixProducts, auditMenu } from "@/lib/audit/catalog-audit";
import { applyGeoDefaults } from "@/lib/geo/geo-defaults";
import { normalizeVertical, getClusterForSubcategory } from "@/lib/taxonomy/world-class-taxonomy";
import { canonicalTaxonomyPayload } from "@/lib/taxonomy/taxonomy-guard";

export interface RepairResult {
  shopId: string;
  shopName: string;
  before: { score: number; status: string; blockers: string[] };
  after: { score: number; status: string; blockers: string[] };
  fixes: string[];
  autoPublished: boolean;
  error?: string;
}

// ── Image generation via AI gateway ──
async function generateShopImage(
  shopName: string,
  type: "logo" | "cover",
  vertical?: string
): Promise<string | null> {
  try {
    const prompt =
      type === "logo"
        ? `Minimalist professional business logo for "${shopName}", a ${vertical || "business"} establishment. Clean, modern, icon-style, solid white background, no text.`
        : `Professional cover photo banner for "${shopName}", a ${vertical || "business"} establishment. Appetizing, high-quality, wide landscape format, warm lighting, clean background.`;

    const { data: secrets } = await supabase.functions.invoke("repair-shop-images", {
      body: { shopName, type, vertical, prompt },
    });

    return secrets?.imageUrl || null;
  } catch {
    return null;
  }
}

// ── Slug generator ──
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50) + "-" + Math.random().toString(36).slice(2, 6);
}

// ── Single shop repair ──
export async function repairShop(shop: any): Promise<RepairResult> {
  const fixes: string[] = [];
  const beforeAudit = auditShop(shop);
  const updates: Record<string, any> = {};

  try {
    // 1. Fix missing slug
    if (!shop.slug) {
      updates.slug = generateSlug(shop.name || "shop");
      fixes.push("Generated slug");
    }

    // 2. Fix missing geo defaults
    if (shop.country && (!shop.currency || !shop.default_language || !shop.timezone)) {
      const defaults = applyGeoDefaults(shop.country, {
        currency: shop.currency,
        defaultLanguage: shop.default_language,
        timezone: shop.timezone,
      });
      if (!shop.currency && defaults.currency) { updates.currency = defaults.currency; fixes.push(`Set currency: ${defaults.currency}`); }
      if (!shop.default_language && defaults.defaultLanguage) { updates.default_language = defaults.defaultLanguage; fixes.push(`Set language: ${defaults.defaultLanguage}`); }
      if (!shop.timezone && defaults.timezone) { updates.timezone = defaults.timezone; fixes.push(`Set timezone: ${defaults.timezone}`); }
    }

    // 3. Fix taxonomy — enforce canonical coherence
    if (shop.vertical || shop.cluster || shop.subcategory) {
      const tax = canonicalTaxonomyPayload(shop.vertical, shop.cluster, shop.subcategory);
      if (tax.vertical !== shop.vertical) { updates.vertical = tax.vertical; fixes.push(`Normalized vertical: ${tax.vertical}`); }
      if (tax.cluster && tax.cluster !== shop.cluster) { updates.cluster = tax.cluster; fixes.push(`Fixed cluster: ${tax.cluster}`); }
      if (tax.subcategory && tax.subcategory !== shop.subcategory) { updates.subcategory = tax.subcategory; fixes.push(`Fixed subcategory: ${tax.subcategory}`); }
    }

    // 4. Generate missing images
    const hasLogo = !!(shop.logo_url || shop.logo_image);
    const hasCover = !!(shop.cover_url || shop.banner_url || shop.cover_image);

    if (!hasLogo && shop.name) {
      const logoUrl = await generateShopImage(shop.name, "logo", shop.vertical);
      if (logoUrl) { updates.logo_url = logoUrl; fixes.push("Generated AI logo"); }
    }

    if (!hasCover && shop.name) {
      const coverUrl = await generateShopImage(shop.name, "cover", shop.vertical);
      if (coverUrl) { updates.cover_url = coverUrl; fixes.push("Generated AI cover"); }
    }

    // 5. Generate missing menu/catalog
    const productCount = shop.products_count || 0;
    if (productCount === 0 && shop.id) {
      const vertical = shop.vertical ? normalizeVertical(shop.vertical) : "food";
      const templates = getAutoFixProducts(vertical);

      if (templates.length > 0) {
        const productRows = templates.map((t, idx) => ({
          shop_id: shop.id,
          name: t.name,
          description: t.description,
          price: t.price,
          category: t.category,
          currency: shop.currency || updates.currency || "AED",
          sort_order: idx + 1,
          is_available: true,
        }));

        const { error: prodErr } = await (supabase as any)
          .from("products")
          .insert(productRows);

        if (!prodErr) {
          updates.products_count = templates.length;
          updates.has_menu = true;
          fixes.push(`Generated ${templates.length} template products`);
        }
      }
    }

    // 6. Apply updates to shop
    if (Object.keys(updates).length > 0) {
      updates.data_freshness_at = new Date().toISOString();

      await (supabase as any)
        .from("storefront_pages")
        .update(updates)
        .eq("id", shop.id);
    }

    // 7. Re-audit with merged data
    const mergedShop = { ...shop, ...updates };
    const afterAudit = auditShop(mergedShop);

    // 7b. Catalog quality score
    let menuQuality = 0;
    if (updates.products_count > 0 || shop.products_count > 0) {
      const { data: prods } = await (supabase as any)
        .from("products")
        .select("*")
        .eq("shop_id", shop.id);
      if (prods?.length) {
        const menuAudit = auditMenu(prods, mergedShop.vertical);
        menuQuality = menuAudit.qualityScore;
      }
    }

    // 8. Store audit results — all fields persisted
    const auditUpdates: Record<string, any> = {
      audit_score: afterAudit.score,
      audit_status: afterAudit.status,
      readiness_status: afterAudit.status,
      menu_quality_score: menuQuality,
      has_photo: !!(mergedShop.logo_url || mergedShop.logo_image || mergedShop.cover_url || mergedShop.banner_url || mergedShop.cover_image),
    };

    // 9. Auto-publish if valid (no blockers, score >= 75, not already live)
    let autoPublished = false;
    if (afterAudit.isPublishable && afterAudit.blockers.length === 0 && shop.readiness_status !== "live") {
      auditUpdates.readiness_status = "ready";
      autoPublished = true;
      fixes.push("Auto-set to ready for publication");
    }

    if (afterAudit.blockers.length > 0) {
      auditUpdates.blocking_reason = afterAudit.blockers.join("; ");
    } else {
      auditUpdates.blocking_reason = null;
    }

    await (supabase as any)
      .from("storefront_pages")
      .update(auditUpdates)
      .eq("id", shop.id);

    return {
      shopId: shop.id,
      shopName: shop.name,
      before: { score: beforeAudit.score, status: beforeAudit.status, blockers: beforeAudit.blockers },
      after: { score: afterAudit.score, status: afterAudit.status, blockers: afterAudit.blockers },
      fixes,
      autoPublished,
    };
  } catch (err: any) {
    return {
      shopId: shop.id,
      shopName: shop.name,
      before: { score: beforeAudit.score, status: beforeAudit.status, blockers: beforeAudit.blockers },
      after: { score: beforeAudit.score, status: beforeAudit.status, blockers: beforeAudit.blockers },
      fixes,
      autoPublished: false,
      error: err.message,
    };
  }
}

// ── Batch repair ──
export interface BatchRepairSummary {
  total: number;
  repaired: number;
  autoPublished: number;
  errors: number;
  avgScoreBefore: number;
  avgScoreAfter: number;
  results: RepairResult[];
}

export async function batchRepairShops(options?: {
  limit?: number;
  onlyBroken?: boolean;
  vertical?: string;
  city?: string;
}): Promise<BatchRepairSummary> {
  let query = (supabase as any)
    .from("storefront_pages")
    .select("*")
    .order("created_at", { ascending: false });

  if (options?.onlyBroken) {
    query = query.or("readiness_status.eq.draft,readiness_status.eq.incomplete,readiness_status.is.null");
  }
  if (options?.vertical) query = query.eq("vertical", options.vertical);
  if (options?.city) query = query.ilike("city", `%${options.city}%`);

  const limit = options?.limit || 50;
  query = query.limit(limit);

  const { data: shops, error } = await query;
  if (error || !shops?.length) {
    return { total: 0, repaired: 0, autoPublished: 0, errors: 0, avgScoreBefore: 0, avgScoreAfter: 0, results: [] };
  }

  const results: RepairResult[] = [];
  let totalBefore = 0;
  let totalAfter = 0;
  let repaired = 0;
  let autoPublished = 0;
  let errCount = 0;

  for (const shop of shops) {
    const result = await repairShop(shop);
    results.push(result);
    totalBefore += result.before.score;
    totalAfter += result.after.score;
    if (result.fixes.length > 0) repaired++;
    if (result.autoPublished) autoPublished++;
    if (result.error) errCount++;
  }

  return {
    total: shops.length,
    repaired,
    autoPublished,
    errors: errCount,
    avgScoreBefore: shops.length ? Math.round(totalBefore / shops.length) : 0,
    avgScoreAfter: shops.length ? Math.round(totalAfter / shops.length) : 0,
    results,
  };
}
