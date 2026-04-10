
-- Add Stripe Connect fields to orgs table
ALTER TABLE public.orgs 
ADD COLUMN IF NOT EXISTS stripe_account_id text,
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete boolean NOT NULL DEFAULT false;
