
-- Auto Acquisition Engine tables
CREATE TABLE IF NOT EXISTS public.auto_discovered_merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'manual',
  source_url TEXT,
  name TEXT NOT NULL,
  category TEXT,
  subcategory TEXT,
  city TEXT,
  country TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  cover_url TEXT,
  rating NUMERIC,
  review_count INTEGER DEFAULT 0,
  menu_json JSONB DEFAULT '[]'::jsonb,
  quality_score INTEGER DEFAULT 0,
  visibility_mode TEXT DEFAULT 'ghost',
  claim_status TEXT DEFAULT 'unclaimed',
  claimed_by UUID,
  claimed_at TIMESTAMPTZ,
  outreach_status TEXT DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.acquisition_outreach_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES public.auto_discovered_merchants(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email',
  message_template TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'sent',
  response TEXT,
  responded_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE public.auto_discovered_merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acquisition_outreach_logs ENABLE ROW LEVEL SECURITY;

-- Public read for ghost listings
CREATE POLICY "Public can view ghost listings" ON public.auto_discovered_merchants
  FOR SELECT TO anon, authenticated USING (visibility_mode IN ('ghost', 'live'));

-- Authenticated users can claim
CREATE POLICY "Authenticated can claim merchants" ON public.auto_discovered_merchants
  FOR UPDATE TO authenticated USING (claim_status = 'unclaimed')
  WITH CHECK (claimed_by = auth.uid());

-- Outreach logs: only authenticated
CREATE POLICY "Authenticated can view outreach" ON public.acquisition_outreach_logs
  FOR SELECT TO authenticated USING (true);
