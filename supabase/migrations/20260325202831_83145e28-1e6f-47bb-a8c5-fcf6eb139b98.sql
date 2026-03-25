CREATE TABLE IF NOT EXISTS public.module_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'unknown',
  last_success_at timestamptz,
  last_error_at timestamptz,
  error_count_1h integer DEFAULT 0,
  p95_latency_ms integer DEFAULT 0,
  auto_fix_enabled boolean DEFAULT true,
  repair_mode text DEFAULT 'observe',
  current_incident text,
  metadata_json jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.module_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "module_health_anon_read" ON public.module_health FOR SELECT TO anon USING (true);
CREATE POLICY "module_health_anon_write" ON public.module_health FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "module_health_anon_update" ON public.module_health FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "module_health_auth_all" ON public.module_health FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.module_health (module, status, repair_mode) VALUES
  ('orbit', 'unknown', 'safe_auto'),
  ('wallet', 'unknown', 'safe_auto'),
  ('scanner', 'unknown', 'safe_auto'),
  ('checkout', 'unknown', 'safe_auto'),
  ('radar', 'unknown', 'safe_auto'),
  ('delivery', 'unknown', 'safe_auto'),
  ('deep_scrape', 'unknown', 'safe_auto'),
  ('publish_pipeline', 'unknown', 'safe_auto'),
  ('notifications', 'unknown', 'safe_auto'),
  ('realtime', 'unknown', 'safe_auto'),
  ('chat', 'unknown', 'safe_auto'),
  ('payments', 'unknown', 'safe_auto')
ON CONFLICT (module) DO NOTHING