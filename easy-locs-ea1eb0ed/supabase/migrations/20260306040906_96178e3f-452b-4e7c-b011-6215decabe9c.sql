
-- Transaction Journal for Accounting Module
CREATE TABLE public.transaction_journal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL DEFAULT 'other',
  label TEXT NOT NULL,
  debit NUMERIC NOT NULL DEFAULT 0,
  credit NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  source_type TEXT DEFAULT NULL, -- 'rent_call', 'expense', 'booking', 'manual'
  source_id UUID DEFAULT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transaction_journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read journal" ON public.transaction_journal FOR SELECT USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can insert journal" ON public.transaction_journal FOR INSERT WITH CHECK (is_org_member(auth.uid(), org_id) AND user_id = auth.uid());
CREATE POLICY "Org members can update journal" ON public.transaction_journal FOR UPDATE USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can delete journal" ON public.transaction_journal FOR DELETE USING (is_org_member(auth.uid(), org_id));

-- Service Providers for Marketplace
CREATE TABLE public.service_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'cleaning', -- cleaning, maintenance, inspection, checkin, management
  description TEXT DEFAULT '',
  hourly_rate NUMERIC DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  city TEXT DEFAULT '',
  country TEXT NOT NULL DEFAULT 'FR',
  rating NUMERIC DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  avatar_url TEXT DEFAULT NULL,
  verified BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active providers" ON public.service_providers FOR SELECT USING (active = true);
CREATE POLICY "Authenticated can insert providers" ON public.service_providers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Service Bookings
CREATE TABLE public.service_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  service_date DATE NOT NULL,
  service_type TEXT NOT NULL DEFAULT 'cleaning',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, completed, cancelled
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  commission_rate NUMERIC NOT NULL DEFAULT 0.15,
  notes TEXT DEFAULT '',
  rating INTEGER DEFAULT NULL,
  review_text TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read bookings" ON public.service_bookings FOR SELECT USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can insert bookings" ON public.service_bookings FOR INSERT WITH CHECK (is_org_member(auth.uid(), org_id) AND user_id = auth.uid());
CREATE POLICY "Org members can update bookings" ON public.service_bookings FOR UPDATE USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can delete bookings" ON public.service_bookings FOR DELETE USING (is_org_member(auth.uid(), org_id));

-- Pricing Rules for Dynamic Pricing
CREATE TABLE public.pricing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rule_type TEXT NOT NULL DEFAULT 'seasonal', -- seasonal, weekend, event, occupancy, last_minute
  name TEXT NOT NULL,
  adjustment_type TEXT NOT NULL DEFAULT 'percentage', -- percentage, fixed
  adjustment_value NUMERIC NOT NULL DEFAULT 0,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  days_of_week INTEGER[] DEFAULT NULL, -- 0=Sun..6=Sat
  min_occupancy NUMERIC DEFAULT NULL,
  max_occupancy NUMERIC DEFAULT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read pricing" ON public.pricing_rules FOR SELECT USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can insert pricing" ON public.pricing_rules FOR INSERT WITH CHECK (is_org_member(auth.uid(), org_id) AND user_id = auth.uid());
CREATE POLICY "Org members can update pricing" ON public.pricing_rules FOR UPDATE USING (is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can delete pricing" ON public.pricing_rules FOR DELETE USING (is_org_member(auth.uid(), org_id));
