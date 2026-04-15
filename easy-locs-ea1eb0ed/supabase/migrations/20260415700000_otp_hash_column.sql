ALTER TABLE public.phone_otp_sessions
  ADD COLUMN IF NOT EXISTS otp_hash text;

ALTER TABLE public.phone_otp_sessions
  ALTER COLUMN otp_code DROP NOT NULL;
