-- Audit Hardening Migration
-- 1. Reconcile renamed migration timestamps in schema_migrations
-- 2. Fix SECURITY DEFINER functions missing SET search_path
-- 3. Add missing performance indexes for high-volume tables

-- Migration timestamp reconciliation: update old names to new names
-- This handles the case where migrations were previously applied under old timestamps
DO $$
BEGIN
  UPDATE supabase_migrations.schema_migrations SET version = '20260411150000' WHERE version = '20260411' AND name LIKE '%canonical_content%';
  UPDATE supabase_migrations.schema_migrations SET version = '20260411160000' WHERE version = '20260411' AND name LIKE '%omega_intelligence%';
  UPDATE supabase_migrations.schema_migrations SET version = '20260411170000' WHERE version = '20260411' AND name LIKE '%sentinel_core%';
  UPDATE supabase_migrations.schema_migrations SET version = '20260414310000' WHERE version = '20260414300000' AND name LIKE '%command_control%';
  UPDATE supabase_migrations.schema_migrations SET version = '20260414410000' WHERE version = '20260414400000' AND name LIKE '%webauthn_credentials%';
  UPDATE supabase_migrations.schema_migrations SET version = '20260414610000' WHERE version = '20260414600000' AND name LIKE '%search_infrastructure%';
  UPDATE supabase_migrations.schema_migrations SET version = '20260414810000' WHERE version = '20260414800000' AND name LIKE '%cron_monitoring%';
  UPDATE supabase_migrations.schema_migrations SET version = '20260415410000' WHERE version = '20260415400000' AND name LIKE '%unified_providers%';
  UPDATE supabase_migrations.schema_migrations SET version = '20260415510000' WHERE version = '20260415500000' AND name LIKE '%short_links%';
  UPDATE supabase_migrations.schema_migrations SET version = '20260415610000' WHERE version = '20260415600000' AND name LIKE '%fix_avatar%';
  UPDATE supabase_migrations.schema_migrations SET version = '20260415620000' WHERE version = '20260415600000' AND name LIKE '%hotel_domain%';
  UPDATE supabase_migrations.schema_migrations SET version = '20260415630000' WHERE version = '20260415600000' AND name LIKE '%restaurant_modifiers%';
  UPDATE supabase_migrations.schema_migrations SET version = '20260415710000' WHERE version = '20260415700000' AND name LIKE '%wallet_security%';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Migration reconciliation skipped (table may not exist or different schema): %', SQLERRM;
END $$;

-- Fix resolve_short_link SECURITY DEFINER search_path
ALTER FUNCTION public.resolve_short_link(text) SET search_path = public;

-- Performance indexes for high-volume tables identified in audit

CREATE INDEX IF NOT EXISTS idx_bookings_v2_user_date
  ON bookings_v2 (buyer_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_v2_listing_status
  ON bookings_v2 (listing_id, status);

CREATE INDEX IF NOT EXISTS idx_bookings_v2_seller
  ON bookings_v2 (seller_user_id, status);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created
  ON activity_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_entity
  ON activity_logs (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_action
  ON activity_logs (action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_date
  ON wallet_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status
  ON wallet_transactions (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type
  ON wallet_transactions (transaction_type, user_id);
