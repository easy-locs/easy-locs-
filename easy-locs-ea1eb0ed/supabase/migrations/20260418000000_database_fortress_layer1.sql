-- =============================================================================
-- Migration: Database Fortress — Layer 1
-- Task #568: Schema hardening, CHECK constraints, normalization, new tables
--
-- This migration:
--   1. Adds CHECK constraints matching TypeScript union types
--   2. Moves BNPL + e-signature tables into commerce schema
--   3. Creates micro-insurance tables in wallet schema
--   4. Normalizes listing_type values to canonical enum
--   5. Runs retroactive text normalization (trim, casing)
--   6. Adds unique constraint on referral redemptions
--   7. Adds CHECK constraint on subscription_tier
--   8. Drops unused browser telemetry tables
--   9. Creates dedicated fleet_metrics + delivery_stats tables
--  10. Creates referral_codes + referral_redemptions if missing
--  11. Validates public-schema compatibility views
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1 — CHECK constraints matching TypeScript union types
--
-- Source of truth: src/lib/schema/status-enums.ts
-- Source of truth: src/services/onboarding-providers.service.ts
-- Source of truth: src/lib/schema/canonical-schemas.ts
-- Source of truth: src/domains/real-estate/canonical-types.ts
-- ─────────────────────────────────────────────────────────────────────────────

-- 1a. provider_type on identity.providers — expand to include all TS values
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'providers_provider_type_check'
      AND table_schema = 'identity' AND table_name = 'providers'
  ) THEN
    ALTER TABLE identity.providers DROP CONSTRAINT providers_provider_type_check;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not drop old provider_type check: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'identity' AND tablename = 'providers'
  ) THEN
    BEGIN
      ALTER TABLE identity.providers
        ADD CONSTRAINT chk_provider_type CHECK (
          provider_type IN (
            'restaurant', 'hotel', 'taxi_driver', 'delivery_driver',
            'service_provider', 'commerce', 'individual', 'company',
            'service', 'shop', 'driver', 'landlord', 'freelancer'
          )
        ) NOT VALID;
      ALTER TABLE identity.providers VALIDATE CONSTRAINT chk_provider_type;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 1b. kyc_status CHECK — superset of both KYC_STATUS (status-enums.ts) and
-- ProviderKycStatus (onboarding-providers.service.ts). DB is the union of all
-- valid values across both TS definitions. TS types narrow per-context.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'providers_kyc_status_check'
      AND table_schema = 'identity' AND table_name = 'providers'
  ) THEN
    ALTER TABLE identity.providers DROP CONSTRAINT providers_kyc_status_check;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not drop old kyc_status check: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'identity' AND tablename = 'providers'
  ) THEN
    BEGIN
      ALTER TABLE identity.providers
        ADD CONSTRAINT chk_kyc_status CHECK (
          kyc_status IN (
            'not_started', 'documents_pending', 'pending',
            'under_review', 'verified', 'rejected',
            'expired', 'suspended'
          )
        ) NOT VALID;
      ALTER TABLE identity.providers VALIDATE CONSTRAINT chk_kyc_status;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 1c. listing_type — normalize existing data FIRST, then add strict CHECK
-- Normalization moved here (before constraint) to avoid constraint violation on ADD

-- listing_type source of truth:
--   DB CHECK (below): merged superset of all TS unions — 15 values
--   TS listing-types.ts (ListingType): 4-value subset for property listings (short_stay, long_stay, hotel, sale)
--   TS canonical-schemas.ts (LISTING_TYPE): broader set used in marketplace module
--   DB is intentionally the union of all per-context TS types for extensibility.
DO $$
DECLARE
  tbl_schema TEXT;
  tbl_name TEXT;
  listings_tables TEXT[][] := ARRAY[
    ARRAY['marketplace', 'listings'],
    ARRAY['public', 'listings']
  ];
  t TEXT[];
BEGIN
  FOREACH t SLICE 1 IN ARRAY listings_tables LOOP
    tbl_schema := t[1];
    tbl_name := t[2];
    IF EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = tbl_schema AND tablename = tbl_name
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = tbl_schema AND table_name = tbl_name AND column_name = 'listing_type'
    ) THEN
      EXECUTE format('UPDATE %I.%I SET listing_type = ''short_stay'' WHERE listing_type IN (''short_term_stay'', ''short-term-stay'', ''Short Term Stay'', ''SHORT_TERM_STAY'')', tbl_schema, tbl_name);
      EXECUTE format('UPDATE %I.%I SET listing_type = ''long_stay'' WHERE listing_type IN (''long_term_rental'', ''long-term-rental'', ''Long Term Rental'', ''LONG_TERM_RENTAL'')', tbl_schema, tbl_name);
      EXECUTE format('UPDATE %I.%I SET listing_type = ''sale'' WHERE listing_type IN (''Sale'', ''SALE'', ''for_sale'', ''FOR_SALE'')', tbl_schema, tbl_name);
      EXECUTE format('UPDATE %I.%I SET listing_type = ''rent'' WHERE listing_type IN (''Rent'', ''RENT'', ''for_rent'', ''FOR_RENT'', ''rental'')', tbl_schema, tbl_name);
      EXECUTE format('UPDATE %I.%I SET listing_type = ''lease'' WHERE listing_type IN (''Lease'', ''LEASE'')', tbl_schema, tbl_name);
      EXECUTE format('UPDATE %I.%I SET listing_type = ''hotel'' WHERE listing_type IN (''Hotel'', ''HOTEL'')', tbl_schema, tbl_name);
      EXECUTE format('UPDATE %I.%I SET listing_type = ''service'' WHERE listing_type IN (''Service'', ''SERVICE'')', tbl_schema, tbl_name);
      EXECUTE format('UPDATE %I.%I SET listing_type = ''product'' WHERE listing_type IN (''Product'', ''PRODUCT'')', tbl_schema, tbl_name);
      EXECUTE format('UPDATE %I.%I SET listing_type = ''room'' WHERE listing_type IN (''Room'', ''ROOM'')', tbl_schema, tbl_name);
      EXECUTE format('UPDATE %I.%I SET listing_type = ''menu_item'' WHERE listing_type IN (''menu-item'', ''Menu Item'', ''MENU_ITEM'')', tbl_schema, tbl_name);
      EXECUTE format('UPDATE %I.%I SET listing_type = ''activity'' WHERE listing_type IN (''Activity'', ''ACTIVITY'')', tbl_schema, tbl_name);
      EXECUTE format('UPDATE %I.%I SET listing_type = ''offer'' WHERE listing_type IN (''Offer'', ''OFFER'')', tbl_schema, tbl_name);
      EXECUTE format('UPDATE %I.%I SET listing_type = ''article'' WHERE listing_type IN (''Article'', ''ARTICLE'')', tbl_schema, tbl_name);
      EXECUTE format('UPDATE %I.%I SET listing_type = ''annonce'' WHERE listing_type IN (''Annonce'', ''ANNONCE'')', tbl_schema, tbl_name);
      EXECUTE format('UPDATE %I.%I SET listing_type = ''property'' WHERE listing_type IN (''Property'', ''PROPERTY'')', tbl_schema, tbl_name);
      RAISE NOTICE 'Normalized listing_type in %.%', tbl_schema, tbl_name;
    END IF;
  END LOOP;
