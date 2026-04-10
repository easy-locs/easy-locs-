
-- Property Units table
CREATE TABLE public.property_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL DEFAULT '',
  floor INTEGER,
  bedrooms INTEGER DEFAULT 1,
  bathrooms INTEGER DEFAULT 1,
  size_sqm NUMERIC,
  rent_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'vacant',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rent Payments table
CREATE TABLE public.rent_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  property_id UUID REFERENCES public.properties(id),
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Property Documents table
CREATE TABLE public.property_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.property_units(id) ON DELETE SET NULL,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  org_id UUID REFERENCES public.orgs(id),
  user_id UUID NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'other',
  title TEXT,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add unit_id to leases if not present
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leases' AND column_name='unit_id') THEN
    ALTER TABLE public.leases ADD COLUMN unit_id UUID REFERENCES public.property_units(id) ON DELETE SET NULL;
  END IF;
END $$;

-- RLS
ALTER TABLE public.property_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;

-- property_units: accessible by authenticated users who own the property
CREATE POLICY "Users can manage their property units" ON public.property_units
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.user_id = auth.uid())
  );

-- rent_payments: accessible by authenticated users who own the lease
CREATE POLICY "Users can manage their rent payments" ON public.rent_payments
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.leases l WHERE l.id = lease_id AND l.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.leases l WHERE l.id = lease_id AND l.user_id = auth.uid())
  );

-- property_documents: accessible by owner
CREATE POLICY "Users can manage their property documents" ON public.property_documents
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
