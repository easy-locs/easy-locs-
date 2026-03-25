/**
 * Visibility Engine — governs imported candidate → public surface transition.
 * Statuses: hidden_imported → indexed_not_public → public_seed → ready_for_claim → live_claimed
 * NO merchant contact at any stage.
 */
import { supabase } from "@/integrations/supabase/client";

export type VisibilityStatus =
  | "hidden_imported"
  | "indexed_not_public"
  | "public_seed"
  | "ready_for_claim"
  | "live_claimed";

interface VisibilityInput {
  quality_score: number;
  completeness?: number;
  dedup_confidence?: string; // "clean" | "review_required" | "duplicate"
  taxonomy_quality?: boolean;
  geo_quality?: boolean;
  has_images?: boolean;
  has_menu?: boolean;
}

/** Automatically determine visibility from quality signals */
export function resolveVisibility(input: VisibilityInput): VisibilityStatus {
  const { quality_score, completeness = 0, dedup_confidence = "clean", taxonomy_quality = false, geo_quality = false } = input;

  // Blocked: known duplicate
  if (dedup_confidence === "duplicate") return "hidden_imported";
  
  // Needs review
  if (dedup_confidence === "review_required") return "hidden_imported";
  
  // Low quality
  if (quality_score < 40) return "hidden_imported";
  
  // Medium quality — indexed for internal use only
  if (quality_score < 60) return "indexed_not_public";
  
  // Good quality but incomplete taxonomy/geo
  if (!taxonomy_quality || !geo_quality) return "indexed_not_public";
  
  // High quality — public seed
  if (quality_score >= 70 && completeness >= 50) return "public_seed";
  
  // Very high quality — ready for merchant claim
  if (quality_score >= 85 && completeness >= 70 && input.has_images && input.has_menu) return "ready_for_claim";
  
  return "indexed_not_public";
}

/** Create a seed_merchants entry from an approved candidate */
export async function publishCandidateAsSeed(candidateId: string): Promise<{ success: boolean; seedId?: string; error?: string }> {
  // Fetch candidate
  const { data: cand, error: fetchErr } = await (supabase as any)
    .from("onboarding_shop_candidates")
    .select("*")
    .eq("id", candidateId)
    .single();
  
  if (fetchErr || !cand) return { success: false, error: fetchErr?.message || "Candidate not found" };

  // Check minimum quality
  if ((cand.quality_score ?? 0) < 40) return { success: false, error: "Quality score too low for publishing" };

  // Check for existing seed with same source
  const { data: existing } = await (supabase as any)
    .from("seed_merchants")
    .select("id")
    .eq("name", cand.canonical_name)
    .eq("city", cand.city)
    .limit(1);

  if (existing?.length) return { success: false, error: "Seed already exists for this merchant" };

  // Create seed merchant
  const { data: seed, error: seedErr } = await (supabase as any)
    .from("seed_merchants")
    .insert({
      name: cand.canonical_name,
      category: cand.canonical_vertical || "food",
      subcategory: cand.canonical_subcategory || "restaurant",
      city: cand.city || "Dubai",
      area: cand.zone || cand.city || "Dubai",
      rating: cand.rating,
      review_count: cand.reviews_count,
      cover_image: cand.cover_url || null,
      is_open: true,
      visibility_score: Math.min(100, (cand.quality_score ?? 50)),
      display_priority: Math.max(0, Math.min(100, Math.round((cand.quality_score ?? 50) * 0.8))),
      visibility_mode: "live",
      route_status: "valid",
    })
    .select("id")
    .single();

  if (seedErr) return { success: false, error: seedErr.message };

  // Update candidate status
  await (supabase as any)
    .from("onboarding_shop_candidates")
    .update({ candidate_status: "published_seed", published_seed_id: seed.id })
    .eq("id", candidateId);

  // Update onboarding state
  await (supabase as any)
    .from("merchant_onboarding_state")
    .update({ visibility_status: "public_seed" })
    .eq("entity_id", candidateId);

  return { success: true, seedId: seed.id };
}

/** Batch auto-classify visibility for all unclassified candidates */
export async function autoClassifyVisibility(): Promise<{ updated: number }> {
  const { data: candidates } = await (supabase as any)
    .from("onboarding_shop_candidates")
    .select("id, quality_score, duplicate_group_id, canonical_vertical, canonical_subcategory, latitude, longitude, phone, rating")
    .in("candidate_status", ["approved", "pending"])
    .limit(500);

  if (!candidates?.length) return { updated: 0 };

  let updated = 0;
  for (const c of candidates) {
    const vis = resolveVisibility({
      quality_score: c.quality_score ?? 0,
      dedup_confidence: c.duplicate_group_id ? "review_required" : "clean",
      taxonomy_quality: !!c.canonical_vertical,
      geo_quality: !!(c.latitude && c.longitude),
      has_images: false,
      has_menu: false,
    });

    // Only update onboarding_state visibility, don't change candidate_status
    await (supabase as any)
      .from("merchant_onboarding_state")
      .update({ visibility_status: vis })
      .eq("entity_id", c.id);
    updated++;
  }

  return { updated };
}
