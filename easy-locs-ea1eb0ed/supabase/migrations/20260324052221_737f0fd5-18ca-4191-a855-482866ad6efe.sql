
-- =====================================================
-- CANONICAL BOOST ENGINE — Complete Schema
-- =====================================================

-- 1. BOOST CAMPAIGNS
CREATE TABLE public.boost_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL,
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'shop',
  campaign_type TEXT NOT NULL DEFAULT 'boost',
  objective TEXT NOT NULL DEFAULT 'visibility',
  status TEXT NOT NULL DEFAULT 'draft',
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  daily_budget NUMERIC(12,2) DEFAULT 0,
  total_budget NUMERIC(12,2) DEFAULT 0,
  spent NUMERIC(12,2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'AED',
  targeting_json JSONB DEFAULT '{}',
  creative_set_id UUID,
  bidding_mode TEXT DEFAULT 'cpm',
  lead_goal INTEGER,
  canonical_vertical TEXT,
  canonical_subcategory TEXT,
  country TEXT,
  city TEXT,
  zone TEXT,
  locale TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. BOOST CREATIVES
CREATE TABLE public.boost_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.boost_campaigns(id) ON DELETE CASCADE NOT NULL,
  creative_type TEXT NOT NULL DEFAULT 'banner',
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT,
  video_url TEXT,
  cta_label TEXT DEFAULT 'View',
  cta_target TEXT,
  theme_variant TEXT,
  canonical_vertical TEXT,
  canonical_subcategory TEXT,
  locale TEXT DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. BOOST SLOTS
CREATE TABLE public.boost_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  surface TEXT NOT NULL,
  slot_key TEXT NOT NULL,
  vertical TEXT,
  subcategory TEXT,
  country TEXT,
  city TEXT,
  zone TEXT,
  position_index INTEGER DEFAULT 0,
  slot_type TEXT DEFAULT 'banner',
  active BOOLEAN DEFAULT true,
  rules_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(surface, slot_key, country, city)
);

-- 4. BOOST IMPRESSIONS
CREATE TABLE public.boost_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.boost_campaigns(id) ON DELETE SET NULL,
  creative_id UUID REFERENCES public.boost_creatives(id) ON DELETE SET NULL,
  slot_id UUID REFERENCES public.boost_slots(id) ON DELETE SET NULL,
  viewer_user_id UUID,
  session_id TEXT,
  country TEXT,
  city TEXT,
  surface TEXT,
  entity_id TEXT,
  rendered_at TIMESTAMPTZ DEFAULT now()
);

-- 5. BOOST CLICKS
CREATE TABLE public.boost_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.boost_campaigns(id) ON DELETE SET NULL,
  creative_id UUID REFERENCES public.boost_creatives(id) ON DELETE SET NULL,
  slot_id UUID REFERENCES public.boost_slots(id) ON DELETE SET NULL,
  viewer_user_id UUID,
  session_id TEXT,
  click_type TEXT DEFAULT 'cta',
  clicked_at TIMESTAMPTZ DEFAULT now()
);

-- 6. BOOST LEADS
CREATE TABLE public.boost_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.boost_campaigns(id) ON DELETE SET NULL,
  source_surface TEXT,
  source_slot UUID REFERENCES public.boost_slots(id) ON DELETE SET NULL,
  lead_type TEXT DEFAULT 'click',
  target_entity_id TEXT,
  customer_user_id UUID,
  guest_id TEXT,
  contact_payload JSONB DEFAULT '{}',
  canonical_vertical TEXT,
  canonical_subcategory TEXT,
  country TEXT,
  city TEXT,
  zone TEXT,
  status TEXT DEFAULT 'new',
  score NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. BOOST ANALYTICS DAILY
CREATE TABLE public.boost_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.boost_campaigns(id) ON DELETE CASCADE NOT NULL,
  day DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr NUMERIC(6,4) DEFAULT 0,
  leads INTEGER DEFAULT 0,
  cpl NUMERIC(12,2) DEFAULT 0,
  spend NUMERIC(12,2) DEFAULT 0,
  roi_proxy NUMERIC(8,4) DEFAULT 0,
  top_slot TEXT,
  top_creative_id UUID,
  top_geo TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, day)
);

