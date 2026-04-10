-- Migration: Create 10 missing tables referenced in codebase
-- Date: 2026-04-07

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid,
  buyer_user_id uuid REFERENCES auth.users(id),
  owner_user_id uuid REFERENCES auth.users(id),
  "buyerOrbitId" text,
  "ownerOrbitId" text,
  status text NOT NULL DEFAULT 'draft',
  check_in date,
  check_out date,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'AED',
  guest_info jsonb DEFAULT '{}'::jsonb,
  conversation_id text,
  transaction_id text,
  "createdAt" timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookings_select" ON public.bookings FOR SELECT USING (auth.uid() = buyer_user_id OR auth.uid() = owner_user_id);
CREATE POLICY "bookings_insert" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = buyer_user_id);
CREATE POLICY "bookings_update" ON public.bookings FOR UPDATE USING (auth.uid() = buyer_user_id OR auth.uid() = owner_user_id);

CREATE TABLE IF NOT EXISTS public.concierge_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  user_id uuid REFERENCES auth.users(id),
  service_id uuid REFERENCES public.concierge_services(id),
  status text NOT NULL DEFAULT 'pending',
  notes text,
  scheduled_at timestamptz,
  amount numeric DEFAULT 0,
  currency text DEFAULT 'EUR',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.concierge_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "concierge_bookings_select" ON public.concierge_bookings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "concierge_bookings_insert" ON public.concierge_bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "concierge_bookings_update" ON public.concierge_bookings FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.conversation_participants_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations_v2(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  unread_count integer DEFAULT 0,
  last_read_at timestamptz DEFAULT now(),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_conv_part_v2_user ON public.conversation_participants_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_part_v2_conv ON public.conversation_participants_v2(conversation_id);
ALTER TABLE public.conversation_participants_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv_part_v2_select" ON public.conversation_participants_v2 FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "conv_part_v2_update" ON public.conversation_participants_v2 FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "conv_part_v2_insert" ON public.conversation_participants_v2 FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.ghost_call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid REFERENCES auth.users(id),
  callee_id uuid REFERENCES auth.users(id),
  caller_orbit_id text,
  callee_orbit_id text,
  status text NOT NULL DEFAULT 'ringing',
  call_type text DEFAULT 'voice',
  started_at timestamptz DEFAULT now(),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.ghost_call_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ghost_calls_select" ON public.ghost_call_sessions FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = callee_id);
CREATE POLICY "ghost_calls_insert" ON public.ghost_call_sessions FOR INSERT WITH CHECK (auth.uid() = caller_id);
CREATE POLICY "ghost_calls_update" ON public.ghost_call_sessions FOR UPDATE USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE TABLE IF NOT EXISTS public.growth_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engine_name text NOT NULL,
  action text NOT NULL,
  result text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.growth_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "growth_logs_insert" ON public.growth_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "growth_logs_select" ON public.growth_logs FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.orbit_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  avatar_url text,
  created_by uuid REFERENCES auth.users(id),
  is_public boolean DEFAULT false,
  max_members integer DEFAULT 256,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.orbit_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orbit_groups_select" ON public.orbit_groups FOR SELECT TO authenticated
  USING (is_public = true OR auth.uid() = created_by OR EXISTS (SELECT 1 FROM public.orbit_group_members m WHERE m.group_id = id AND m.user_id = auth.uid()));
CREATE POLICY "orbit_groups_insert" ON public.orbit_groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "orbit_groups_update" ON public.orbit_groups FOR UPDATE TO authenticated USING (auth.uid() = created_by);

CREATE TABLE IF NOT EXISTS public.orbit_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.orbit_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_ogm_user ON public.orbit_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_ogm_group ON public.orbit_group_members(group_id);
ALTER TABLE public.orbit_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ogm_select" ON public.orbit_group_members FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.orbit_group_members m2 WHERE m2.group_id = group_id AND m2.user_id = auth.uid()));
CREATE POLICY "ogm_insert" ON public.orbit_group_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ogm_delete" ON public.orbit_group_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.orbit_group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.orbit_groups(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL,
  type text DEFAULT 'text',
  pinned boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ogmsg_group ON public.orbit_group_messages(group_id);
ALTER TABLE public.orbit_group_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ogmsg_select" ON public.orbit_group_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orbit_group_members m WHERE m.group_id = group_id AND m.user_id = auth.uid()));
CREATE POLICY "ogmsg_insert" ON public.orbit_group_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.orbit_group_members m WHERE m.group_id = group_id AND m.user_id = auth.uid()));
CREATE POLICY "ogmsg_update" ON public.orbit_group_messages FOR UPDATE TO authenticated USING (auth.uid() = sender_id);

CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES auth.users(id),
  referred_user_id uuid REFERENCES auth.users(id),
  code text NOT NULL,
  status text DEFAULT 'pending',
  reward_amount numeric DEFAULT 0,
  currency text DEFAULT 'EUR',
  claimed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referral_referrer ON public.referral_rewards(referrer_user_id);
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referral_select" ON public.referral_rewards FOR SELECT TO authenticated USING (auth.uid() = referrer_user_id);
CREATE POLICY "referral_insert" ON public.referral_rewards FOR INSERT TO authenticated WITH CHECK (auth.uid() = referrer_user_id);

CREATE TABLE IF NOT EXISTS public.zone_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_key text NOT NULL,
  event_type text NOT NULL,
  title text,
  description text,
  is_active boolean DEFAULT true,
  severity text DEFAULT 'info',
  metadata jsonb DEFAULT '{}'::jsonb,
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_zone_events_active ON public.zone_events(is_active) WHERE is_active = true;
ALTER TABLE public.zone_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zone_events_select" ON public.zone_events FOR SELECT USING (true);
CREATE POLICY "zone_events_insert" ON public.zone_events FOR INSERT TO authenticated WITH CHECK (true);
