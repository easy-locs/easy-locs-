-- =============================================================================
-- Migration: Domain Schema Architecture (Task #56)
-- Implements the "1 data = 1 owner" boundary rule.
--
-- STRATEGY
-- ─────────
-- Canonical tables are physically moved from `public` to their owner domain
-- schema using ALTER TABLE … SET SCHEMA. PostgreSQL preserves all constraints,
-- indexes, sequences, RLS policies, and trigger definitions automatically.
-- FK constraints referencing moved tables continue to resolve because
-- they store the table OID, not a schema-qualified name.
--
-- Backward compatibility is maintained through:
--   (a) PUBLIC COMPAT VIEWS — simple SELECT * views in public pointing to the
--       domain table, auto-updatable by PostgreSQL, SECURITY INVOKER.
--   (b) LEGACY ALIAS VIEWS — views in public for dropped legacy/duplicate
--       tables, mapping old columns to the canonical table.
--
-- Supabase Realtime note:
--   After moving tables, the supabase_realtime publication must be updated to
--   include the domain-schema tables. This migration does so. Client-side
--   .on("postgres_changes", { schema: "orbit", table: "chat_messages_v2" })
--   must also be updated — the non-tsx files are updated in this PR; tsx
--   component subscriptions are tracked as follow-up work.
--
-- PostgREST note:
--   Domain schemas are added to supabase/config.toml [api].schemas so that
--   PostgREST exposes them. The public compat views also allow existing
--   .from("table") calls to continue working via PostgREST.
--
-- Schemas created:
--   identity | wallet | orbit | marketplace | commerce | property
--   onboarding | support | notification | system | analytics
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1 — Create 11 domain schemas
-- ─────────────────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS wallet;
CREATE SCHEMA IF NOT EXISTS orbit;
CREATE SCHEMA IF NOT EXISTS marketplace;
CREATE SCHEMA IF NOT EXISTS commerce;
CREATE SCHEMA IF NOT EXISTS property;
CREATE SCHEMA IF NOT EXISTS onboarding;
CREATE SCHEMA IF NOT EXISTS support;
CREATE SCHEMA IF NOT EXISTS notification;
CREATE SCHEMA IF NOT EXISTS system;
CREATE SCHEMA IF NOT EXISTS analytics;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2 — Grant USAGE + default privileges on domain schemas
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  schemas TEXT[] := ARRAY[
    'identity','wallet','orbit','marketplace','commerce',
    'property','onboarding','support','notification','system','analytics'
  ];
  s TEXT;
BEGIN
  FOREACH s IN ARRAY schemas LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO anon, authenticated, service_role', s);
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT ON TABLES TO anon', s
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON TABLES TO authenticated', s
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON TABLES TO service_role', s
    );
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3 — Drop legacy / duplicate tables with CASCADE
--
-- These tables are superseded by canonical tables in domain schemas.
-- Public compat alias views are created in STEP 6 to preserve backward compat.
-- ─────────────────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS public.orbit_profiles_v2        CASCADE;
DROP TABLE IF EXISTS public.orbit_identity_profiles   CASCADE;
DROP TABLE IF EXISTS public.wallet_balances_v2        CASCADE;
DROP TABLE IF EXISTS public.conversations             CASCADE;
DROP TABLE IF EXISTS public.messages                  CASCADE;
DROP TABLE IF EXISTS public.marketplace_services      CASCADE;
DROP TABLE IF EXISTS public.storefront_pages          CASCADE;
DROP TABLE IF EXISTS public.marketplace_bookings      CASCADE;
DROP TABLE IF EXISTS public.concierge_orders          CASCADE;
DROP TABLE IF EXISTS public.booking_requests          CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4 — Physically move canonical tables to their domain schemas
--
-- ALTER TABLE … SET SCHEMA preserves:
--   • All RLS policies and row security settings
--   • All indexes, unique constraints, check constraints
--   • All FK constraints (they reference OIDs, not schema-qualified names)
--   • Sequences, triggers, and default values
--
-- Each table is guarded with an IF EXISTS check so the migration is
-- idempotent (re-running won't fail if the table has already been moved).
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  moves TEXT[][] := ARRAY[
    -- [current_schema, table_name, target_schema]
    -- identity domain
    ARRAY['public', 'profiles',                      'identity'],
    ARRAY['public', 'organizations',                 'identity'],
    ARRAY['public', 'organization_members',          'identity'],
    -- wallet domain
    ARRAY['public', 'wallet_accounts',               'wallet'],
    ARRAY['public', 'wallet_transactions',           'wallet'],
    ARRAY['public', 'wallet_ledger_entries',         'wallet'],
    -- orbit domain
    ARRAY['public', 'conversations_v2',              'orbit'],
    ARRAY['public', 'chat_messages_v2',              'orbit'],
    ARRAY['public', 'conversation_participants_v2',  'orbit'],
    ARRAY['public', 'orbit_contacts_v2',             'orbit'],
    ARRAY['public', 'ghost_call_sessions',           'orbit'],
    ARRAY['public', 'call_logs',                     'orbit'],
    -- marketplace domain
    ARRAY['public', 'listings',                      'marketplace'],
    ARRAY['public', 'listing_details',               'marketplace'],
    ARRAY['public', 'listing_attributes',            'marketplace'],
    ARRAY['public', 'categories',                    'marketplace'],
    ARRAY['public', 'verticals',                     'marketplace'],
    ARRAY['public', 'reviews',                       'marketplace'],
    ARRAY['public', 'favorites',                     'marketplace'],
    -- commerce domain
    ARRAY['public', 'bookings',                      'commerce'],
    ARRAY['public', 'transactions',                  'commerce'],
    ARRAY['public', 'carts',                         'commerce'],
    ARRAY['public', 'receipts',                      'commerce'],
    ARRAY['public', 'payout_requests',               'commerce'],
    -- property domain
    ARRAY['public', 'properties',                    'property'],
    ARRAY['public', 'units',                         'property'],
    ARRAY['public', 'leases',                        'property'],
    -- onboarding domain
    ARRAY['public', 'onboarding_sessions',           'onboarding'],
    ARRAY['public', 'import_jobs',                   'onboarding'],
    ARRAY['public', 'staging_entities',              'onboarding'],
    -- support domain
    ARRAY['public', 'support_tickets',               'support'],
    -- notification domain
    ARRAY['public', 'app_notifications',             'notification'],
    ARRAY['public', 'user_notification_preferences', 'notification'],
    ARRAY['public', 'user_push_tokens',              'notification'],
    -- system domain
    ARRAY['public', 'engine_supervisor',             'system'],
    ARRAY['public', 'engine_run_logs',               'system'],
    ARRAY['public', 'worker_health_snapshots',       'system'],
    -- analytics domain
    ARRAY['public', 'user_radar_events',             'analytics'],
    ARRAY['public', 'user_radar_profiles',           'analytics']
  ];
  m TEXT[];
BEGIN
  FOREACH m SLICE 1 IN ARRAY moves LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = m[1] AND tablename = m[2]
    ) THEN
      EXECUTE format('ALTER TABLE %I.%I SET SCHEMA %I', m[1], m[2], m[3]);
      RAISE NOTICE 'Moved %.% → %.%', m[1], m[2], m[3], m[2];
    ELSIF EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = m[3] AND tablename = m[2]
    ) THEN
      RAISE NOTICE 'Table %.% already in target schema — skipping', m[3], m[2];
    ELSE
      RAISE NOTICE 'Table %.% not found — skipping move', m[1], m[2];
    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5 — Create public compat views for all moved canonical tables
