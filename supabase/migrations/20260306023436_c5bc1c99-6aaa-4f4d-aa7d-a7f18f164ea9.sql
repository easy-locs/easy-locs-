-- Referral system
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  referrer_org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE,
  referral_code text NOT NULL UNIQUE,
  referred_user_id uuid,
  referred_email text,
  status text NOT NULL DEFAULT 'pending',
  reward_applied boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  converted_at timestamptz
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals"
  ON public.referrals FOR SELECT TO authenticated
  USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());

CREATE POLICY "Users can create referrals"
  ON public.referrals FOR INSERT TO authenticated
  WITH CHECK (referrer_user_id = auth.uid());

-- Add referral_code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- Public landlord profiles for SEO
CREATE TABLE public.landlord_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE NOT NULL,
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL DEFAULT '',
  bio text,
  avatar_url text,
  city text,
  country text DEFAULT 'FR',
  verified boolean DEFAULT false,
  properties_count integer DEFAULT 0,
  rating numeric(2,1),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.landlord_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active landlord profiles"
  ON public.landlord_profiles FOR SELECT
  USING (active = true);

CREATE POLICY "Users can manage own landlord profile"
  ON public.landlord_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Generate referral code trigger
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := 'EL-' || upper(substr(md5(random()::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION generate_referral_code();

UPDATE public.profiles SET referral_code = 'EL-' || upper(substr(md5(random()::text || id::text), 1, 8)) WHERE referral_code IS NULL;