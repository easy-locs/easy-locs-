-- Add module status tracking columns to seed_merchants
ALTER TABLE public.seed_merchants 
  ADD COLUMN IF NOT EXISTS storefront_status text DEFAULT 'locked',
  ADD COLUMN IF NOT EXISTS menu_status text DEFAULT 'locked',
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'locked',
  ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'not_applicable',
  ADD COLUMN IF NOT EXISTS radar_status text DEFAULT 'locked',
  ADD COLUMN IF NOT EXISTS orbit_status text DEFAULT 'locked',
  ADD COLUMN IF NOT EXISTS analytics_status text DEFAULT 'locked',
  ADD COLUMN IF NOT EXISTS boost_status text DEFAULT 'locked',
  ADD COLUMN IF NOT EXISTS truth_status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS publish_status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS active_modules integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_modules integer DEFAULT 8,
  ADD COLUMN IF NOT EXISTS module_summary_json jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_sync_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_seed_merchants_publish_status ON public.seed_merchants(publish_status);
CREATE INDEX IF NOT EXISTS idx_seed_merchants_truth_status ON public.seed_merchants(truth_status);