-- RLS
ALTER TABLE public.boost_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boost_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boost_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boost_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boost_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boost_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boost_analytics_daily ENABLE ROW LEVEL SECURITY;

-- Campaigns: owner can CRUD
CREATE POLICY "Owner manages campaigns" ON public.boost_campaigns
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- Creatives: via campaign owner
CREATE POLICY "Campaign owner manages creatives" ON public.boost_creatives
  FOR ALL TO authenticated
  USING (campaign_id IN (SELECT id FROM public.boost_campaigns WHERE owner_user_id = auth.uid()))
  WITH CHECK (campaign_id IN (SELECT id FROM public.boost_campaigns WHERE owner_user_id = auth.uid()));

-- Slots: public read, admin write (no admin table yet so read-only for now)
CREATE POLICY "Anyone can read active slots" ON public.boost_slots
  FOR SELECT TO authenticated USING (active = true);

-- Impressions: insert for anyone (tracking), select for campaign owner
CREATE POLICY "Anyone can insert impressions" ON public.boost_impressions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anon insert impressions" ON public.boost_impressions
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Owner reads impressions" ON public.boost_impressions
  FOR SELECT TO authenticated
  USING (campaign_id IN (SELECT id FROM public.boost_campaigns WHERE owner_user_id = auth.uid()));

-- Clicks: same pattern
CREATE POLICY "Anyone can insert clicks" ON public.boost_clicks
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anon insert clicks" ON public.boost_clicks
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Owner reads clicks" ON public.boost_clicks
  FOR SELECT TO authenticated
  USING (campaign_id IN (SELECT id FROM public.boost_campaigns WHERE owner_user_id = auth.uid()));

-- Leads: campaign owner reads
CREATE POLICY "Owner manages leads" ON public.boost_leads
  FOR ALL TO authenticated
  USING (campaign_id IN (SELECT id FROM public.boost_campaigns WHERE owner_user_id = auth.uid()))
  WITH CHECK (campaign_id IN (SELECT id FROM public.boost_campaigns WHERE owner_user_id = auth.uid()));

-- Analytics: campaign owner reads
CREATE POLICY "Owner reads analytics" ON public.boost_analytics_daily
  FOR SELECT TO authenticated
  USING (campaign_id IN (SELECT id FROM public.boost_campaigns WHERE owner_user_id = auth.uid()));

-- Indexes for performance
CREATE INDEX idx_boost_campaigns_owner ON public.boost_campaigns(owner_user_id);
CREATE INDEX idx_boost_campaigns_status ON public.boost_campaigns(status);
CREATE INDEX idx_boost_impressions_campaign ON public.boost_impressions(campaign_id);
CREATE INDEX idx_boost_impressions_rendered ON public.boost_impressions(rendered_at);
CREATE INDEX idx_boost_clicks_campaign ON public.boost_clicks(campaign_id);
CREATE INDEX idx_boost_leads_campaign ON public.boost_leads(campaign_id);
CREATE INDEX idx_boost_leads_status ON public.boost_leads(status);
CREATE INDEX idx_boost_analytics_campaign_day ON public.boost_analytics_daily(campaign_id, day);
CREATE INDEX idx_boost_slots_surface ON public.boost_slots(surface, active);

-- Seed default slots
INSERT INTO public.boost_slots (surface, slot_key, slot_type) VALUES
  ('home', 'hero_primary', 'hero'),
  ('home', 'hero_secondary', 'banner'),
  ('home', 'inline_banner_1', 'inline'),
  ('home', 'sponsored_carousel', 'carousel'),
  ('search', 'featured_card', 'card'),
  ('search', 'inline_banner_1', 'inline'),
  ('radar', 'sponsored_row', 'card'),
  ('radar', 'inline_banner_1', 'inline'),
  ('vertical_hub', 'hero_primary', 'hero'),
  ('vertical_hub', 'inline_banner_1', 'inline'),
  ('vertical_hub', 'sponsored_carousel', 'carousel'),
  ('subcategory', 'featured_card', 'card'),
  ('subcategory', 'inline_banner_1', 'inline'),
  ('shop_detail', 'related_businesses_boost', 'card'),
  ('shop_detail', 'sticky_cta', 'cta'),
  ('explore', 'hero_primary', 'hero'),
  ('explore', 'lead_capture_banner', 'lead');
