/**
 * UAE Auto Shop Import Pipeline — ENRICHED
 * SOURCE → PARSE → NORMALIZE → TAXONOMY → GEO → DEDUP → SCORE → ENRICH → CREATE
 * NO activation messages. NO merchant contact. Import only.
 */
import { supabase } from "@/integrations/supabase/client";
import { resolveVerticalFromSubcategory } from "@/lib/taxonomy/subcategory-vertical-map";

// ─── Types ───
export interface RawShopInput {
  source_external_id?: string;
  name: string;
  category?: string;
  subcategory?: string;
  phone?: string;
  address?: string;
  city?: string;
  area?: string;
  country?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  reviews_count?: number;
  price_level?: number;
  hours?: any;
  menu?: any[];
  images?: string[];
  logo_url?: string;
  cover_url?: string;
  website?: string;
  description?: string;
  cuisine_tags?: string[];
  amenities?: string[];
  delivery_available?: boolean;
  dine_in?: boolean;
  takeaway?: boolean;
  halal?: boolean;
  raw_payload?: any;
}

export interface BatchConfig {
  source_type: string;
  source_name: string;
  country?: string;
  city?: string;
}

export interface PipelineResult {
  batch_id: string;
  total_raw: number;
  total_created: number;
  total_updated: number;
  total_skipped: number;
  total_duplicates: number;
  total_failed: number;
  errors: Array<{ name: string; error: string }>;
  quality_distribution: { approved: number; review: number; low_quality: number };
  avg_completeness: number;
}

