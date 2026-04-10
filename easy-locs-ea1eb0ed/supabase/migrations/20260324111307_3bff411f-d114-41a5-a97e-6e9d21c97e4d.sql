
-- Force sync seed_merchants.visibility_mode from ranking state
UPDATE seed_merchants sm SET
  visibility_mode = CASE
    WHEN crs.visibility_class IN ('public_seed','ready_for_claim','priority_public','boost_ready') THEN 'live'
    ELSE 'coming_soon'
  END
FROM current_ranking_state crs
WHERE sm.id = crs.entity_id::uuid AND crs.entity_type = 'seed';