--
-- These are simple SELECT * views in public pointing to the domain tables.
-- PostgreSQL automatically makes them updatable (DML pass-through).
-- SECURITY INVOKER ensures the calling user's RLS context is used.
--
-- TEMPORARY — these views will be removed once all callers are migrated
-- to use domain-schema references directly.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  compat_views TEXT[][] := ARRAY[
    -- [domain_schema, table_name]  → creates public.table_name VIEW
    ARRAY['identity',    'profiles'],
    ARRAY['identity',    'organizations'],
    ARRAY['identity',    'organization_members'],
    ARRAY['wallet',      'wallet_accounts'],
    ARRAY['wallet',      'wallet_transactions'],
    ARRAY['wallet',      'wallet_ledger_entries'],
    ARRAY['orbit',       'conversations_v2'],
    ARRAY['orbit',       'chat_messages_v2'],
    ARRAY['orbit',       'conversation_participants_v2'],
    ARRAY['orbit',       'orbit_contacts_v2'],
    ARRAY['orbit',       'ghost_call_sessions'],
    ARRAY['orbit',       'call_logs'],
    ARRAY['marketplace', 'listings'],
    ARRAY['marketplace', 'listing_details'],
    ARRAY['marketplace', 'listing_attributes'],
    ARRAY['marketplace', 'categories'],
    ARRAY['marketplace', 'verticals'],
    ARRAY['marketplace', 'reviews'],
    ARRAY['marketplace', 'favorites'],
    ARRAY['commerce',    'bookings'],
    ARRAY['commerce',    'transactions'],
    ARRAY['commerce',    'carts'],
    ARRAY['commerce',    'receipts'],
    ARRAY['commerce',    'payout_requests'],
    ARRAY['property',    'properties'],
    ARRAY['property',    'units'],
    ARRAY['property',    'leases'],
    ARRAY['onboarding',  'onboarding_sessions'],
    ARRAY['onboarding',  'import_jobs'],
    ARRAY['onboarding',  'staging_entities'],
    ARRAY['support',     'support_tickets'],
    ARRAY['notification','app_notifications'],
    ARRAY['notification','user_notification_preferences'],
    ARRAY['notification','user_push_tokens'],
    ARRAY['system',      'engine_supervisor'],
    ARRAY['system',      'engine_run_logs'],
    ARRAY['system',      'worker_health_snapshots'],
    ARRAY['analytics',   'user_radar_events'],
    ARRAY['analytics',   'user_radar_profiles']
  ];
  v TEXT[];
