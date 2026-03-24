
CREATE TABLE IF NOT EXISTS public.live_status_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL,
  entity_type text NOT NULL,
  user_id uuid,
  status_label text NOT NULL,
  status_subtitle text,
  status_code text NOT NULL,
  eta_min integer,
  eta_max integer,
  progress_percent integer DEFAULT 0,
  live_step_index integer DEFAULT 0,
  live_step_total integer DEFAULT 1,
  live_visual_type text DEFAULT 'progress',
  actor_name text,
  context_action_url text,
  metadata_json jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.live_status_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read live status" ON public.live_status_snapshots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "System manages live status" ON public.live_status_snapshots
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_live_status_entity 
  ON public.live_status_snapshots(entity_id, entity_type, is_active);

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_status_snapshots;
