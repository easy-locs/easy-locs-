INSERT INTO public.engine_supervisor (engine_name, engine_tier, runtime_class, frequency_seconds, timeout_ms, worker_group, description, enabled)
VALUES
  ('source-of-truth-drift', 'critical', 'server', 300, 30000, 'integrity', 'Detects visibility/trust/gate inconsistencies across merchant data', true),
  ('incident-classify', 'standard', 'server', 180, 20000, 'meta', 'Classifies engine errors by category and severity', true),
  ('pricing-integrity', 'critical', 'server', 600, 30000, 'integrity', 'Detects invalid/suspicious pricing in menu items', true),
  ('availability-integrity', 'standard', 'server', 600, 20000, 'integrity', 'Ensures merchants have valid availability state', true),
  ('regression-metrics', 'standard', 'server', 3600, 20000, 'meta', 'Compares hour-over-hour success rates, alerts on regression', true),
  ('orphan-entity-cleanup', 'standard', 'server', 3600, 45000, 'maintenance', 'Removes orphan media and menu items with null merchant_id', true),
  ('stale-flow-detection', 'standard', 'server', 1800, 30000, 'lifecycle', 'Expires pending bookings older than 7 days', true),
  ('proof-log-aggregation', 'standard', 'server', 3600, 30000, 'meta', 'Hourly aggregation of engine run logs for reporting', true)
ON CONFLICT (engine_name) DO UPDATE SET
  frequency_seconds = EXCLUDED.frequency_seconds,
  timeout_ms = EXCLUDED.timeout_ms,
  worker_group = EXCLUDED.worker_group,
  description = EXCLUDED.description,
  runtime_class = 'server';

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS price_flag TEXT;
