
-- 1. Add merchant_profile_id to storefront_pages for proper linkage
ALTER TABLE public.storefront_pages
  ADD COLUMN IF NOT EXISTS merchant_profile_id uuid REFERENCES public.merchant_onboarding_profiles(id);

-- 2. Add verification fields to merchant_onboarding_profiles
ALTER TABLE public.merchant_onboarding_profiles
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS description_ar text;

-- 3. Add bilingual fields to menu_items
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS description_ar text;

-- 4. Make menu_items.price nullable
ALTER TABLE public.menu_items ALTER COLUMN price DROP NOT NULL;
ALTER TABLE public.menu_items ALTER COLUMN price DROP DEFAULT;

-- 5. Create claim_attempts table for abuse protection
CREATE TABLE IF NOT EXISTS public.claim_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_profile_id uuid REFERENCES public.merchant_onboarding_profiles(id),
  user_id uuid,
  ip_address text,
  verification_method text,
  verification_value text,
  status text DEFAULT 'attempted',
  flagged boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.claim_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert claim attempts"
  ON public.claim_attempts FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read own claim attempts"
  ON public.claim_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 6. Repair script: link existing storefront_pages to merchant profiles by matching name
UPDATE public.storefront_pages sp
SET merchant_profile_id = mop.id
FROM public.merchant_onboarding_profiles mop
WHERE sp.merchant_profile_id IS NULL
  AND sp.name = mop.merchant_name
  AND mop.onboarding_status IN ('imported_not_claimed', 'claimed', 'active', 'live');

-- 7. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_storefront_pages_merchant_profile_id
  ON public.storefront_pages(merchant_profile_id);

CREATE INDEX IF NOT EXISTS idx_claim_attempts_merchant_profile_id
  ON public.claim_attempts(merchant_profile_id);

CREATE INDEX IF NOT EXISTS idx_claim_attempts_user_id_created
  ON public.claim_attempts(user_id, created_at);
