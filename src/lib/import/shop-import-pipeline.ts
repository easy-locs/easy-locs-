/**
 * UAE Auto Shop Import Pipeline
 * SOURCE → PARSE → NORMALIZE → TAXONOMY → GEO → DEDUP → SCORE → CREATE
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
  website?: string;
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

  // Insert in chunks of 50
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
  fast_food: { vertical: "food", subcategory: "fast_food" },
  pharmacy: { vertical: "healthcare", subcategory: "pharmacy" },
  clinic: { vertical: "healthcare", subcategory: "clinic" },
  hospital: { vertical: "healthcare", subcategory: "hospital" },
  hotel: { vertical: "property", subcategory: "hotel" },
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
};

function mapTaxonomy(rawCat?: string | null, rawSub?: string | null): { vertical: string; subcategory: string | null } {
  const normalized = (rawSub ?? rawCat ?? "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  
  if (CATEGORY_MAP[normalized]) return CATEGORY_MAP[normalized];
  
  const vertical = resolveVerticalFromSubcategory(normalized);
  return { vertical, subcategory: normalized || null };
}

// ─── STEP 5: Quality scoring ───
function calculateQualityScore(candidate: {
  canonical_name: string;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  canonical_subcategory?: string | null;
  rating?: number | null;
  reviews_count?: number | null;
  website?: string | null;
  address?: string | null;
}): number {
  let score = 0;
  if (candidate.canonical_name && candidate.canonical_name.length > 2) score += 20;
  if (candidate.phone) score += 15;
  if (candidate.latitude && candidate.longitude) score += 20;
  if (candidate.canonical_subcategory) score += 10;
  if (candidate.rating && candidate.rating > 0) score += 10;
  if (candidate.reviews_count && candidate.reviews_count > 0) score += 10;
  if (candidate.website) score += 5;
  if (candidate.address && candidate.address.length > 5) score += 10;
  return Math.min(score, 100);
}

// ─── STEP 6: Dedup check ───
async function checkDuplicate(name: string, phone: string | null, lat: number | null, lng: number | null): Promise<{ isDuplicate: boolean; existingId?: string; confidence: number }> {
  // Check exact phone match first
  if (phone) {
    const { data } = await (supabase as any)
      .from("onboarding_shop_candidates")
      .select("id")
      .eq("phone", phone)
      .limit(1);
    if (data?.length) return { isDuplicate: true, existingId: data[0].id, confidence: 95 };
  }

  // Check similar name + close geo
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
            const nameSim = nameSimilarity(name, existing.canonical_name);
            if (nameSim > 0.8) return { isDuplicate: true, existingId: existing.id, confidence: 85 };
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
  // Simple character overlap
  let matches = 0;
  for (const c of shorter) {
    if (longer.includes(c)) matches++;
  }
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
  };

  // Step 1: Create batch
  const batchId = await createBatch(config);
  result.batch_id = batchId;

  // Step 2: Ingest raw
  await ingestRaw(batchId, config.source_type, items);

  // Step 3-8: Process each item
  for (const item of items) {
    try {
      const name = normalizeText(item.name);
      if (!name) {
        result.total_skipped++;
        continue;
      }

      const phone = normalizePhone(item.phone);
      const city = normalizeText(item.city) || config.city || "Dubai";
      const country = item.country || config.country || "AE";
      const zone = normalizeText(item.area);
      const { vertical, subcategory } = mapTaxonomy(item.category, item.subcategory);

      // Dedup
      const dedup = await checkDuplicate(name, phone, item.lat ?? null, item.lng ?? null);
      if (dedup.isDuplicate && dedup.confidence > 90) {
        result.total_duplicates++;
        continue;
      }

      const slug = generateSlug(name, city, zone);
      const qualityScore = calculateQualityScore({
        canonical_name: name,
        phone,
        latitude: item.lat,
        longitude: item.lng,
        canonical_subcategory: subcategory,
        rating: item.rating,
        reviews_count: item.reviews_count,
        website: item.website,
        address: item.address,
      });

      const candidateStatus = qualityScore >= 60 ? "approved" : qualityScore >= 30 ? "review" : "low_quality";
      const visibilityStatus = qualityScore >= 70 ? "indexed_not_public" : "hidden_imported";

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
          reason_json: dedup.isDuplicate ? { duplicate_of: dedup.existingId, confidence: dedup.confidence } : null,
        })
        .select("id")
        .single();

      if (candErr) {
        result.total_failed++;
        result.errors.push({ name, error: candErr.message });
        continue;
      }

      // Create assets if images provided
      if (item.images?.length && candidate) {
        const assets = item.images.map((url, i) => ({
          candidate_id: candidate.id,
          asset_type: i === 0 ? "cover" : "gallery",
          asset_url: url,
          asset_source: config.source_type,
          is_primary: i === 0,
        }));
        await (supabase as any).from("imported_shop_assets").insert(assets);
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
        menu_status: item.menu?.length ? "imported" : "empty",
      });

      result.total_created++;
    } catch (err: any) {
      result.total_failed++;
      result.errors.push({ name: item.name, error: err.message ?? "Unknown error" });
    }
  }

  // Update batch with results
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

// ─── Convenience: parse JSON/CSV into RawShopInput[] ───
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
    website: row.website ?? row.url ?? undefined,
    raw_payload: row,
  }));
}
