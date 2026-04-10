
-- =============================================
-- PHASE 1: Enhanced Data Models for Global SaaS
-- =============================================

-- 1. Enrich profiles with currency & language
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- 2. Owner Profiles table
CREATE TABLE public.owner_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  person_type text NOT NULL DEFAULT 'individual', -- individual | company
  full_name text NOT NULL DEFAULT '',
  company_name text,
  address text DEFAULT '',
  postal_code text DEFAULT '',
  city text DEFAULT '',
  country text DEFAULT 'FR',
  phone text DEFAULT '',
  email text DEFAULT '',
  tax_id text, -- SIRET, NIF, etc.
  bank_iban text,
  bank_bic text,
  bank_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.owner_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own owner profile" ON public.owner_profiles
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own owner profile" ON public.owner_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own owner profile" ON public.owner_profiles
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own owner profile" ON public.owner_profiles
  FOR DELETE USING (user_id = auth.uid());

CREATE TRIGGER update_owner_profiles_updated_at
  BEFORE UPDATE ON public.owner_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. Add rental_mode to properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS rental_mode text DEFAULT 'long_term'; -- long_term | short_term | mixed

-- 4. Leases table (proper lifecycle)
CREATE TABLE public.leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  owner_profile_id uuid REFERENCES public.owner_profiles(id),
  lease_type text NOT NULL DEFAULT 'empty', -- empty | furnished | student | commercial | seasonal
  start_date date NOT NULL,
  end_date date,
  duration_months integer,
  rent_amount numeric NOT NULL DEFAULT 0,
  charges_amount numeric NOT NULL DEFAULT 0,
  deposit_amount numeric NOT NULL DEFAULT 0,
  payment_day integer DEFAULT 1,
  notice_period_months integer DEFAULT 3,
  country text NOT NULL DEFAULT 'FR',
  status text NOT NULL DEFAULT 'draft', -- draft | signed | active | ended | terminated
  signed_at timestamptz,
  signed_by_owner boolean DEFAULT false,
  signed_by_tenant boolean DEFAULT false,
  pdf_url text,
  annexes_json jsonb DEFAULT '[]'::jsonb,
  clauses_json jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read leases" ON public.leases
  FOR SELECT USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can insert leases" ON public.leases
  FOR INSERT WITH CHECK (is_org_member(auth.uid(), org_id) AND user_id = auth.uid());
CREATE POLICY "Org members can update leases" ON public.leases
  FOR UPDATE USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can delete leases" ON public.leases
  FOR DELETE USING (user_id = auth.uid() AND is_org_member(auth.uid(), org_id));

CREATE TRIGGER update_leases_updated_at
  BEFORE UPDATE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 5. OTA Connections table
CREATE TABLE public.ota_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  provider text NOT NULL, -- airbnb | booking
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  external_user_id text,
  status text NOT NULL DEFAULT 'pending', -- pending | connected | disconnected | error
  linked_properties jsonb DEFAULT '[]'::jsonb,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ota_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read ota" ON public.ota_connections
  FOR SELECT USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can insert ota" ON public.ota_connections
  FOR INSERT WITH CHECK (is_org_member(auth.uid(), org_id) AND user_id = auth.uid());
CREATE POLICY "Org members can update ota" ON public.ota_connections
  FOR UPDATE USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can delete ota" ON public.ota_connections
  FOR DELETE USING (user_id = auth.uid() AND is_org_member(auth.uid(), org_id));

CREATE TRIGGER update_ota_connections_updated_at
  BEFORE UPDATE ON public.ota_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 6. Reservations table (enhanced)
CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  ota_connection_id uuid REFERENCES public.ota_connections(id),
  ota_provider text, -- airbnb | booking | direct
  ota_listing_id text,
  ota_reservation_id text,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  guest_email text,
  guest_phone text,
  check_in date NOT NULL,
  check_out date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  cleaning_fee numeric DEFAULT 0,
  platform_fee numeric DEFAULT 0,
  currency text DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'confirmed', -- pending | confirmed | cancelled | completed
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read reservations" ON public.reservations
  FOR SELECT USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can insert reservations" ON public.reservations
  FOR INSERT WITH CHECK (is_org_member(auth.uid(), org_id) AND user_id = auth.uid());
CREATE POLICY "Org members can update reservations" ON public.reservations
  FOR UPDATE USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can delete reservations" ON public.reservations
  FOR DELETE USING (user_id = auth.uid() AND is_org_member(auth.uid(), org_id));

CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 7. Enrich tenants with co-tenants and ID docs
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS co_tenants_json jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS id_document_urls jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS current_address text DEFAULT '';

-- 8. Enrich documents with hash and QR verification
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS doc_hash text,
  ADD COLUMN IF NOT EXISTS qr_verification_url text,
  ADD COLUMN IF NOT EXISTS sent_to_emails jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS lease_id uuid REFERENCES public.leases(id);

-- 9. Add onboarding_step to profiles for wizard progress
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 0;
