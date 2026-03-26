
-- Pass 9: Eliminate anon write policies on system/user tables
-- Keep boost_clicks/impressions anon INSERT (analytics tracking from unauthenticated visitors is valid)

-- 1. current_ranking_state: restrict to authenticated
DROP POLICY IF EXISTS "Allow anon insert current_ranking_state" ON public.current_ranking_state;
DROP POLICY IF EXISTS "Allow anon update current_ranking_state" ON public.current_ranking_state;
CREATE POLICY "Authenticated insert current_ranking_state" ON public.current_ranking_state
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update current_ranking_state" ON public.current_ranking_state
  FOR UPDATE TO authenticated USING (true);

-- 2. engine_registry: restrict to authenticated
DROP POLICY IF EXISTS "Allow anon update engine_registry" ON public.engine_registry;
DROP POLICY IF EXISTS "Allow anon insert engine_registry" ON public.engine_registry;
CREATE POLICY "Authenticated insert engine_registry" ON public.engine_registry
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update engine_registry" ON public.engine_registry
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 3. engine_reports: restrict to authenticated
DROP POLICY IF EXISTS "anon_insert_engine_reports" ON public.engine_reports;
CREATE POLICY "Authenticated insert engine_reports" ON public.engine_reports
  FOR INSERT TO authenticated WITH CHECK (true);

-- 4. entity_feedback_signals: restrict to authenticated
DROP POLICY IF EXISTS "Allow all insert feedback signals" ON public.entity_feedback_signals;
CREATE POLICY "Authenticated insert feedback signals" ON public.entity_feedback_signals
  FOR INSERT TO authenticated WITH CHECK (true);

-- 5. entity_taxonomy_mapping: restrict to authenticated
DROP POLICY IF EXISTS "anon_insert_entity_mapping" ON public.entity_taxonomy_mapping;
CREATE POLICY "Authenticated insert entity_mapping" ON public.entity_taxonomy_mapping
  FOR INSERT TO authenticated WITH CHECK (true);

-- 6. platform_recovery_runs: restrict to authenticated
DROP POLICY IF EXISTS "Allow anon insert recovery runs" ON public.platform_recovery_runs;
CREATE POLICY "Authenticated insert recovery runs" ON public.platform_recovery_runs
  FOR INSERT TO authenticated WITH CHECK (true);

-- 7. ranking_snapshots: restrict to authenticated (drop anon, keep existing authenticated)
DROP POLICY IF EXISTS "Allow anon insert ranking_snapshots" ON public.ranking_snapshots;

-- 8. taxonomy_gap_candidates: restrict to authenticated
DROP POLICY IF EXISTS "anon_insert_taxonomy_gaps" ON public.taxonomy_gap_candidates;
CREATE POLICY "Authenticated insert taxonomy_gaps" ON public.taxonomy_gap_candidates
  FOR INSERT TO authenticated WITH CHECK (true);

-- 9. user_ai_profiles: drop leftover anon policies (authenticated ones already exist from Pass 6)
DROP POLICY IF EXISTS "Anon can insert AI profiles" ON public.user_ai_profiles;
DROP POLICY IF EXISTS "Anon can update AI profiles" ON public.user_ai_profiles;
