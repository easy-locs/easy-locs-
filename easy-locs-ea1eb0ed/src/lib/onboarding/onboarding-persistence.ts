/**
 * Onboarding Persistence — Saves pipeline results to the database.
 */
import { supabase } from "@/integrations/supabase/client";
import type { OnboardingRequest, OnboardingPipelineResult } from "./onboarding-orchestrator";

export async function persistOnboardingRun(
  input: OnboardingRequest,
  result: OnboardingPipelineResult,
) {
  const db = supabase as any;

  const { data: run, error: runError } = await db
    .from("onboarding_import_runs")
    .insert({
      vertical: input.vertical,
      input_json: input,
      status: "completed",
      result_json: result,
    })
    .select("id")
    .single();

  if (runError) throw runError;

  if (result.canonical.length > 0) {
    const rows = result.canonical.map((record) => {
      const publish = result.publish.find((p) => p.entityId === record.entityId);

      return {
        import_run_id: run.id,
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
        publish_visibility: publish?.targetVisibility ?? "draft",
      };
    });

    const { error: canonicalError } = await db
      .from("onboarding_canonical_records")
      .insert(rows);

    if (canonicalError) throw canonicalError;
  }

  return run.id as string;
}
