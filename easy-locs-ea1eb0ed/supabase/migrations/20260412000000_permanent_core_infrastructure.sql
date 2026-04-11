ALTER TABLE public.engine_supervisor
  ADD COLUMN IF NOT EXISTS frequency_seconds INTEGER DEFAULT 300,
  ADD COLUMN IF NOT EXISTS timeout_ms INTEGER DEFAULT 30000,
  ADD COLUMN IF NOT EXISTS kill_switch BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS dry_run BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_runs INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_rows_affected INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS success_rate REAL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS heartbeat TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS worker_group TEXT DEFAULT 'core',
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.engine_run_logs
  ADD COLUMN IF NOT EXISTS rows_read INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS side_effect_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trigger_source TEXT DEFAULT 'cron';

CREATE TABLE IF NOT EXISTS public.worker_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_engines INTEGER NOT NULL DEFAULT 0,
  healthy_count INTEGER NOT NULL DEFAULT 0,
  stale_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  disabled_count INTEGER NOT NULL DEFAULT 0,
  stale_engines TEXT[] DEFAULT '{}',
  error_engines TEXT[] DEFAULT '{}',
  avg_success_rate REAL DEFAULT 0,
  total_runs_last_hour INTEGER DEFAULT 0,
  metadata_json JSONB DEFAULT '{}'
);

ALTER TABLE public.worker_health_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "whs_select_anon" ON public.worker_health_snapshots FOR SELECT TO anon USING (true);
CREATE POLICY "whs_all_service" ON public.worker_health_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_whs_snapshot_at ON public.worker_health_snapshots(snapshot_at DESC);

INSERT INTO public.engine_supervisor (engine_name, engine_tier, runtime_class, frequency_seconds, timeout_ms, worker_group, description, enabled)
VALUES
  ('trust-ranking-recompute', 'critical', 'server', 300, 45000, 'core', 'Computes trust scores from verification, reviews, completeness, age', true),
  ('fraud-anomaly-scan', 'critical', 'server', 120, 30000, 'core', 'Detects duplicate listings, suspicious pricing, fake review patterns', true),
  ('quality-deep-scan', 'standard', 'server', 300, 30000, 'core', 'Enhanced quality scoring: media, description, pricing, completeness', true),
  ('taxonomy-enforcer', 'standard', 'server', 600, 30000, 'core', 'Fixes wrong verticals, missing categories, orphan taxonomy paths', true),
  ('maintenance-sweep', 'standard', 'server', 3600, 60000, 'maintenance', 'Unified cleanup: stale sessions, expired tokens, orphan media', true),
  ('health-monitor', 'critical', 'server', 60, 10000, 'meta', 'Checks all engine health, detects stale workers, computes metrics', true)
ON CONFLICT (engine_name) DO UPDATE SET
  frequency_seconds = EXCLUDED.frequency_seconds,
  timeout_ms = EXCLUDED.timeout_ms,
  worker_group = EXCLUDED.worker_group,
  description = EXCLUDED.description,
  runtime_class = 'server';

UPDATE public.engine_supervisor SET worker_group = 'data', description = 'Quality scoring for merchant entities' WHERE engine_name = 'shop-quality' AND worker_group IS NULL;
UPDATE public.engine_supervisor SET worker_group = 'gate', description = 'Publish gate validation for all verticals' WHERE engine_name = 'publish-gate' AND worker_group IS NULL;
UPDATE public.engine_supervisor SET worker_group = 'lifecycle', description = 'Auto-publish gated merchants' WHERE engine_name = 'auto-publish' AND worker_group IS NULL;
UPDATE public.engine_supervisor SET worker_group = 'lifecycle', description = 'Auto-unpublish low-quality merchants' WHERE engine_name = 'auto-unpublish' AND worker_group IS NULL;
UPDATE public.engine_supervisor SET worker_group = 'data', description = 'Coherence sweep for merchant data' WHERE engine_name = 'coherence-sweep' AND worker_group IS NULL;
UPDATE public.engine_supervisor SET worker_group = 'finance', description = 'Wallet balance reconciliation' WHERE engine_name = 'wallet-sync' AND worker_group IS NULL;
UPDATE public.engine_supervisor SET worker_group = 'data', description = 'Data completeness checks' WHERE engine_name = 'data-completeness' AND worker_group IS NULL;
UPDATE public.engine_supervisor SET worker_group = 'data', description = 'Trust score detection' WHERE engine_name = 'data-trust-scan' AND worker_group IS NULL;

ALTER TABLE public.seed_merchants
  ADD COLUMN IF NOT EXISTS trust_score INTEGER,
  ADD COLUMN IF NOT EXISTS ranking_score INTEGER,
  ADD COLUMN IF NOT EXISTS fraud_flag TEXT,
  ADD COLUMN IF NOT EXISTS fraud_flagged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quality_deep_score INTEGER,
  ADD COLUMN IF NOT EXISTS quality_scanned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS taxonomy_enforced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sm_trust_score ON public.seed_merchants(trust_score);
CREATE INDEX IF NOT EXISTS idx_sm_fraud_flag ON public.seed_merchants(fraud_flag) WHERE fraud_flag IS NOT NULL;
