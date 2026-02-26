
-- Storage bucket for rental documents (inventory photos, tenant IDs)
INSERT INTO storage.buckets (id, name, public) VALUES ('rental-docs', 'rental-docs', false);

-- Storage policies
CREATE POLICY "Authenticated users can upload rental docs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'rental-docs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Org members can view rental docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'rental-docs' AND auth.uid() IS NOT NULL);

CREATE POLICY "File owners can delete rental docs"
ON storage.objects FOR DELETE
USING (bucket_id = 'rental-docs' AND auth.uid() IS NOT NULL);

-- ========== PROPERTIES TABLE ==========
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  label TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  postal_code TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  property_type TEXT NOT NULL DEFAULT 'apartment',
  surface NUMERIC DEFAULT 0,
  rooms INTEGER DEFAULT 1,
  floor INTEGER,
  heating TEXT DEFAULT 'individual-gas',
  furnished BOOLEAN DEFAULT false,
  monthly_rent NUMERIC DEFAULT 0,
  monthly_charges NUMERIC DEFAULT 0,
  deposit_amount NUMERIC DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read properties" ON public.properties FOR SELECT USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can insert properties" ON public.properties FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), org_id) AND user_id = auth.uid());
CREATE POLICY "Owner can update properties" ON public.properties FOR UPDATE USING (user_id = auth.uid() AND public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Owner can delete properties" ON public.properties FOR DELETE USING (user_id = auth.uid() AND public.is_org_member(auth.uid(), org_id));

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ========== TENANTS TABLE ==========
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  tenant_user_id UUID, -- linked auth user for tenant portal
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  birth_date DATE,
  birth_place TEXT DEFAULT '',
  nationality TEXT DEFAULT 'Française',
  profession TEXT DEFAULT '',
  lease_start DATE,
  lease_end DATE,
  rent_amount NUMERIC DEFAULT 0,
  charges_amount NUMERIC DEFAULT 0,
  deposit_amount NUMERIC DEFAULT 0,
  lease_type TEXT DEFAULT 'empty',
  guarantor_name TEXT DEFAULT '',
  guarantor_phone TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read tenants" ON public.tenants FOR SELECT USING (public.is_org_member(auth.uid(), org_id) OR tenant_user_id = auth.uid());
CREATE POLICY "Org members can insert tenants" ON public.tenants FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), org_id) AND user_id = auth.uid());
CREATE POLICY "Owner can update tenants" ON public.tenants FOR UPDATE USING (user_id = auth.uid() AND public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Owner can delete tenants" ON public.tenants FOR DELETE USING (user_id = auth.uid() AND public.is_org_member(auth.uid(), org_id));

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ========== TENANT DOCUMENTS (ID, insurance, etc.) ==========
CREATE TABLE public.tenant_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL, -- 'id_card', 'insurance', 'income_proof', 'rib', 'guarantor', 'contract', 'tax_notice'
  label TEXT NOT NULL,
  file_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'validated', 'rejected'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read tenant docs" ON public.tenant_documents FOR SELECT
  USING (public.is_org_member(auth.uid(), org_id) OR EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = tenant_documents.tenant_id AND tenants.tenant_user_id = auth.uid()));
CREATE POLICY "Upload tenant docs" ON public.tenant_documents FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), org_id) AND uploaded_by = auth.uid());
CREATE POLICY "Update tenant docs" ON public.tenant_documents FOR UPDATE USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Delete tenant docs" ON public.tenant_documents FOR DELETE USING (public.is_org_member(auth.uid(), org_id));

-- ========== INVENTORY REPORTS (État des lieux) ==========
CREATE TABLE public.inventory_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'entry', -- 'entry' or 'exit'
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  general_notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'signed', 'completed'
  meter_electricity TEXT DEFAULT '',
  meter_gas TEXT DEFAULT '',
  meter_water TEXT DEFAULT '',
  keys_count INTEGER DEFAULT 0,
  keys_details TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read inventories" ON public.inventory_reports FOR SELECT USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can insert inventories" ON public.inventory_reports FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), org_id) AND user_id = auth.uid());
