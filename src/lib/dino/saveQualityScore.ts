/**
 * DINO Save Quality Score — Persist quality scores to the database.
 */

import { supabase } from "@/integrations/supabase/client";
import { computeQualityScore, type QualityInput } from "./qualityScore";

export async function saveQualityScore(input: QualityInput & {
  route: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}) {
  const score = computeQualityScore(input);

  const { data, error } = await supabase
    .from("dino_quality_scores")
    .insert({
      route: input.route,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      ...score,
      score_details: input.details ?? {},
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
