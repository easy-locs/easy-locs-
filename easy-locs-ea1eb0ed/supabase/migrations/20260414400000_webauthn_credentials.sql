CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  sign_count bigint NOT NULL DEFAULT 0,
  device_name text,
  transports text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id ON public.webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_credential_id ON public.webauthn_credentials(credential_id);

ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own webauthn credentials"
  ON public.webauthn_credentials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own webauthn credentials"
  ON public.webauthn_credentials FOR DELETE
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge text NOT NULL,
  type text NOT NULL CHECK (type IN ('registration', 'authentication')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_user_id ON public.webauthn_challenges(user_id);

ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'biometric_enabled'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN biometric_enabled boolean NOT NULL DEFAULT false;
  END IF;
END $$;