END $$;

-- Now add strict CHECK (canonical values only, no legacy aliases)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'marketplace' AND tablename = 'listings'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'marketplace' AND table_name = 'listings'
        AND column_name = 'listing_type'
    ) THEN
      BEGIN
        ALTER TABLE marketplace.listings
          ADD CONSTRAINT chk_listing_type CHECK (
            listing_type IN (
              'article', 'annonce', 'service', 'property',
              'activity', 'room', 'menu_item', 'product', 'offer',
              'sale', 'rent', 'lease', 'short_stay', 'long_stay', 'hotel'
            )
          ) NOT VALID;
        ALTER TABLE marketplace.listings VALIDATE CONSTRAINT chk_listing_type;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'listings'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'listings'
        AND column_name = 'listing_type'
    ) THEN
      BEGIN
        ALTER TABLE public.listings
          ADD CONSTRAINT chk_listing_type CHECK (
            listing_type IN (
              'article', 'annonce', 'service', 'property',
              'activity', 'room', 'menu_item', 'product', 'offer',
              'sale', 'rent', 'lease', 'short_stay', 'long_stay', 'hotel'
            )
          ) NOT VALID;
        ALTER TABLE public.listings VALIDATE CONSTRAINT chk_listing_type;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END;
    END IF;
  END IF;
END $$;

-- 1d. booking_status CHECK on commerce.bookings
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'commerce' AND tablename = 'bookings'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'commerce' AND table_name = 'bookings'
        AND column_name = 'status'
    ) THEN
      BEGIN
        ALTER TABLE commerce.bookings
          ADD CONSTRAINT chk_booking_status CHECK (
            status IN (
              'pending', 'confirmed', 'paid', 'in_progress',
              'completed', 'cancelled', 'no_show'
            )
          ) NOT VALID;
        ALTER TABLE commerce.bookings VALIDATE CONSTRAINT chk_booking_status;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END;
    END IF;
  END IF;
END $$;

-- Also try on bookings_v2 if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bookings_v2'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'bookings_v2'
        AND column_name = 'status'
    ) THEN
      BEGIN
        ALTER TABLE public.bookings_v2
          ADD CONSTRAINT chk_booking_v2_status CHECK (
            status IN (
              'pending', 'confirmed', 'paid', 'in_progress',
              'completed', 'cancelled', 'no_show'
            )
          ) NOT VALID;
        ALTER TABLE public.bookings_v2 VALIDATE CONSTRAINT chk_booking_v2_status;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END;
    END IF;
  END IF;
END $$;

-- 1e. subscription_tier CHECK on profiles
DO $$
DECLARE
  tbl_schema TEXT;
BEGIN
  SELECT schemaname INTO tbl_schema FROM pg_tables
  WHERE tablename = 'profiles' AND schemaname IN ('identity', 'public')
  LIMIT 1;

  IF tbl_schema IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = tbl_schema AND table_name = 'profiles'
        AND column_name = 'subscription_tier'
    ) THEN
      BEGIN
        EXECUTE format(
          'ALTER TABLE %I.profiles ADD CONSTRAINT chk_subscription_tier CHECK (subscription_tier IN (''free'', ''starter'', ''pro'', ''business'', ''enterprise'')) NOT VALID',
          tbl_schema
        );
        EXECUTE format(
          'ALTER TABLE %I.profiles VALIDATE CONSTRAINT chk_subscription_tier',
          tbl_schema
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END;
    END IF;
  END IF;
END $$;

-- 1f. Additional status CHECK constraints from status-enums.ts

-- transaction_status on commerce.transactions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'commerce' AND tablename = 'transactions'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'commerce' AND table_name = 'transactions'
        AND column_name = 'status'
    ) THEN
      BEGIN
        ALTER TABLE commerce.transactions
          ADD CONSTRAINT chk_transaction_status CHECK (
            status IN (
              'initiated', 'pending', 'confirmed', 'completed',
              'cancelled', 'failed', 'refunded'
            )
          ) NOT VALID;
        ALTER TABLE commerce.transactions VALIDATE CONSTRAINT chk_transaction_status;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END;
    END IF;
  END IF;
END $$;

-- support_ticket_status on support.support_tickets
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'support' AND tablename = 'support_tickets'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'support' AND table_name = 'support_tickets'
        AND column_name = 'status'
    ) THEN
      BEGIN
        ALTER TABLE support.support_tickets
          ADD CONSTRAINT chk_support_ticket_status CHECK (
            status IN (
              'open', 'in_progress', 'waiting_customer',
              'resolved', 'closed'
            )
          ) NOT VALID;
        ALTER TABLE support.support_tickets VALIDATE CONSTRAINT chk_support_ticket_status;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END;
    END IF;
  END IF;
END $$;

-- conversation_status on orbit.conversations_v2
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'orbit' AND tablename = 'conversations_v2'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'orbit' AND table_name = 'conversations_v2'
        AND column_name = 'status'
    ) THEN
      BEGIN
        ALTER TABLE orbit.conversations_v2
          ADD CONSTRAINT chk_conversation_status CHECK (
            status IN ('active', 'archived', 'deleted', 'blocked')
          ) NOT VALID;
        ALTER TABLE orbit.conversations_v2 VALIDATE CONSTRAINT chk_conversation_status;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END;
    END IF;
  END IF;
END $$;

-- onboarding_status on onboarding.onboarding_sessions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'onboarding' AND tablename = 'onboarding_sessions'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'onboarding' AND table_name = 'onboarding_sessions'
        AND column_name = 'status'
    ) THEN
      BEGIN
        ALTER TABLE onboarding.onboarding_sessions
          ADD CONSTRAINT chk_onboarding_status CHECK (
            status IN (
              'not_started', 'in_progress', 'pending_review',
              'approved', 'rejected', 'completed'
            )
          ) NOT VALID;
        ALTER TABLE onboarding.onboarding_sessions VALIDATE CONSTRAINT chk_onboarding_status;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END;
    END IF;
  END IF;
