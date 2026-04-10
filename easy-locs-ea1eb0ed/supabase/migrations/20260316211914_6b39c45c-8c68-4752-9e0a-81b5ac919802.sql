
-- ============================================================
-- Smart Notifications, Multi-Store, Advanced Products, Gamification
-- ============================================================

-- 1. SMART NOTIFICATIONS PREFERENCES
CREATE TABLE IF NOT EXISTS public.storefront_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  notify_orders BOOLEAN NOT NULL DEFAULT true,
  notify_shipping BOOLEAN NOT NULL DEFAULT true,
  notify_promotions BOOLEAN NOT NULL DEFAULT true,
  notify_reviews BOOLEAN NOT NULL DEFAULT true,
  notify_deals BOOLEAN NOT NULL DEFAULT false,
  notify_live BOOLEAN NOT NULL DEFAULT true,
  channel_email BOOLEAN NOT NULL DEFAULT true,
  channel_push BOOLEAN NOT NULL DEFAULT true,
  channel_sms BOOLEAN NOT NULL DEFAULT false,
  digest_frequency TEXT NOT NULL DEFAULT 'instant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.storefront_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'push',
  title TEXT NOT NULL,
  body TEXT,
  metadata_json JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ
);

-- 2. MULTI-STORE MANAGEMENT
CREATE TABLE IF NOT EXISTS public.storefront_store_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.storefront_store_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.storefront_store_groups(id) ON DELETE CASCADE NOT NULL,
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, shop_id)
);

-- 3. ADVANCED PRODUCT PAGES (extend catalog_items)
ALTER TABLE public.catalog_items ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.catalog_items ADD COLUMN IF NOT EXISTS gallery_urls JSONB DEFAULT '[]';
ALTER TABLE public.catalog_items ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '[]';
ALTER TABLE public.catalog_items ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE public.catalog_items ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE public.catalog_items ADD COLUMN IF NOT EXISTS weight_grams INTEGER;
ALTER TABLE public.catalog_items ADD COLUMN IF NOT EXISTS dimensions_json JSONB;
ALTER TABLE public.catalog_items ADD COLUMN IF NOT EXISTS brand_name TEXT;
ALTER TABLE public.catalog_items ADD COLUMN IF NOT EXISTS warranty_info TEXT;

-- 4. GAMIFICATION & CHALLENGES
CREATE TABLE IF NOT EXISTS public.storefront_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL DEFAULT 'purchase',
  target_value INTEGER NOT NULL DEFAULT 1,
  reward_points INTEGER NOT NULL DEFAULT 100,
  reward_badge TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.storefront_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.storefront_challenges(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  current_value INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.storefront_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  badge_type TEXT NOT NULL DEFAULT 'achievement',
  criteria_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.storefront_user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id UUID REFERENCES public.storefront_badges(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(badge_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.storefront_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  period TEXT NOT NULL DEFAULT 'alltime',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id, user_id, period)
);

-- RLS
ALTER TABLE public.storefront_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_store_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_store_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_leaderboard ENABLE ROW LEVEL SECURITY;

-- Notification prefs
CREATE POLICY "notif_prefs_own" ON public.storefront_notification_preferences FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif_log_own" ON public.storefront_notification_log FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif_log_seller" ON public.storefront_notification_log FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
);

-- Store groups
CREATE POLICY "store_groups_own" ON public.storefront_store_groups FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "store_group_members_read" ON public.storefront_store_group_members FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.storefront_store_groups g WHERE g.id = group_id AND g.owner_id = auth.uid())
);
CREATE POLICY "store_group_members_manage" ON public.storefront_store_group_members FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.storefront_store_groups g WHERE g.id = group_id AND g.owner_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.storefront_store_groups g WHERE g.id = group_id AND g.owner_id = auth.uid())
);

-- Challenges
CREATE POLICY "challenges_read" ON public.storefront_challenges FOR SELECT USING (active = true);
CREATE POLICY "challenges_manage" ON public.storefront_challenges FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "challenge_progress_own" ON public.storefront_challenge_progress FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Badges
CREATE POLICY "badges_read" ON public.storefront_badges FOR SELECT USING (true);
CREATE POLICY "badges_manage" ON public.storefront_badges FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_badges_own" ON public.storefront_user_badges FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Leaderboard
CREATE POLICY "leaderboard_read" ON public.storefront_leaderboard FOR SELECT USING (true);
CREATE POLICY "leaderboard_own" ON public.storefront_leaderboard FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
