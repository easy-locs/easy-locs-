
-- Entity Pipeline Queue: real-time queue-driven pipeline processing
CREATE TABLE IF NOT EXISTS public.entity_pipeline_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'seed_merchant',
  source_type TEXT,
  current_stage TEXT NOT NULL DEFAULT 'source',
  next_stage TEXT,
  priority INT NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending',
  retries INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,
  locked_by TEXT,
  locked_at TIMESTAMPTZ,
  last_error TEXT,
  payload_json JSONB DEFAULT '{}',
  stage_results_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for queue processing
CREATE INDEX IF NOT EXISTS idx_pipeline_queue_status ON public.entity_pipeline_queue(status, priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_pipeline_queue_entity ON public.entity_pipeline_queue(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_pipeline_queue_stage ON public.entity_pipeline_queue(current_stage, status);

-- Enable RLS
ALTER TABLE public.entity_pipeline_queue ENABLE ROW LEVEL SECURITY;

-- Allow anon access for client-side pipeline engines
CREATE POLICY "Allow anon select pipeline queue" ON public.entity_pipeline_queue FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow anon insert pipeline queue" ON public.entity_pipeline_queue FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon update pipeline queue" ON public.entity_pipeline_queue FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Engine rationalization registry table
CREATE TABLE IF NOT EXISTS public.engine_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engine_name TEXT NOT NULL UNIQUE,
  pipeline_stage TEXT NOT NULL,
  layer TEXT NOT NULL DEFAULT 'toolbox',
  status TEXT NOT NULL DEFAULT 'active',
  tier TEXT NOT NULL DEFAULT 'standard',
  business_function TEXT,
  description TEXT,
  fields_modified TEXT[],
  tables_modified TEXT[],
  merged_into TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.engine_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon select engine_registry" ON public.engine_registry FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow anon insert engine_registry" ON public.engine_registry FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon update engine_registry" ON public.engine_registry FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Enable realtime for pipeline queue
ALTER PUBLICATION supabase_realtime ADD TABLE public.entity_pipeline_queue;
