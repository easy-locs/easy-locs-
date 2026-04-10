
-- Pass 7: Lock down anonymous access to critical system tables

-- 1. engine_supervisor: remove anon policies (keep service_role ALL)
DROP POLICY IF EXISTS "engine_supervisor_anon_insert" ON public.engine_supervisor;
DROP POLICY IF EXISTS "engine_supervisor_anon_select" ON public.engine_supervisor;
DROP POLICY IF EXISTS "engine_supervisor_anon_update" ON public.engine_supervisor;

-- 2. entity_pipeline_queue: restrict to authenticated only (remove anon)
DROP POLICY IF EXISTS "Allow anon insert pipeline queue" ON public.entity_pipeline_queue;
DROP POLICY IF EXISTS "Allow anon select pipeline queue" ON public.entity_pipeline_queue;
DROP POLICY IF EXISTS "Allow anon update pipeline queue" ON public.entity_pipeline_queue;

CREATE POLICY "Authenticated select pipeline queue" ON public.entity_pipeline_queue
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert pipeline queue" ON public.entity_pipeline_queue
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update pipeline queue" ON public.entity_pipeline_queue
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 3. module_health: remove anon policies (keep authenticated ALL)
DROP POLICY IF EXISTS "module_health_anon_write" ON public.module_health;
DROP POLICY IF EXISTS "module_health_anon_read" ON public.module_health;
DROP POLICY IF EXISTS "module_health_anon_update" ON public.module_health;

-- 4. rider_runtime_state: restrict SELECT to authenticated only
DROP POLICY IF EXISTS "rider_runtime_read" ON public.rider_runtime_state;
CREATE POLICY "rider_runtime_read" ON public.rider_runtime_state
  FOR SELECT TO authenticated USING (true);
