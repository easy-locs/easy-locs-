
ALTER TABLE public.seed_merchants
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS unpublished_at timestamptz,
  ADD COLUMN IF NOT EXISTS publish_source text,
  ADD COLUMN IF NOT EXISTS unpublish_reason text,
  ADD COLUMN IF NOT EXISTS publish_gate_status text,
  ADD COLUMN IF NOT EXISTS last_publish_check_at timestamptz,
  ADD COLUMN IF NOT EXISTS visibility_decision_reason text,
  ADD COLUMN IF NOT EXISTS manual_lock boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_claimed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_controlled boolean DEFAULT false;
