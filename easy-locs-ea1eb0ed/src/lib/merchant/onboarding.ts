import { db as supabase } from "@/services/db";
import type { Vertical } from "@/lib/taxonomy/world-class-taxonomy";
import { checkNewShopDuplicate } from "@/lib/dedup/dedup-engine";
import { pickDiverseHero } from "@/lib/image/hero-diversity-guard";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createMerchantDraft(params: {
  name: string;
  category: Vertical;
  subcategory?: string;
  cluster?: string;
  city?: string;
  area?: string;
  country?: string;
  ownerUserId?: string | null;
  coverImage?: string | null;
  currency?: string;
  defaultLanguage?: string;
  timezone?: string;
  tags?: string[];
}) {
  const insertPayload: Record<string, any> = {
    name: params.name,
    category: params.category,
    subcategory: params.subcategory ?? null,
    city: params.city ?? "Dubai",
    area: params.area ?? "Business Bay",
    cover_image: params.coverImage ?? null, // Will be overridden below if needed
    logo_image: params.coverImage ?? null,
    is_active: true,
    is_open: false,
    is_featured: false,
    visibility_score: 50,
    rating: 4.2,
    review_count: 0,
    delivery_time_min: 20,
    delivery_time_max: 40,
    source_type: "import_ai",
    source_confidence: 70,
  };

  // Hero diversity guard: auto-pick diverse image if none provided or if duplicate
  if (!insertPayload.cover_image && params.subcategory) {
    const diverseHero = await pickDiverseHero(params.subcategory);
    insertPayload.cover_image = diverseHero;
    insertPayload.logo_image = diverseHero;
  } else if (insertPayload.cover_image && params.subcategory) {
    const { validateHeroUniqueness } = await import("@/lib/image/hero-diversity-guard");
    const check = await validateHeroUniqueness(insertPayload.cover_image, params.subcategory);
    if (!check.ok && check.suggestedAlternative) {
      console.warn(`[HERO-GUARD] Replacing duplicate hero for "${params.name}" with diverse alternative`);
      insertPayload.cover_image = check.suggestedAlternative;
      insertPayload.logo_image = check.suggestedAlternative;
    }
  }

  // World-ready optional fields (nullable/safe)
  if (params.country) insertPayload.country = params.country;
  if (params.cluster) insertPayload.cluster = params.cluster;
  if (params.tags?.length) insertPayload.tags = params.tags;

  const { data, error } = await supabase
    .from("seed_merchants")
    .insert(insertPayload as any)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function bulkCreateMerchantProducts(params: {
  merchantId: string;
  category: string;
  items: Array<{
    name: string;
    description?: string;
    price: number;
    image?: string | null;
    category?: string | null;
    sortOrder?: number;
  }>;
}) {
  const rows = params.items.map((item, index) => ({
    merchant_id: params.merchantId,
    name: item.name,
    description: item.description ?? null,
    price: item.price,
    image: item.image ?? null,
    category: item.category ?? params.category,
    sort_order: item.sortOrder ?? index + 1,
    is_available: true,
  }));

  const { data, error } = await supabase
    .from("seed_products")
    .insert(rows as any)
    .select("*");

  if (error) throw error;
  return data ?? [];
}

export async function activateMerchantStore(params: {
  merchantId: string;
  featured?: boolean;
  visibilityScore?: number;
}) {
  const { data, error } = await supabase
    .from("seed_merchants")
    .update({
      is_open: true,
      is_active: true,
      is_featured: params.featured ?? false,
      visibility_score: params.visibilityScore ?? 80,
    } as any)
    .eq("id", params.merchantId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function autoOnboardMerchant(params: {
  name: string;
  category: Vertical;
  subcategory?: string;
  cluster?: string;
  city?: string;
  area?: string;
  country?: string;
  ownerUserId?: string | null;
  coverImage?: string | null;
  currency?: string;
  defaultLanguage?: string;
  timezone?: string;
  tags?: string[];
  items: Array<{
    name: string;
    description?: string;
    price: number;
    image?: string | null;
    category?: string | null;
  }>;
}) {
  // ── DEDUP CHECK BEFORE INSERTION ──
  const dedupResult = await checkNewShopDuplicate({
    id: crypto.randomUUID(),
    name: params.name,
    city: params.city ?? "Dubai",
    address: params.area ?? undefined,
  });

  if (dedupResult && dedupResult.action === "auto_hide") {
    console.warn(`[DEDUP] Blocked: "${params.name}" is duplicate of "${dedupResult.matchName}" (confidence: ${dedupResult.confidence}%)`);
    throw new Error(`Duplicate detected: "${params.name}" matches existing "${dedupResult.matchName}" (${dedupResult.confidence}% confidence). Use a different name or location.`);
  }

  if (dedupResult && dedupResult.action === "review") {
    console.warn(`[DEDUP] Review needed: "${params.name}" similar to "${dedupResult.matchName}" (confidence: ${dedupResult.confidence}%)`);
  }

  const merchant = await createMerchantDraft({
    name: params.name,
    category: params.category,
    subcategory: params.subcategory,
    cluster: params.cluster,
    city: params.city,
    area: params.area,
    country: params.country,
    ownerUserId: params.ownerUserId ?? null,
    coverImage: params.coverImage ?? null,
    currency: params.currency,
    defaultLanguage: params.defaultLanguage,
    timezone: params.timezone,
    tags: params.tags,
  });

  // If review needed, flag the merchant
  if (dedupResult && dedupResult.action === "review") {
    await supabase
      .from("seed_merchants" as any)
      .update({
        review_required: true,
        duplicate_confidence: dedupResult.confidence,
        duplicate_of: dedupResult.matchId,
      } as any)
      .eq("id", merchant.id);
  }

  await bulkCreateMerchantProducts({
    merchantId: merchant.id,
    category: params.category,
    items: params.items,
  });

  const active = await activateMerchantStore({
    merchantId: merchant.id,
    featured: false,
    visibilityScore: 75,
  });

  return active;
}
