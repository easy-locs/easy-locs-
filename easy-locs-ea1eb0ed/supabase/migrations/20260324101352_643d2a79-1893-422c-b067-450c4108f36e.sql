
-- Dedicated user_addresses table (replaces activity_logs abuse)
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL DEFAULT 'Home',
  icon text NOT NULL DEFAULT 'home',
  line1 text NOT NULL DEFAULT '',
  line2 text DEFAULT '',
  city text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  country_code text DEFAULT 'AE',
  lat numeric,
  lng numeric,
  delivery_notes text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own addresses"
  ON public.user_addresses FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Dedicated user_payment_preferences table
CREATE TABLE IF NOT EXISTS public.user_payment_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  default_method text NOT NULL DEFAULT 'wallet',
  saved_methods_json jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_payment_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own payment preferences"
  ON public.user_payment_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
