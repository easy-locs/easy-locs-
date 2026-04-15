-- Migration: Unified Providers table + KYC documents support
-- Task #139: Foundation — KYC End-to-End + Provider Unifié + Onboarding Tous Rôles

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
--  1. identity.providers — Unified provider model for all verticals
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS identity.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('restaurant','hotel','taxi_driver','delivery_driver','service_provider','commerce')),
  display_name TEXT NOT NULL,
  legal_name TEXT,
  business_registration TEXT,
  tax_id TEXT,
  kyc_level TEXT NOT NULL DEFAULT 'none' CHECK (kyc_level IN ('none','basic','standard','enhanced','full')),
  kyc_status TEXT NOT NULL DEFAULT 'not_started' CHECK (kyc_status IN ('not_started','documents_pending','under_review','verified','rejected','suspended')),
  onboarding_status TEXT NOT NULL DEFAULT 'not_started' CHECK (onboarding_status IN ('not_started','in_progress','completed','suspended')),
  onboarding_completed_at TIMESTAMPTZ,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  country TEXT,
  postal_code TEXT,
  lat NUMERIC,
  lng NUMERIC,
  coverage_radius_km INTEGER DEFAULT 10,
  operating_hours JSONB DEFAULT '{}',
  bank_iban TEXT,
  bank_name TEXT,
  bank_swift TEXT,
  bank_account_holder TEXT,
  commission_rate NUMERIC DEFAULT 0.15,
  payout_frequency TEXT DEFAULT 'weekly' CHECK (payout_frequency IN ('daily','weekly','biweekly','monthly')),
  rating_avg NUMERIC DEFAULT 5.0,
  rating_count INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  profile_photo_url TEXT,
  cover_photo_url TEXT,
  gallery_urls TEXT[] DEFAULT '{}',
  description TEXT,
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  suspension_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT providers_user_id_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_providers_type_active_city
  ON identity.providers (provider_type, is_active, city);

CREATE INDEX IF NOT EXISTS idx_providers_kyc_status
  ON identity.providers (kyc_status) WHERE kyc_status != 'verified';

CREATE INDEX IF NOT EXISTS idx_providers_onboarding
  ON identity.providers (onboarding_status) WHERE onboarding_status != 'completed';

-- ═══════════════════════════════════════════════════════════════════
--  2. identity.kyc_documents — Document tracking for KYC pipeline
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS identity.kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES identity.providers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'national_id','passport','driving_license','residence_permit',
    'trade_license','tax_certificate','bank_statement','utility_bill',
    'selfie','taxi_license','commercial_insurance','vehicle_registration',
    'criminal_record','professional_certificate'
  )),
  file_path TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')),
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kyc_documents_user
  ON identity.kyc_documents (user_id, status);

CREATE INDEX IF NOT EXISTS idx_kyc_documents_pending
  ON identity.kyc_documents (status, submitted_at)
  WHERE status = 'pending';

-- ═══════════════════════════════════════════════════════════════════
--  3. RLS Policies
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE identity.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.kyc_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY providers_select_authenticated
  ON identity.providers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY providers_insert_own
  ON identity.providers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY providers_update_own
  ON identity.providers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY providers_admin_all
  ON identity.providers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY providers_admin_authenticated
  ON identity.providers FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  );

CREATE POLICY kyc_docs_select_own
  ON identity.kyc_documents FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  );

CREATE POLICY kyc_docs_insert_own
  ON identity.kyc_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY kyc_docs_update_admin
  ON identity.kyc_documents FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  );

CREATE POLICY kyc_docs_admin_all
  ON identity.kyc_documents FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════
--  4. Public compat views (backward compatibility)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.providers
  WITH (security_invoker = true) AS
  SELECT * FROM identity.providers;

CREATE OR REPLACE VIEW public.providers_public AS
  SELECT id, user_id, provider_type, display_name, kyc_level, kyc_status,
    onboarding_status, city, country, lat, lng, coverage_radius_km,
    rating_avg, rating_count, total_orders, profile_photo_url,
    cover_photo_url, gallery_urls, description, tags, metadata,
    is_active, is_featured, created_at, updated_at
  FROM identity.providers
  WHERE is_active = true;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'kyc_documents'
    AND table_type = 'BASE TABLE'
  ) THEN
    ALTER TABLE public.kyc_documents RENAME TO kyc_documents_legacy;

    INSERT INTO identity.kyc_documents (user_id, document_type, file_path, file_name, status, rejection_reason, submitted_at, reviewed_at, created_at)
    SELECT
      user_id,
      doc_type,
      COALESCE(file_url, ''),
      doc_type || '_legacy',
      COALESCE(status, 'pending'),
      rejection_reason,
      COALESCE(uploaded_at, now()),
      reviewed_at,
      COALESCE(uploaded_at, now())
    FROM public.kyc_documents_legacy
    WHERE doc_type IN (
      'national_id','passport','driving_license','residence_permit',
      'trade_license','tax_certificate','bank_statement','utility_bill',
      'selfie','taxi_license','commercial_insurance','vehicle_registration',
      'criminal_record','professional_certificate'
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

CREATE OR REPLACE VIEW public.kyc_documents
  WITH (security_invoker = true) AS
  SELECT * FROM identity.kyc_documents;

-- ═══════════════════════════════════════════════════════════════════
--  5. Auto-update trigger for updated_at
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION identity.update_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_providers_updated_at
  BEFORE UPDATE ON identity.providers
  FOR EACH ROW
  EXECUTE FUNCTION identity.update_providers_updated_at();

-- ═══════════════════════════════════════════════════════════════════
--  6. Server-side KYC gate function (reusable guard)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION identity.require_kyc_level(
  p_user_id UUID,
  p_required_level TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_level TEXT;
  v_levels TEXT[] := ARRAY['none','basic','standard','enhanced','full'];
  v_current_idx INT;
  v_required_idx INT;
BEGIN
  SELECT kyc_level INTO v_current_level
  FROM identity.providers
  WHERE user_id = p_user_id;

  IF v_current_level IS NULL THEN
    v_current_level := 'none';
  END IF;

  v_current_idx := array_position(v_levels, v_current_level);
  v_required_idx := array_position(v_levels, p_required_level);

  IF v_current_idx IS NULL OR v_required_idx IS NULL THEN
    RETURN false;
  END IF;

  RETURN v_current_idx >= v_required_idx;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION identity.enforce_kyc_on_withdrawal()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.context_type = 'withdrawal' THEN
    IF NOT identity.require_kyc_level(NEW.sender_id, 'enhanced') THEN
      RAISE EXCEPTION 'KYC level "enhanced" required for withdrawals. Complete verification at /pro/compliance.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'unified_wallet_transactions'
  ) THEN
    DROP TRIGGER IF EXISTS trg_kyc_gate_withdrawal ON public.unified_wallet_transactions;
    CREATE TRIGGER trg_kyc_gate_withdrawal
      BEFORE INSERT ON public.unified_wallet_transactions
      FOR EACH ROW
      EXECUTE FUNCTION identity.enforce_kyc_on_withdrawal();
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
--  7. Storage buckets — separate KYC (private) from onboarding media (public)
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('kyc-documents', 'kyc-documents', false),
  ('onboarding-media', 'onboarding-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own KYC docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users read own KYC docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'owner')
    )
  );

CREATE POLICY "Admins manage KYC docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'owner')
    )
  );

CREATE POLICY "Users upload onboarding media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'onboarding-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Anyone can read onboarding media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'onboarding-media');

COMMIT;
