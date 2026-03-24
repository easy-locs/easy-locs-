
-- Fix stale ranking data: recompute visibility_class AND remove false "Blocked by coherence gate" penalty
-- All 311 seeds have coherence_status = 'publishable', so coherence gate passes for ALL of them
-- The penalty was incorrectly persisted from a previous batch run

UPDATE current_ranking_state SET
  visibility_class = CASE
    WHEN global_rank_score >= 90 THEN 'boost_ready'
    WHEN global_rank_score >= 78 THEN 'priority_public'
    WHEN global_rank_score >= 65 THEN 'ready_for_claim'
    WHEN global_rank_score >= 45 THEN 'public_seed'
    WHEN global_rank_score >= 25 THEN 'indexed_not_public'
    ELSE 'hidden'
  END,
  -- Remove the false coherence penalty from ranking_reason_json
  ranking_reason_json = jsonb_set(
    ranking_reason_json::jsonb,
    '{penalties}',
    (
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
      FROM jsonb_array_elements(ranking_reason_json::jsonb->'penalties') AS elem
      WHERE elem::text != '"Blocked by coherence gate"'
    )
  ),
  updated_at = NOW()
WHERE ranking_reason_json::text LIKE '%Blocked by coherence gate%';

-- Sync seed_merchants visibility_mode from corrected ranking state
UPDATE seed_merchants sm SET
  visibility_mode = CASE
    WHEN crs.visibility_class IN ('public_seed','ready_for_claim','priority_public','boost_ready') THEN 'live'
    ELSE 'coming_soon'
  END
FROM current_ranking_state crs
WHERE sm.id = crs.entity_id::uuid AND crs.entity_type = 'seed';
