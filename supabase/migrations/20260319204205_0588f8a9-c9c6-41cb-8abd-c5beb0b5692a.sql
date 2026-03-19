
CREATE TABLE IF NOT EXISTS public.dino_visibility_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id text NOT NULL,
  entity_type text NOT NULL DEFAULT 'category',
  boost_multiplier numeric NOT NULL DEFAULT 1.0,
  reason text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dino_visibility_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only visibility overrides"
  ON public.dino_visibility_overrides
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
