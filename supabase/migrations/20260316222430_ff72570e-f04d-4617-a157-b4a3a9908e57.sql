
-- Support tickets
CREATE TABLE IF NOT EXISTS public.storefront_support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'normal',
  order_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.storefront_support_tickets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Customers manage own tickets" ON public.storefront_support_tickets FOR ALL TO authenticated USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Shop owners view tickets" ON public.storefront_support_tickets FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Support messages
CREATE TABLE IF NOT EXISTS public.storefront_support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.storefront_support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_bot BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.storefront_support_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Ticket participants view messages" ON public.storefront_support_messages FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.storefront_support_tickets t WHERE t.id = ticket_id AND (t.customer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = t.shop_id AND sp.user_id = auth.uid())))) WITH CHECK (EXISTS (SELECT 1 FROM public.storefront_support_tickets t WHERE t.id = ticket_id AND (t.customer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = t.shop_id AND sp.user_id = auth.uid()))));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Referral links
CREATE TABLE IF NOT EXISTS public.storefront_referral_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  referrer_id UUID NOT NULL,
  code TEXT UNIQUE NOT NULL DEFAULT 'REF-' || upper(substr(md5(random()::text), 1, 8)),
  commission_percent NUMERIC DEFAULT 5,
  tier INT DEFAULT 1,
  parent_referrer_id UUID,
  clicks INT DEFAULT 0,
  conversions INT DEFAULT 0,
  total_earned NUMERIC DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.storefront_referral_links ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own referrals" ON public.storefront_referral_links FOR ALL TO authenticated USING (referrer_id = auth.uid()) WITH CHECK (referrer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Shop owners view referrals" ON public.storefront_referral_links FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Referral conversions
CREATE TABLE IF NOT EXISTS public.storefront_referral_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID REFERENCES public.storefront_referral_links(id) ON DELETE CASCADE NOT NULL,
  order_id UUID,
  buyer_id UUID,
  order_amount NUMERIC DEFAULT 0,
  commission_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.storefront_referral_conversions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Referrers view own conversions" ON public.storefront_referral_conversions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.storefront_referral_links rl WHERE rl.id = link_id AND rl.referrer_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tax rules per country
CREATE TABLE IF NOT EXISTS public.storefront_tax_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  country_code TEXT NOT NULL,
  tax_name TEXT DEFAULT 'VAT',
  rate_percent NUMERIC NOT NULL DEFAULT 20,
  applies_to TEXT DEFAULT 'all',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.storefront_tax_rules ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Shop owners manage tax rules" ON public.storefront_tax_rules FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone view tax rules" ON public.storefront_tax_rules FOR SELECT TO anon, authenticated USING (active = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Bulk import jobs
CREATE TABLE IF NOT EXISTS public.storefront_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  source_type TEXT DEFAULT 'csv',
  status TEXT DEFAULT 'pending',
  total_rows INT DEFAULT 0,
  processed_rows INT DEFAULT 0,
  error_rows INT DEFAULT 0,
  errors_json JSONB DEFAULT '[]',
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.storefront_import_jobs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own imports" ON public.storefront_import_jobs FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
