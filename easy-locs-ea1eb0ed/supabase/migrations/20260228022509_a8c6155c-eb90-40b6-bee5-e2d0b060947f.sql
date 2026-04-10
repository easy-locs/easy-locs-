
CREATE TABLE public.interventions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id),
  user_id UUID NOT NULL,
  property_id UUID REFERENCES public.properties(id),
  tenant_id UUID REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'repair',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_date DATE,
  completed_date DATE,
  provider_name TEXT DEFAULT '',
  provider_phone TEXT DEFAULT '',
  estimated_cost NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read interventions" ON public.interventions FOR SELECT USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can insert interventions" ON public.interventions FOR INSERT WITH CHECK (is_org_member(auth.uid(), org_id) AND user_id = auth.uid());
CREATE POLICY "Org members can update interventions" ON public.interventions FOR UPDATE USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can delete interventions" ON public.interventions FOR DELETE USING (is_org_member(auth.uid(), org_id));

CREATE TRIGGER update_interventions_updated_at BEFORE UPDATE ON public.interventions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
