
-- Recompute visibility_class based on current thresholds
-- Score >= 45 = public_seed (was being marked hidden due to stale data)
UPDATE current_ranking_state SET
  visibility_class = CASE
    WHEN global_rank_score >= 90 THEN 'boost_ready'
    WHEN global_rank_score >= 78 THEN 'priority_public'
    WHEN global_rank_score >= 65 THEN 'ready_for_claim'
    WHEN global_rank_score >= 45 THEN 'public_seed'
    WHEN global_rank_score >= 25 THEN 'indexed_not_public'
    ELSE 'hidden'
  END,
  updated_at = NOW();

-- Sync seed_merchants visibility_mode from ranking state
UPDATE seed_merchants sm SET
  visibility_mode = CASE
    WHEN crs.visibility_class IN ('public_seed','ready_for_claim','priority_public','boost_ready') THEN 'live'
    ELSE 'coming_soon'
  END
FROM current_ranking_state crs
WHERE sm.id = crs.entity_id::uuid AND crs.entity_type = 'seed';
