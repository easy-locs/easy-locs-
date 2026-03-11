-- Fix 1: contact_clicks INSERT — restrict to non-empty required fields instead of WITH CHECK (true)
DROP POLICY IF EXISTS "Anyone can insert contact clicks" ON public.contact_clicks;
CREATE POLICY "Anyone can insert contact clicks"
  ON public.contact_clicks FOR INSERT
  WITH CHECK (channel IS NOT NULL AND channel <> '');

-- Fix 2: Tighten financial tables — only accountant+ can write
-- expenses: restrict INSERT/UPDATE/DELETE to accountant+
DROP POLICY IF EXISTS "Org members can insert expenses" ON public.expenses;
CREATE POLICY "Accountant+ can insert expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (has_min_role(auth.uid(), org_id, 'accountant') AND user_id = auth.uid());

DROP POLICY IF EXISTS "Owner can update expenses" ON public.expenses;
CREATE POLICY "Accountant+ can update expenses"
  ON public.expenses FOR UPDATE
  USING (has_min_role(auth.uid(), org_id, 'accountant'));

DROP POLICY IF EXISTS "Owner can delete expenses" ON public.expenses;
CREATE POLICY "Accountant+ can delete expenses"
  ON public.expenses FOR DELETE
  USING (has_min_role(auth.uid(), org_id, 'accountant'));

-- Fix 3: documents — only agent+ can write
DROP POLICY IF EXISTS "Org members can create docs" ON public.documents;
CREATE POLICY "Agent+ can create docs"
  ON public.documents FOR INSERT
  WITH CHECK (has_min_role(auth.uid(), org_id, 'agent') AND user_id = auth.uid());

DROP POLICY IF EXISTS "Doc owner can update" ON public.documents;
CREATE POLICY "Agent+ can update docs"
  ON public.documents FOR UPDATE
  USING (has_min_role(auth.uid(), org_id, 'agent'));

DROP POLICY IF EXISTS "Doc owner can delete" ON public.documents;
CREATE POLICY "Agent+ can delete docs"
  ON public.documents FOR DELETE
  USING (has_min_role(auth.uid(), org_id, 'admin'));

-- Fix 4: properties — only agent+ can write, admin+ can delete
DROP POLICY IF EXISTS "Org members can insert properties" ON public.properties;
CREATE POLICY "Agent+ can insert properties"
  ON public.properties FOR INSERT
  WITH CHECK (has_min_role(auth.uid(), org_id, 'agent') AND user_id = auth.uid());

DROP POLICY IF EXISTS "Owner can update properties" ON public.properties;
CREATE POLICY "Agent+ can update properties"
  ON public.properties FOR UPDATE
  USING (has_min_role(auth.uid(), org_id, 'agent'));

DROP POLICY IF EXISTS "Owner can delete properties" ON public.properties;
CREATE POLICY "Admin+ can delete properties"
  ON public.properties FOR DELETE
  USING (has_min_role(auth.uid(), org_id, 'admin'));

-- Fix 5: tenants — only agent+ can write
DROP POLICY IF EXISTS "Org members can insert tenants" ON public.tenants;
CREATE POLICY "Agent+ can insert tenants"
  ON public.tenants FOR INSERT
  WITH CHECK (has_min_role(auth.uid(), org_id, 'agent') AND user_id = auth.uid());

DROP POLICY IF EXISTS "Owner can update tenants" ON public.tenants;
CREATE POLICY "Agent+ can update tenants"
  ON public.tenants FOR UPDATE
  USING (has_min_role(auth.uid(), org_id, 'agent'));

DROP POLICY IF EXISTS "Owner can delete tenants" ON public.tenants;
CREATE POLICY "Admin+ can delete tenants"
  ON public.tenants FOR DELETE
  USING (has_min_role(auth.uid(), org_id, 'admin'));

-- Fix 6: leases — only agent+ can write
DROP POLICY IF EXISTS "Org members can insert leases" ON public.leases;
CREATE POLICY "Agent+ can insert leases"
  ON public.leases FOR INSERT
  WITH CHECK (has_min_role(auth.uid(), org_id, 'agent') AND user_id = auth.uid());

DROP POLICY IF EXISTS "Org members can update leases" ON public.leases;
CREATE POLICY "Agent+ can update leases"
  ON public.leases FOR UPDATE
  USING (has_min_role(auth.uid(), org_id, 'agent'));

DROP POLICY IF EXISTS "Org members can delete leases" ON public.leases;
CREATE POLICY "Admin+ can delete leases"
  ON public.leases FOR DELETE
  USING (has_min_role(auth.uid(), org_id, 'admin'));

-- Fix 7: interventions — staff+ can write (they handle maintenance)
DROP POLICY IF EXISTS "Org members can insert interventions" ON public.interventions;
CREATE POLICY "Staff+ can insert interventions"
  ON public.interventions FOR INSERT
  WITH CHECK (has_min_role(auth.uid(), org_id, 'staff') AND user_id = auth.uid());

DROP POLICY IF EXISTS "Org members can update interventions" ON public.interventions;
CREATE POLICY "Staff+ can update interventions"
  ON public.interventions FOR UPDATE
  USING (has_min_role(auth.uid(), org_id, 'staff'));

DROP POLICY IF EXISTS "Org members can delete interventions" ON public.interventions;
CREATE POLICY "Agent+ can delete interventions"
  ON public.interventions FOR DELETE
  USING (has_min_role(auth.uid(), org_id, 'agent'));

-- Fix 8: rent_calls — accountant+ can write
DROP POLICY IF EXISTS "Org members can insert rent calls" ON public.rent_calls;
CREATE POLICY "Accountant+ can insert rent calls"
  ON public.rent_calls FOR INSERT
  WITH CHECK (has_min_role(auth.uid(), org_id, 'accountant'));

DROP POLICY IF EXISTS "Org members can update rent calls" ON public.rent_calls;
CREATE POLICY "Accountant+ can update rent calls"
  ON public.rent_calls FOR UPDATE
  USING (has_min_role(auth.uid(), org_id, 'accountant'));

DROP POLICY IF EXISTS "Org members can delete rent calls" ON public.rent_calls;
CREATE POLICY "Accountant+ can delete rent calls"
  ON public.rent_calls FOR DELETE
  USING (has_min_role(auth.uid(), org_id, 'accountant'));