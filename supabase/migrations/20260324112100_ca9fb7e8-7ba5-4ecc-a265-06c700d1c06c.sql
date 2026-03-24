
-- Direct visibility_mode sync: set all seeds with public_seed+ ranking to 'live'
UPDATE seed_merchants SET visibility_mode = 'live'
WHERE id IN (
  SELECT entity_id::uuid FROM current_ranking_state 
  WHERE entity_type = 'seed' 
  AND visibility_class IN ('public_seed', 'ready_for_claim', 'priority_public', 'boost_ready')
);
