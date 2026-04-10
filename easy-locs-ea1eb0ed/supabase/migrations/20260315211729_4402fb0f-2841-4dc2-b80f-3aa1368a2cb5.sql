ALTER TABLE public.service_providers ADD COLUMN IF NOT EXISTS created_by_org_id uuid REFERENCES public.orgs(id);

DROP POLICY IF EXISTS "Admins can manage service_providers" ON public.service_providers;
DROP POLICY IF EXISTS "Org members can view active providers" ON public.service_providers;

CREATE POLICY "Org admins can manage service_providers" ON public.service_providers FOR ALL TO authenticated USING (public.has_min_role(auth.uid(), created_by_org_id, 'admin')) WITH CHECK (public.has_min_role(auth.uid(), created_by_org_id, 'admin'));
CREATE POLICY "Anyone can view active providers" ON public.service_providers FOR SELECT TO authenticated USING (active = true OR public.is_org_member(auth.uid(), created_by_org_id));