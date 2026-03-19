
-- Merchant outreach campaigns table
CREATE TABLE IF NOT EXISTS public.merchant_outreach_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_profile_id uuid REFERENCES public.merchant_onboarding_profiles(id) ON DELETE CASCADE NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  activation_token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  activation_link text,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  claimed_at timestamptz,
  activated_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_outreach_token ON public.merchant_outreach_campaigns(activation_token);
CREATE INDEX IF NOT EXISTS idx_outreach_merchant ON public.merchant_outreach_campaigns(merchant_profile_id);

-- Add claimed_by to merchant_onboarding_profiles
ALTER TABLE public.merchant_onboarding_profiles 
  ADD COLUMN IF NOT EXISTS claimed_by uuid,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS claim_verification_method text;

-- RLS for outreach campaigns
ALTER TABLE public.merchant_outreach_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read outreach" ON public.merchant_outreach_campaigns
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert outreach" ON public.merchant_outreach_campaigns
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update outreach" ON public.merchant_outreach_campaigns
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Allow anon to read by token (for activation links)
CREATE POLICY "Anon can read by token" ON public.merchant_outreach_campaigns
  FOR SELECT TO anon USING (true);
