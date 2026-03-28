/**
 * persistence.canonical_record.write — Persists canonical records.
 * ONE thing: write canonical entity records to DB.
 */
import { supabase } from "@/integrations/supabase/client";
import type { CanonicalOnboardingRecord } from "../../types";

export async function writeCanonicalRecords(
  importRunId: string,
  records: CanonicalOnboardingRecord[],
  publishMap: Record<string, string>,
): Promise<string[]> {
  if (records.length === 0) return [];

  const db = supabase as any;
  const rows = records.map((record) => ({
    import_run_id: importRunId,
    entity_id: record.entityId,
    vertical: record.vertical,
    canonical_name: record.canonicalName,
    address: record.address,
    city: record.city,
    district: record.district,
    country: record.country,
    lat: record.lat,
    lng: record.lng,
    phone: record.phone,
    website: record.website,
    categories_json: record.categories,
    subcategories_json: record.subcategories,
    opening_hours_json: record.openingHours,
    menu_items_json: record.menuItems,
    hotel_inventory_json: record.hotelInventory,
    service_items_json: record.serviceItems,
    photos_json: record.photos,
    source_proofs_json: record.sourceProofs,
    merge_confidence: record.mergeConfidence,
    missing_fields_json: record.missingFields,
    needs_review: record.needsReview,
    publish_visibility: publishMap[record.entityId] ?? "draft",
  }));

  const { data, error } = await db
    .from("onboarding_canonical_records")
    .insert(rows)
    .select("id");

  if (error) throw error;
  return (data ?? []).map((r: any) => r.id as string);
}