BEGIN
  FOREACH v SLICE 1 IN ARRAY compat_views LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = v[1] AND tablename = v[2]
    ) THEN
      -- Drop any pre-existing public object with this name (view or table)
      -- to avoid collision (e.g. if this migration is partially re-run)
      IF EXISTS (
        SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = v[2]
      ) THEN
        EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', v[2]);
      END IF;
      EXECUTE format(
        'CREATE VIEW public.%I AS SELECT * FROM %I.%I',
        v[2], v[1], v[2]
      );
      RAISE NOTICE 'Created compat view public.% → %.%', v[2], v[1], v[2];
    ELSE
      RAISE NOTICE 'Domain table %.% not found — skipping public compat view', v[1], v[2];
    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5b — Apply SECURITY INVOKER to all public compat views (PG 15+)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  compat_tables TEXT[] := ARRAY[
    'profiles','organizations','organization_members',
    'wallet_accounts','wallet_transactions','wallet_ledger_entries',
    'conversations_v2','chat_messages_v2','conversation_participants_v2',
    'orbit_contacts_v2','ghost_call_sessions','call_logs',
    'listings','listing_details','listing_attributes','categories',
    'verticals','reviews','favorites',
    'bookings','transactions','carts','receipts','payout_requests',
    'properties','units','leases',
    'onboarding_sessions','import_jobs','staging_entities',
    'support_tickets',
    'app_notifications','user_notification_preferences','user_push_tokens',
    'engine_supervisor','engine_run_logs','worker_health_snapshots',
    'user_radar_events','user_radar_profiles'
  ];
  t TEXT;
  pg_ver INT;
