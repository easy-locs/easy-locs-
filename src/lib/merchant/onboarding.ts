import { supabase } from "@/integrations/supabase/client";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createMerchantDraft(params: {
  name: string;
  category: "food" | "grocery" | "services";
  subcategory?: string;
  city?: string;
  area?: string;
  ownerUserId?: string | null;
  coverImage?: string | null;
}) {
  const slug = `${slugify(params.name)}-${Math.random().toString(36).slice(2, 7)}`;

  const { data, error } = await supabase
    .from("seed_merchants")
    .insert({
      name: params.name,
      slug,
      category: params.category,
      subcategory: params.subcategory ?? null,
      city: params.city ?? "Dubai",
      area: params.area ?? "Business Bay",
      owner_user_id: params.ownerUserId ?? null,
      cover_image: params.coverImage ?? null,
      logo_url: params.coverImage ?? null,
      is_active: true,
      is_open: false,
      is_featured: false,
      onboarding_status: "draft",
      visibility_score: 50,
      rating: 4.2,
      review_count: 0,
      delivery_time_min: 20,
      delivery_time_max: 40,
    } as any)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function bulkCreateMerchantProducts(params: {
  merchantId: string;
  category: "food" | "grocery" | "services";
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
      onboarding_status: "ready",
      visibility_score: params.visibilityScore ?? 80,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", params.merchantId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function autoOnboardMerchant(params: {
  name: string;
  category: "food" | "grocery" | "services";
  subcategory?: string;
  city?: string;
  area?: string;
  ownerUserId?: string | null;
  coverImage?: string | null;
  items: Array<{
    name: string;
    description?: string;
    price: number;
    image?: string | null;
    category?: string | null;
  }>;
}) {
  const merchant = await createMerchantDraft({
    name: params.name,
    category: params.category,
    subcategory: params.subcategory,
    city: params.city,
    area: params.area,
    ownerUserId: params.ownerUserId ?? null,
    coverImage: params.coverImage ?? null,
  });

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