END $$;

-- ledger_direction on wallet.wallet_ledger_entries
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'wallet' AND tablename = 'wallet_ledger_entries'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'wallet' AND table_name = 'wallet_ledger_entries'
        AND column_name = 'direction'
    ) THEN
      BEGIN
        ALTER TABLE wallet.wallet_ledger_entries
          ADD CONSTRAINT chk_ledger_direction CHECK (
            direction IN ('credit', 'debit')
          ) NOT VALID;
        ALTER TABLE wallet.wallet_ledger_entries VALIDATE CONSTRAINT chk_ledger_direction;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END;
    END IF;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2 — Move BNPL + e-signature tables into commerce schema
-- Handles both fresh installs (no existing public tables) and upgrades
-- (public.bnpl_plans / public.signature_envelopes already exist from
-- migration 20260416120000).
-- Strategy: create commerce tables → migrate data from any existing public
-- tables → drop old public tables → create compat views.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS commerce.bnpl_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  total_amount NUMERIC(18,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  installment_count INTEGER NOT NULL CHECK (installment_count IN (3, 4, 6)),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'overdue', 'defaulted')),
  merchant_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commerce.bnpl_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES commerce.bnpl_plans(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'overdue')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bnpl_plans_user ON commerce.bnpl_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_bnpl_plans_status ON commerce.bnpl_plans(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_bnpl_installments_plan ON commerce.bnpl_installments(plan_id);
CREATE INDEX IF NOT EXISTS idx_bnpl_installments_due ON commerce.bnpl_installments(due_date) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS commerce.signing_envelopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id TEXT NOT NULL,
  title TEXT NOT NULL,
  document_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'signed', 'declined', 'expired')),
  signed_document_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commerce.signing_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  envelope_id UUID NOT NULL REFERENCES commerce.signing_envelopes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('landlord', 'tenant', 'witness', 'notary')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('draft', 'pending', 'signed', 'declined', 'expired')),
  signed_at TIMESTAMPTZ,
  signature_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signing_envelopes_lease ON commerce.signing_envelopes(lease_id);
CREATE INDEX IF NOT EXISTS idx_signing_envelopes_status ON commerce.signing_envelopes(status);
CREATE INDEX IF NOT EXISTS idx_signing_parties_envelope ON commerce.signing_parties(envelope_id);

-- Migrate data from existing public tables into commerce tables, then drop old tables.
-- Old public.bnpl_plans: TEXT id, JSONB installments column (denormalized).
-- Old public.signature_envelopes: TEXT id, JSONB parties column (denormalized).
-- We create a mapping table to track old TEXT id → new UUID id for each migrated row
-- and explode the JSONB arrays into the new normalized child tables.
DO $$
DECLARE
  v_new_plan_id UUID;
  v_new_envelope_id UUID;
  r RECORD;
  inst RECORD;
  party RECORD;
BEGIN
  -- ── BNPL migration ──
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bnpl_plans'
      AND table_type = 'BASE TABLE'
  ) THEN
    FOR r IN SELECT * FROM public.bnpl_plans LOOP
      v_new_plan_id := gen_random_uuid();

      INSERT INTO commerce.bnpl_plans (
        id, user_id, order_id, total_amount, currency, installment_count,
        status, merchant_name, created_at, updated_at
      ) VALUES (
        v_new_plan_id, r.user_id, r.order_id, r.total_amount, r.currency,
        CASE WHEN r.installment_count IN (3, 4, 6) THEN r.installment_count ELSE 3 END,
        CASE WHEN r.status IN ('active', 'completed', 'overdue', 'defaulted') THEN r.status ELSE 'active' END,
        r.merchant_name, r.created_at, r.updated_at
      ) ON CONFLICT (id) DO NOTHING;

      IF r.installments IS NOT NULL AND jsonb_array_length(r.installments) > 0 THEN
        FOR inst IN
          SELECT
            row_number() OVER () AS num,
            (elem->>'amount')::numeric(18,2) AS amount,
            COALESCE((elem->>'dueDate')::timestamptz, (elem->>'due_date')::timestamptz, now() + (row_number() OVER () || ' months')::interval) AS due_date,
            (elem->>'paidAt')::timestamptz AS paid_at,
            CASE
              WHEN elem->>'status' IN ('pending', 'paid', 'overdue') THEN elem->>'status'
              ELSE 'pending'
            END AS status
          FROM jsonb_array_elements(r.installments) AS elem
        LOOP
          INSERT INTO commerce.bnpl_installments (
            plan_id, installment_number, amount, due_date, paid_at, status
          ) VALUES (
            v_new_plan_id, inst.num::int, inst.amount, inst.due_date, inst.paid_at, inst.status
          );
        END LOOP;
      END IF;
    END LOOP;

    DROP POLICY IF EXISTS "Users can view own BNPL plans" ON public.bnpl_plans;
    DROP POLICY IF EXISTS "Users can insert own BNPL plans" ON public.bnpl_plans;
    DROP POLICY IF EXISTS "Users can update own BNPL plans" ON public.bnpl_plans;
    DROP TABLE public.bnpl_plans;

    RAISE NOTICE 'Migrated public.bnpl_plans → commerce.bnpl_plans (with installments) and dropped old table';
  END IF;

  -- ── E-signature migration ──
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'signature_envelopes'
      AND table_type = 'BASE TABLE'
  ) THEN
    FOR r IN SELECT * FROM public.signature_envelopes LOOP
      v_new_envelope_id := gen_random_uuid();

      INSERT INTO commerce.signing_envelopes (
        id, lease_id, title, document_url, status,
        signed_document_url, created_by, expires_at, created_at, updated_at
      ) VALUES (
        v_new_envelope_id, r.lease_id, r.title, r.document_url,
        CASE WHEN r.status IN ('draft', 'pending', 'signed', 'declined', 'expired') THEN r.status ELSE 'draft' END,
        r.signed_document_url, r.user_id, r.expires_at, r.created_at, r.updated_at
      ) ON CONFLICT (id) DO NOTHING;

      IF r.parties IS NOT NULL AND jsonb_array_length(r.parties) > 0 THEN
        FOR party IN
          SELECT
            COALESCE(elem->>'name', 'Unknown') AS name,
            COALESCE(elem->>'email', '') AS email,
            CASE
              WHEN elem->>'role' IN ('landlord', 'tenant', 'witness', 'notary') THEN elem->>'role'
              ELSE 'tenant'
            END AS role,
            CASE
              WHEN elem->>'status' IN ('draft', 'pending', 'signed', 'declined', 'expired') THEN elem->>'status'
              ELSE 'pending'
            END AS status,
            (elem->>'signedAt')::timestamptz AS signed_at,
            elem->>'signatureUrl' AS signature_url
          FROM jsonb_array_elements(r.parties) AS elem
        LOOP
          INSERT INTO commerce.signing_parties (
            envelope_id, name, email, role, status, signed_at, signature_url
          ) VALUES (
            v_new_envelope_id, party.name, party.email, party.role,
            party.status, party.signed_at, party.signature_url
          );
        END LOOP;
      END IF;
    END LOOP;

    DROP POLICY IF EXISTS "Authenticated can view signature envelopes" ON public.signature_envelopes;
    DROP POLICY IF EXISTS "Users can insert own signature envelopes" ON public.signature_envelopes;
    DROP POLICY IF EXISTS "Owner can update own signature envelopes" ON public.signature_envelopes;
    DROP TABLE public.signature_envelopes;

    RAISE NOTICE 'Migrated public.signature_envelopes → commerce.signing_envelopes (with parties) and dropped old table';
  END IF;