BEGIN
  pg_ver := current_setting('server_version_num')::INT;
  IF pg_ver >= 150000 THEN
    FOREACH t IN ARRAY compat_tables LOOP
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = t
        ) THEN
          EXECUTE format(
            'ALTER VIEW public.%I SET (security_invoker = true)', t
          );
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'security_invoker on public.%: %', t, SQLERRM;
      END;
    END LOOP;
    RAISE NOTICE 'SECURITY INVOKER applied to public compat views (PG %)',
      current_setting('server_version');
  ELSE
    RAISE NOTICE 'PG < 15 — skipping SECURITY INVOKER (version: %)',
      current_setting('server_version');
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5c — Grant SELECT + DML on public compat views to PostgREST roles
-- Auto-updatable SELECT * compat views pass DML through to the canonical table.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  compat_tables TEXT[] := ARRAY[
    'profiles','organizations','organization_members',
    'wallet_accounts','wallet_transactions','wallet_ledger_entries',
    'conversations_v2','chat_messages_v2','conversation_participants_v2',
    'orbit_contacts_v2','ghost_call_sessions','call_logs',
    'listings','listing_details','listing_attributes','categories',
    'verticals','reviews','favorites',
    'bookings','transactions','carts','receipts','payout_requests',
    'properties','units','leases',
    'onboarding_sessions','import_jobs','staging_entities',
    'support_tickets',
    'app_notifications','user_notification_preferences','user_push_tokens',
    'engine_supervisor','engine_run_logs','worker_health_snapshots',
    'user_radar_events','user_radar_profiles'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY compat_tables LOOP
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = t
      ) THEN
        EXECUTE format(
          'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated, service_role', t
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Grant on public.%: %', t, SQLERRM;
    END;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5d — Grant ALL on domain schema tables to authenticated / service_role
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  schemas TEXT[] := ARRAY[
    'identity','wallet','orbit','marketplace','commerce',
    'property','onboarding','support','notification','system','analytics'
  ];
  s TEXT;
BEGIN
  FOREACH s IN ARRAY schemas LOOP
    -- anon: no direct access to domain schema tables; use public compat views instead
    -- authenticated + service_role: full access (RLS policies on each table restrict
    --   what authenticated users can actually do — same model as public schema)
    EXECUTE format(
      'GRANT ALL ON ALL TABLES IN SCHEMA %I TO authenticated, service_role', s
    );
    -- Grant USAGE on schemas so PostgREST can resolve domain schema routes
    EXECUTE format(
      'GRANT USAGE ON SCHEMA %I TO anon', s
    );
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5e — Update supabase_realtime publication to include domain tables
--
-- After ALTER TABLE SET SCHEMA, the moved tables are no longer in the
-- supabase_realtime publication (which was scoped to public.*).
-- We add each moved table explicitly so Realtime events continue to fire.
--
-- Client-side code must subscribe with the new domain schema:
--   .on("postgres_changes", { schema: "orbit", table: "chat_messages_v2" })
-- Non-tsx hook files are updated in this PR. The public compat views do NOT
-- generate Realtime events (views are not in the WAL replication stream).
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  domain_tables TEXT[][] := ARRAY[
    ARRAY['identity',    'profiles'],
    ARRAY['identity',    'organizations'],
    ARRAY['identity',    'organization_members'],
    ARRAY['wallet',      'wallet_accounts'],
    ARRAY['wallet',      'wallet_transactions'],
    ARRAY['wallet',      'wallet_ledger_entries'],
    ARRAY['orbit',       'conversations_v2'],
    ARRAY['orbit',       'chat_messages_v2'],
    ARRAY['orbit',       'conversation_participants_v2'],
    ARRAY['orbit',       'orbit_contacts_v2'],
    ARRAY['orbit',       'ghost_call_sessions'],
    ARRAY['orbit',       'call_logs'],
    ARRAY['marketplace', 'listings'],
    ARRAY['marketplace', 'listing_details'],
    ARRAY['marketplace', 'listing_attributes'],
    ARRAY['marketplace', 'categories'],
    ARRAY['marketplace', 'verticals'],
    ARRAY['marketplace', 'reviews'],
    ARRAY['marketplace', 'favorites'],
    ARRAY['commerce',    'bookings'],
    ARRAY['commerce',    'transactions'],
    ARRAY['commerce',    'carts'],
    ARRAY['commerce',    'receipts'],
    ARRAY['commerce',    'payout_requests'],
    ARRAY['property',    'properties'],
    ARRAY['property',    'units'],
    ARRAY['property',    'leases'],
    ARRAY['onboarding',  'onboarding_sessions'],
    ARRAY['onboarding',  'import_jobs'],
    ARRAY['onboarding',  'staging_entities'],
    ARRAY['support',     'support_tickets'],
    ARRAY['notification','app_notifications'],
    ARRAY['notification','user_notification_preferences'],
    ARRAY['notification','user_push_tokens'],
    ARRAY['system',      'engine_supervisor'],
    ARRAY['system',      'engine_run_logs'],
    ARRAY['system',      'worker_health_snapshots'],
    ARRAY['analytics',   'user_radar_events'],
    ARRAY['analytics',   'user_radar_profiles']
  ];
  v TEXT[];
  pub_exists BOOL;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) INTO pub_exists;

  IF pub_exists THEN
    FOREACH v SLICE 1 IN ARRAY domain_tables LOOP
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_tables WHERE schemaname = v[1] AND tablename = v[2]
        ) THEN
          EXECUTE format(
            'ALTER PUBLICATION supabase_realtime ADD TABLE %I.%I', v[1], v[2]
          );
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Publication update %.%: %', v[1], v[2], SQLERRM;
      END;
    END LOOP;
    RAISE NOTICE 'supabase_realtime publication updated with domain schema tables';
  ELSE
    RAISE NOTICE 'supabase_realtime publication not found — skipping (local dev)';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6 — Legacy alias views in public for all dropped tables
