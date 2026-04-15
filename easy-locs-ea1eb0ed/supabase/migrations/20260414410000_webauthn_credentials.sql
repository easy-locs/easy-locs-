-- Additive WebAuthn enhancements (runs after 20260414400000_webauthn_and_profile_prefs.sql)
-- Adds missing columns, indexes, and the biometric_enabled profile column

ALTER TABLE public.webauthn_credentials ADD COLUMN IF NOT EXISTS transports text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id ON public.webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_credential_id ON public.webauthn_credentials(credential_id);

ALTER TABLE public.webauthn_challenges ADD COLUMN IF NOT EXISTS used boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_user_id ON public.webauthn_challenges(user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'biometric_enabled'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN biometric_enabled boolean NOT NULL DEFAULT false;
  END IF;
END $$;
