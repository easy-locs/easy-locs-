
-- Create a secure config table for internal secrets (only accessible by postgres/service role)
CREATE TABLE IF NOT EXISTS public.internal_config (
  key text PRIMARY KEY,
  value text NOT NULL
);

-- Disable RLS so only service role / postgres can access
ALTER TABLE public.internal_config ENABLE ROW LEVEL SECURITY;
-- No policies = no access via anon/authenticated roles

-- Generate and store a cron secret
INSERT INTO public.internal_config (key, value)
VALUES ('cron_secret', gen_random_uuid()::text)
ON CONFLICT (key) DO NOTHING;