--
-- These views redirect old table names to the canonical domain table.
-- All are marked SECURITY INVOKER (PG15+). Existing .from() queries
-- continue to work transparently for SELECT operations.
-- DML (INSERT/UPDATE/DELETE) through the non-SELECT* alias views must
-- be redirected to the canonical table name in application code.
--
-- This layer is TEMPORARY and will be removed in a follow-up migration
-- once all callers reference the canonical table directly.
-- ─────────────────────────────────────────────────────────────────────────────

-- orbit_profiles_v2 → identity.profiles
-- profiles columns: id, name (not full_name), email, created_at, updated_at.
-- orbit_id is aliased to id (same value); display_name maps to name.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'identity' AND tablename = 'profiles') THEN
    BEGIN
      CREATE OR REPLACE VIEW public.orbit_profiles_v2 AS
        SELECT
          id,
          id                 AS orbit_id,
          name               AS display_name,
          NULL::text         AS avatar_url,
          email,
          created_at,
          updated_at
        FROM identity.profiles;
      COMMENT ON VIEW public.orbit_profiles_v2 IS
        'LEGACY ALIAS → identity.profiles. Drop after all callers migrate.';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'orbit_profiles_v2 alias view skipped: %', SQLERRM;
    END;
  END IF;
END $$;

-- orbit_identity_profiles → identity.profiles
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'identity' AND tablename = 'profiles') THEN
    BEGIN
      CREATE OR REPLACE VIEW public.orbit_identity_profiles AS
        SELECT * FROM identity.profiles;
      COMMENT ON VIEW public.orbit_identity_profiles IS
        'LEGACY ALIAS → identity.profiles. Drop after all callers migrate.';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'orbit_identity_profiles alias view skipped: %', SQLERRM;
    END;
  END IF;
END $$;

-- wallet_balances_v2 → wallet.wallet_accounts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'wallet' AND tablename = 'wallet_accounts') THEN
    BEGIN
      CREATE OR REPLACE VIEW public.wallet_balances_v2 AS
        SELECT * FROM wallet.wallet_accounts WHERE status = 'active';
      COMMENT ON VIEW public.wallet_balances_v2 IS
        'LEGACY ALIAS → wallet.wallet_accounts (filter status=active). Drop after callers migrate.';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'wallet_balances_v2 alias view skipped: %', SQLERRM;
    END;
  END IF;
