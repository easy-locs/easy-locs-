import { supabase } from "@/integrations/supabase/client";
import type { CanonicalOnboardingRecord, OnboardingQualityResult } from "./types";

export async function enqueueForReview(
  canonicalRecordId: string,
  record: CanonicalOnboardingRecord,
  quality: OnboardingQualityResult,
  suggestedVisibility: "draft" | "public",
) {
  const db = supabase as any;

  const priority =
    quality.score < 50 ? 95 :
    quality.score < 65 ? 80 :
    quality.score < 75 ? 65 : 40;

  const { data, error } = await db
    .from("onboarding_review_queue")
    .insert({
      canonical_record_id: canonicalRecordId,
      entity_id: record.entityId,
      vertical: record.vertical,
      priority,
      review_status: "pending",
      quality_score: quality.score,
      missing_fields_json: quality.missingFields,
      warnings_json: quality.warnings,
      suggested_visibility: suggestedVisibility,
      metadata_json: {
        canonicalName: record.canonicalName,
        city: record.city,
        district: record.district,
      },
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
