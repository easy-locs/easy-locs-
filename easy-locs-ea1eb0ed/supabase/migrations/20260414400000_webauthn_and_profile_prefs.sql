-- WebAuthn credentials table: stores registered authenticator public keys per user
CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key_cose TEXT NOT NULL,
  sign_count BIGINT NOT NULL DEFAULT 0,
  aaguid TEXT,
  device_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_used_at TIMESTAMPTZ
);

ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their webauthn credentials"
  ON public.webauthn_credentials
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- WebAuthn challenges table: ephemeral server challenges (TTL via expires_at)
CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'registration',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;

-- No client-accessible policies: RLS with zero permissive policies = default deny for anon/authenticated roles.
-- The service role (used by Edge Functions) bypasses RLS entirely, so webauthn-begin/finish-registration
-- can still read, insert, and delete rows via the service role key.
-- Revoke direct table grants from client roles to enforce edge-function-only access.
REVOKE ALL ON public.webauthn_challenges FROM anon, authenticated;

-- Add theme and profile_visibility columns to profiles (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'theme') THEN
    ALTER TABLE public.profiles ADD COLUMN theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'profile_visibility') THEN
    ALTER TABLE public.profiles ADD COLUMN profile_visibility TEXT DEFAULT 'contacts' CHECK (profile_visibility IN ('public', 'contacts', 'private'));
  END IF;
END $$;
