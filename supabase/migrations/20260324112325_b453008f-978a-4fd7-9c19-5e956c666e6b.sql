
-- Recompute ranking for ALL seeds using correct seed-specific penalty logic
-- Seed penalties: missing_geo=10, seed_no_menu=5 (food only), missing_cover=5, missing_logo=3, weak_taxonomy=15
-- Merchant penalties are HIGHER but should NOT apply to seeds

WITH seed_scores AS (
  SELECT 
    sm.id,
    sm.category as vertical,
    -- Data quality score
    LEAST(100, 30 
      + CASE WHEN sm.name IS NOT NULL THEN 10 ELSE 0 END
      + CASE WHEN sm.subcategory IS NOT NULL AND sm.subcategory != '' THEN 10 ELSE 0 END
      + CASE WHEN sm.support_phone IS NOT NULL OR sm.support_email IS NOT NULL THEN 10 ELSE 0 END
      + CASE WHEN sm.opening_hours IS NOT NULL THEN 10 ELSE 0 END
      + CASE WHEN sm.area IS NOT NULL OR sm.city IS NOT NULL THEN 10 ELSE 0 END
      + CASE WHEN sm.rating > 0 THEN 10 ELSE 0 END
    ) as data_score,
    -- Visual quality
    CASE 
      WHEN (sm.cover_image IS NOT NULL AND sm.cover_image != '') AND (sm.logo_image IS NOT NULL AND sm.logo_image != '') THEN 70
      WHEN (sm.cover_image IS NOT NULL AND sm.cover_image != '') THEN 50
      WHEN (sm.logo_image IS NOT NULL AND sm.logo_image != '') THEN 30
      ELSE 10
    END as visual_score,
    -- Geo confidence  
    CASE WHEN sm.area IS NOT NULL THEN 40 ELSE 0 END as geo_score,
    -- Taxonomy confidence
    CASE WHEN sm.subcategory IS NOT NULL AND sm.subcategory != '' THEN 70 ELSE CASE WHEN sm.category IS NOT NULL THEN 40 ELSE 10 END END as taxonomy_score,
    -- Reputation
    CASE WHEN sm.rating > 0 THEN LEAST(100, (sm.rating / 5.0) * 80 + LEAST(20, COALESCE(sm.review_count, 0) / 5.0)) ELSE 20 END as reputation_score,
    -- Flags
    (sm.cover_image IS NOT NULL AND sm.cover_image != '') as has_cover,
    (sm.logo_image IS NOT NULL AND sm.logo_image != '') as has_logo,
    sm.duplicate_of IS NOT NULL as is_dup,
    sm.subcategory IS NOT NULL AND sm.subcategory != '' as has_sub
  FROM seed_merchants sm
),
computed AS (
  SELECT 
    ss.id,
    ss.vertical,
    -- Compute weighted raw score (using default weights for simplicity, food gets menu=0.22)
    CASE ss.vertical
      WHEN 'food' THEN 
        ss.data_score * 0.14 + 20 * 0.22 + ss.visual_score * 0.12 + ss.geo_score * 0.10 + ss.taxonomy_score * 0.10 + ss.reputation_score * 0.08 + (ss.data_score * 0.6 + ss.reputation_score * 0.4) * 0.14 + 40 * 0.05 + ss.reputation_score * 0.03 + 70 * 0.02
      WHEN 'property' THEN
        ss.data_score * 0.18 + 20 * 0.02 + ss.visual_score * 0.14 + ss.geo_score * 0.14 + ss.taxonomy_score * 0.10 + ss.reputation_score * 0.10 + (ss.data_score * 0.6 + ss.reputation_score * 0.4) * 0.14 + 40 * 0.08 + ss.reputation_score * 0.06 + 70 * 0.04
      ELSE
        ss.data_score * 0.16 + 20 * 0.16 + ss.visual_score * 0.10 + ss.geo_score * 0.10 + ss.taxonomy_score * 0.10 + ss.reputation_score * 0.08 + (ss.data_score * 0.6 + ss.reputation_score * 0.4) * 0.12 + 40 * 0.08 + ss.reputation_score * 0.05 + 70 * 0.05
    END as raw_score,
    -- Seed-specific penalties (MUCH lighter than merchant)
    10 -- missing_geo (all seeds lack coordinates)
    + CASE WHEN NOT ss.has_logo THEN 3 ELSE 0 END -- missing_logo
    + CASE WHEN NOT ss.has_cover THEN 5 ELSE 0 END -- missing_cover  
    + CASE WHEN ss.vertical = 'food' THEN 5 ELSE 0 END -- seed_no_menu (food only)
    + CASE WHEN ss.is_dup THEN 35 ELSE 0 END -- duplicate
    as total_penalty
  FROM seed_scores ss
)
UPDATE current_ranking_state SET
  global_rank_score = GREATEST(0, LEAST(100, ROUND(c.raw_score - c.total_penalty))),
  visibility_class = CASE
    WHEN GREATEST(0, LEAST(100, ROUND(c.raw_score - c.total_penalty))) >= 90 THEN 'boost_ready'
    WHEN GREATEST(0, LEAST(100, ROUND(c.raw_score - c.total_penalty))) >= 78 THEN 'priority_public'
    WHEN GREATEST(0, LEAST(100, ROUND(c.raw_score - c.total_penalty))) >= 65 THEN 'ready_for_claim'
    WHEN GREATEST(0, LEAST(100, ROUND(c.raw_score - c.total_penalty))) >= 45 THEN 'public_seed'
    WHEN GREATEST(0, LEAST(100, ROUND(c.raw_score - c.total_penalty))) >= 25 THEN 'indexed_not_public'
    ELSE 'hidden'
  END,
  ranking_reason_json = jsonb_build_object(
    'penalties', (
      SELECT jsonb_agg(p) FROM (
        SELECT 'missing_geo'::text as p
        UNION ALL SELECT 'missing_logo' WHERE NOT EXISTS (SELECT 1 FROM seed_merchants sm2 WHERE sm2.id = c.id AND sm2.logo_image IS NOT NULL AND sm2.logo_image != '')
        UNION ALL SELECT 'seed_no_menu' WHERE c.vertical = 'food'
      ) penalties
    ),
    'reasons', jsonb_build_object(
      'vertical', c.vertical,
      'rawBeforePenalty', ROUND(c.raw_score),
      'totalPenalty', c.total_penalty
    )
  ),
  updated_at = NOW()
FROM computed c
WHERE current_ranking_state.entity_id = c.id::text AND current_ranking_state.entity_type = 'seed';

-- Sync visibility_mode
UPDATE seed_merchants sm SET
  visibility_mode = CASE
    WHEN crs.visibility_class IN ('public_seed','ready_for_claim','priority_public','boost_ready') THEN 'live'
    ELSE 'coming_soon'
  END
FROM current_ranking_state crs
WHERE sm.id = crs.entity_id::uuid AND crs.entity_type = 'seed';
