ALTER TABLE public.seed_merchants
  ADD COLUMN IF NOT EXISTS gate_failures jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS publish_gate_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS menu_quality_flag text;