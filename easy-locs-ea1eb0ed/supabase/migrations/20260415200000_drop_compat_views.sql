-- Migration: Drop legacy compat views (guarded, phased)
-- These public compat views were created during the domain schema migration (Task #56)
-- to allow existing .from("table") calls to work during transition.
--
-- PREREQUISITE: All callsites in pages/components/hooks must be migrated to use
-- domain services before this migration can safely execute.
--
-- GUARD: This migration only executes when the config flag
-- 'compat_views_ready_to_drop' is set to 'true' in the app_config table.
-- To enable: INSERT INTO public.app_config (key, value) VALUES ('compat_views_ready_to_drop', 'true')
-- ON CONFLICT (key) DO UPDATE SET value = 'true';

DO $$
DECLARE
  v_ready boolean := false;
  v_name text;
  v_views text[] := ARRAY[
    'profiles', 'organizations', 'organization_members',
    'wallet_accounts', 'wallet_transactions',
    'conversations_v2', 'chat_messages_v2', 'conversations', 'messages',
    'listings', 'marketplace_services',
    'bookings', 'marketplace_bookings', 'booking_requests', 'concierge_orders',
    'properties',
    'orbit_profiles_v2', 'wallet_balances_v2', 'storefront_pages'
  ];
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'app_config'
  ) INTO v_ready;

  IF v_ready THEN
    SELECT COALESCE(
      (SELECT value = 'true' FROM public.app_config WHERE key = 'compat_views_ready_to_drop'),
      false
    ) INTO v_ready;
  END IF;

  IF NOT v_ready THEN
    RAISE NOTICE 'Compat view drop SKIPPED — set app_config.compat_views_ready_to_drop = true to enable.';
    RETURN;
  END IF;

  RAISE NOTICE 'Dropping % compat views...', array_length(v_views, 1);

  FOREACH v_name IN ARRAY v_views
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.views
      WHERE table_schema = 'public' AND table_name = v_name
    ) THEN
      RAISE NOTICE 'Dropping compat view: public.%', v_name;
      EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', v_name);
    ELSE
      RAISE NOTICE 'View public.% does not exist, skipping', v_name;
    END IF;
  END LOOP;

  RAISE NOTICE 'All compat views dropped successfully.';
END $$;