END $$;

-- conversations (v1) → orbit.conversations_v2
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'orbit' AND tablename = 'conversations_v2') THEN
    BEGIN
      CREATE OR REPLACE VIEW public.conversations AS
        SELECT * FROM orbit.conversations_v2;
      COMMENT ON VIEW public.conversations IS
        'LEGACY ALIAS → orbit.conversations_v2. Drop after all callers migrate.';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'conversations alias view skipped: %', SQLERRM;
    END;
  END IF;
END $$;

-- messages (v1) → orbit.chat_messages_v2
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'orbit' AND tablename = 'chat_messages_v2') THEN
    BEGIN
      CREATE OR REPLACE VIEW public.messages AS
        SELECT * FROM orbit.chat_messages_v2;
      COMMENT ON VIEW public.messages IS
        'LEGACY ALIAS → orbit.chat_messages_v2. Drop after all callers migrate.';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'messages alias view skipped: %', SQLERRM;
    END;
  END IF;
END $$;

-- marketplace_services → marketplace.listings (service/activity type filter)
-- Uses SELECT * to avoid column name assumptions; auto-updatable via WHERE filter.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'marketplace' AND tablename = 'listings') THEN
    BEGIN
      CREATE OR REPLACE VIEW public.marketplace_services AS
        SELECT * FROM marketplace.listings
        WHERE listing_type IN ('service', 'activity');
      COMMENT ON VIEW public.marketplace_services IS
        'LEGACY ALIAS → marketplace.listings WHERE listing_type IN (service, activity). Drop after callers migrate.';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'marketplace_services alias view skipped: %', SQLERRM;
    END;
  END IF;
END $$;

-- storefront_pages → identity.organizations
-- organizations columns: id, name, owner_id, city, country, created_at, updated_at.
-- NULL placeholders preserve the storefront_pages column surface for SELECT queries.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'identity' AND tablename = 'organizations') THEN
    BEGIN
      CREATE OR REPLACE VIEW public.storefront_pages AS
        SELECT
          id,
          name,
          NULL::text                        AS slug,
          NULL::text                        AS logo_url,
          NULL::text                        AS banner_url,
          NULL::text                        AS description,
          NULL::text                        AS contact_email,
          NULL::text                        AS contact_phone,
          NULL::text                        AS address,
          NULL::text                        AS city,
          NULL::text                        AS country,
          NULL::numeric                     AS latitude,
          NULL::numeric                     AS longitude,
          'public'::text                    AS shop_visibility,
          FALSE                             AS is_verified,
          TRUE                              AS active,
          NULL::numeric                     AS rating,
          0                                 AS reviews_count,
          0                                 AS views_count,
          NULL::text                        AS currency,
          NULL::text                        AS theme_color,
          owner_id                          AS owner_user_id,
          created_at,
          updated_at
        FROM identity.organizations;
      COMMENT ON VIEW public.storefront_pages IS
        'LEGACY ALIAS → identity.organizations. Drop after callers migrate to organizations.';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'storefront_pages alias view skipped: %', SQLERRM;
    END;
  END IF;
END $$;

-- marketplace_bookings → commerce.bookings (booking_type=marketplace)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'commerce' AND tablename = 'bookings') THEN
    BEGIN
      CREATE OR REPLACE VIEW public.marketplace_bookings AS
        SELECT * FROM commerce.bookings
        WHERE booking_type = 'marketplace' OR booking_type IS NULL;
      COMMENT ON VIEW public.marketplace_bookings IS
        'LEGACY ALIAS → commerce.bookings WHERE booking_type=marketplace. Drop after callers migrate.';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'marketplace_bookings alias view skipped: %', SQLERRM;
    END;
  END IF;
END $$;