END $$;

-- Drop old RPCs that reference the now-gone public.signature_envelopes table
-- (will be recreated below against new schema)
DROP FUNCTION IF EXISTS public.sign_envelope_party(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.decline_envelope_party(TEXT, TEXT);

-- RLS for BNPL + e-signature tables (idempotent: only create if not exists)
ALTER TABLE commerce.bnpl_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce.bnpl_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce.signing_envelopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce.signing_parties ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'bnpl_plans_select_own' AND tablename = 'bnpl_plans' AND schemaname = 'commerce') THEN
    CREATE POLICY bnpl_plans_select_own ON commerce.bnpl_plans
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'bnpl_plans_insert_own' AND tablename = 'bnpl_plans' AND schemaname = 'commerce') THEN
    CREATE POLICY bnpl_plans_insert_own ON commerce.bnpl_plans
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'bnpl_plans_service' AND tablename = 'bnpl_plans' AND schemaname = 'commerce') THEN
    CREATE POLICY bnpl_plans_service ON commerce.bnpl_plans
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'bnpl_installments_select' AND tablename = 'bnpl_installments' AND schemaname = 'commerce') THEN
    CREATE POLICY bnpl_installments_select ON commerce.bnpl_installments
      FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM commerce.bnpl_plans bp WHERE bp.id = plan_id AND bp.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'bnpl_installments_service' AND tablename = 'bnpl_installments' AND schemaname = 'commerce') THEN
    CREATE POLICY bnpl_installments_service ON commerce.bnpl_installments
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'signing_envelopes_select' AND tablename = 'signing_envelopes' AND schemaname = 'commerce') THEN
    CREATE POLICY signing_envelopes_select ON commerce.signing_envelopes
      FOR SELECT TO authenticated
      USING (
        auth.uid() = created_by
        OR EXISTS (
          SELECT 1 FROM commerce.signing_parties sp
          WHERE sp.envelope_id = id AND sp.email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
          )
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'signing_envelopes_insert' AND tablename = 'signing_envelopes' AND schemaname = 'commerce') THEN
    CREATE POLICY signing_envelopes_insert ON commerce.signing_envelopes
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'signing_envelopes_update' AND tablename = 'signing_envelopes' AND schemaname = 'commerce') THEN
    CREATE POLICY signing_envelopes_update ON commerce.signing_envelopes
      FOR UPDATE TO authenticated USING (auth.uid() = created_by);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'signing_envelopes_service' AND tablename = 'signing_envelopes' AND schemaname = 'commerce') THEN
    CREATE POLICY signing_envelopes_service ON commerce.signing_envelopes
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'signing_parties_select' AND tablename = 'signing_parties' AND schemaname = 'commerce') THEN
    CREATE POLICY signing_parties_select ON commerce.signing_parties
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM commerce.signing_envelopes se
          WHERE se.id = envelope_id AND (
            se.created_by = auth.uid()
            OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
          )
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'signing_parties_update' AND tablename = 'signing_parties' AND schemaname = 'commerce') THEN
    CREATE POLICY signing_parties_update ON commerce.signing_parties
      FOR UPDATE TO authenticated
      USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'signing_parties_service' AND tablename = 'signing_parties' AND schemaname = 'commerce') THEN
    CREATE POLICY signing_parties_service ON commerce.signing_parties
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Public compat views for BNPL + e-signature
-- Only created after old tables have been dropped above.
-- Views include legacy column shapes so existing callers don't break:
-- - public.bnpl_plans includes 'installments' JSONB (aggregated from child table)
-- - public.signature_envelopes includes 'user_id' (alias for created_by) and 'parties' JSONB

CREATE OR REPLACE VIEW public.bnpl_plans AS
SELECT
  bp.id, bp.user_id, bp.order_id, bp.total_amount, bp.currency,
  bp.installment_count, bp.status, bp.merchant_name,
  bp.created_at, bp.updated_at,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
      'installment_number', bi.installment_number,
      'amount', bi.amount,
      'due_date', bi.due_date,
      'paid_at', bi.paid_at,
      'status', bi.status
    ) ORDER BY bi.installment_number)
    FROM commerce.bnpl_installments bi WHERE bi.plan_id = bp.id),
    '[]'::jsonb
  ) AS installments
FROM commerce.bnpl_plans bp;

CREATE OR REPLACE VIEW public.bnpl_installments AS SELECT * FROM commerce.bnpl_installments;

CREATE OR REPLACE VIEW public.signature_envelopes AS
SELECT
  se.id, se.lease_id, se.title, se.document_url, se.status,
  se.signed_document_url,
  se.created_by AS user_id,
  se.expires_at, se.created_at, se.updated_at,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
      'id', sp.id,
      'name', sp.name,
      'email', sp.email,
      'role', sp.role,
      'status', sp.status,
      'signedAt', sp.signed_at,
      'signatureUrl', sp.signature_url
    ) ORDER BY sp.created_at)
    FROM commerce.signing_parties sp WHERE sp.envelope_id = se.id),
    '[]'::jsonb
  ) AS parties
FROM commerce.signing_envelopes se;

CREATE OR REPLACE VIEW public.signing_envelopes AS SELECT * FROM commerce.signing_envelopes;
CREATE OR REPLACE VIEW public.signing_parties AS SELECT * FROM commerce.signing_parties;

