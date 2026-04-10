CREATE TABLE IF NOT EXISTS public.engine_supervisor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engine_name text UNIQUE NOT NULL,
  engine_tier text NOT NULL DEFAULT 'standard',
  runtime_class text NOT NULL DEFAULT 'server',
  status text NOT NULL DEFAULT 'idle',
  last_run_at timestamptz,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error_message text,
  last_duration_ms integer,
  restart_count integer NOT NULL DEFAULT 0,
  consecutive_failures integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  cron_interval text DEFAULT '10min',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.engine_supervisor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "engine_supervisor_anon_select" ON public.engine_supervisor FOR SELECT TO anon USING (true);
CREATE POLICY "engine_supervisor_anon_insert" ON public.engine_supervisor FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "engine_supervisor_anon_update" ON public.engine_supervisor FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "engine_supervisor_service_all" ON public.engine_supervisor FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_engine_supervisor_status ON public.engine_supervisor(status);
CREATE INDEX IF NOT EXISTS idx_engine_supervisor_name ON public.engine_supervisor(engine_name);