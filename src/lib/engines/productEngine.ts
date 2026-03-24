/**
 * Product Engine V2 — Canonical commerce operations.
 * Extends existing catalog_items / catalog_variants / catalog_media.
 * No duplication. Single source of truth.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Types ──

export interface ProductVariant {
  id: string;
  name: string;
  variant_label: string | null;
  size: string | null;
  weight: number | null;
  volume: number | null;
  pack_quantity: number | null;
  unit: string;
  price: number;
  compare_at_price: number | null;
  currency: string;
  in_stock: boolean;
  barcode: string | null;
  sku: string | null;
  sort_order: number;
}

export interface ProductAttribute {
  id: string;
  attribute_key: string;
  attribute_label: string;
  value_text: string | null;
  value_number: number | null;
  value_bool: boolean | null;
}

export interface ProductImage {
  id: string;
  url: string;
  media_type: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
  quality_score: number | null;
}

export interface ProductSearchResult {
  product_id: string;
  entity_id: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  photo_url: string | null;
  vertical: string | null;
  category: string | null;
  subcategory: string | null;
  brand: string | null;
  rank_score: number;
}

export interface ProductScores {
  data_quality_score: number;
  visual_quality_score: number;
  search_quality_score: number;
  taxonomy_quality_score: number;
  readiness_score: number;
}

// ── Variants ──

export async function getProductVariants(globalProductId: string): Promise<ProductVariant[]> {
  const { data, error } = await supabase
    .from("catalog_variants")
    .select("id, name, variant_label, size, weight, volume, pack_quantity, unit, price, compare_at_price, currency, in_stock, barcode, sku, sort_order")
    .eq("item_id", globalProductId)
    .eq("available", true)
    .order("sort_order");

  if (error) {
    console.error("[ProductEngine] getProductVariants error:", error.message);
    return [];
  }
  return (data ?? []) as ProductVariant[];
}

// ── Attributes ──

export async function getProductAttributes(globalProductId: string): Promise<ProductAttribute[]> {
  const { data, error } = await supabase
    .from("catalog_product_attributes")
    .select(`
      id,
      value_text,
      value_number,
      value_bool,
      attribute_definition_id
    `)
    .eq("global_product_id", globalProductId);

  if (error) {
    console.error("[ProductEngine] getProductAttributes error:", error.message);
    return [];
  }

  // Enrich with definition labels
  if (!data || data.length === 0) return [];

  const defIds = [...new Set(data.map((a: any) => a.attribute_definition_id))];
  const { data: defs } = await supabase
    .from("canonical_attribute_definitions")
    .select("id, key, label")
    .in("id", defIds);

  const defMap = new Map((defs ?? []).map((d: any) => [d.id, d]));

  return data.map((a: any) => {
    const def = defMap.get(a.attribute_definition_id);
    return {
      id: a.id,
      attribute_key: def?.key ?? "unknown",
      attribute_label: def?.label ?? "Unknown",
      value_text: a.value_text,
      value_number: a.value_number,
      value_bool: a.value_bool,
    };
  });
}

// ── Images ──

export async function getProductImages(globalProductId: string): Promise<ProductImage[]> {
  const { data, error } = await supabase
    .from("catalog_media")
    .select("id, url, media_type, alt_text, is_primary, sort_order, quality_score")
    .eq("product_id", globalProductId)
    .eq("active", true)
    .order("sort_order");

  if (error) {
    console.error("[ProductEngine] getProductImages error:", error.message);
    return [];
  }
  return (data ?? []) as ProductImage[];
}

// ── Search V2 ──

export async function searchProductsV2(
  query: string,
  filters?: {
    country?: string;
    city?: string;
    vertical?: string;
    category?: string;
    limit?: number;
  }
): Promise<ProductSearchResult[]> {
  const { data, error } = await supabase.rpc("search_global_products_v2", {
    q: query,
    p_country: filters?.country ?? null,
    p_city: filters?.city ?? null,
    p_vertical: filters?.vertical ?? null,
    p_category: filters?.category ?? null,
    limit_count: filters?.limit ?? 20,
  });

  if (error) {
    console.error("[ProductEngine] searchProductsV2 error:", error.message);
    return [];
  }
  return (data ?? []) as ProductSearchResult[];
}

// ── Quality Scoring ──

export async function computeProductScores(productId: string): Promise<boolean> {
  const { error } = await supabase.rpc("compute_product_quality_scores", {
    p_product_id: productId,
  });

  if (error) {
    console.error("[ProductEngine] computeProductScores error:", error.message);
    return false;
  }
  return true;
}

export async function rebuildSearchIndex(productId: string): Promise<boolean> {
  const { error } = await supabase.rpc("rebuild_product_search_index", {
    p_product_id: productId,
  });

  if (error) {
    console.error("[ProductEngine] rebuildSearchIndex error:", error.message);
    return false;
  }
  return true;
}

// ── Taxonomy Hierarchy ──

export async function getCanonicalTaxonomyHierarchy() {
  const [verticals, families, categories, subcategories] = await Promise.all([
    supabase.from("canonical_verticals").select("*").eq("active", true).order("sort_order"),
    supabase.from("canonical_families").select("*").eq("active", true).order("sort_order"),
    supabase.from("canonical_categories").select("*").eq("active", true).order("sort_order"),
    supabase.from("canonical_subcategories").select("*").eq("active", true).order("sort_order"),
  ]);

  return {
    verticals: verticals.data ?? [],
    families: families.data ?? [],
    categories: categories.data ?? [],
    subcategories: subcategories.data ?? [],
  };
}

// ── Full Product Detail ──

export async function getFullProductDetail(productId: string) {
  const [product, variants, attributes, images] = await Promise.all([
    supabase.from("catalog_items").select("*").eq("id", productId).single(),
    getProductVariants(productId),
    getProductAttributes(productId),
    getProductImages(productId),
  ]);

  return {
    product: product.data,
    variants,
    attributes,
    images,
  };
}