DO $$
DECLARE
  pg_ver INT;
BEGIN
  pg_ver := current_setting('server_version_num')::INT;
  IF pg_ver >= 150000 THEN
    ALTER VIEW public.bnpl_plans SET (security_invoker = true);
    ALTER VIEW public.bnpl_installments SET (security_invoker = true);
    ALTER VIEW public.signature_envelopes SET (security_invoker = true);
    ALTER VIEW public.signing_envelopes SET (security_invoker = true);
    ALTER VIEW public.signing_parties SET (security_invoker = true);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'security_invoker skip: %', SQLERRM;
END $$;

-- INSTEAD OF triggers on legacy compat views so existing callers can still
-- INSERT/UPDATE with legacy column shapes (TEXT id, JSONB installments/parties, user_id).

-- ── public.bnpl_plans INSERT trigger ──
CREATE OR REPLACE FUNCTION public.trg_bnpl_plans_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, commerce AS $$
DECLARE
  v_new_id UUID;
  inst RECORD;
BEGIN
  IF NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Cannot create BNPL plan for another user';
  END IF;

  v_new_id := COALESCE(NEW.id::uuid, gen_random_uuid());

  INSERT INTO commerce.bnpl_plans (
    id, user_id, order_id, total_amount, currency, installment_count,
    status, merchant_name, created_at, updated_at
  ) VALUES (
    v_new_id, NEW.user_id, NEW.order_id, NEW.total_amount,
    COALESCE(NEW.currency, 'USD'),
    CASE WHEN NEW.installment_count IN (3, 4, 6) THEN NEW.installment_count ELSE 3 END,
    COALESCE(NEW.status, 'active'),
    NEW.merchant_name,
    COALESCE(NEW.created_at, now()),
    COALESCE(NEW.updated_at, now())
  );

  IF NEW.installments IS NOT NULL AND jsonb_array_length(NEW.installments) > 0 THEN
    FOR inst IN
      SELECT
        row_number() OVER () AS num,
        (elem->>'amount')::numeric(18,2) AS amount,
        COALESCE(
          (elem->>'dueDate')::timestamptz,
          (elem->>'due_date')::timestamptz,
          now() + (row_number() OVER () || ' months')::interval
        ) AS due_date,
        (elem->>'paidAt')::timestamptz AS paid_at,
        CASE
          WHEN elem->>'status' IN ('pending', 'paid', 'overdue') THEN elem->>'status'
          ELSE 'pending'
        END AS status
      FROM jsonb_array_elements(NEW.installments) AS elem
    LOOP
      INSERT INTO commerce.bnpl_installments (
        plan_id, installment_number, amount, due_date, paid_at, status
      ) VALUES (
        v_new_id, inst.num::int, inst.amount, inst.due_date, inst.paid_at, inst.status
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bnpl_plans_insert ON public.bnpl_plans;
CREATE TRIGGER trg_bnpl_plans_insert
  INSTEAD OF INSERT ON public.bnpl_plans
  FOR EACH ROW EXECUTE FUNCTION public.trg_bnpl_plans_insert();

-- ── public.bnpl_plans UPDATE trigger ──
CREATE OR REPLACE FUNCTION public.trg_bnpl_plans_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, commerce AS $$
DECLARE
  inst RECORD;
BEGIN
  IF OLD.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Cannot update another user''s BNPL plan';
  END IF;

  UPDATE commerce.bnpl_plans SET
    status = COALESCE(NEW.status, OLD.status),
    merchant_name = COALESCE(NEW.merchant_name, OLD.merchant_name),
    updated_at = COALESCE(NEW.updated_at, now())
  WHERE id = OLD.id::uuid;

  IF NEW.installments IS NOT NULL THEN
    DELETE FROM commerce.bnpl_installments WHERE plan_id = OLD.id::uuid;

    FOR inst IN
      SELECT
        row_number() OVER () AS num,
        (elem->>'amount')::numeric(18,2) AS amount,
        COALESCE(
          (elem->>'dueDate')::timestamptz,
          (elem->>'due_date')::timestamptz,
          now() + (row_number() OVER () || ' months')::interval
        ) AS due_date,
        (elem->>'paidAt')::timestamptz AS paid_at,
        CASE
          WHEN elem->>'status' IN ('pending', 'paid', 'overdue') THEN elem->>'status'
          ELSE 'pending'
        END AS status
      FROM jsonb_array_elements(NEW.installments) AS elem
    LOOP
      INSERT INTO commerce.bnpl_installments (
        plan_id, installment_number, amount, due_date, paid_at, status
      ) VALUES (
        OLD.id::uuid, inst.num::int, inst.amount, inst.due_date, inst.paid_at, inst.status
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bnpl_plans_update ON public.bnpl_plans;
CREATE TRIGGER trg_bnpl_plans_update
  INSTEAD OF UPDATE ON public.bnpl_plans
  FOR EACH ROW EXECUTE FUNCTION public.trg_bnpl_plans_update();

-- ── public.signature_envelopes INSERT trigger ──
CREATE OR REPLACE FUNCTION public.trg_signature_envelopes_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, commerce AS $$
DECLARE
  v_new_id UUID;
  party RECORD;
BEGIN
  IF NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Cannot create envelope for another user';
  END IF;

  v_new_id := COALESCE(NEW.id::uuid, gen_random_uuid());

  INSERT INTO commerce.signing_envelopes (
    id, lease_id, title, document_url, status,
    signed_document_url, created_by, expires_at, created_at, updated_at
  ) VALUES (
    v_new_id, NEW.lease_id, NEW.title, NEW.document_url,
    COALESCE(NEW.status, 'draft'),
    NEW.signed_document_url,
    NEW.user_id,
    NEW.expires_at,
    COALESCE(NEW.created_at, now()),
    COALESCE(NEW.updated_at, now())
  );

  IF NEW.parties IS NOT NULL AND jsonb_array_length(NEW.parties) > 0 THEN
    FOR party IN
      SELECT
        COALESCE(elem->>'name', 'Unknown') AS name,
        COALESCE(elem->>'email', '') AS email,
        CASE
          WHEN elem->>'role' IN ('landlord', 'tenant', 'witness', 'notary') THEN elem->>'role'
          ELSE 'tenant'
        END AS role,
        CASE
          WHEN elem->>'status' IN ('draft', 'pending', 'signed', 'declined', 'expired') THEN elem->>'status'
          ELSE 'pending'
        END AS status
      FROM jsonb_array_elements(NEW.parties) AS elem
    LOOP
      INSERT INTO commerce.signing_parties (
        envelope_id, name, email, role, status
      ) VALUES (
        v_new_id, party.name, party.email, party.role, party.status
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_signature_envelopes_insert ON public.signature_envelopes;
CREATE TRIGGER trg_signature_envelopes_insert
  INSTEAD OF INSERT ON public.signature_envelopes
  FOR EACH ROW EXECUTE FUNCTION public.trg_signature_envelopes_insert();

-- ── public.signature_envelopes UPDATE trigger ──
CREATE OR REPLACE FUNCTION public.trg_signature_envelopes_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, commerce AS $$
BEGIN
  IF OLD.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Cannot update another user''s envelope';
  END IF;

  UPDATE commerce.signing_envelopes SET
    status = COALESCE(NEW.status, OLD.status),
    signed_document_url = COALESCE(NEW.signed_document_url, OLD.signed_document_url),
    updated_at = COALESCE(NEW.updated_at, now())
  WHERE id = OLD.id::uuid;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_signature_envelopes_update ON public.signature_envelopes;
CREATE TRIGGER trg_signature_envelopes_update
  INSTEAD OF UPDATE ON public.signature_envelopes
  FOR EACH ROW EXECUTE FUNCTION public.trg_signature_envelopes_update();

-- Recreate RPCs against new commerce schema tables
-- These provide the same interface as the old RPCs from migration 20260416120000
CREATE OR REPLACE FUNCTION public.sign_envelope_party(
  p_envelope_id TEXT,
  p_party_id TEXT,
  p_signature_url TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commerce
AS $$
DECLARE
  v_envelope RECORD;
  v_party RECORD;
  v_caller_email TEXT;
  v_all_signed BOOLEAN;
BEGIN
  v_caller_email := lower(auth.jwt()->>'email');
  IF v_caller_email IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_envelope FROM commerce.signing_envelopes WHERE id = p_envelope_id::uuid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Envelope not found');
  END IF;

  SELECT * INTO v_party FROM commerce.signing_parties
  WHERE id = p_party_id::uuid AND envelope_id = v_envelope.id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Party not found');
  END IF;

  IF lower(v_party.email) <> v_caller_email THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized for this party');
  END IF;

  IF v_party.status = 'signed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Already signed');
  END IF;

  UPDATE commerce.signing_parties
  SET status = 'signed', signed_at = now(), signature_url = p_signature_url
  WHERE id = v_party.id;

  SELECT NOT EXISTS (
    SELECT 1 FROM commerce.signing_parties
    WHERE envelope_id = v_envelope.id AND status <> 'signed'
  ) INTO v_all_signed;

  IF v_all_signed THEN
    UPDATE commerce.signing_envelopes
    SET status = 'signed', signed_document_url = v_envelope.document_url, updated_at = now()
    WHERE id = v_envelope.id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_envelope_party(
  p_envelope_id TEXT,
  p_party_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, commerce
AS $$
DECLARE
  v_envelope RECORD;
  v_party RECORD;
  v_caller_email TEXT;
BEGIN
  v_caller_email := lower(auth.jwt()->>'email');
  IF v_caller_email IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_envelope FROM commerce.signing_envelopes WHERE id = p_envelope_id::uuid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Envelope not found');
  END IF;

  SELECT * INTO v_party FROM commerce.signing_parties
  WHERE id = p_party_id::uuid AND envelope_id = v_envelope.id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Party not found');
  END IF;

  IF lower(v_party.email) <> v_caller_email THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized for this party');
  END IF;

  UPDATE commerce.signing_parties
  SET status = 'declined'
  WHERE id = v_party.id;

  UPDATE commerce.signing_envelopes
  SET status = 'declined', updated_at = now()
  WHERE id = v_envelope.id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sign_envelope_party(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_envelope_party(TEXT, TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3 — Create micro-insurance tables in wallet schema
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wallet.insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL,
  insurance_type TEXT NOT NULL
    CHECK (insurance_type IN ('package_protection', 'trip_protection')),
  premium NUMERIC(18,2) NOT NULL,
  coverage_amount NUMERIC(18,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'claimed', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallet.insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES wallet.insurance_policies(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(18,2),
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'reviewing', 'approved', 'denied')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_insurance_policies_user ON wallet.insurance_policies(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_status ON wallet.insurance_policies(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_insurance_claims_policy ON wallet.insurance_claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status ON wallet.insurance_claims(status);

ALTER TABLE wallet.insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet.insurance_claims ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'insurance_policies_select_own' AND tablename = 'insurance_policies' AND schemaname = 'wallet') THEN
    CREATE POLICY insurance_policies_select_own ON wallet.insurance_policies
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'insurance_policies_insert_own' AND tablename = 'insurance_policies' AND schemaname = 'wallet') THEN
    CREATE POLICY insurance_policies_insert_own ON wallet.insurance_policies
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'insurance_policies_service' AND tablename = 'insurance_policies' AND schemaname = 'wallet') THEN
    CREATE POLICY insurance_policies_service ON wallet.insurance_policies
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'insurance_claims_select' AND tablename = 'insurance_claims' AND schemaname = 'wallet') THEN
    CREATE POLICY insurance_claims_select ON wallet.insurance_claims
      FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM wallet.insurance_policies ip WHERE ip.id = policy_id AND ip.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'insurance_claims_insert' AND tablename = 'insurance_claims' AND schemaname = 'wallet') THEN
    CREATE POLICY insurance_claims_insert ON wallet.insurance_claims
      FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM wallet.insurance_policies ip WHERE ip.id = policy_id AND ip.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'insurance_claims_service' AND tablename = 'insurance_claims' AND schemaname = 'wallet') THEN
    CREATE POLICY insurance_claims_service ON wallet.insurance_claims
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE OR REPLACE VIEW public.insurance_policies AS SELECT * FROM wallet.insurance_policies;
CREATE OR REPLACE VIEW public.insurance_claims AS SELECT * FROM wallet.insurance_claims;

DO $$
DECLARE
  pg_ver INT;
BEGIN
  pg_ver := current_setting('server_version_num')::INT;
  IF pg_ver >= 150000 THEN
    ALTER VIEW public.insurance_policies SET (security_invoker = true);
    ALTER VIEW public.insurance_claims SET (security_invoker = true);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'security_invoker skip: %', SQLERRM;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4 — (listing_type normalization moved to Section 1c above)
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5 — Retroactive text normalization
-- Trim whitespace and normalize casing on key text fields
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  norm_targets TEXT[][] := ARRAY[
    ARRAY['identity', 'profiles', 'name'],
    ARRAY['identity', 'profiles', 'email'],
    ARRAY['identity', 'organizations', 'legal_name'],
    ARRAY['identity', 'organizations', 'display_name'],
    ARRAY['identity', 'providers', 'display_name'],
    ARRAY['identity', 'providers', 'city'],
    ARRAY['identity', 'providers', 'country'],
    ARRAY['marketplace', 'listings', 'title'],
    ARRAY['marketplace', 'categories', 'name'],
    ARRAY['commerce', 'bookings', 'notes'],
    ARRAY['support', 'support_tickets', 'subject'],
    ARRAY['support', 'support_tickets', 'description']
  ];
  t TEXT[];
BEGIN
  FOREACH t SLICE 1 IN ARRAY norm_targets LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = t[1] AND table_name = t[2] AND column_name = t[3]
    ) THEN
      EXECUTE format(
        'UPDATE %I.%I SET %I = BTRIM(%I) WHERE %I IS NOT NULL AND %I != BTRIM(%I)',
        t[1], t[2], t[3], t[3], t[3], t[3], t[3]
      );
      RAISE NOTICE 'Trimmed %.%.%', t[1], t[2], t[3];
    END IF;
  END LOOP;
END $$;

-- Normalize email to lowercase across key tables
DO $$
DECLARE
  email_targets TEXT[][] := ARRAY[
    ARRAY['identity', 'profiles', 'email'],
    ARRAY['identity', 'providers', 'email']
  ];
  t TEXT[];
BEGIN
  FOREACH t SLICE 1 IN ARRAY email_targets LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = t[1] AND table_name = t[2] AND column_name = t[3]
    ) THEN
      EXECUTE format(
        'UPDATE %I.%I SET %I = LOWER(%I) WHERE %I IS NOT NULL AND %I != LOWER(%I)',
        t[1], t[2], t[3], t[3], t[3], t[3], t[3]
      );
      RAISE NOTICE 'Lowercased %.%.%', t[1], t[2], t[3];
    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 6 — Referral codes + redemptions tables + unique constraint
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_amount NUMERIC(18,2) NOT NULL DEFAULT 10,
  reward_currency TEXT NOT NULL DEFAULT 'AED',
  max_uses INTEGER,
  use_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.referral_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code_id UUID REFERENCES public.referral_codes(id) ON DELETE SET NULL,
  reward_amount NUMERIC(18,2) NOT NULL,
  reward_currency TEXT NOT NULL DEFAULT 'AED',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'credited', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_owner ON public.referral_codes(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_active ON public.referral_codes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_referral_redemptions_referred ON public.referral_redemptions(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_redemptions_referrer ON public.referral_redemptions(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_redemptions_status ON public.referral_redemptions(status);

-- Unique constraint: prevent duplicate credit per user + referral code
-- Uses referral_code_id (FK) not the text code column, so constraint is
-- correctly scoped to normalized code identity. NULLS NOT DISTINCT ensures
-- a user can only have one redemption with NULL referral_code_id.
DO $$
DECLARE
  pg_ver INT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'uq_referral_redemptions_user_code'
  ) THEN
    DROP INDEX public.uq_referral_redemptions_user_code;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'uq_referral_redemptions_user_code_id'
  ) THEN
    DROP INDEX public.uq_referral_redemptions_user_code_id;
  END IF;

  pg_ver := current_setting('server_version_num')::INT;
  IF pg_ver >= 150000 THEN
    CREATE UNIQUE INDEX uq_referral_redemptions_user_code_id
      ON public.referral_redemptions(referred_user_id, referral_code_id)
      NULLS NOT DISTINCT;
  ELSE
    CREATE UNIQUE INDEX uq_referral_redemptions_user_code_id
      ON public.referral_redemptions(referred_user_id, COALESCE(referral_code_id, '00000000-0000-0000-0000-000000000000'::uuid));
  END IF;
END $$;

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_redemptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'referral_codes_select' AND tablename = 'referral_codes'
  ) THEN
    CREATE POLICY referral_codes_select ON public.referral_codes
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'referral_codes_insert_own' AND tablename = 'referral_codes'
  ) THEN
    CREATE POLICY referral_codes_insert_own ON public.referral_codes
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'referral_codes_service' AND tablename = 'referral_codes'
  ) THEN
    CREATE POLICY referral_codes_service ON public.referral_codes
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'referral_redemptions_select' AND tablename = 'referral_redemptions'
  ) THEN
    CREATE POLICY referral_redemptions_select ON public.referral_redemptions
      FOR SELECT TO authenticated
      USING (auth.uid() = referred_user_id OR auth.uid() = referrer_user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'referral_redemptions_insert' AND tablename = 'referral_redemptions'
  ) THEN
    CREATE POLICY referral_redemptions_insert ON public.referral_redemptions
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = referred_user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'referral_redemptions_service' AND tablename = 'referral_redemptions'
  ) THEN
    CREATE POLICY referral_redemptions_service ON public.referral_redemptions
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 7 — Drop unused browser telemetry tables
-- These tables are superseded by structured analytics + sentinel systems
-- ─────────────────────────────────────────────────────────────────────────────

