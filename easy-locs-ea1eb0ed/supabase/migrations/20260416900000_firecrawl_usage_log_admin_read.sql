CREATE POLICY "Admins can read firecrawl usage logs"
  ON public.firecrawl_usage_log
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
