/**
 * UAE Ingestion Engine
 * Controlled batch ingestion for all 7 emirates.
 * Every imported shop must pass minimum quality gates before visibility.
 */
import { supabase } from "@/integrations/supabase/client";
import { canonicalTaxonomyPayload } from "@/lib/taxonomy/taxonomy-guard";
import { getTaxonomyFallbackCover } from "@/lib/image/dual-layer-image";
import { buildProvenance } from "@/lib/image/dual-layer-image";
import { applyGeoDefaults } from "@/lib/geo/geo-defaults";

// ── Emirates config ──
export const UAE_EMIRATES = [
  { code: "DXB", name: "Dubai", region: "Dubai" },
  { code: "AUH", name: "Abu Dhabi", region: "Abu Dhabi" },
  { code: "SHJ", name: "Sharjah", region: "Sharjah" },
  { code: "AJM", name: "Ajman", region: "Ajman" },
  { code: "RAK", name: "Ras Al Khaimah", region: "Ras Al Khaimah" },
  { code: "FUJ", name: "Fujairah", region: "Fujairah" },
  { code: "UAQ", name: "Umm Al Quwain", region: "Umm Al Quwain" },
] as const;

export type EmirateCode = typeof UAE_EMIRATES[number]["code"];

export interface IngestionBatch {
  id: string;
  label: string;
  emirates: EmirateCode[];
  verticals: string[];
  status: "pending" | "running" | "completed" | "failed";
  totalShops: number;
  processedShops: number;
  passedShops: number;
  failedShops: number;
}

export const INGESTION_BATCHES: IngestionBatch[] = [
  {
    id: "batch-1",
    label: "Dubai + Abu Dhabi — Food, Grocery, Services",
    emirates: ["DXB", "AUH"],
    verticals: ["food", "grocery", "services"],
    status: "pending",
    totalShops: 0,
    processedShops: 0,
    passedShops: 0,
    failedShops: 0,
  },
  {
    id: "batch-2",
    label: "Sharjah + Ajman — Food, Shops, Services",
    emirates: ["SHJ", "AJM"],
    verticals: ["food", "shops", "services"],
    status: "pending",
    totalShops: 0,
    processedShops: 0,
    passedShops: 0,
    failedShops: 0,
  },
  {
    id: "batch-3",
    label: "RAK + Fujairah + UAQ — Food, Grocery, Services",
    emirates: ["RAK", "FUJ", "UAQ"],
    verticals: ["food", "grocery", "services"],
    status: "pending",
    totalShops: 0,
    processedShops: 0,
    passedShops: 0,
    failedShops: 0,
  },
];

function generateSlug(name: string, city: string): string {
  const base = `${name}-${city}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 55);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

export interface IngestionShopInput {
  name: string;
  vertical: string;
  subcategory?: string;
  city: string;
  emirate: EmirateCode;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  sourceType?: string;
  sourceName?: string;
  sourceExternalId?: string;
  coverUrl?: string;
  logoUrl?: string;
}

export interface IngestionResult {
  name: string;
  ok: boolean;
  shopId?: string;
  slug?: string;
  reason?: string;
}

/**
 * Validate a shop before ingestion — minimum quality gates.
 */
export function validateIngestionShop(input: IngestionShopInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input.name || input.name.trim().length < 2) errors.push("Invalid name");
  if (!input.city) errors.push("Missing city");
  if (!input.vertical) errors.push("Missing vertical");
  // Validate taxonomy
  const tax = canonicalTaxonomyPayload(input.vertical, undefined, input.subcategory);
  if (!tax.vertical) errors.push("Invalid vertical");
  return { valid: errors.length === 0, errors };
}

/**
 * Ingest a single shop with full quality gates.
 */
export async function ingestShop(
  input: IngestionShopInput,
  userId: string,
  orgId: string
): Promise<IngestionResult> {
  // Validate
  const validation = validateIngestionShop(input);
  if (!validation.valid) {
    return { name: input.name, ok: false, reason: validation.errors.join(", ") };
  }

  const tax = canonicalTaxonomyPayload(input.vertical, undefined, input.subcategory);
  const slug = generateSlug(input.name, input.city);
  const geo = applyGeoDefaults("AE", {});
  const emirateInfo = UAE_EMIRATES.find(e => e.code === input.emirate);

  // Build provenance
  const provenance = buildProvenance({
    sourceName: input.sourceName,
    sourceType: input.sourceType || "import_ai",
    sourceExternalId: input.sourceExternalId,
    confidence: input.sourceType === "google" ? 40 : 60,
  });

  // Determine cover with diversity
  const tempId = crypto.randomUUID();
  const coverAutoUrl = input.coverUrl || getTaxonomyFallbackCover({
    id: tempId,
    vertical: tax.vertical,
    subcategory: tax.subcategory,
  });

  const insertPayload: Record<string, any> = {
    name: input.name.trim(),
    slug,
    city: input.city,
    country: "AE",
    region: emirateInfo?.region || input.city,
    vertical: tax.vertical,
    cluster: tax.cluster,
    subcategory: tax.subcategory,
    launch_status: "draft",
    readiness_status: "draft",
    activation_status: "draft",
    user_id: userId,
    org_id: orgId,
    source_type: input.sourceType || "import_ai",
    source_confidence: provenance.source_confidence,
    source_name: input.sourceName || null,
    source_external_id: input.sourceExternalId || null,
    is_auto_generated: true,
    is_claimed: false,
    has_photo: !!input.coverUrl,
    has_menu: false,
    products_count: 0,
    cover_source: input.coverUrl ? (input.sourceType || "system") : "system",
    cover_auto_url: coverAutoUrl,
    cover_owner_url: null,
    logo_auto_url: input.logoUrl || null,
    logo_owner_url: null,
    provenance_json: provenance,
    currency: geo.currency || "AED",
    default_language: geo.defaultLanguage || "en",
    timezone: geo.timezone || "Asia/Dubai",
    metadata_json: { auto_generated: true, source: "uae_ingestion", emirate: input.emirate },
  };

  if (input.address) insertPayload.address = input.address;
  if (input.latitude != null) insertPayload.latitude = input.latitude;
  if (input.longitude != null) insertPayload.longitude = input.longitude;
  if (input.phone) insertPayload.phone = input.phone;

  try {
    const { data: shop, error } = await (supabase as any)
      .from("storefront_pages")
      .insert(insertPayload)
      .select("id, slug")
      .single();

    if (error) {
      return { name: input.name, ok: false, reason: error.message };
    }

    return { name: input.name, ok: true, shopId: shop.id, slug: shop.slug };
  } catch (err: any) {
    return { name: input.name, ok: false, reason: err.message || "Unknown error" };
  }
}

/**
 * Batch ingest multiple shops with progress tracking.
 */
export async function batchIngest(
  shops: IngestionShopInput[],
  userId: string,
  orgId: string,
  onProgress?: (done: number, total: number) => void
): Promise<IngestionResult[]> {
  const results: IngestionResult[] = [];
  for (let i = 0; i < shops.length; i++) {
    const result = await ingestShop(shops[i], userId, orgId);
    results.push(result);
    onProgress?.(i + 1, shops.length);
  }
  return results;
}
