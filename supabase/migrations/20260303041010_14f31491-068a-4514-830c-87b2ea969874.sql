
-- Add read policy for internal_config (service use only)
CREATE POLICY "Authenticated can read config"
ON public.internal_config FOR SELECT
USING (auth.uid() IS NOT NULL);