-- Dependency audit: these tables have no FK references from other tables,
-- no views depend on them, and no functions reference them.
-- Only RLS policies (dropped with the table) and indexes exist on them.
DROP TABLE IF EXISTS public.browser_front_incidents;
DROP TABLE IF EXISTS public.browser_telemetry_events;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 8 — Dedicated fleet_metrics + delivery_stats tables
-- Replace derived calculations with persistent analytics tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics.fleet_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  city TEXT,
  country_code TEXT NOT NULL DEFAULT 'AE',
  total_drivers INTEGER NOT NULL DEFAULT 0,
  active_drivers INTEGER NOT NULL DEFAULT 0,
  online_drivers INTEGER NOT NULL DEFAULT 0,
  total_deliveries INTEGER NOT NULL DEFAULT 0,
  completed_deliveries INTEGER NOT NULL DEFAULT 0,
  cancelled_deliveries INTEGER NOT NULL DEFAULT 0,
  avg_delivery_time_min NUMERIC(10,2),
  avg_distance_km NUMERIC(10,2),
  avg_rating NUMERIC(3,2),
  total_revenue NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_driver_payout NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'AED',
  peak_hour_start INTEGER,
  peak_hour_end INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(snapshot_date, city, country_code)
);

CREATE TABLE IF NOT EXISTS analytics.delivery_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL,
  driver_id UUID NOT NULL,
  order_id UUID NOT NULL,
  merchant_id UUID,
  city TEXT,
  country_code TEXT NOT NULL DEFAULT 'AE',
  distance_km NUMERIC(10,2),
  duration_min NUMERIC(10,2),
  pickup_wait_min NUMERIC(10,2),
  delivery_fee NUMERIC(18,2),
  tip_amount NUMERIC(18,2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'AED',
  driver_rating NUMERIC(3,1),
  customer_rating NUMERIC(3,1),
  status TEXT NOT NULL
    CHECK (status IN ('completed', 'cancelled', 'returned', 'failed')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fleet_metrics_date ON analytics.fleet_metrics(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_fleet_metrics_city ON analytics.fleet_metrics(city, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_stats_driver ON analytics.delivery_stats(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_stats_city ON analytics.delivery_stats(city, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_stats_order ON analytics.delivery_stats(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_stats_status ON analytics.delivery_stats(status, created_at DESC);

ALTER TABLE analytics.fleet_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.delivery_stats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'fleet_metrics_select' AND tablename = 'fleet_metrics' AND schemaname = 'analytics') THEN
    CREATE POLICY fleet_metrics_select ON analytics.fleet_metrics
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'fleet_metrics_service' AND tablename = 'fleet_metrics' AND schemaname = 'analytics') THEN
    CREATE POLICY fleet_metrics_service ON analytics.fleet_metrics
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'delivery_stats_select' AND tablename = 'delivery_stats' AND schemaname = 'analytics') THEN
    CREATE POLICY delivery_stats_select ON analytics.delivery_stats
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'delivery_stats_service' AND tablename = 'delivery_stats' AND schemaname = 'analytics') THEN
    CREATE POLICY delivery_stats_service ON analytics.delivery_stats
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE OR REPLACE VIEW public.fleet_metrics AS SELECT * FROM analytics.fleet_metrics;
CREATE OR REPLACE VIEW public.delivery_stats AS SELECT * FROM analytics.delivery_stats;

DO $$
DECLARE
  pg_ver INT;
BEGIN
  pg_ver := current_setting('server_version_num')::INT;
  IF pg_ver >= 150000 THEN
    ALTER VIEW public.fleet_metrics SET (security_invoker = true);
    ALTER VIEW public.delivery_stats SET (security_invoker = true);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'security_invoker skip: %', SQLERRM;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 9 — Verify and refresh public-schema compatibility views
-- Recreate any stale views pointing to domain tables
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  compat_views TEXT[][] := ARRAY[
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
  view_def TEXT;
  expected_target TEXT;
BEGIN
  FOREACH v SLICE 1 IN ARRAY compat_views LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = v[1] AND tablename = v[2]
    ) THEN
      SELECT definition INTO view_def
        FROM pg_views WHERE schemaname = 'public' AND viewname = v[2];

      expected_target := v[1] || '.' || v[2];

      IF view_def IS NULL THEN
        EXECUTE format(
          'CREATE OR REPLACE VIEW public.%I AS SELECT * FROM %I.%I',
          v[2], v[1], v[2]
        );
        RAISE NOTICE 'Created missing compat view: public.% → %.%', v[2], v[1], v[2];
      ELSIF view_def NOT LIKE '%' || expected_target || '%' THEN
        EXECUTE format(
          'CREATE OR REPLACE VIEW public.%I AS SELECT * FROM %I.%I',
          v[2], v[1], v[2]
        );
        RAISE NOTICE 'Refreshed stale compat view: public.% → %.%', v[2], v[1], v[2];
      ELSE
        RAISE NOTICE 'Compat view OK: public.% → %.%', v[2], v[1], v[2];
      END IF;
    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 10 — Grant permissions on new tables
-- ─────────────────────────────────────────────────────────────────────────────

-- Least-privilege grants — only new tables created by this migration.
-- RLS on the commerce/wallet tables is the primary access control; these grants
-- just allow the roles to reach the tables (RLS filters what they can see/do).

GRANT SELECT, INSERT, UPDATE ON commerce.bnpl_plans TO authenticated;
GRANT SELECT ON commerce.bnpl_installments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON commerce.signing_envelopes TO authenticated;
GRANT SELECT, UPDATE ON commerce.signing_parties TO authenticated;
GRANT ALL ON commerce.bnpl_plans, commerce.bnpl_installments,
  commerce.signing_envelopes, commerce.signing_parties TO service_role;

GRANT SELECT, INSERT ON wallet.insurance_policies TO authenticated;
GRANT SELECT, INSERT ON wallet.insurance_claims TO authenticated;
GRANT ALL ON wallet.insurance_policies, wallet.insurance_claims TO service_role;

GRANT SELECT ON analytics.fleet_metrics TO authenticated;
GRANT SELECT ON analytics.delivery_stats TO authenticated;
GRANT ALL ON analytics.fleet_metrics, analytics.delivery_stats TO service_role;

-- Compat views: read-only for anon, read+write for authenticated (triggers enforce ownership)
GRANT SELECT ON public.bnpl_plans TO anon;
GRANT SELECT, INSERT, UPDATE ON public.bnpl_plans TO authenticated;
GRANT SELECT ON public.bnpl_installments TO anon;
GRANT SELECT ON public.bnpl_installments TO authenticated;
GRANT SELECT ON public.signature_envelopes TO anon;
GRANT SELECT, INSERT, UPDATE ON public.signature_envelopes TO authenticated;
GRANT SELECT ON public.signing_envelopes TO anon;
GRANT SELECT ON public.signing_envelopes TO authenticated;
GRANT SELECT ON public.signing_parties TO anon;
GRANT SELECT ON public.signing_parties TO authenticated;
GRANT SELECT ON public.insurance_policies TO anon;
GRANT SELECT ON public.insurance_policies TO authenticated;
GRANT SELECT ON public.insurance_claims TO anon;
GRANT SELECT ON public.insurance_claims TO authenticated;
GRANT SELECT ON public.fleet_metrics TO anon;
GRANT SELECT ON public.fleet_metrics TO authenticated;
GRANT SELECT ON public.delivery_stats TO anon;
GRANT SELECT ON public.delivery_stats TO authenticated;
GRANT ALL ON public.bnpl_plans, public.bnpl_installments, public.signature_envelopes,
  public.signing_envelopes, public.signing_parties, public.insurance_policies,
  public.insurance_claims, public.fleet_metrics, public.delivery_stats TO service_role;

COMMIT;
