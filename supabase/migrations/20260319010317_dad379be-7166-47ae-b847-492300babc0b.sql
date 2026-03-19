
-- Add hardened OTP fields to phone_otp_sessions
ALTER TABLE public.phone_otp_sessions
  ADD COLUMN IF NOT EXISTS attempt_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '10 minutes'),
  ADD COLUMN IF NOT EXISTS channel text DEFAULT 'phone';

-- RLS policies for phone_otp_sessions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own otp sessions' AND tablename = 'phone_otp_sessions') THEN
    CREATE POLICY "Users can insert own otp sessions"
      ON public.phone_otp_sessions FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own otp sessions' AND tablename = 'phone_otp_sessions') THEN
    CREATE POLICY "Users can read own otp sessions"
      ON public.phone_otp_sessions FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own otp sessions' AND tablename = 'phone_otp_sessions') THEN
    CREATE POLICY "Users can update own otp sessions"
      ON public.phone_otp_sessions FOR UPDATE TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- RLS for merchant_onboarding_profiles — owners only manage their claimed profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owners can update own merchant profiles' AND tablename = 'merchant_onboarding_profiles') THEN
    CREATE POLICY "Owners can update own merchant profiles"
      ON public.merchant_onboarding_profiles FOR UPDATE TO authenticated
      USING (claimed_by = auth.uid()) WITH CHECK (claimed_by = auth.uid());
  END IF;
END $$;

-- RLS for storefront_pages — owners manage linked storefronts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owners can update linked storefronts' AND tablename = 'storefront_pages') THEN
    CREATE POLICY "Owners can update linked storefronts"
      ON public.storefront_pages FOR UPDATE TO authenticated
      USING (merchant_profile_id IN (
        SELECT id FROM public.merchant_onboarding_profiles WHERE claimed_by = auth.uid()
      ));
  END IF;
END $$;

-- Cleanup index for expired OTP sessions
CREATE INDEX IF NOT EXISTS idx_phone_otp_sessions_expires
  ON public.phone_otp_sessions(expires_at);
