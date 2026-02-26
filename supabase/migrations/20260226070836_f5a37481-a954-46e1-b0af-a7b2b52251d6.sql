
-- Table immeubles/lots
CREATE TABLE public.buildings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  postal_code TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  building_type TEXT NOT NULL DEFAULT 'immeuble',
  total_units INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read buildings"
  ON public.buildings FOR SELECT
  USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can insert buildings"
  ON public.buildings FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), org_id) AND user_id = auth.uid());

CREATE POLICY "Owner can update buildings"
  ON public.buildings FOR UPDATE
  USING (user_id = auth.uid() AND is_org_member(auth.uid(), org_id));

CREATE POLICY "Owner can delete buildings"
  ON public.buildings FOR DELETE
  USING (user_id = auth.uid() AND is_org_member(auth.uid(), org_id));

-- Link properties to buildings (optional FK)
ALTER TABLE public.properties
  ADD COLUMN building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL;

-- Trigger updated_at
CREATE TRIGGER update_buildings_updated_at
  BEFORE UPDATE ON public.buildings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