CREATE POLICY "Owner can update inventories" ON public.inventory_reports FOR UPDATE USING (user_id = auth.uid() AND public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Owner can delete inventories" ON public.inventory_reports FOR DELETE USING (user_id = auth.uid() AND public.is_org_member(auth.uid(), org_id));

CREATE TRIGGER update_inventory_reports_updated_at BEFORE UPDATE ON public.inventory_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ========== INVENTORY ROOMS (pièces de l'état des lieux) ==========
CREATE TABLE public.inventory_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.inventory_reports(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL, -- 'Entrée', 'Salon', 'Cuisine', 'Chambre 1', etc.
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read inventory rooms" ON public.inventory_rooms FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.inventory_reports WHERE inventory_reports.id = inventory_rooms.report_id AND public.is_org_member(auth.uid(), inventory_reports.org_id)));
CREATE POLICY "Insert inventory rooms" ON public.inventory_rooms FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.inventory_reports WHERE inventory_reports.id = inventory_rooms.report_id AND public.is_org_member(auth.uid(), inventory_reports.org_id)));
CREATE POLICY "Update inventory rooms" ON public.inventory_rooms FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.inventory_reports WHERE inventory_reports.id = inventory_rooms.report_id AND public.is_org_member(auth.uid(), inventory_reports.org_id)));
CREATE POLICY "Delete inventory rooms" ON public.inventory_rooms FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.inventory_reports WHERE inventory_reports.id = inventory_rooms.report_id AND public.is_org_member(auth.uid(), inventory_reports.org_id)));

-- ========== INVENTORY ITEMS (éléments de chaque pièce) ==========
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.inventory_rooms(id) ON DELETE CASCADE,
  element_name TEXT NOT NULL, -- 'Sol', 'Murs', 'Plafond', 'Fenêtres', 'Porte', 'Prises', etc.
  condition TEXT NOT NULL DEFAULT 'good', -- 'good', 'average', 'bad'
  notes TEXT DEFAULT '',
  photo_urls JSONB DEFAULT '[]'::jsonb,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read inventory items" ON public.inventory_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.inventory_rooms r
    JOIN public.inventory_reports rpt ON rpt.id = r.report_id
    WHERE r.id = inventory_items.room_id AND public.is_org_member(auth.uid(), rpt.org_id)
  ));
CREATE POLICY "Insert inventory items" ON public.inventory_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.inventory_rooms r
    JOIN public.inventory_reports rpt ON rpt.id = r.report_id
    WHERE r.id = inventory_items.room_id AND public.is_org_member(auth.uid(), rpt.org_id)
  ));
CREATE POLICY "Update inventory items" ON public.inventory_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.inventory_rooms r
    JOIN public.inventory_reports rpt ON rpt.id = r.report_id
    WHERE r.id = inventory_items.room_id AND public.is_org_member(auth.uid(), rpt.org_id)
  ));
CREATE POLICY "Delete inventory items" ON public.inventory_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.inventory_rooms r
    JOIN public.inventory_reports rpt ON rpt.id = r.report_id
    WHERE r.id = inventory_items.room_id AND public.is_org_member(auth.uid(), rpt.org_id)
  ));

-- ========== RENT CALLS (appels de loyer) ==========
CREATE TABLE public.rent_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  month TEXT NOT NULL, -- '2026-03'
  rent_amount NUMERIC NOT NULL DEFAULT 0,
  charges_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  paid BOOLEAN DEFAULT false,
  paid_date TIMESTAMPTZ,
  receipt_validated BOOLEAN DEFAULT false, -- landlord must validate before tenant access
  receipt_pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rent_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read rent calls" ON public.rent_calls FOR SELECT
  USING (public.is_org_member(auth.uid(), org_id) OR EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = rent_calls.tenant_id AND tenants.tenant_user_id = auth.uid() AND rent_calls.receipt_validated = true));
CREATE POLICY "Org members can insert rent calls" ON public.rent_calls FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can update rent calls" ON public.rent_calls FOR UPDATE USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can delete rent calls" ON public.rent_calls FOR DELETE USING (public.is_org_member(auth.uid(), org_id));

CREATE TRIGGER update_rent_calls_updated_at BEFORE UPDATE ON public.rent_calls FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ========== RENT REVISIONS (augmentations de loyer) ==========
CREATE TABLE public.rent_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  revision_date DATE NOT NULL,
  previous_rent NUMERIC NOT NULL,
  new_rent NUMERIC NOT NULL,
  irl_index_value NUMERIC,
  irl_reference_quarter TEXT, -- 'T1 2026'
  method TEXT DEFAULT 'irl', -- 'irl' or 'manual'
  applied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rent_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read revisions" ON public.rent_revisions FOR SELECT USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can insert revisions" ON public.rent_revisions FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can update revisions" ON public.rent_revisions FOR UPDATE USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can delete revisions" ON public.rent_revisions FOR DELETE USING (public.is_org_member(auth.uid(), org_id));
