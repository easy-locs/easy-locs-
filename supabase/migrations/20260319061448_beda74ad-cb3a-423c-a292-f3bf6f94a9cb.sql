
-- Security reviews table
CREATE TABLE IF NOT EXISTS public.security_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  audit_level text NOT NULL DEFAULT 'external',
  created_by text NOT NULL,
  findings jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert security reviews"
  ON public.security_reviews FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read security reviews"
  ON public.security_reviews FOR SELECT TO authenticated
  USING (true);

-- Device attestations table
CREATE TABLE IF NOT EXISTS public.device_attestations (
  device_id text PRIMARY KEY,
  device_fingerprint text NOT NULL,
  public_key_fingerprint text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  trust_state text NOT NULL DEFAULT 'pending_review'
);

ALTER TABLE public.device_attestations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage device attestations"
  ON public.device_attestations FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Security nonces table (replay protection)
CREATE TABLE IF NOT EXISTS public.security_nonces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nonce text NOT NULL,
  domain text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nonce, domain)
);

ALTER TABLE public.security_nonces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage nonces"
  ON public.security_nonces FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- RTC config table (if not exists)
CREATE TABLE IF NOT EXISTS public.rtc_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  active boolean NOT NULL DEFAULT false,
  ice_servers jsonb,
  ice_transport_policy text DEFAULT 'all',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rtc_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read rtc config"
  ON public.rtc_config FOR SELECT TO authenticated
  USING (true);
