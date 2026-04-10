
-- Create a secrets table accessible only via service role (no RLS SELECT for clients)
CREATE TABLE public.org_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE UNIQUE,
  gocardless_access_token text,
  gocardless_environment text DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS but add NO select policy — only service role can read
ALTER TABLE public.org_secrets ENABLE ROW LEVEL SECURITY;

-- Only org owner can insert/update their own secrets (but not read via client)
CREATE POLICY "Owner can insert org secrets"
  ON public.org_secrets FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.orgs WHERE orgs.id = org_secrets.org_id AND orgs.owner_user_id = auth.uid()));

CREATE POLICY "Owner can update org secrets"
  ON public.org_secrets FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.orgs WHERE orgs.id = org_secrets.org_id AND orgs.owner_user_id = auth.uid()));

-- Migrate existing data
INSERT INTO public.org_secrets (org_id, gocardless_access_token, gocardless_environment)
SELECT id, gocardless_access_token, gocardless_environment
FROM public.orgs
WHERE gocardless_access_token IS NOT NULL
ON CONFLICT (org_id) DO UPDATE SET
  gocardless_access_token = EXCLUDED.gocardless_access_token,
  gocardless_environment = EXCLUDED.gocardless_environment;

-- Remove sensitive columns from orgs table
ALTER TABLE public.orgs DROP COLUMN IF EXISTS gocardless_access_token;
ALTER TABLE public.orgs DROP COLUMN IF EXISTS gocardless_environment;
