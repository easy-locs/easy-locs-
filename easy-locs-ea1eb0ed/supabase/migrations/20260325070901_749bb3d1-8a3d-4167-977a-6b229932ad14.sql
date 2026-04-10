CREATE TABLE IF NOT EXISTS public.verified_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  order_id UUID NOT NULL,
  merchant_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  verified BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, order_id)
);

ALTER TABLE public.verified_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all reviews"
  ON public.verified_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own reviews"
  ON public.verified_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anon can read reviews"
  ON public.verified_reviews FOR SELECT
  TO anon
  USING (true);