
-- 1. Enable RLS on seed_merchant_promos
ALTER TABLE public.seed_merchant_promos ENABLE ROW LEVEL SECURITY;

-- 2. Public read for active promos (anon + authenticated)
CREATE POLICY "anyone_read_active_promos"
  ON public.seed_merchant_promos
  FOR SELECT
  USING (is_active = true);

-- 3. Only org owners/admins can manage promos
CREATE POLICY "org_admin_manage_promos"
  ON public.seed_merchant_promos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_members.user_id = auth.uid()
        AND org_members.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_members.user_id = auth.uid()
        AND org_members.role IN ('owner', 'admin')
    )
  );
