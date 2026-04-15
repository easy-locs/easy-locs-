CREATE TABLE IF NOT EXISTS public.firecrawl_usage_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_url text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  text_length integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_firecrawl_usage_log_user_id ON public.firecrawl_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_firecrawl_usage_log_created_at ON public.firecrawl_usage_log(created_at);

ALTER TABLE public.firecrawl_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert firecrawl usage logs"
  ON public.firecrawl_usage_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can read firecrawl usage logs"
  ON public.firecrawl_usage_log
  FOR SELECT
  TO service_role
  USING (true);
