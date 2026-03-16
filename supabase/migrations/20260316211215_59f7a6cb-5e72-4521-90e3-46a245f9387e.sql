
-- Add missing columns to existing storefront_social_posts
ALTER TABLE public.storefront_social_posts ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.storefront_social_posts ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]';
ALTER TABLE public.storefront_social_posts ADD COLUMN IF NOT EXISTS tagged_items JSONB DEFAULT '[]';
ALTER TABLE public.storefront_social_posts ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.storefront_social_posts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';

-- CUSTOMER SUPPORT & TICKETING
CREATE TABLE public.storefront_support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID NOT NULL,
  order_id UUID,
  subject TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to UUID,
  resolved_at TIMESTAMPTZ,
  satisfaction_rating INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.storefront_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.storefront_support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'customer',
  message TEXT NOT NULL,
  attachment_urls JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.storefront_faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  sort_order INTEGER DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.storefront_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_faq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets_customer" ON public.storefront_support_tickets FOR ALL TO authenticated USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());
CREATE POLICY "tickets_seller" ON public.storefront_support_tickets FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
);
CREATE POLICY "ticket_msgs_participant" ON public.storefront_ticket_messages FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.storefront_support_tickets t WHERE t.id = ticket_id AND (t.customer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = t.shop_id AND sp.user_id = auth.uid())))
) WITH CHECK (sender_id = auth.uid());
CREATE POLICY "faq_read_public" ON public.storefront_faq FOR SELECT USING (published = true);
CREATE POLICY "faq_manage_owner" ON public.storefront_faq FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- LIVE SHOPPING
CREATE TABLE public.storefront_live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL,
  host_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  viewer_count INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  featured_items JSONB DEFAULT '[]',
  stream_url TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.storefront_influencer_collabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL,
  influencer_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  commission_percent NUMERIC DEFAULT 10,
  promo_code TEXT,
  total_sales NUMERIC DEFAULT 0,
  total_commission NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.storefront_live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_influencer_collabs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "live_read_all" ON public.storefront_live_sessions FOR SELECT USING (true);
CREATE POLICY "live_manage_host" ON public.storefront_live_sessions FOR ALL TO authenticated USING (host_id = auth.uid()) WITH CHECK (host_id = auth.uid());
CREATE POLICY "influencer_own" ON public.storefront_influencer_collabs FOR SELECT TO authenticated USING (influencer_id = auth.uid());
CREATE POLICY "influencer_shop" ON public.storefront_influencer_collabs FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
);

-- SUBSCRIPTION PLANS & RECURRING
CREATE TABLE public.storefront_subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  item_ids JSONB DEFAULT '[]',
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  billing_interval TEXT NOT NULL DEFAULT 'monthly',
  trial_days INTEGER DEFAULT 0,
  max_subscribers INTEGER,
  active BOOLEAN NOT NULL DEFAULT true,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.storefront_subscriptions_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.storefront_subscription_plans(id) ON DELETE CASCADE NOT NULL,
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL,
  subscriber_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  next_billing_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  pause_until TIMESTAMPTZ,
  total_paid NUMERIC DEFAULT 0,
  orders_count INTEGER DEFAULT 0,
  shipping_address JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.storefront_subscription_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.storefront_subscriptions_v2(id) ON DELETE CASCADE NOT NULL,
  shop_id UUID NOT NULL,
  order_id UUID,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.storefront_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_subscriptions_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_subscription_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_plans_read_active" ON public.storefront_subscription_plans FOR SELECT USING (active = true);
CREATE POLICY "sub_plans_manage_owner" ON public.storefront_subscription_plans FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "subs_v2_subscriber" ON public.storefront_subscriptions_v2 FOR ALL TO authenticated USING (subscriber_id = auth.uid()) WITH CHECK (subscriber_id = auth.uid());
CREATE POLICY "subs_v2_shop_owner" ON public.storefront_subscriptions_v2 FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
);
CREATE POLICY "sub_orders_subscriber" ON public.storefront_subscription_orders FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.storefront_subscriptions_v2 s WHERE s.id = subscription_id AND s.subscriber_id = auth.uid())
);
CREATE POLICY "sub_orders_shop_owner" ON public.storefront_subscription_orders FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.storefront_live_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.storefront_support_tickets;
