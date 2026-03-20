
-- ============================================================
-- 1. orbit_profiles — V2 identity layer linked to auth.users
-- ============================================================

CREATE TABLE IF NOT EXISTS public.orbit_profiles_v2 (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  orbit_id text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'buyer',
  display_name text,
  avatar_url text,
  device_id text,
  verification_level integer DEFAULT 1,
  permissions jsonb DEFAULT '{"camera":false,"microphone":false,"geolocation":false,"contacts":false,"notifications":false}'::jsonb,
  service_links jsonb DEFAULT '{"walletLinked":false,"bookingEnabled":true,"deliveryEnabled":true,"propertyEnabled":true,"messagingEnabled":true}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orbit_profiles_v2_orbit_id ON public.orbit_profiles_v2(orbit_id);

-- Auto-create orbit profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_orbit()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.orbit_profiles_v2 (id, orbit_id, role)
  VALUES (
    NEW.id,
    'orbit_' || substr(NEW.id::text, 1, 8),
    'buyer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_orbit ON auth.users;
CREATE TRIGGER on_auth_user_created_orbit
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_orbit();

-- RLS for orbit_profiles_v2
ALTER TABLE public.orbit_profiles_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own orbit profile"
  ON public.orbit_profiles_v2 FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users update own orbit profile"
  ON public.orbit_profiles_v2 FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "System inserts orbit profile"
  ON public.orbit_profiles_v2 FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- 2. V2 wallets — linked to auth user via orbit
-- ============================================================

CREATE TABLE IF NOT EXISTS public.wallets_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  orbit_id text NOT NULL,
  currency text NOT NULL DEFAULT 'AED',
  available_balance numeric NOT NULL DEFAULT 0,
  locked_balance numeric NOT NULL DEFAULT 0,
  pending_balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallets_v2_user_id ON public.wallets_v2(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_v2_orbit_id ON public.wallets_v2(orbit_id);

ALTER TABLE public.wallets_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own wallet"
  ON public.wallets_v2 FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own wallet"
  ON public.wallets_v2 FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own wallet"
  ON public.wallets_v2 FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. V2 property_listings — linked to auth user
-- ============================================================

CREATE TABLE IF NOT EXISTS public.property_listings_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_orbit_id text NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  flow_mode text NOT NULL DEFAULT 'instant_book',
  location jsonb NOT NULL DEFAULT '{}'::jsonb,
  pricing jsonb NOT NULL DEFAULT '{}'::jsonb,
  capacity jsonb DEFAULT '{}'::jsonb,
  amenities jsonb DEFAULT '[]'::jsonb,
  photos jsonb DEFAULT '[]'::jsonb,
  availability jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_listings_v2_user_id ON public.property_listings_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_property_listings_v2_status ON public.property_listings_v2(status);

ALTER TABLE public.property_listings_v2 ENABLE ROW LEVEL SECURITY;

-- Anyone can read published listings
CREATE POLICY "Anyone reads published listings"
  ON public.property_listings_v2 FOR SELECT
  USING (status = 'published' OR auth.uid() = user_id);

CREATE POLICY "Owners manage own listings"
  ON public.property_listings_v2 FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 4. V2 bookings — linked to auth user
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bookings_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.property_listings_v2(id),
  buyer_user_id uuid NOT NULL REFERENCES auth.users(id),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id),
  buyer_orbit_id text NOT NULL,
  owner_orbit_id text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  check_in date NOT NULL,
  check_out date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'AED',
  guest_info jsonb DEFAULT '{}'::jsonb,
  conversation_id text,
  transaction_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_v2_buyer ON public.bookings_v2(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_v2_owner ON public.bookings_v2(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_v2_listing ON public.bookings_v2(listing_id);

ALTER TABLE public.bookings_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Booking participants can read"
  ON public.bookings_v2 FOR SELECT
  USING (auth.uid() = buyer_user_id OR auth.uid() = owner_user_id);

CREATE POLICY "Buyers create bookings"
  ON public.bookings_v2 FOR INSERT
  WITH CHECK (auth.uid() = buyer_user_id);

CREATE POLICY "Participants update bookings"
  ON public.bookings_v2 FOR UPDATE
  USING (auth.uid() = buyer_user_id OR auth.uid() = owner_user_id);

-- ============================================================
-- 5. V2 conversations — linked to auth user
-- ============================================================

CREATE TABLE IF NOT EXISTS public.conversations_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'direct',
  title text,
  participants jsonb NOT NULL DEFAULT '[]'::jsonb,
  listing_id text,
  booking_id text,
  lease_id text,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.conversations_v2 ENABLE ROW LEVEL SECURITY;

-- Participants can read their conversations
CREATE POLICY "Participants read conversations"
  ON public.conversations_v2 FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(participants) AS p
      WHERE (p->>'userId')::uuid = auth.uid()
    )
  );

CREATE POLICY "Authenticated users create conversations"
  ON public.conversations_v2 FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Participants update conversations"
  ON public.conversations_v2 FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(participants) AS p
      WHERE (p->>'userId')::uuid = auth.uid()
    )
  );

-- ============================================================
-- 6. V2 chat_messages — linked to auth user
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chat_messages_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations_v2(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES auth.users(id),
  sender_orbit_id text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'text',
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_v2_conv ON public.chat_messages_v2(conversation_id);

ALTER TABLE public.chat_messages_v2 ENABLE ROW LEVEL SECURITY;

-- Users can read messages in their conversations
CREATE POLICY "Read messages in own conversations"
  ON public.chat_messages_v2 FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations_v2 c
      WHERE c.id = conversation_id
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(c.participants) AS p
        WHERE (p->>'userId')::uuid = auth.uid()
      )
    )
  );

CREATE POLICY "Send messages to own conversations"
  ON public.chat_messages_v2 FOR INSERT
  WITH CHECK (auth.uid() = sender_user_id);

-- ============================================================
-- 7. Secure app_notifications with user_id
-- ============================================================

ALTER TABLE public.app_notifications ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old permissive policy
DROP POLICY IF EXISTS "dev_all_app_notifications" ON public.app_notifications;

CREATE POLICY "Users read own notifications"
  ON public.app_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System inserts notifications"
  ON public.app_notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Users update own notifications"
  ON public.app_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable realtime for V2 tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages_v2;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings_v2;
ALTER PUBLICATION supabase_realtime ADD TABLE public.property_listings_v2;
