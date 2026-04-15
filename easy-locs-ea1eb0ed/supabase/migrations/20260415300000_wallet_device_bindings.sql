CREATE TABLE IF NOT EXISTS public.wallet_device_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  wallet_id text NOT NULL,
  hmac text NOT NULL,
  salt text NOT NULL,
  bound_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, wallet_id)
);

ALTER TABLE public.wallet_device_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own device bindings"
  ON public.wallet_device_bindings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
