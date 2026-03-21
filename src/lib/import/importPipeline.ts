/**
 * importPipeline — Unified merchant acquisition pipeline.
 * Normalizes external sources, checks duplicates, stages records,
 * and optionally creates safe draft storefronts.
 * 
 * Flow: source → normalize → duplicate check → stage → optional draft creation
 */
import { supabase } from "@/integrations/supabase/client";
import { checkStorefrontDuplicate } from "@/lib/geo/duplicateGuard";
import { assignZoneToStorefront } from "@/lib/zones/autoAssignZone";

const db = supabase as any;

export interface NormalizedSource {
  source_name: string;
  source_entity_id: string;
  source_url?: string;
  business_name: string;
  phone?: string;
  website?: string;
  vertical?: string;
  category?: string;
  address?: string;
  country?: string;
  city?: string;
  lat?: number;
  lng?: number;
  images?: string[];
  menu_categories?: Array<{ name: string; items: Array<{ name: string; price?: number; currency?: string; description?: string }> }>;
  hours?: Record<string, string>;
  confidence_score?: number;
  completeness_score?: number;
  raw_payload?: Record<string, any>;
}

export type StagingStatus =
  | "discovered"
  | "normalized"
  | "duplicate"
  | "needs_review"
  | "ready_to_create"
  | "created_draft"
  | "claimed"
  | "activated"
  | "rejected";

export interface StagingRecord {
  id?: string;
  source_name: string;
  source_entity_id: string;
  business_name: string;
  normalized_data: NormalizedSource;
  status: StagingStatus;
  duplicate_score?: number;
  matched_entity_id?: string;
  batch_id?: string;
  created_storefront_id?: string;
}

/** Stage a normalized source into merchant_staging (or equivalent review table) */
export async function stageImportRecord(
  source: NormalizedSource,
  batchId?: string
): Promise<{ staged: boolean; status: StagingStatus; storefrontId?: string }> {
  // 1. Check source-level duplicates
  const { data: existingSource } = await db
    .from("merchant_onboarding_sources")
    .select("id")
    .eq("source_external_id", source.source_entity_id)
    .maybeSingle();

  if (existingSource) {
    return { staged: false, status: "duplicate" };
  }

  // 2. Check storefront-level duplicates
  const dupCheck = await checkStorefrontDuplicate(
    source.business_name,
    source.lat ?? null,
    source.lng ?? null,
    source.phone ?? null
  );

  if (dupCheck.blocked) {
    // Record as duplicate but still save for review
    await db.from("merchant_onboarding_sources").insert({
      source_type: source.source_name,
      source_name: source.source_name,
      source_external_id: source.source_entity_id,
      status: "duplicate",
      payload: {
        ...source.raw_payload,
        duplicate_score: dupCheck.result.score,
        matched_id: dupCheck.result.matchedId,
        batch_id: batchId,
      },
    });
    return { staged: true, status: "duplicate" };
  }

  // 3. Stage as ready for review/creation
  const { data: srcRecord } = await db.from("merchant_onboarding_sources").insert({
    source_type: source.source_name,
    source_name: source.source_name,
    source_external_id: source.source_entity_id,
    status: "imported",
    payload: {
      ...source.raw_payload,
      normalized: source,
      confidence_score: source.confidence_score,
      completeness_score: source.completeness_score,
      batch_id: batchId,
    },
  }).select("id").single();

  return {
    staged: true,
    status: source.confidence_score && source.confidence_score >= 0.8
      ? "ready_to_create"
      : "needs_review",
  };
}

/** Create a safe draft storefront from a staged/reviewed source */
export async function createDraftFromSource(
  source: NormalizedSource,
  userId: string,
  orgId: string
): Promise<string | null> {
  // Final duplicate safety check
  const dupCheck = await checkStorefrontDuplicate(
    source.business_name,
    source.lat ?? null,
    source.lng ?? null,
    source.phone ?? null
  );
  if (dupCheck.blocked) return null;

  const slug = source.business_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) + "-" + Date.now().toString(36);

  const { data: shop, error } = await db.from("storefront_pages").insert({
    name: source.business_name,
    slug,
    org_id: orgId,
    user_id: userId,
    entity_type: "fixed_store",
    city: source.city || null,
    country: source.country || null,
    latitude: source.lat || null,
    longitude: source.lng || null,
    contact_phone: source.phone || null,
    description: source.category ? `${source.category} in ${source.city || ""}` : null,
    vertical: source.vertical || null,
    subcategory: source.category || null,
    active: false,
    shop_visibility: "draft",
    status: "onboarding_draft",
  }).select("id").single();

  if (error || !shop?.id) return null;

  // Auto-assign zone
  if (source.lat && source.lng) {
    assignZoneToStorefront(shop.id, source.lat, source.lng).catch(() => {});
  }

  return shop.id;
}

/** Batch process an array of normalized sources */
export async function batchImport(
  sources: NormalizedSource[],
  batchId?: string,
  onProgress?: (current: number, total: number) => void
): Promise<{ imported: number; duplicates: number; errors: number }> {
  const result = { imported: 0, duplicates: 0, errors: 0 };
  const id = batchId || `batch-${Date.now().toString(36)}`;

  for (let i = 0; i < sources.length; i++) {
    try {
      const res = await stageImportRecord(sources[i], id);
      if (res.status === "duplicate") result.duplicates++;
      else result.imported++;
    } catch {
      result.errors++;
    }
    onProgress?.(i + 1, sources.length);
  }

  return result;
}
