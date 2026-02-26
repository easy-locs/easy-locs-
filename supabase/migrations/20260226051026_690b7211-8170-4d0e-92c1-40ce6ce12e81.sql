
-- 1. Expenses table (comptabilité dépenses)
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id),
  user_id UUID NOT NULL,
  property_id UUID REFERENCES public.properties(id),
  category TEXT NOT NULL DEFAULT 'other',
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier TEXT,
  invoice_url TEXT,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read expenses" ON public.expenses FOR SELECT USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can insert expenses" ON public.expenses FOR INSERT WITH CHECK (is_org_member(auth.uid(), org_id) AND user_id = auth.uid());
CREATE POLICY "Owner can update expenses" ON public.expenses FOR UPDATE USING (user_id = auth.uid() AND is_org_member(auth.uid(), org_id));
CREATE POLICY "Owner can delete expenses" ON public.expenses FOR DELETE USING (user_id = auth.uid() AND is_org_member(auth.uid(), org_id));

-- 2. Candidates table
CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id),
  user_id UUID NOT NULL,
  property_id UUID REFERENCES public.properties(id),
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  profession TEXT DEFAULT '',
  monthly_income NUMERIC DEFAULT 0,
  guarantor_info TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  score INTEGER DEFAULT 0,
  applied_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read candidates" ON public.candidates FOR SELECT USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can insert candidates" ON public.candidates FOR INSERT WITH CHECK (is_org_member(auth.uid(), org_id) AND user_id = auth.uid());
CREATE POLICY "Owner can update candidates" ON public.candidates FOR UPDATE USING (user_id = auth.uid() AND is_org_member(auth.uid(), org_id));
CREATE POLICY "Owner can delete candidates" ON public.candidates FOR DELETE USING (user_id = auth.uid() AND is_org_member(auth.uid(), org_id));

-- 3. Seasonal bookings table
CREATE TABLE public.seasonal_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id),
  user_id UUID NOT NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id),
  guest_name TEXT NOT NULL,
  guest_email TEXT DEFAULT '',
  guest_phone TEXT DEFAULT '',
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  total_price NUMERIC NOT NULL DEFAULT 0,
  cleaning_fee NUMERIC DEFAULT 0,
  deposit_amount NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seasonal_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read bookings" ON public.seasonal_bookings FOR SELECT USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can insert bookings" ON public.seasonal_bookings FOR INSERT WITH CHECK (is_org_member(auth.uid(), org_id) AND user_id = auth.uid());
CREATE POLICY "Owner can update bookings" ON public.seasonal_bookings FOR UPDATE USING (user_id = auth.uid() AND is_org_member(auth.uid(), org_id));
CREATE POLICY "Owner can delete bookings" ON public.seasonal_bookings FOR DELETE USING (user_id = auth.uid() AND is_org_member(auth.uid(), org_id));

-- 4. Payment notices table (avis d'échéance)
CREATE TABLE public.payment_notices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  property_id UUID REFERENCES public.properties(id),
  month TEXT NOT NULL,
  rent_amount NUMERIC NOT NULL DEFAULT 0,
  charges_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  sent BOOLEAN DEFAULT false,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read notices" ON public.payment_notices FOR SELECT USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can insert notices" ON public.payment_notices FOR INSERT WITH CHECK (is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can update notices" ON public.payment_notices FOR UPDATE USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can delete notices" ON public.payment_notices FOR DELETE USING (is_org_member(auth.uid(), org_id));

-- 5. Dunning letters (relances impayés)
CREATE TABLE public.dunning_letters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  property_id UUID REFERENCES public.properties(id),
  level INTEGER NOT NULL DEFAULT 1,
  month TEXT NOT NULL,
  amount_due NUMERIC NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dunning_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read dunning" ON public.dunning_letters FOR SELECT USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can insert dunning" ON public.dunning_letters FOR INSERT WITH CHECK (is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can update dunning" ON public.dunning_letters FOR UPDATE USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can delete dunning" ON public.dunning_letters FOR DELETE USING (is_org_member(auth.uid(), org_id));

-- 6. Furniture inventory table
CREATE TABLE public.furniture_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id),
  property_id UUID NOT NULL REFERENCES public.properties(id),
  room_name TEXT NOT NULL DEFAULT 'Salon',
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  condition TEXT NOT NULL DEFAULT 'good',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.furniture_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read furniture" ON public.furniture_items FOR SELECT USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can insert furniture" ON public.furniture_items FOR INSERT WITH CHECK (is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can update furniture" ON public.furniture_items FOR UPDATE USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can delete furniture" ON public.furniture_items FOR DELETE USING (is_org_member(auth.uid(), org_id));