// ─── STEP 1: Create batch ───
async function createBatch(config: BatchConfig): Promise<string> {
  const { data, error } = await (supabase as any)
    .from("import_batches")
    .insert({
      source_type: config.source_type,
      source_name: config.source_name,
      country: config.country ?? "AE",
      city: config.city ?? "Dubai",
      status: "running",
      total_raw: 0,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Batch creation failed: ${error.message}`);
  return data.id;
}

// ─── STEP 2: Ingest raw data ───
async function ingestRaw(batchId: string, sourceType: string, items: RawShopInput[]) {
  const rows = items.map((item) => ({
    batch_id: batchId,
    source_type: sourceType,
    source_external_id: item.source_external_id ?? null,
    raw_name: item.name,
    raw_category: item.category ?? null,
    raw_subcategory: item.subcategory ?? null,
    raw_phone: item.phone ?? null,
    raw_address: item.address ?? null,
    raw_city: item.city ?? "Dubai",
    raw_area: item.area ?? null,
    raw_country: item.country ?? "AE",
    raw_lat: item.lat ?? null,
    raw_lng: item.lng ?? null,
    raw_rating: item.rating ?? null,
    raw_reviews_count: item.reviews_count ?? null,
    raw_price_level: item.price_level ?? null,
    raw_hours: item.hours ?? null,
    raw_menu_json: item.menu ?? null,
    raw_images: item.images ?? null,
    raw_website: item.website ?? null,
    raw_payload_json: item.raw_payload ?? null,
    parsed_status: "pending",
  }));

  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50);
    const { error } = await (supabase as any).from("imported_shop_raw").insert(chunk);
    if (error) throw new Error(`Raw ingest failed: ${error.message}`);
  }
}

// ─── STEP 3: Parse & Normalize ───
function normalizeText(raw: string | null): string {
  if (!raw) return "";
  return raw.trim().replace(/\s+/g, " ");
}

function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (cleaned.length < 7) return null;
  return cleaned;
}

function generateSlug(name: string, city: string, area?: string): string {
  const parts = [name, area ?? "", city].filter(Boolean);
  return parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

// ─── STEP 4: Taxonomy mapping ───
const CATEGORY_MAP: Record<string, { vertical: string; subcategory: string }> = {
  restaurant: { vertical: "food", subcategory: "dineout" },
  cafe: { vertical: "food", subcategory: "cafe" },
  bakery: { vertical: "food", subcategory: "bakery" },
  pizza: { vertical: "food", subcategory: "pizza" },
  burger: { vertical: "food", subcategory: "burger" },
  sushi: { vertical: "food", subcategory: "sushi" },
  indian: { vertical: "food", subcategory: "indian" },
  chinese: { vertical: "food", subcategory: "chinese" },
  italian: { vertical: "food", subcategory: "italian" },
  lebanese: { vertical: "food", subcategory: "lebanese" },
  mexican: { vertical: "food", subcategory: "mexican" },
  thai: { vertical: "food", subcategory: "thai" },
  japanese: { vertical: "food", subcategory: "japanese" },
  korean: { vertical: "food", subcategory: "korean" },
  fast_food: { vertical: "food", subcategory: "fast_food" },
  seafood: { vertical: "food", subcategory: "seafood" },
  shawarma: { vertical: "food", subcategory: "shawarma" },
  desserts: { vertical: "food", subcategory: "desserts" },
  juice: { vertical: "food", subcategory: "juice" },
  coffee: { vertical: "food", subcategory: "cafe" },
  pharmacy: { vertical: "healthcare", subcategory: "pharmacy" },
  clinic: { vertical: "healthcare", subcategory: "clinic" },
  hospital: { vertical: "healthcare", subcategory: "hospital" },
  dentist: { vertical: "healthcare", subcategory: "dentist" },
  optician: { vertical: "healthcare", subcategory: "optician" },
  hotel: { vertical: "property", subcategory: "hotel" },
  resort: { vertical: "property", subcategory: "resort" },
  salon: { vertical: "services", subcategory: "salon" },
  spa: { vertical: "services", subcategory: "spa" },
  gym: { vertical: "services", subcategory: "fitness" },
  supermarket: { vertical: "grocery", subcategory: "supermarket" },
  grocery: { vertical: "grocery", subcategory: "grocery" },
  convenience: { vertical: "grocery", subcategory: "convenience" },
  electronics: { vertical: "shops", subcategory: "electronics" },
  fashion: { vertical: "shops", subcategory: "fashion" },
  furniture: { vertical: "shops", subcategory: "furniture" },
  laundry: { vertical: "services", subcategory: "cleaning" },
  car_wash: { vertical: "services", subcategory: "car_wash" },
  pet_shop: { vertical: "shops", subcategory: "pet" },
  florist: { vertical: "shops", subcategory: "florist" },
};

function mapTaxonomy(rawCat?: string | null, rawSub?: string | null): { vertical: string; subcategory: string | null } {
  const normalized = (rawSub ?? rawCat ?? "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (CATEGORY_MAP[normalized]) return CATEGORY_MAP[normalized];
  const vertical = resolveVerticalFromSubcategory(normalized);
  return { vertical, subcategory: normalized || null };
}

// ─── STEP 5: Completeness scoring ───
interface CompletenessScores {
  profile: number;
  media: number;
  menu: number;
  taxonomy: number;
  geo: number;
  overall: number;
}

function calculateCompleteness(item: RawShopInput, subcategory: string | null): CompletenessScores {
  // Profile: name, phone, address, description, website, hours, rating
  let profile = 0;
  if (item.name?.length > 2) profile += 20;
  if (item.phone) profile += 15;
  if (item.address) profile += 15;
  if (item.description) profile += 15;
  if (item.website) profile += 10;
  if (item.hours) profile += 15;
  if (item.rating) profile += 10;
  profile = Math.min(profile, 100);

  // Media: logo, cover, gallery (3+), menu images
  let media = 0;
  if (item.logo_url) media += 25;
  if (item.cover_url) media += 25;
  const galleryCount = item.images?.length ?? 0;
  if (galleryCount >= 1) media += 15;
  if (galleryCount >= 3) media += 15;
  if (galleryCount >= 5) media += 10;
  if (item.menu?.some((m: any) => m.image)) media += 10;
  media = Math.min(media, 100);

  // Menu: categories, items, prices, descriptions
  let menu = 0;
  if (item.menu?.length) {
    menu += 30; // has menu
    const hasCategories = item.menu.some((m: any) => m.category);
    if (hasCategories) menu += 20;
    const hasDescriptions = item.menu.some((m: any) => m.description);
    if (hasDescriptions) menu += 15;
    const hasPrices = item.menu.some((m: any) => m.price != null);
    if (hasPrices) menu += 25;
    if (item.menu.length >= 10) menu += 10;
  }
  menu = Math.min(menu, 100);

  // Taxonomy
  let taxonomy = 0;
  if (subcategory) taxonomy += 50;
  if (item.cuisine_tags?.length) taxonomy += 30;
  if (item.amenities?.length) taxonomy += 20;
  taxonomy = Math.min(taxonomy, 100);

  // Geo
  let geo = 0;
  if (item.lat && item.lng) geo += 50;
  if (item.address) geo += 20;
  if (item.city) geo += 15;
  if (item.area) geo += 15;
  geo = Math.min(geo, 100);

  const overall = Math.round((profile * 0.3 + media * 0.2 + menu * 0.15 + taxonomy * 0.15 + geo * 0.2) * 100) / 100;

  return { profile, media, menu, taxonomy, geo, overall };
}

// ─── STEP 6: Quality scoring (enhanced) ───
function calculateQualityScore(item: RawShopInput, completeness: CompletenessScores): number {
  let score = 0;
  if (item.name?.length > 2) score += 15;
  if (item.phone) score += 10;
  if (item.lat && item.lng) score += 15;
  if (item.rating && item.rating > 0) score += 8;
  if (item.reviews_count && item.reviews_count > 0) score += 7;
  if (item.website) score += 5;
  if (item.address?.length && item.address.length > 5) score += 8;
  if (item.logo_url) score += 5;
  if (item.cover_url) score += 5;
  if ((item.images?.length ?? 0) >= 3) score += 5;
  if (item.menu?.length) score += 7;
  if (item.description) score += 5;
  if (item.hours) score += 5;
  // Bonus from completeness
  score = Math.round(score * 0.7 + completeness.overall * 0.3);
  return Math.min(score, 100);
}

// ─── STEP 7: Menu structuring + display scoring ───
interface StructuredMenuItem {
  name: string;
  category?: string;
  description?: string;
  price?: number;
  currency?: string;
  image?: string;
  tags?: string[];
  available?: boolean;
  is_bestseller?: boolean;
}

interface MenuDisplayAnalysis {
  categories: Record<string, StructuredMenuItem[]>;
  totalItems: number;
  menu_display_score: number;
  bestseller_count: number;
  missing_image_count: number;
  missing_price_count: number;
  empty_category_count: number;
  optimal_category_order: string[];
  flags: string[];
}

const CATEGORY_PRIORITY: Record<string, number> = {
  bestsellers: 1, "best sellers": 1, popular: 1, "most ordered": 1,
  combos: 2, meals: 2, "value meals": 2,
  appetizers: 3, starters: 3,
  mains: 4, "main course": 4, entrees: 4,
  burgers: 5, pizza: 5, sandwiches: 5, wraps: 5,
  sides: 6,
  salads: 7,
  soups: 8,
  desserts: 9, sweets: 9,
  drinks: 10, beverages: 10, juice: 10, coffee: 10,
  extras: 11, "add-ons": 11, sauces: 11,
  general: 99,
};

function detectBestseller(item: any): boolean {
  const tags = (item.tags || []).map((t: string) => t.toLowerCase());
  const name = (item.name || "").toLowerCase();
  return tags.includes("bestseller") || tags.includes("popular") || tags.includes("best seller")
    || name.includes("bestseller") || item.is_bestseller === true || item.popular === true;
}

function analyzeMenu(rawMenu: any[]): MenuDisplayAnalysis {
  const categories: Record<string, StructuredMenuItem[]> = {};
  let totalItems = 0;
  let bestseller_count = 0;
  let missing_image_count = 0;
  let missing_price_count = 0;
  const flags: string[] = [];

  for (const item of rawMenu) {
    const cat = (item.category || item.section || "General").trim();
    if (!categories[cat]) categories[cat] = [];
    const isBestseller = detectBestseller(item);
    if (isBestseller) bestseller_count++;
    const hasImage = !!(item.image || item.image_url || item.photo);
    const hasPrice = item.price != null && !isNaN(parseFloat(item.price));
    if (!hasImage) missing_image_count++;
    if (!hasPrice) missing_price_count++;

    categories[cat].push({
      name: (item.name || item.title || "").trim(),
      category: cat,
      description: item.description || item.desc || undefined,
      price: hasPrice ? (typeof item.price === "number" ? item.price : parseFloat(item.price)) : undefined,
      currency: item.currency || "AED",
      image: hasImage ? (item.image || item.image_url || item.photo) : undefined,
      tags: item.tags || [],
      available: item.available !== false,
      is_bestseller: isBestseller,
    });
    totalItems++;
  }

  // Empty categories
  const empty_category_count = Object.entries(categories).filter(([, items]) => items.length === 0).length;

  // Optimal order
  const optimal_category_order = Object.keys(categories).sort((a, b) => {
    const pa = CATEGORY_PRIORITY[a.toLowerCase()] ?? 50;
    const pb = CATEGORY_PRIORITY[b.toLowerCase()] ?? 50;
    return pa - pb;
  });

  // Flags
  if (bestseller_count === 0 && totalItems > 5) flags.push("no_bestsellers_detected");
  if (missing_image_count > totalItems * 0.5) flags.push("majority_missing_images");
  if (missing_price_count > totalItems * 0.3) flags.push("many_missing_prices");
  if (empty_category_count > 0) flags.push("empty_categories");
  if (Object.keys(categories).length < 2 && totalItems > 10) flags.push("single_category_dump");

  // Menu display score (0-100)
  let menu_display_score = 40; // base
  if (totalItems >= 5) menu_display_score += 10;
  if (totalItems >= 15) menu_display_score += 5;
  if (Object.keys(categories).length >= 3) menu_display_score += 10;
  if (bestseller_count > 0) menu_display_score += 10;
  if (missing_image_count < totalItems * 0.3) menu_display_score += 10;
  if (missing_price_count === 0) menu_display_score += 10;
  if (empty_category_count === 0) menu_display_score += 5;
  menu_display_score = Math.min(menu_display_score, 100);

  return {
    categories, totalItems, menu_display_score, bestseller_count,
    missing_image_count, missing_price_count, empty_category_count,
    optimal_category_order, flags,
  };
}

// Backward compat wrapper
function structureMenu(rawMenu: any[]): { categories: Record<string, StructuredMenuItem[]>; totalItems: number } {
  const analysis = analyzeMenu(rawMenu);
  return { categories: analysis.categories, totalItems: analysis.totalItems };
}

// ─── STEP 8: Vertical-specific attributes ───
function extractVerticalAttributes(item: RawShopInput, vertical: string): Record<string, any> {
  const attrs: Record<string, any> = {};

  // Common
  if (item.cuisine_tags?.length) attrs.cuisine_tags = item.cuisine_tags;
  if (item.amenities?.length) attrs.amenities = item.amenities;
  if (item.halal) attrs.halal = true;
  if (item.delivery_available) attrs.delivery = true;
  if (item.dine_in) attrs.dine_in = true;
  if (item.takeaway) attrs.takeaway = true;
  if (item.hours) attrs.opening_hours = item.hours;
  if (item.price_level) attrs.price_tier = item.price_level;

  // Vertical-specific extraction
  switch (vertical) {
    case "food":
      attrs.service_modes = [
        item.dine_in && "dine_in",
        item.takeaway && "takeaway",
        item.delivery_available && "delivery",
      ].filter(Boolean);
      break;
    case "healthcare":
      attrs.facility_type = item.subcategory || "clinic";
      break;
    case "property":
      attrs.property_type = item.subcategory || "hotel";
      break;
    case "services":
      attrs.service_type = item.subcategory || "general";
      break;
  }

  return attrs;
}

// ─── STEP 9: Dedup check ───
async function checkDuplicate(name: string, phone: string | null, lat: number | null, lng: number | null, sourceExtId?: string): Promise<{ isDuplicate: boolean; existingId?: string; confidence: number }> {
  // Exact source_external_id match
  if (sourceExtId) {
    const { data } = await (supabase as any)
      .from("onboarding_shop_candidates")
      .select("id")
      .eq("source_external_id", sourceExtId)
      .limit(1);
    if (data?.length) return { isDuplicate: true, existingId: data[0].id, confidence: 99 };
  }

  // Exact phone match
  if (phone) {
    const { data } = await (supabase as any)
      .from("onboarding_shop_candidates")
      .select("id")
      .eq("phone", phone)
      .limit(1);
    if (data?.length) return { isDuplicate: true, existingId: data[0].id, confidence: 95 };
  }

  // Similar name + close geo
  if (lat && lng) {
    const { data } = await (supabase as any)
      .from("onboarding_shop_candidates")
      .select("id, canonical_name, latitude, longitude")
      .ilike("canonical_name", `%${name.slice(0, 15)}%`)
      .limit(20);

    if (data?.length) {
      for (const existing of data) {
        if (existing.latitude && existing.longitude) {
          const dist = haversineDistance(lat, lng, existing.latitude, existing.longitude);
          if (dist < 0.15) {
            const sim = nameSimilarity(name, existing.canonical_name);
            if (sim > 0.8) return { isDuplicate: true, existingId: existing.id, confidence: 85 };
          }
        }
      }
    }
  }

  return { isDuplicate: false, confidence: 0 };
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nameSimilarity(a: string, b: string): number {
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  if (na === nb) return 1;
  const longer = na.length > nb.length ? na : nb;
  const shorter = na.length > nb.length ? nb : na;
  if (longer.includes(shorter)) return shorter.length / longer.length;
  let matches = 0;
  for (const c of shorter) { if (longer.includes(c)) matches++; }
  return matches / longer.length;
}

// ─── MAIN PIPELINE ───
export async function runImportPipeline(config: BatchConfig, items: RawShopInput[]): Promise<PipelineResult> {
  const result: PipelineResult = {
    batch_id: "",
    total_raw: items.length,
    total_created: 0,
    total_updated: 0,
    total_skipped: 0,
    total_duplicates: 0,
    total_failed: 0,
    errors: [],
    quality_distribution: { approved: 0, review: 0, low_quality: 0 },
    avg_completeness: 0,
  };

  const batchId = await createBatch(config);
  result.batch_id = batchId;
  await ingestRaw(batchId, config.source_type, items);

  let totalCompleteness = 0;

  for (const item of items) {
    try {
      const name = normalizeText(item.name);
      if (!name) { result.total_skipped++; continue; }

      const phone = normalizePhone(item.phone);
      const city = normalizeText(item.city) || config.city || "Dubai";
      const country = item.country || config.country || "AE";
      const zone = normalizeText(item.area);
      const { vertical, subcategory } = mapTaxonomy(item.category, item.subcategory);

      // Dedup
      const dedup = await checkDuplicate(name, phone, item.lat ?? null, item.lng ?? null, item.source_external_id);
      if (dedup.isDuplicate && dedup.confidence > 90) {
        result.total_duplicates++;
        continue;
      }

      const slug = generateSlug(name, city, zone);
      const completeness = calculateCompleteness(item, subcategory);
      const qualityScore = calculateQualityScore(item, completeness);
      totalCompleteness += completeness.overall;

      const candidateStatus = qualityScore >= 60 ? "approved" : qualityScore >= 30 ? "review" : "low_quality";
      result.quality_distribution[candidateStatus as keyof typeof result.quality_distribution]++;
      const visibilityStatus = qualityScore >= 70 ? "indexed_not_public" : "hidden_imported";

      // Structure menu if available
      const menuData = item.menu?.length ? structureMenu(item.menu) : null;

      // Extract vertical-specific attributes
      const verticalAttrs = extractVerticalAttributes(item, vertical);

      // Build reason_json with enriched data
      const reasonJson: Record<string, any> = {};
      if (dedup.isDuplicate) {
        reasonJson.duplicate_of = dedup.existingId;
        reasonJson.confidence = dedup.confidence;
      }
      reasonJson.completeness = completeness;
      reasonJson.vertical_attributes = verticalAttrs;
      if (menuData) {
        reasonJson.menu_summary = {
          total_items: menuData.totalItems,
          categories: Object.keys(menuData.categories),
        };
      }

      // Create candidate
      const { data: candidate, error: candErr } = await (supabase as any)
        .from("onboarding_shop_candidates")
        .insert({
          batch_id: batchId,
          source_type: config.source_type,
          source_external_id: item.source_external_id ?? null,
          canonical_name: name,
          canonical_slug: slug,
          canonical_vertical: vertical,
          canonical_subcategory: subcategory,
          country,
          city,
          zone,
          address: normalizeText(item.address),
          latitude: item.lat ?? null,
          longitude: item.lng ?? null,
          phone,
          website: item.website ?? null,
          rating: item.rating ?? null,
          reviews_count: item.reviews_count ?? 0,
          price_tier: item.price_level ?? 2,
          quality_score: qualityScore,
          duplicate_group_id: dedup.isDuplicate ? dedup.existingId : null,
          candidate_status: candidateStatus,
          reason_json: reasonJson,
        })
        .select("id")
        .single();

      if (candErr) {
        result.total_failed++;
        result.errors.push({ name, error: candErr.message });
        continue;
      }

      // Create assets (logo, cover, gallery)
      const assetRows: any[] = [];
      if (item.logo_url) assetRows.push({ candidate_id: candidate.id, asset_type: "logo", asset_url: item.logo_url, asset_source: config.source_type, is_primary: false });
      if (item.cover_url) assetRows.push({ candidate_id: candidate.id, asset_type: "cover", asset_url: item.cover_url, asset_source: config.source_type, is_primary: true });
      if (item.images?.length) {
        item.images.forEach((url, i) => {
          assetRows.push({ candidate_id: candidate.id, asset_type: i === 0 && !item.cover_url ? "cover" : "gallery", asset_url: url, asset_source: config.source_type, is_primary: i === 0 && !item.cover_url });
        });
      }
      if (assetRows.length) {
        await (supabase as any).from("imported_shop_assets").insert(assetRows);
      }

      // Create onboarding state
      await (supabase as any).from("merchant_onboarding_state").insert({
        entity_id: candidate.id,
        onboarding_mode: "imported_draft",
        import_source: config.source_type,
        claim_status: "unclaimed",
        contact_status: "not_contacted",
        activation_status: "inactive",
        visibility_status: visibilityStatus,
        taxonomy_status: subcategory ? "mapped" : "pending",
        geo_status: item.lat && item.lng ? "resolved" : "pending",
        menu_status: menuData ? "imported" : "empty",
        seo_status: "pending",
        review_status: "pending",
      });

      result.total_created++;
    } catch (err: any) {
      result.total_failed++;
      result.errors.push({ name: item.name, error: err.message ?? "Unknown error" });
    }
  }

  result.avg_completeness = result.total_created > 0 ? Math.round(totalCompleteness / result.total_created) : 0;

  await (supabase as any).from("import_batches").update({
    status: "completed",
    completed_at: new Date().toISOString(),
    total_raw: result.total_raw,
    total_created: result.total_created,
    total_updated: result.total_updated,
    total_skipped: result.total_skipped,
    total_duplicates: result.total_duplicates,
    total_failed: result.total_failed,
  }).eq("id", batchId);

  return result;
}

// ─── JSON parser ───
export function parseImportJson(json: any[]): RawShopInput[] {
  return json.map((row) => ({
    source_external_id: row.id ?? row.external_id ?? row.source_id ?? undefined,
    name: row.name ?? row.title ?? row.restaurant_name ?? "",
    category: row.category ?? row.cuisine ?? row.type ?? undefined,
    subcategory: row.subcategory ?? row.cuisine_type ?? row.sub_type ?? undefined,
    phone: row.phone ?? row.telephone ?? row.contact ?? undefined,
    address: row.address ?? row.location ?? row.full_address ?? undefined,
    city: row.city ?? undefined,
    area: row.area ?? row.district ?? row.zone ?? row.neighborhood ?? undefined,
    country: row.country ?? row.country_code ?? "AE",
    lat: parseFloat(row.lat ?? row.latitude ?? "") || undefined,
    lng: parseFloat(row.lng ?? row.longitude ?? row.lon ?? "") || undefined,
    rating: parseFloat(row.rating ?? "") || undefined,
    reviews_count: parseInt(row.reviews_count ?? row.review_count ?? "0") || undefined,
    price_level: parseInt(row.price_level ?? row.price_tier ?? "2") || undefined,
    hours: row.hours ?? row.opening_hours ?? undefined,
    menu: row.menu ?? row.menu_items ?? undefined,
    images: row.images ?? (row.image ? [row.image] : undefined) ?? (row.cover_image ? [row.cover_image] : undefined),
    logo_url: row.logo_url ?? row.logo ?? undefined,
    cover_url: row.cover_url ?? row.cover_image ?? row.hero_image ?? undefined,
    website: row.website ?? row.url ?? undefined,
    description: row.description ?? row.about ?? row.bio ?? undefined,
    cuisine_tags: row.cuisine_tags ?? row.tags ?? row.cuisines ?? undefined,
    amenities: row.amenities ?? row.features ?? undefined,
    delivery_available: row.delivery ?? row.delivery_available ?? undefined,
    dine_in: row.dine_in ?? row.dinein ?? undefined,
    takeaway: row.takeaway ?? row.pickup ?? undefined,
    halal: row.halal ?? undefined,
    raw_payload: row,
  }));
}
