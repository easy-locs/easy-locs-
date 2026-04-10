
-- AI Personal Radar tables
CREATE TABLE IF NOT EXISTS public.user_radar_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lifestyle_tags TEXT[] DEFAULT '{}',
  budget_profile TEXT DEFAULT 'mid',
  travel_profile TEXT DEFAULT 'local',
  preferred_verticals TEXT[] DEFAULT '{}',
  preferred_categories TEXT[] DEFAULT '{}',
  taste_scores_json JSONB DEFAULT '{}',
  session_count INTEGER DEFAULT 0,
  last_updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.user_radar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  entity_id TEXT,
  category TEXT,
  subcategory TEXT,
  context TEXT,
  zone_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_radar_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  detected_intent TEXT,
  time_slot TEXT,
  context_type TEXT,
  zone_id TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.user_radar_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL,
  entity_id TEXT,
  category TEXT,
  personal_score NUMERIC DEFAULT 0,
  shown_at TIMESTAMPTZ DEFAULT now(),
  clicked BOOLEAN DEFAULT false,
  converted BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.zone_live_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id TEXT NOT NULL,
  lat NUMERIC,
  lng NUMERIC,
  vibe TEXT DEFAULT 'calm',
  density INTEGER DEFAULT 0,
  activity_score INTEGER DEFAULT 0,
  dominant_categories TEXT[] DEFAULT '{}',
  entity_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(zone_id)
);

-- RLS
ALTER TABLE public.user_radar_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_radar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_radar_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_radar_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_live_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users manage own radar profile" ON public.user_radar_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own radar events" ON public.user_radar_events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own radar sessions" ON public.user_radar_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own radar recommendations" ON public.user_radar_recommendations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Zone profiles are public read, service-role write
CREATE POLICY "Anyone can read zone profiles" ON public.zone_live_profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Service can manage zone profiles" ON public.zone_live_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_radar_events_user ON public.user_radar_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_radar_sessions_user ON public.user_radar_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_radar_recs_user ON public.user_radar_recommendations(user_id, shown_at DESC);
CREATE INDEX IF NOT EXISTS idx_zone_profiles_zone ON public.zone_live_profiles(zone_id);
