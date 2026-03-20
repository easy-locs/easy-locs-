-- ============================================================
-- ENABLE RLS + POLICIES ON CRITICAL TABLES (PART 2 - CORRECTED)
-- Tables already RLS-enabled by failed migration: call_sessions, call_signals, call_logs, bookings_v2, leases
-- ============================================================

-- Leases policies (RLS already enabled)
CREATE POLICY "Org members read leases"
  ON public.leases FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = leases.org_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members insert leases"
  ON public.leases FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = leases.org_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members update leases"
  ON public.leases FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = leases.org_id AND om.user_id = auth.uid()
    )
  );

-- RENT_CALLS — org member only (no user_id on this table)
ALTER TABLE public.rent_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read rent calls"
  ON public.rent_calls FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = rent_calls.org_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members insert rent calls"
  ON public.rent_calls FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = rent_calls.org_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members update rent calls"
  ON public.rent_calls FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = rent_calls.org_id AND om.user_id = auth.uid()
    )
  );

-- TENANTS — org member or tenant user
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read tenants"
  ON public.tenants FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR tenant_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = tenants.org_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members insert tenants"
  ON public.tenants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = tenants.org_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members update tenants"
  ON public.tenants FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = tenants.org_id AND om.user_id = auth.uid()
    )
  );

-- PROPERTY_DOCUMENTS — org member or doc owner
ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read property docs"
  ON public.property_documents FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = property_documents.org_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members insert property docs"
  ON public.property_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = property_documents.org_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members update property docs"
  ON public.property_documents FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = property_documents.org_id AND om.user_id = auth.uid()
    )
  );