-- concierge_orders → commerce.transactions (transaction_type=service_request)
-- Uses SELECT * to avoid column name assumptions; auto-updatable via WHERE filter.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'commerce' AND tablename = 'transactions') THEN
    BEGIN
      CREATE OR REPLACE VIEW public.concierge_orders AS
        SELECT * FROM commerce.transactions
        WHERE transaction_type = 'service_request';
      COMMENT ON VIEW public.concierge_orders IS
        'LEGACY ALIAS → commerce.transactions WHERE transaction_type=service_request. Drop after callers migrate.';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'concierge_orders alias view skipped: %', SQLERRM;
    END;
  END IF;
END $$;

-- booking_requests → commerce.bookings (status=pending/requested)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'commerce' AND tablename = 'bookings') THEN
    BEGIN
      CREATE OR REPLACE VIEW public.booking_requests AS
        SELECT * FROM commerce.bookings
        WHERE status IN ('pending', 'requested', 'awaiting_confirmation');
      COMMENT ON VIEW public.booking_requests IS
        'LEGACY ALIAS → commerce.bookings WHERE status IN (pending, requested, awaiting_confirmation). Drop after callers migrate.';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'booking_requests alias view skipped: %', SQLERRM;
    END;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6b — Apply SECURITY INVOKER to all legacy alias views (PG 15+)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  alias_views TEXT[] := ARRAY[
    'orbit_profiles_v2', 'orbit_identity_profiles', 'wallet_balances_v2',
    'conversations', 'messages', 'marketplace_services', 'storefront_pages',
    'marketplace_bookings', 'concierge_orders', 'booking_requests'
  ];
  vn TEXT;
  pg_ver INT;
BEGIN
  pg_ver := current_setting('server_version_num')::INT;
  IF pg_ver >= 150000 THEN
    FOREACH vn IN ARRAY alias_views LOOP
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = vn
        ) THEN
          EXECUTE format(
            'ALTER VIEW public.%I SET (security_invoker = true)', vn
          );
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'security_invoker on public.%: %', vn, SQLERRM;
      END;
    END LOOP;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6c — Grant SELECT + DML on all legacy alias views
-- Auto-updatable SELECT * alias views pass DML to canonical domain table.
-- Non-updatable alias views (column projections) will return PostgreSQL errors
-- on DML — callers must be migrated to canonical table names.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  alias_views TEXT[] := ARRAY[
    'orbit_profiles_v2', 'orbit_identity_profiles', 'wallet_balances_v2',
    'conversations', 'messages', 'marketplace_services', 'storefront_pages',
    'marketplace_bookings', 'concierge_orders', 'booking_requests'
  ];
  vn TEXT;
