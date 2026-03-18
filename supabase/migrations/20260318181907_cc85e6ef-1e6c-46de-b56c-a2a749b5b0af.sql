
-- Push tokens table
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL DEFAULT 'web',
  push_token text NOT NULL,
  device_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, push_token)
);

CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON public.user_push_tokens(user_id);

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_tokens_select_own" ON public.user_push_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "push_tokens_insert_own" ON public.user_push_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_tokens_update_own" ON public.user_push_tokens
  FOR UPDATE USING (auth.uid() = user_id);

-- Ride tip and rating fields
ALTER TABLE public.ride_requests
  ADD COLUMN IF NOT EXISTS tip_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tip_settled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS rider_rating integer,
  ADD COLUMN IF NOT EXISTS rider_review text,
  ADD COLUMN IF NOT EXISTS thread_id uuid;