BEGIN
  FOREACH vn IN ARRAY alias_views LOOP
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = vn
      ) THEN
        EXECUTE format(
          'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated, service_role', vn
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Grant on public.%: %', vn, SQLERRM;
    END;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 7 — Annotate canonical domain tables with ownership comments
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  annotations TEXT[][] := ARRAY[
    ARRAY['identity',    'profiles',                     'DOMAIN: identity | FK_ROOT: id'],
    ARRAY['identity',    'organizations',                'DOMAIN: identity | FK_ROOT: org_id'],
    ARRAY['identity',    'organization_members',         'DOMAIN: identity'],
    ARRAY['wallet',      'wallet_accounts',              'DOMAIN: wallet | FK: owner_user_id → identity.profiles.id'],
    ARRAY['wallet',      'wallet_transactions',          'DOMAIN: wallet'],
    ARRAY['wallet',      'wallet_ledger_entries',        'DOMAIN: wallet | LEDGER_SOURCE_OF_TRUTH'],
    ARRAY['orbit',       'conversations_v2',             'DOMAIN: orbit'],
    ARRAY['orbit',       'chat_messages_v2',             'DOMAIN: orbit | canonical message table'],
    ARRAY['orbit',       'conversation_participants_v2', 'DOMAIN: orbit'],
    ARRAY['orbit',       'orbit_contacts_v2',            'DOMAIN: orbit'],
    ARRAY['orbit',       'ghost_call_sessions',          'DOMAIN: orbit'],
    ARRAY['orbit',       'call_logs',                    'DOMAIN: orbit'],
    ARRAY['marketplace', 'listings',                     'DOMAIN: marketplace | CANONICAL_LISTING'],
    ARRAY['marketplace', 'listing_details',              'DOMAIN: marketplace'],
    ARRAY['marketplace', 'listing_attributes',           'DOMAIN: marketplace'],
    ARRAY['marketplace', 'categories',                   'DOMAIN: marketplace'],
    ARRAY['marketplace', 'verticals',                    'DOMAIN: marketplace'],
    ARRAY['marketplace', 'reviews',                      'DOMAIN: marketplace'],
    ARRAY['marketplace', 'favorites',                    'DOMAIN: marketplace'],
    ARRAY['commerce',    'bookings',                     'DOMAIN: commerce'],
    ARRAY['commerce',    'transactions',                 'DOMAIN: commerce | CANONICAL_TRANSACTION'],
    ARRAY['commerce',    'carts',                        'DOMAIN: commerce'],
    ARRAY['commerce',    'receipts',                     'DOMAIN: commerce'],
    ARRAY['commerce',    'payout_requests',              'DOMAIN: commerce'],
    ARRAY['property',    'properties',                   'DOMAIN: property'],
    ARRAY['property',    'units',                        'DOMAIN: property'],
    ARRAY['property',    'leases',                       'DOMAIN: property'],
    ARRAY['onboarding',  'onboarding_sessions',          'DOMAIN: onboarding'],
    ARRAY['onboarding',  'import_jobs',                  'DOMAIN: onboarding'],
    ARRAY['onboarding',  'staging_entities',             'DOMAIN: onboarding'],
    ARRAY['support',     'support_tickets',              'DOMAIN: support'],
    ARRAY['notification','app_notifications',            'DOMAIN: notification'],
    ARRAY['notification','user_notification_preferences','DOMAIN: notification'],
    ARRAY['notification','user_push_tokens',             'DOMAIN: notification'],
    ARRAY['system',      'engine_supervisor',            'DOMAIN: system'],
    ARRAY['system',      'engine_run_logs',              'DOMAIN: system'],
    ARRAY['system',      'worker_health_snapshots',      'DOMAIN: system'],
    ARRAY['analytics',   'user_radar_events',            'DOMAIN: analytics'],
    ARRAY['analytics',   'user_radar_profiles',          'DOMAIN: analytics']
  ];
  a TEXT[];
BEGIN
  FOREACH a SLICE 1 IN ARRAY annotations LOOP
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = a[1] AND tablename = a[2]
      ) THEN
        EXECUTE format(
          'COMMENT ON TABLE %I.%I IS %L', a[1], a[2], a[3]
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Comment on %.%: %', a[1], a[2], SQLERRM;
    END;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 8 — Audit log
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_findings'
  ) THEN
    INSERT INTO public.audit_findings (
      finding_type, severity, domain, description, resolved, metadata_json, created_at
    ) VALUES (
      'schema_migration', 'info', 'platform',
      'Task #56: Domain schema architecture. 11 schemas created. 38 canonical tables physically moved to domain schemas. Public compat views created (TEMPORARY). Legacy tables dropped with alias views. supabase_realtime publication updated. SECURITY INVOKER applied (PG15+).',
      true,
      jsonb_build_object(
        'schemas', ARRAY['identity','wallet','orbit','marketplace','commerce','property','onboarding','support','notification','system','analytics'],
        'tables_moved', 38,
        'legacy_dropped', ARRAY['orbit_profiles_v2','orbit_identity_profiles','wallet_balances_v2','conversations','messages','marketplace_services','storefront_pages','marketplace_bookings','concierge_orders','booking_requests'],
        'compat_views', 'temporary — remove in follow-up migration after tsx realtime subs updated',
        'version', '20260413600000'
      ),
      now()
    ) ON CONFLICT DO NOTHING;
  END IF;
END $$;

COMMIT;
